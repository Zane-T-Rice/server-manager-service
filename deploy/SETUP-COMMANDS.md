# k3s setup commands, with what each one does

Two NixOS desktops, both named `nixos`, so the k3s node names are set explicitly:

| Machine   | LAN         | WireGuard  | k3s role               | k3s node name | Nix repo dir          |
| --------- | ----------- | ---------- | ---------------------- | ------------- | --------------------- |
| desktop 1 | 192.168.1.3 | 10.20.10.4 | server (control plane) | `server`      | `~/Nix/server/nixos`  |
| desktop 2 | 192.168.1.4 | 10.20.10.5 | agent                  | `server2`     | `~/Nix/server2/nixos` |

The proxy (10.20.10.1) reaches the service over WireGuard. Cluster traffic stays on the LAN
(`--node-ip`), so WireGuard is not involved in k3s. Each `Host` record's `name` must equal its node name.

NixOS is declarative, so the k3s install script is not used. k3s is enabled in a module instead,
and `nixos-rebuild` makes the machine match it.

## Already done (no effect on the running systems)

1.  Wrote `k3s.nix` next to each machine's `configuration.nix` and added it to `imports`:

        ~/Nix/server/nixos/k3s.nix    # on 192.168.1.3 (role = "server")
        ~/Nix/server2/nixos/k3s.nix   # on 192.168.1.4 (role = "agent")

    Review with `cd ~/Nix && git status && git diff`. Nothing is committed or pushed in that repo.

2.  Built both new configurations without activating them. `build` only fills the nix store:

```sh
sudo nixos-rebuild build
```

3.  Asked what activation would change:

        sudo nixos-rebuild dry-activate

    Result on both: reload `dbus-broker` and `firewall`, restart `polkit`, plus start `k3s` (new).
    Docker and the running containers (game server, Jellyfin, postfix, remarkable-sync) are not touched.

## Done with your go-ahead (these changed the live machines)

4.  Create the join token on 192.168.1.3. It lives outside the nix store, which anyone can read:

```sh
sudo install -d -m700 /var/lib/rancher/k3s
openssl rand -hex 32 | sudo install -m600 /dev/stdin /var/lib/rancher/k3s/shared-token
```

5.  Copy the same token to 192.168.1.4 (piped machine to machine, so it is never printed):

```sh
ssh 192.168.1.3 'sudo cat /var/lib/rancher/k3s/shared-token' \
 | ssh 192.168.1.4 'sudo install -d -m700 /var/lib/rancher/k3s && sudo install -m600 /dev/stdin /var/lib/rancher/k3s/shared-token'
```

6.  Activate on the control plane first, then wait for it to answer:

```sh
sudo nixos-rebuild switch # on 192.168.1.3
sudo k3s kubectl get nodes # `server` should become Ready
```

7.  Activate on the second desktop and check that it joined:

```sh
sudo nixos-rebuild switch # on 192.168.1.4
sudo k3s kubectl get nodes # `server` and `server2`, both Ready
```

8.  Apply the manifests from this repo (on 192.168.1.3, after copying `deploy/` there). Edit
    `allowedHostPaths` in `20-admission-policy.yaml` first:

        sudo k3s kubectl apply -f deploy/
        sudo k3s kubectl get pods -A

9.  Run the policy checks from `deploy/README.md` section 4. The two test pods must be denied.

## Results of the live test

- Both nodes joined and are Ready (`server` = 192.168.1.3 control plane, `server2` = 192.168.1.4 agent).
  All existing docker containers kept running through both switches.
- The admission policy denied a privileged pod, an added capability, hostNetwork, `hostPath: /`,
  `docker.sock` and a path-prefix trick, and accepted a pod mounting a path under `allowedHostPaths`.
- Used the service's own restricted service account (not cluster-admin): it could manage workloads and was
  refused (403) on cluster-wide resources.
- A test server went through the real code path: kaniko built the image on one node and pushed it to the
  registry, the pod ran on the pinned node, answered on its NodePort (LAN and WireGuard address), wrote to a
  bind-mounted host directory, and was removed cleanly by the stop path. The test directory was removed afterwards.

