FROM node:22.23.4-bookworm-slim@sha256:de170b39439eb0e5a3444ad7d60b015614a381e10fecae2e30ec9e735122f38d

WORKDIR /app
COPY scripts/update-security-ca.sh ./scripts/update-security-ca.sh
RUN sh scripts/update-security-ca.sh
ENV SSL_CERT_DIR=/usr/local/share/security-ca/certs
RUN npm install --global pnpm@10.34.6 --no-audit --no-fund
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile
COPY app ./app
COPY components ./components
COPY lib ./lib
COPY emails ./emails
COPY public ./public
COPY prisma ./prisma
COPY scripts ./scripts
COPY prisma.config.ts next.config.ts postcss.config.mjs tsconfig.json proxy.ts ./
# Static build only; synthetic Auth0 settings match existing CI. No DB connection.
RUN DATABASE_URL=postgresql://build:build@127.0.0.1:1/build \
    AUTH0_DOMAIN=example.us.auth0.com AUTH0_CLIENT_ID=ci-placeholder \
    AUTH0_CLIENT_SECRET=ci-placeholder \
    AUTH0_SECRET=0000000000000000000000000000000000000000000000000000000000000000 \
    APP_BASE_URL=http://localhost:3000 pnpm prisma:generate && \
    mkdir -p tmp && pnpm build:workers && \
    DATABASE_URL=postgresql://build:build@127.0.0.1:1/build \
    AUTH0_DOMAIN=example.us.auth0.com AUTH0_CLIENT_ID=ci-placeholder \
    AUTH0_CLIENT_SECRET=ci-placeholder \
    AUTH0_SECRET=0000000000000000000000000000000000000000000000000000000000000000 \
    APP_BASE_URL=http://localhost:3000 pnpm build

ENV NODE_ENV=production
# The worker retains its existing Railway start override.
CMD ["pnpm", "start"]
