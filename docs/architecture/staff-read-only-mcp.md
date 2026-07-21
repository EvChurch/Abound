# Staff Read-Only MCP

Abound exposes a staff-only MCP endpoint at `/mcp`. It lets external AI clients use OAuth bearer tokens to query the same bounded read models that staff already use inside the app.

## Authentication

The MCP endpoint is an OAuth protected resource. Requests must include `Authorization: Bearer <access-token>`.

Token validation checks the configured Auth0 issuer and JWKS, and requires the access token audience to match the MCP resource. After token validation, Abound resolves the token subject against the local `AppUser` table. Only active local app users can access MCP tools. Auth0 login alone is not authorization.

For AI clients where Auth0 OAuth is not a good fit, Abound also supports personal MCP bearer tokens. Personal tokens are created by an active staff user from the MCP tools page, are stored only as SHA-256 hashes, are scoped to `abound:staff:read`, and can be revoked by the same user. Personal token authentication still resolves to an active local `AppUser`; revoking or deactivating that user removes MCP access.

Unauthorized callers receive `401` with a `WWW-Authenticate` challenge that points to `/.well-known/oauth-protected-resource`. Authenticated users without active local app access receive `403`.

Codex can use the personal token path without dynamic client registration:

```bash
export ABOUND_MCP_TOKEN="abound_mcp_..."
codex mcp add abound --url https://abound.ev.church/mcp --bearer-token-env-var ABOUND_MCP_TOKEN
```

## Configuration

Set these environment variables in deployment:

- `MCP_PUBLIC_BASE_URL`: public app origin hosting `/mcp`.
- `MCP_RESOURCE`: canonical resource identifier for the MCP endpoint. Defaults to `MCP_PUBLIC_BASE_URL + /mcp`.
- `MCP_AUDIENCE`: Auth0 API audience expected in access tokens. Defaults to `MCP_RESOURCE`.
- `MCP_AUTH0_ISSUER`: Auth0 issuer URL. Defaults to `AUTH0_DOMAIN`.
- `MCP_AUTHORIZATION_SERVER`: value advertised in protected resource metadata. Defaults to `MCP_AUTH0_ISSUER`.
- `MCP_AUTH0_JWKS_URI`: JWKS URL. Defaults to `MCP_AUTH0_ISSUER + /.well-known/jwks.json`.

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
