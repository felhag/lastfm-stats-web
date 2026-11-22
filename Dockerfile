FROM node:24-alpine AS builder
ARG PROJECT=lastfm-stats
WORKDIR /app

ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable && corepack prepare pnpm@11.28.13 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY angular.json tsconfig.json tsconfig.app.json ./
COPY projects ./projects
RUN pnpm exec ng build --project "${PROJECT}" --configuration production

FROM node:24-alpine
ARG PROJECT=lastfm-stats
WORKDIR /app

COPY --from=builder /app/dist/${PROJECT}/browser ./public
COPY docker/server.mjs ./server.mjs

USER node
EXPOSE 4200

CMD ["node", "server.mjs"]
