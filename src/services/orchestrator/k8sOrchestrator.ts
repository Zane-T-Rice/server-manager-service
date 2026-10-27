import { createK8sClient, K8sClient } from "../../utils/k8sClient";
import {
  buildBuilderJob,
  buildContextConfigMap,
  buildDeployment,
  aliasName,
  buildAliasService,
  CONTAINER_NAME_ANNOTATION,
  deploymentStatus,
  labelSelector,
  resourceName,
  ServerSpec,
  WORKLOADS_NAMESPACE,
} from "./manifests";

const SERVICE_ACCOUNT_NAME = "server-manager";
const BUILD_POLL_MS = 2000;
const BUILD_TIMEOUT_MS = 30 * 60 * 1000;

let client: K8sClient | undefined;
async function getClient(): Promise<K8sClient> {
  client = client ?? createK8sClient();
  return client;
}

function isNotFound(e: unknown) {
  return (e as { code?: number })?.code === 404;
}

function registry(): string {
  const value = process.env.REGISTRY;
  if (!value) {
    throw new Error("REGISTRY must be set when ORCHESTRATOR=k8s.");
  }
  return value;
}

/* Runs the call, treating "does not exist" as success. */
async function ignoreNotFound(call: Promise<unknown>) {
  try {
    await call;
  } catch (e) {
    if (!isNotFound(e)) {
      throw e;
    }
  }
}

/* Builds the image in a rootless job and waits for it to finish. */
export async function buildImage(server: ServerSpec) {
  const { core, batch } = await getClient();
  const configMap = buildContextConfigMap(server);
  const job = buildBuilderJob(
    server,
    registry(),
    process.env.REGISTRY_INSECURE === "true",
  );
  const namespace = WORKLOADS_NAMESPACE;

  // Clear out the previous build, whose job may not have been cleaned up yet.
  await ignoreNotFound(
    batch.deleteNamespacedJob({
      name: job.metadata.name,
      namespace,
      propagationPolicy: "Background",
    }),
  );
  await ignoreNotFound(
    core.deleteNamespacedConfigMap({
      name: configMap.metadata.name,
      namespace,
    }),
  );

  await core.createNamespacedConfigMap({ namespace, body: configMap });
  await batch.createNamespacedJob({ namespace, body: job });

  const deadline = Date.now() + BUILD_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const { status } = await batch.readNamespacedJobStatus({
      name: job.metadata.name,
      namespace,
    });
    if (status?.succeeded) {
      return;
    }
    if (status?.failed) {
      throw new Error(`Image build for ${server.containerName} failed.`);
    }
    await new Promise((resolve) => setTimeout(resolve, BUILD_POLL_MS));
  }
  throw new Error(`Image build for ${server.containerName} timed out.`);
}

/* Creates or replaces the server's Deployment and Service. */
export async function applyServer(server: ServerSpec) {
  const { apps, core } = await getClient();
  const namespace = WORKLOADS_NAMESPACE;
  const name = resourceName(server);
  const deployment = buildDeployment(
    server,
    registry(),
    new Date().toISOString(),
    server.id === process.env.SELF_SERVER_ID ? SERVICE_ACCOUNT_NAME : undefined,
  );

  try {
    await apps.replaceNamespacedDeployment({
      name,
      namespace,
      body: deployment,
    });
  } catch (e) {
    if (!isNotFound(e)) {
      throw e;
    }
    await apps.createNamespacedDeployment({ namespace, body: deployment });
  }

  // Ports are published by the pod itself now. Remove the NodePort service earlier versions created.
  await ignoreNotFound(core.deleteNamespacedService({ name, namespace }));

  // Services cannot be replaced without their cluster IP, and are cheap to recreate.

  const alias = buildAliasService(server);
  const aliasServiceName = aliasName(server);
  if (aliasServiceName) {
    await ignoreNotFound(
      core.deleteNamespacedService({ name: aliasServiceName, namespace }),
    );
  }
  if (alias) {
    await core.createNamespacedService({ namespace, body: alias });
  }
}

/* Removes the server's Deployment and Service. A server that is not running is already stopped. */
export async function removeServer(
  server: Pick<ServerSpec, "id" | "containerName">,
) {
  const { apps, core } = await getClient();
  const namespace = WORKLOADS_NAMESPACE;
  const name = resourceName(server);
  await ignoreNotFound(
    apps.deleteNamespacedDeployment({
      name,
      namespace,
      propagationPolicy: "Foreground",
    }),
  );
  await ignoreNotFound(core.deleteNamespacedService({ name, namespace }));
  const aliasServiceName = aliasName(server);
  if (aliasServiceName) {
    await ignoreNotFound(
      core.deleteNamespacedService({ name: aliasServiceName, namespace }),
    );
  }
}

/* Status of every managed server, keyed by container name. */
export async function getStatuses(): Promise<Map<string, string> | undefined> {
  try {
    const { items } = await (
      await getClient()
    ).apps.listNamespacedDeployment({
      namespace: WORKLOADS_NAMESPACE,
      labelSelector: labelSelector(),
    });
    return new Map(
      items.map((deployment) => [
        deployment.metadata?.annotations?.[CONTAINER_NAME_ANNOTATION] ??
          String(deployment.metadata?.name),
        deploymentStatus(deployment),
      ]),
    );
  } catch {
    return undefined;
  }
}

/* Test hook: forget the cached client. */
export function resetClient() {
  client = undefined;
}
