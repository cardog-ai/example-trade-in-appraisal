# Larkspur trade-in appraisal: one container, SQLite and photos on a mounted volume.
#   docker build -t larkspur .
#   docker run -p 3022:3022 -v larkspur-data:/app/data \
#     -e CARDOG_API_KEY=... -e BETTER_AUTH_SECRET=... -e BETTER_AUTH_URL=https://your.host larkspur
FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable
COPY --from=build /app ./
VOLUME /app/data
EXPOSE 3022
CMD ["pnpm", "start"]
