# Staff Read-Only MCP

Abound exposes a staff-only MCP endpoint at `/mcp`. It lets external AI clients use personal bearer tokens to query the same bounded read models that staff already use inside the app.

## Authentication

The MCP endpoint is a token-protected resource. Requests must include `Authorization: Bearer <personal-mcp-token>`.

Personal tokens are created by an active staff user from the MCP tools page, are stored only as SHA-256 hashes, are scoped to `abound:staff:read`, and can be revoked by the same user. Personal token authentication still resolves to an active local `AppUser`; revoking or deactivating that user removes MCP access.

Unauthorized callers receive `401`. Valid personal tokens for inactive or removed local users receive `401` because the token is no longer valid for MCP access.

Codex can store the personal token as an HTTP authorization header in `~/.codex/config.toml`:

```toml
[mcp_servers.abound]
url = "https://abound.ev.church/mcp"

[mcp_servers.abound.http_headers]
Authorization = "Bearer abound_mcp_..."
```

## Configuration

Set these environment variables in deployment:

- `MCP_PUBLIC_BASE_URL`: public app origin hosting `/mcp`.
- `MCP_RESOURCE`: canonical resource identifier for the MCP endpoint. Defaults to `MCP_PUBLIC_BASE_URL + /mcp`.

Localhost `http://` URLs are allowed for development. Non-localhost MCP URLs must use `https://`.

## Tool Surface

The v1 tool registry is read-only:

- `get_staff_context`
- `get_sync_status`
- `list_saved_segments`
- `get_filter_catalog`
- `query_people`
- `query_households`
- `get_person_profile`
- `get_household_profile`

These tools reuse existing Abound services for profiles, list views, saved segments, filter catalogs, and sync freshness. They do not query live Rock directly.

## Safety Boundaries

The MCP does not expose raw SQL, raw Prisma, raw GraphQL passthrough, payment instruments, OAuth tokens, provider payloads, donor self-service access, or write-capable tools.

The endpoint intentionally follows the current staff access model: any active local `AppUser` has the full read-only MCP surface. If the product reintroduces scoped staff permissions later, MCP authorization should be updated at the same boundary.

## Audit Trail

Every MCP tool invocation attempts to create an `McpAuditEvent`. Audit records store the local app user id, tool name, success/failure status, safe error code, optional target Rock id, result count, request id, and timestamp.

Audit records do not store prompts, bearer tokens, donor payloads, result bodies, emails, or raw filters. Audit write failures are swallowed so they do not turn successful read-only tool calls into user-facing outages.
