/* Pure functions that turn a server record into Kubernetes manifests. */

export const WORKLOADS_NAMESPACE = "server-manager-workloads";
const MANAGED_BY = "server-manager";
export const CONTAINER_NAME_ANNOTATION = "server-manager/container-name";

export interface ServerSpec {
  id: string;
  containerName: string;
  hostName: string; // The kubernetes node the server is pinned to.
  ports: { number: number; protocol: string }[];
  volumes: { hostPath: string; containerPath: string }[];
  environmentVariables: { name: string; value: string }[];
  files: { name: string; content: string }[]; // content is base64 encoded.
}

/* Kubernetes names must be DNS-1123 labels, which container names are not guaranteed to be. */
export function resourceName(server: Pick<ServerSpec, "id">): string {
  return `server-${server.id}`;
}

/* The container name as a DNS label, or undefined if it cannot be one. Servers reach each other by this name,
 * as they did on the docker network. */
export function aliasName(server: Pick<ServerSpec, "containerName">) {
  const name = server.containerName.toLowerCase();
  return /^[a-z0-9]([-a-z0-9]{0,61}[a-z0-9])?$/.test(name) ? name : undefined;
}

export function labels(server: Pick<ServerSpec, "id">) {
  return {
    "app.kubernetes.io/managed-by": MANAGED_BY,
    "server-manager/server-id": server.id,
  };
}

export function labelSelector(server?: Pick<ServerSpec, "id">): string {
  return Object.entries(
    server ? labels(server) : { "app.kubernetes.io/managed-by": MANAGED_BY },
  )
    .map(([key, value]) => `${key}=${value}`)
    .join(",");
}

export function imageRef(registry: string, server: ServerSpec): string {
  return `${registry}/${resourceName(server)}:latest`;
}

/* restartedAt changes the pod template so an update rolls out even though the :latest tag is unchanged.
 * Only the service itself gets a service account (serviceAccountName); every other pod gets no API token. */
export function buildDeployment(
  server: ServerSpec,
  registry: string,
  restartedAt: string,
  serviceAccountName?: string,
) {
  const name = resourceName(server);
  return {
    apiVersion: "apps/v1",
    kind: "Deployment",
    metadata: {
      name,
      namespace: WORKLOADS_NAMESPACE,
      labels: labels(server),
      annotations: { [CONTAINER_NAME_ANNOTATION]: server.containerName },
    },
    spec: {
      replicas: 1,
      // Two copies must never run at once: they would share ports and save data.
      strategy: { type: "Recreate" },
      selector: { matchLabels: labels(server) },
      template: {
        metadata: {
          labels: {
            ...labels(server),
            ...(aliasName(server) && {
              "server-manager/name": aliasName(server),
            }),
          },
          annotations: { "server-manager/restarted-at": restartedAt },
        },
        spec: {
          restartPolicy: "Always",
          ...(serviceAccountName
            ? { serviceAccountName }
            : { automountServiceAccountToken: false }),
          nodeSelector: { "kubernetes.io/hostname": server.hostName },
          containers: [
            {
              name: "server",
              image: imageRef(registry, server),
              imagePullPolicy: "Always",
              env: server.environmentVariables.map(({ name, value }) => ({
                name,
                value,
              })),
              ports: server.ports.map((port) => ({
                containerPort: port.number,
                protocol: port.protocol.toUpperCase(),
              })),
              volumeMounts: server.volumes.map((volume, index) => ({
                name: `volume-${index}`,
                mountPath: volume.containerPath,
              })),
            },
          ],
          volumes: server.volumes.map((volume, index) => ({
            name: `volume-${index}`,
            hostPath: { path: volume.hostPath, type: "Directory" },
          })),
        },
      },
    },
  };
}

