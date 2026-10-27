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

## Not done yet: needs your go-ahead (it changes the live machines)

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

## Undo

Each step is reversible. `sudo nixos-rebuild switch --rollback` returns to the previous generation,
which stops k3s. `sudo rm -rf /var/lib/rancher/k3s` removes the cluster state and token afterwards.
Existing docker containers keep their ports the whole time.