## Things learned

- `/home/zane/mount/NFS` is NFSv4 with root squash. Container root becomes `nobody`, so a mounted directory
  must be writable by `nobody` (your existing ones are owned by it). Docker behaves the same way.
- Services use `externalTrafficPolicy: Local`. Without it, a request arriving at the _other_ node was
  rejected by the network policy (the hop rewrites the source to a pod-network address). With it, a server
  answers on the node it runs on, like docker, and sees real player addresses.

## Servers on Kubernetes

Everything that ran in docker now runs as a pod. The docker containers are stopped (restart disabled, not deleted) so
each can be started again with `docker update --restart=always NAME && docker start NAME` after removing its Deployment:

| Server                               | Node     | Ports      | Reached by other servers as |
| ------------------------------------ | -------- | ---------- | --------------------------- |
| `salty`                              | server-1 | none       | n/a                         |
| `jellyfin`                           | server-2 | 8096       | `jellyfin`                  |
| `postfix`                            | server-2 | 25         | `postfix`                   |
| `remarkable-sync`                    | server-2 | 3000, 8883 | `remarkable-sync`           |
| service instance for host `server-1` | server-1 | 3000       | n/a                         |
| service instance for host `server-2` | server-2 | 3001       | n/a                         |

There are still two service instances, one per host record, so the existing URLs (`.../1` and `.../2`) keep reaching
the same machines. Each manages the whole cluster; neither holds the docker socket.

```sh
# Roll one back (example: jellyfin on 192.168.1.4)
ssh 192.168.1.3 "sudo k3s kubectl -n server-manager-workloads delete deploy,svc -l server-manager/server-id=d3ac5159-2a98-4f05-ab61-66f797927653"
ssh 192.168.1.4 "docker update --restart=always jellyfin && docker start jellyfin"
```

## Database changes made

Backup: `dev.db.bak-before-k8s-migration` next to `dev.db`.

- `postfix`: `SMTP_NETWORKS` now also trusts `10.42.0.0/16` (the pod network), so mail from `remarkable-sync` is relayed.
- Both service records: removed the `/var/run/docker.sock` volume and added `ORCHESTRATOR`, `REGISTRY`, `REGISTRY_INSECURE`
  and `SELF_SERVER_ID`. Their stored Dockerfile still installs the docker CLI, which is unused and can be dropped.

## Problems met while migrating

- The build job copied ConfigMap symlinks instead of files, so `COPY ./script.sh` produced an image without it. Fixed
  with an init container that copies real files.
- Renaming the k3s nodes left flannel without VXLAN forwarding entries, so pods on `server-1` could not reach CoreDNS on
  `server-2`. `sudo systemctl restart k3s` on both nodes rebuilt them. If DNS inside pods ever times out after a
  node change, check `bridge fdb show | grep flannel` first.
- NodePorts are allocated across the whole cluster, so the service on one host and `remarkable-sync` on another could not
  both use port 3000. Servers now publish with `hostPort`, on the node they run on, like `docker run -p`.
- `/home/zane/mount/NFS` is NFSv4 with root squash. Container root becomes `nobody`, so a mounted directory must be
  writable by `nobody` (your existing ones are owned by it). Docker behaves the same way.
- Node names are `server-1` and `server-2`, matching the `Host` records in the database.
- Servers cannot reach each other unless `deploy/35-server-links.yaml` allows it. `remarkable-sync` to `postfix:25` is the only link.

## Still to do

- Game servers (valheim, palworld, ...) are not running. Start them through the service and check that each mount is under
  `allowedHostPaths` (`/home/zane/valheim`, `/home/zane/palworld`, ... are not yet).
- The service's stored Dockerfile can drop `docker` from its `apk add` line.

## Undo

Each step is reversible. `sudo nixos-rebuild switch --rollback` returns to the previous generation,
which stops k3s. `sudo rm -rf /var/lib/rancher/k3s` removes the cluster state and token afterwards.
Existing docker containers keep their ports the whole time.