/* Publishes each port on the node under the same number, as `docker run -p N:N` did. */
export function buildService(server: ServerSpec) {
  return {
    apiVersion: "v1",
    kind: "Service",
    metadata: {
      name: resourceName(server),
      namespace: WORKLOADS_NAMESPACE,
      labels: labels(server),
    },
    spec: {
      type: "NodePort",
      // Only the node running the pod answers, as with docker, and players keep their real source address.
      // Forwarding between nodes would hide it behind a pod-network address.
      externalTrafficPolicy: "Local",
      selector: labels(server),
      ports: server.ports.map((port) => ({
        name: `${port.protocol.toLowerCase()}-${port.number}`,
        port: port.number,
        targetPort: port.number,
        nodePort: port.number,
        protocol: port.protocol.toUpperCase(),
      })),
    },
  };
}

/* Lets other servers reach this one by container name, as on the docker network. Undefined if there is no
 * valid name or the server publishes no ports. */
export function buildAliasService(server: ServerSpec) {
  const name = aliasName(server);
  if (!name || server.ports.length === 0) {
    return undefined;
  }
  return {
    apiVersion: "v1",
    kind: "Service",
    metadata: { name, namespace: WORKLOADS_NAMESPACE, labels: labels(server) },
    spec: {
      type: "ClusterIP",
      selector: labels(server),
      ports: server.ports.map((port) => ({
        name: `${port.protocol.toLowerCase()}-${port.number}`,
        port: port.number,
        targetPort: port.number,
        protocol: port.protocol.toUpperCase(),
      })),
    },
  };
}

/* The Dockerfile and any other build files, mounted into the builder Job. */
export function buildContextConfigMap(server: ServerSpec) {
  return {
    apiVersion: "v1",
    kind: "ConfigMap",
    metadata: {
      name: `${resourceName(server)}-build`,
      namespace: WORKLOADS_NAMESPACE,
      labels: labels(server),
    },
    binaryData: Object.fromEntries(
      server.files.map((file) => [baseName(file.name), file.content]),
    ),
  };
}

function baseName(fileName: string): string {
  return fileName.split("/").pop() as string;
}

/* Builds the image rootless with kaniko and pushes it to the registry. */
export function buildBuilderJob(
  server: ServerSpec,
  registry: string,
  insecureRegistry = false,
) {
  const name = `${resourceName(server)}-build`;
  return {
    apiVersion: "batch/v1",
    kind: "Job",
    metadata: { name, namespace: WORKLOADS_NAMESPACE, labels: labels(server) },
    spec: {
      backoffLimit: 0,
      ttlSecondsAfterFinished: 600,
      template: {
        metadata: { labels: labels(server) },
        spec: {
          restartPolicy: "Never",
          automountServiceAccountToken: false,
          // ConfigMap files are symlinks, which kaniko would copy as dangling links. Copy the real files.
          initContainers: [
            {
              name: "context",
              image: "busybox:1.36",
              command: ["sh", "-c", "cp -L /config/* /workspace/"],
              volumeMounts: [
                { name: "config", mountPath: "/config" },
                { name: "context", mountPath: "/workspace" },
              ],
            },
          ],
          containers: [
            {
              name: "kaniko",
              image: "gcr.io/kaniko-project/executor:latest",
              args: [
                "--dockerfile=/workspace/Dockerfile",
                "--context=dir:///workspace",
                `--destination=${imageRef(registry, server)}`,
                "--cache=false",
                ...(insecureRegistry ? ["--insecure"] : []),
                ...server.environmentVariables.map(
                  (variable) =>
                    `--build-arg=${variable.name}=${variable.value}`,
                ),
              ],
              volumeMounts: [{ name: "context", mountPath: "/workspace" }],
            },
          ],
          volumes: [
            { name: "config", configMap: { name } },
            { name: "context", emptyDir: {} },
          ],
        },
      },
    },
  };
}

/* Maps the replica counts of a Deployment onto the statuses the API reports. */
export function deploymentStatus(deployment: {
  metadata?: { deletionTimestamp?: Date };
  spec?: { replicas?: number };
  status?: { readyReplicas?: number };
}): string {
  // A deployment being deleted (a stop in progress) is already stopped as far as the API is concerned.
  if (deployment.metadata?.deletionTimestamp || !deployment.spec?.replicas) {
    return "stopped";
  }
  return deployment.status?.readyReplicas ? "running" : "starting";
}
