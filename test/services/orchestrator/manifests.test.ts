import {
  aliasName,
  buildAliasService,
  buildBuilderJob,
  buildContextConfigMap,
  buildDeployment,
  deploymentStatus,
  imageRef,
  labelSelector,
  resourceName,
  ServerSpec,
  WORKLOADS_NAMESPACE,
} from "../../../src/services/orchestrator/manifests";

describe("orchestrator manifests", () => {
  const server: ServerSpec = {
    id: "abc-123",
    containerName: "Minecraft Server!",
    hostName: "desktop-1",
    ports: [
      { number: 25565, protocol: "tcp" },
      { number: 19132, protocol: "udp" },
    ],
    volumes: [{ hostPath: "/srv/mc", containerPath: "/data" }],
    environmentVariables: [{ name: "EULA", value: "true" }],
    files: [
      { name: "Dockerfile", content: "RlJPTSBhbHBpbmU=" },
      { name: "nested/start.sh", content: "ZWNobyBoaQ==" },
    ],
  };
  const registry = "registry.local:5000";

  it("names resources from the id, not the free-form container name", () => {
    expect(resourceName(server)).toBe("server-abc-123");
    expect(imageRef(registry, server)).toBe(
      "registry.local:5000/server-abc-123:latest",
    );
  });

  it("builds label selectors for one server or for all", () => {
    expect(labelSelector(server)).toBe(
      "app.kubernetes.io/managed-by=server-manager,server-manager/server-id=abc-123",
    );
    expect(labelSelector()).toBe("app.kubernetes.io/managed-by=server-manager");
  });

  it("builds a Recreate deployment pinned to the host with bind mounts", () => {
    const deployment = buildDeployment(server, registry, "now");
    expect(deployment.metadata.namespace).toBe(WORKLOADS_NAMESPACE);
    expect(deployment.spec.strategy.type).toBe("Recreate");
    expect(deployment.spec.template.metadata.annotations).toEqual({
      "server-manager/restarted-at": "now",
    });
    const pod = deployment.spec.template.spec;
    expect(pod.nodeSelector).toEqual({ "kubernetes.io/hostname": "desktop-1" });
    expect(pod.enableServiceLinks).toBe(false);
    expect(pod.containers[0].env).toEqual([{ name: "EULA", value: "true" }]);
    // Published on the node under the same number, as `docker run -p N:N` did.
    expect(pod.containers[0].ports).toEqual([
      { containerPort: 25565, hostPort: 25565, protocol: "TCP" },
      { containerPort: 19132, hostPort: 19132, protocol: "UDP" },
    ]);
    expect(pod.containers[0].volumeMounts).toEqual([
      { name: "volume-0", mountPath: "/data" },
    ]);
    expect(pod.volumes).toEqual([
      { name: "volume-0", hostPath: { path: "/srv/mc", type: "Directory" } },
    ]);
  });

  it("gives pods no API token unless a service account is requested", () => {
    const pod = buildDeployment(server, registry, "now").spec.template.spec;
    expect(pod).toMatchObject({ automountServiceAccountToken: false });
    expect(pod).not.toHaveProperty("serviceAccountName");
    const own = buildDeployment(server, registry, "now", "server-manager").spec
      .template.spec;
    expect(own).toMatchObject({ serviceAccountName: "server-manager" });
    expect(own).not.toHaveProperty("automountServiceAccountToken");
  });

  it("puts build files in a config map by base name", () => {
    expect(buildContextConfigMap(server).binaryData).toEqual({
      Dockerfile: "RlJPTSBhbHBpbmU=",
      "start.sh": "ZWNobyBoaQ==",
    });
  });

  it("builds a kaniko job that passes env vars as build args", () => {
    const job = buildBuilderJob(server, registry);
    const container = job.spec.template.spec.containers[0];
    expect(container.args).toEqual([
      "--dockerfile=/workspace/Dockerfile",
      "--context=dir:///workspace",
      "--destination=registry.local:5000/server-abc-123:latest",
      "--cache=false",
      "--build-arg=EULA=true",
    ]);
    // The build context is a real copy of the config map files, not the symlinks they are mounted as.
    const pod = job.spec.template.spec;
    expect(pod.initContainers[0].command.join(" ")).toContain(
      "cp -L /config/*",
    );
    expect(pod.volumes).toEqual([
      {
        name: "config",
        configMap: { name: buildContextConfigMap(server).metadata.name },
      },
      { name: "context", emptyDir: {} },
    ]);
  });

  it("passes --insecure to kaniko for a plain http registry", () => {
    const args = buildBuilderJob(server, registry, true).spec.template.spec
      .containers[0].args;
    expect(args).toContain("--insecure");
    expect(buildBuilderJob(server, registry).spec.template.spec).toMatchObject({
      automountServiceAccountToken: false,
    });
  });

  it("lets other servers reach a server by its container name", () => {
    const named = { ...server, containerName: "Postfix" };
    expect(aliasName(named)).toBe("postfix");
    const alias = buildAliasService(named);
    expect(alias?.metadata.name).toBe("postfix");
    expect(alias?.spec.type).toBe("ClusterIP");
    expect(alias?.spec.ports[0]).toEqual({
      name: "tcp-25565",
      port: 25565,
      targetPort: 25565,
      protocol: "TCP",
    });
    expect(
      buildDeployment(named, registry, "now").spec.template.metadata.labels,
    ).toMatchObject({ "server-manager/name": "postfix" });
  });

  it("has no alias without a valid name or without ports", () => {
    expect(aliasName({ containerName: "Minecraft Server!" })).toBeUndefined();
    expect(aliasName({ containerName: "-bad" })).toBeUndefined();
    expect(aliasName({ containerName: "a".repeat(64) })).toBeUndefined();
    expect(buildAliasService(server)).toBeUndefined();
    expect(
      buildAliasService({ ...server, containerName: "ok", ports: [] }),
    ).toBeUndefined();
    expect(
      buildDeployment(server, registry, "now").spec.template.metadata.labels,
    ).not.toHaveProperty("server-manager/name");
  });

  it("maps deployment replicas to a status", () => {
    expect(deploymentStatus({})).toBe("stopped");
    expect(deploymentStatus({ spec: { replicas: 0 } })).toBe("stopped");
    expect(
      deploymentStatus({
        metadata: { deletionTimestamp: new Date() },
        spec: { replicas: 1 },
        status: { readyReplicas: 1 },
      }),
    ).toBe("stopped");
    expect(deploymentStatus({ spec: { replicas: 1 } })).toBe("starting");
    expect(
      deploymentStatus({ spec: { replicas: 1 }, status: { readyReplicas: 1 } }),
    ).toBe("running");
  });
});
