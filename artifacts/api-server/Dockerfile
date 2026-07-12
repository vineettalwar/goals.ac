ARG DEPENDENCY_PLATFORM=linux/amd64
FROM --platform=${DEPENDENCY_PLATFORM} node:20-bookworm-slim AS build

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY tsconfig.json tsconfig.base.json ./

COPY lib/ ./lib/
COPY artifacts/api-server/ ./artifacts/api-server/

RUN pnpm install --frozen-lockfile

RUN pnpm --filter @workspace/api-server run build

FROM node:20-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app

RUN addgroup -S app && adduser -S app -G app

COPY --from=build --chown=app:app /app/artifacts/api-server/dist ./dist

USER app
EXPOSE 8080

CMD ["node", "--enable-source-maps", "./dist/index.mjs"]
