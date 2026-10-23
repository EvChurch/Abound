# Controlled security build

The live Node and application CA fixes do not cover the managed Railpack bootstrap trust store. Build web and worker from the pinned official patched Node 22.23.4 image. Filter both distrusted OS roots before the first apt/npm network operation, refresh CA packages, and retain a managed hashed CA directory. Install the existing frozen pnpm lockfile and build the existing Next application and all worker artifacts.

Use a build-context allowlist; exclude credentials, local outputs and caches. Keep dummy static-build configuration only in RUN assignments. Preserve both service start commands, migration behavior, replica/network options and application code. No live sync, giving, communication or payment operation is part of this change.

Validation: required formatting, lint, typecheck, existing tests, compiled-worker supervision fixtures and production build. Hosted CI builds the actual Docker image; verifies Node/OpenSSL/installed pnpm bad-chain rejection and good controls; boots the real anonymous HTTP access guard, auth-error UI/static asset; and runs existing auth, sync and reporting fixtures with a fresh loopback-only PostgreSQL 18 database. Database tests use a distinct TEST_DATABASE_URL ending in _test, never a live database. The hosted database container is disposable. No real Auth0 login, Rock or messaging request is made.

Release via PR/main CI and the existing GitHub-connected Railway flow. Verify each current image, mapped serving/worker process, OS/client TLS and health/access behavior before audit closure. Rollback to an older managed image would reopen its build-trust finding.
