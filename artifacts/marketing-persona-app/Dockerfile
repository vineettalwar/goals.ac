ARG DEPENDENCY_PLATFORM=linux/amd64
FROM --platform=${DEPENDENCY_PLATFORM} node:20-bookworm-slim AS build

RUN corepack enable
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY tsconfig.json tsconfig.base.json ./
COPY lib/ ./lib/
COPY artifacts/marketing-persona-app/ ./artifacts/marketing-persona-app/

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @workspace/marketing-persona-app run build

FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

RUN addgroup -S app && adduser -S app -G app

COPY --from=build --chown=app:app /app/artifacts/marketing-persona-app/.next/standalone ./
COPY --from=build --chown=app:app /app/artifacts/marketing-persona-app/.next/static ./artifacts/marketing-persona-app/.next/static
COPY --from=build --chown=app:app /app/artifacts/marketing-persona-app/public ./artifacts/marketing-persona-app/public

USER app
EXPOSE 3001
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

CMD ["node", "artifacts/marketing-persona-app/server.js"]
