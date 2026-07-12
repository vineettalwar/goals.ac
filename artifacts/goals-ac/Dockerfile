ARG DEPENDENCY_PLATFORM=linux/amd64
FROM --platform=${DEPENDENCY_PLATFORM} node:20-bookworm-slim AS build

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY tsconfig.json tsconfig.base.json ./

COPY lib/ ./lib/
COPY artifacts/goals-ac/ ./artifacts/goals-ac/

RUN pnpm install --frozen-lockfile

RUN pnpm --filter @workspace/goals-ac run build

FROM nginx:1.27-alpine AS runtime

COPY artifacts/goals-ac/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/artifacts/goals-ac/dist/public /usr/share/nginx/html

EXPOSE 8080
