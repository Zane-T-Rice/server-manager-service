# Running server-manager-service on k3s

Replaces the mounted `docker.sock`. The service only has the permissions in `10-rbac.yaml`,
inside the `server-manager-workloads` namespace. The API server enforces `20-admission-policy.yaml`.

## 1. Cluster (once)

On the control-plane desktop, copy `k3s/config.yaml` to `/etc/rancher/k3s/config.yaml`, then:

    curl -sfL https://get.k3s.io | sh -

On every other desktop, install the agent (token is in `/var/lib/rancher/k3s/server/node-token`):

    curl -sfL https://get.k3s.io | K3S_URL=https://CONTROL_PLANE_IP:6443 K3S_TOKEN=... sh -

On **every** node, copy `k3s/registries.yaml` to `/etc/rancher/k3s/registries.yaml` (fill in
`CONTROL_PLANE_IP`) and restart `k3s` / `k3s-agent`. Node names (`kubectl get nodes`) must equal the
`name` of the matching `Host` record, because servers are pinned with `kubernetes.io/hostname`.

## 2. Policy and registry

Edit `allowedHostPaths` in `20-admission-policy.yaml` to the parent directories of your servers' save
data (and the service's database directory), then:

    kubectl apply -f deploy/

Servers can no longer bind mount anything outside that list.

## 3. Start the service

Create the service's own `Server` record (so it can update itself), note its id, then:

    SERVER_ID=... NODE_NAME=... REGISTRY=CONTROL_PLANE_IP:5000 IMAGE=CONTROL_PLANE_IP:5000/server-<id>:latest \
      envsubst < deploy/bootstrap/service.yaml | kubectl apply -f -

Add the remaining env vars from the README to that file first. Afterwards, updating the service
through the API rebuilds the image and replaces this Deployment.

## 4. Verify (before moving real servers)

Not checked against a live cluster yet, so run these once:

    # The policy rejects what it should (each must be denied):
    kubectl -n server-manager-workloads run t1 --image=alpine --privileged -- sleep 1
    kubectl -n server-manager-workloads apply -f - <<'Y'
    apiVersion: v1
    kind: Pod
    metadata: { name: t2 }
    spec:
      containers: [{ name: c, image: alpine, command: [sleep, "1"] }]
      volumes: [{ name: v, hostPath: { path: / } }]
    Y

    # The service account can manage workloads and nothing else:
    kubectl auth can-i create deployments -n server-manager-workloads --as=system:serviceaccount:server-manager-workloads:server-manager
    kubectl auth can-i get secrets -A --as=system:serviceaccount:server-manager-workloads:server-manager   # no

Then update one low-stakes server through the API and check `kubectl -n server-manager-workloads get pods,svc`.

## Notes

- Old docker containers keep running and keep their ports. Stop each one before updating its server
  through the new path, or the pod cannot bind the port the docker container still holds.
- The registry is plain http on the LAN. Put it behind TLS if the desktops are not on a trusted network.
- Ports are published with hostPort on the node the pod runs on, like `docker run -p`. A port a host service already
  listens on (22, 6443, 10250, ...) cannot be used by a server.
