# Running server-manager-service on k3s

Replaces the mounted `docker.sock`. The service only has the permissions in `10-rbac.yaml`,
inside the `server-manager-workloads` namespace. The API server enforces `20-admission-policy.yaml`.

You need one or more Linux machines (the "nodes") on a network they all share, root on each, `kubectl`
(`k3s kubectl` on the control plane works), and an Auth0 tenant (see [Authentication](../README.md#authentication)).
The examples below call the control-plane node's address `CONTROL_PLANE_IP`.

## 1. Cluster (once)

Pick a unique name for every node. It is the node's hostname unless you set `node-name` in
`/etc/rancher/k3s/config.yaml` (see `k3s/config.yaml`). The name must equal the `name` of the matching `Host`
record, because servers are pinned with `kubernetes.io/hostname`.

On the control-plane node, copy `k3s/config.yaml` to `/etc/rancher/k3s/config.yaml`, then:

    curl -sfL https://get.k3s.io | sh -

On every other node, install the agent (token is in `/var/lib/rancher/k3s/server/node-token`):

    curl -sfL https://get.k3s.io | K3S_URL=https://CONTROL_PLANE_IP:6443 K3S_TOKEN=... sh -

On **every** node, copy `k3s/registries.yaml` to `/etc/rancher/k3s/registries.yaml` (fill in
`CONTROL_PLANE_IP`) and restart `k3s` / `k3s-agent`.

On **every** node, create the directory that servers may keep data in, and one for the service's database:

    sudo install -d -m755 /srv/servers /srv/servers/db

Open `6443/tcp` (API), `10250/tcp` (kubelet) and `8472/udp` (flannel) between the nodes, if they have a firewall.
Check that `kubectl get nodes` lists every node as Ready.

## 2. Policy and registry

Servers may only bind mount from the `allowedHostPaths` in `20-admission-policy.yaml`, which is `/srv/servers` unless
you change it. If you use another directory, change it there and everywhere `/srv/servers` appears in this file. Then:

    kubectl apply -f deploy/

Servers can no longer bind mount anything outside that list. `40-registry.yaml` starts a plain http registry
on the control-plane node, at `CONTROL_PLANE_IP:5000`.

## 3. Start the service

The service describes itself with a `Server` record in its own database, which is how it updates itself.
That record has to exist before the service does, so create it first with a script. The first image also has to be
built by hand, because the cluster cannot build it until the service is running.

1.  On the node that will run the service, from a checkout of this repo (`npm install` and `npx prisma generate` done),
    write an env file with the service's environment (see [Deployment](../README.md#how-to-get-this-running-deployment);
    this is what the pod will see, so the database is the mounted one):

        DATABASE_URL=file:./db/dev.db
        PORT=3000
        HOST=https://where.the.service.is.reached
        REGISTRY=CONTROL_PLANE_IP:5000
        REGISTRY_INSECURE=true
        ISSUER=https://TENANT.auth0.com/
        AUDIENCE=...
        TOKEN_SIGNING_ALG=RS256
        WEBSITE_DOMAIN=...
        AUTH0_MGMT_CLIENT_ID=...
        AUTH0_MGMT_CLIENT_SECRET=...

2.  Create the database and the record. The script prints the new server's id.

        export DATABASE_URL=file:/srv/servers/db/dev.db
        npx prisma migrate deploy
        npx ts-node --files prisma/scripts/createSelfServer.ts NODE_NAME /srv/servers/db ENV_FILE

    `NODE_NAME` is the node that runs the service. It also creates the `Host` record with that name.
    If you ran this somewhere else, copy the `db` directory to the same path on that node.

3.  Build the first image from `docker/deployment` (the same files that are now stored on the record) and push it.
    Use docker or podman; `CONTROL_PLANE_IP:5000` is plain http, so tell your tool to allow that
    (`insecure-registries` in docker's `daemon.json`, `--tls-verify=false` for podman):

        docker build -t CONTROL_PLANE_IP:5000/server-SERVER_ID:latest docker/deployment
        docker push CONTROL_PLANE_IP:5000/server-SERVER_ID:latest

4.  Start it. The secret holds the env file for the first start only:

        kubectl -n server-manager-workloads create secret generic server-manager-bootstrap-env \
          --from-env-file=ENV_FILE --from-literal=SELF_SERVER_ID=SERVER_ID
        SERVER_ID=... NODE_NAME=... DB_DIR=/srv/servers/db IMAGE=CONTROL_PLANE_IP:5000/server-SERVER_ID:latest \
          envsubst < deploy/bootstrap/service.yaml | kubectl apply -f -

5.  Update the service through its API once (`POST /hosts/{hostId}/servers/{serverId}/update`). That rebuilds the image
    in the cluster and replaces this Deployment with one made from the record, which holds the environment itself.
    Then delete the secret: `kubectl -n server-manager-workloads delete secret server-manager-bootstrap-env`.

Add the other nodes as `Host` records through the API, with the node's name as the `name`.

## 4. Verify (before moving real servers)

Run these once on a new cluster:

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
- The registry is plain http on the LAN. Put it behind TLS if the nodes are not on a trusted network.
- Ports are published with hostPort on the node the pod runs on, like `docker run -p`. A port a host service already
  listens on (22, 6443, 10250, ...) cannot be used by a server.
- Servers cannot reach each other unless a NetworkPolicy allows it: see `examples/server-link.yaml`.
- On NixOS, k3s is enabled with a module instead of the install script. A worked example is in the author's
  [Nix repo](https://github.com/Zane-T-Rice/Nix) (`server/nixos/k3s.nix`).
