import { createK8sClient } from "../../src/utils/k8sClient";

const mockKubeConfig = {
  loadFromCluster: jest.fn(),
  loadFromDefault: jest.fn(),
  makeApiClient: jest.fn((api: string) => ({ api })),
};
jest.mock("@kubernetes/client-node", () => ({
  KubeConfig: jest.fn(() => mockKubeConfig),
  AppsV1Api: "apps",
  CoreV1Api: "core",
  BatchV1Api: "batch",
}));

describe("createK8sClient", () => {
  afterEach(() => {
    delete process.env.KUBERNETES_SERVICE_HOST;
    jest.clearAllMocks();
  });

  it("uses the service account inside a cluster", async () => {
    process.env.KUBERNETES_SERVICE_HOST = "10.0.0.1";
    const client = createK8sClient();
    expect(mockKubeConfig.loadFromCluster).toHaveBeenCalled();
    expect(mockKubeConfig.loadFromDefault).not.toHaveBeenCalled();
    expect(client).toEqual({
      apps: { api: "apps" },
      core: { api: "core" },
      batch: { api: "batch" },
    });
  });

  it("uses the default kubeconfig outside a cluster", async () => {
    createK8sClient();
    expect(mockKubeConfig.loadFromDefault).toHaveBeenCalled();
    expect(mockKubeConfig.loadFromCluster).not.toHaveBeenCalled();
  });
});
