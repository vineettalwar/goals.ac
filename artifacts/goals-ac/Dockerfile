FROM node:20-alpine

RUN npm install -g pnpm@9

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY tsconfig.json ./

COPY lib/ ./lib/
COPY artifacts/goals-ac/ ./artifacts/goals-ac/

RUN pnpm install

CMD ["pnpm", "--filter", "@workspace/goals-ac", "run", "dev"]
