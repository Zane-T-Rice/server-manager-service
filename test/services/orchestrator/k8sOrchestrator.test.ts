import {
  applyServer,
  buildImage,
  getStatuses,
  removeServer,
  resetClient,
} from "../../../src/services/orchestrator/k8sOrchestrator";
import { ServerSpec } from "../../../src/services/orchestrator/manifests";
import { createK8sClient } from "../../../src/utils/k8sClient";
jest.mock("../../../src/utils/k8sClient");

describe("k8sOrchestrator", () => {
  const server: ServerSpec = {
    id: "abc",
    containerName: "game",
    hostName: "desktop-1",
    ports: [{ number: 25565, protocol: "tcp" }],
    volumes: [],
    environmentVariables: [],
    files: [{ name: "Dockerfile", content: "RlJPTSBhbHBpbmU=" }],
  };
  const notFound = Object.assign(new Error("not found"), { code: 404 });
  const serverError = Object.assign(new Error("boom"), { code: 500 });
  const client = {
    apps: {
      replaceNamespacedDeployment: jest.fn(),
      createNamespacedDeployment: jest.fn(),
      deleteNamespacedDeployment: jest.fn(),
      listNamespacedDeployment: jest.fn(),
    },
    core: {
      createNamespacedConfigMap: jest.fn(),
      deleteNamespacedConfigMap: jest.fn(),
      createNamespacedService: jest.fn(),
      deleteNamespacedService: jest.fn(),
    },
    batch: {
      createNamespacedJob: jest.fn(),
      deleteNamespacedJob: jest.fn(),
      readNamespacedJobStatus: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.resetAllMocks();
    resetClient();
    process.env.REGISTRY = "registry.local:5000";
    (createK8sClient as jest.Mock).mockReturnValue(client);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("buildImage", () => {
    it("clears the previous build, creates the job and returns once it succeeds", async () => {
      client.batch.deleteNamespacedJob.mockRejectedValue(notFound);
      client.core.deleteNamespacedConfigMap.mockResolvedValue({});
      client.batch.readNamespacedJobStatus.mockResolvedValue({
        status: { succeeded: 1 },
      });
      await buildImage(server);
      expect(client.core.createNamespacedConfigMap).toHaveBeenCalledTimes(1);
      expect(client.batch.createNamespacedJob).toHaveBeenCalledTimes(1);
      expect(client.batch.readNamespacedJobStatus).toHaveBeenCalledWith({
        name: "server-abc-build",
        namespace: "server-manager-workloads",
      });
    });

    it("keeps polling until the job finishes", async () => {
      jest.useFakeTimers();
      client.batch.readNamespacedJobStatus
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ status: { succeeded: 1 } });
      const build = buildImage(server);
      await jest.advanceTimersByTimeAsync(2000);
      await build;
      expect(client.batch.readNamespacedJobStatus).toHaveBeenCalledTimes(2);
    });

    it("fails if the job fails", async () => {
      client.batch.readNamespacedJobStatus.mockResolvedValue({
        status: { failed: 1 },
      });
      await expect(buildImage(server)).rejects.toThrow(
        "Image build for game failed.",
      );
    });

    it("fails if the job takes too long", async () => {
      jest.useFakeTimers();
      client.batch.readNamespacedJobStatus.mockResolvedValue({});
      const build = buildImage(server);
      const assertion = expect(build).rejects.toThrow(
        "Image build for game timed out.",
      );
      await jest.advanceTimersByTimeAsync(31 * 60 * 1000);
      await assertion;
    });

    it("rethrows errors other than not found when clearing the previous build", async () => {
      client.batch.deleteNamespacedJob.mockRejectedValue(serverError);
      await expect(buildImage(server)).rejects.toBe(serverError);
    });

    it("requires a registry", async () => {
      delete process.env.REGISTRY;
      await expect(buildImage(server)).rejects.toThrow(
        "REGISTRY must be set when ORCHESTRATOR=k8s.",
      );
    });
  });

  describe("applyServer", () => {
    it("replaces an existing deployment and recreates the name service", async () => {
      client.core.deleteNamespacedService.mockRejectedValue(notFound);
      await applyServer(server);
      expect(client.apps.replaceNamespacedDeployment).toHaveBeenCalledTimes(1);
      expect(client.apps.createNamespacedDeployment).not.toHaveBeenCalled();
      // Ports are published by the pod, so the only service is the one other servers reach it by.
      expect(client.core.createNamespacedService).toHaveBeenCalledTimes(1);
      expect(
        client.core.createNamespacedService.mock.calls[0][0].body.metadata.name,
      ).toBe("game");
      // The NodePort service older versions created is cleaned up.
      expect(client.core.deleteNamespacedService).toHaveBeenCalledWith({
        name: "server-abc",
        namespace: "server-manager-workloads",
      });
    });

    it("creates the deployment if it does not exist", async () => {
      client.apps.replaceNamespacedDeployment.mockRejectedValue(notFound);
      await applyServer(server);
      expect(client.apps.createNamespacedDeployment).toHaveBeenCalledTimes(1);
    });

    it("gives only the service itself a service account", async () => {
      process.env.SELF_SERVER_ID = "abc";
      process.env.REGISTRY_INSECURE = "true";
      await applyServer(server);
      await buildImage(server).catch(() => undefined);
      delete process.env.SELF_SERVER_ID;
      delete process.env.REGISTRY_INSECURE;
      const own =
        client.apps.replaceNamespacedDeployment.mock.calls[0][0].body.spec
          .template.spec;
      expect(own.serviceAccountName).toBe("server-manager");
      expect(
        client.batch.createNamespacedJob.mock.calls[0][0].body.spec.template
          .spec.containers[0].args,
      ).toContain("--insecure");
    });

    it("does not create a service for a server without ports", async () => {
      await applyServer({ ...server, ports: [] });
      expect(client.core.createNamespacedService).not.toHaveBeenCalled();
    });

    it("creates no alias for a name that is not a dns label", async () => {
      await applyServer({ ...server, containerName: "Not_A_Label!" });
      expect(client.core.createNamespacedService).not.toHaveBeenCalled();
    });

    it("rethrows other errors", async () => {
      client.apps.replaceNamespacedDeployment.mockRejectedValue(serverError);
      await expect(applyServer(server)).rejects.toBe(serverError);
    });
  });

  describe("removeServer", () => {
    it("deletes the deployment and service", async () => {
      await removeServer(server);
      expect(client.apps.deleteNamespacedDeployment).toHaveBeenCalledWith({
        name: "server-abc",
        namespace: "server-manager-workloads",
        propagationPolicy: "Foreground",
      });
      expect(client.core.deleteNamespacedService).toHaveBeenCalledTimes(2);
    });

    it("succeeds if the server is already gone", async () => {
      client.apps.deleteNamespacedDeployment.mockRejectedValue(notFound);
      client.core.deleteNamespacedService.mockRejectedValue(notFound);
      await expect(removeServer(server)).resolves.toBeUndefined();
    });

    it("also deletes the service other servers reach it by", async () => {
      await removeServer(server);
      expect(client.core.deleteNamespacedService).toHaveBeenCalledWith({
        name: "game",
        namespace: "server-manager-workloads",
      });
    });

    it("has no such service for a name that is not a dns label", async () => {
      await removeServer({ id: "abc", containerName: "Not_A_Label!" });
      expect(client.core.deleteNamespacedService).toHaveBeenCalledTimes(1);
    });
  });

  describe("getStatuses", () => {
    it("maps container names to statuses", async () => {
      client.apps.listNamespacedDeployment.mockResolvedValue({
        items: [
          {
            metadata: {
              name: "server-abc",
              annotations: { "server-manager/container-name": "game" },
            },
            spec: { replicas: 1 },
            status: { readyReplicas: 1 },
          },
          { metadata: { name: "server-def" }, spec: { replicas: 1 } },
          {},
        ],
      });
      expect(await getStatuses()).toEqual(
        new Map([
          ["game", "running"],
          ["server-def", "starting"],
          ["undefined", "stopped"],
        ]),
      );
    });

    it("returns undefined if the cluster can not be asked", async () => {
      client.apps.listNamespacedDeployment.mockRejectedValue(serverError);
      expect(await getStatuses()).toBeUndefined();
    });
  });
});
