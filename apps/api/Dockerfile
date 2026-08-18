FROM node:20-alpine AS base
WORKDIR /repo
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm build:contracts
RUN pnpm --filter @eventful/api prisma:generate
RUN pnpm --filter @eventful/api build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /repo /repo
EXPOSE 3333
CMD ["sh", "-c", "pnpm --filter @eventful/api prisma:deploy && node apps/api/dist/src/main.js"]
