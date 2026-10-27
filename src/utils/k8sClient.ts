/* Talks to the cluster as the pod's service account, or with KUBECONFIG outside of one.
 * The client library is ESM only, so it is required on first use (Node 22.12 or newer). */
export function createK8sClient() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- a static import cannot load the ESM-only package under jest.
  const k8s: typeof import("@kubernetes/client-node") = require("@kubernetes/client-node");
  const kubeConfig = new k8s.KubeConfig();
  if (process.env.KUBERNETES_SERVICE_HOST) {
    kubeConfig.loadFromCluster();
  } else {
    kubeConfig.loadFromDefault();
  }
  return {
    apps: kubeConfig.makeApiClient(k8s.AppsV1Api),
    core: kubeConfig.makeApiClient(k8s.CoreV1Api),
    batch: kubeConfig.makeApiClient(k8s.BatchV1Api),
  };
}

export type K8sClient = ReturnType<typeof createK8sClient>;
