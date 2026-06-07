# Dev Container SSH Access

The devcontainer runs `sshd` so you can SSH into the running app container from
the host machine. Authentication uses public SSH keys published on your GitHub
account; private keys are never copied, mounted, or baked into the image.

## First-time setup

Open a shell inside the devcontainer and authenticate GitHub CLI:

```bash
gh auth login
```

The container startup runs `sync-github-authorized-keys`. If `gh` is not
authenticated yet, startup still succeeds and prints a message telling you to
run `gh auth login`.

## Connecting from the host

SSH is bound to host loopback only:

```bash
ssh -p 2290 vscode@127.0.0.1
```

For a non-interactive smoke test:

```bash
ssh -p 2290 vscode@127.0.0.1 true
```

## Managing keys

Manage allowed public keys in your GitHub account SSH key settings. The sync
helper discovers the authenticated GitHub user with `gh`, fetches public keys
from `https://github.com/<user>.keys`, and writes them into a clearly marked
managed block in `/home/vscode/.ssh/authorized_keys`.

Manual `authorized_keys` entries outside that managed block are preserved.

After changing GitHub SSH keys, refresh the container keys by running:

```bash
sync-github-authorized-keys
```

Alternatively, restart the devcontainer app service.

## Persistence and security

Docker named volumes persist GitHub CLI config at `/home/vscode/.config/gh` and
SSH state at `/home/vscode/.ssh`.

SSH security settings are intentionally restrictive:

- password authentication is disabled
- keyboard-interactive authentication is disabled
- root login is disabled
- only the `vscode` user is allowed
- the host port is bound to `127.0.0.1:2290`, not a public interface
