ARG DEPENDENCY_PLATFORM=linux/amd64
FROM --platform=${DEPENDENCY_PLATFORM} node:20-bookworm-slim AS build

RUN corepack enable
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY tsconfig.json tsconfig.base.json ./
COPY lib/ ./lib/
COPY artifacts/worker/ ./artifacts/worker/

RUN pnpm install --frozen-lockfile

FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

RUN addgroup -S app && adduser -S app -G app
RUN corepack enable

COPY --from=build --chown=app:app /app /app

USER app
WORKDIR /app/artifacts/worker

CMD ["pnpm", "run", "start"]
