FROM oven/bun:1.3.14 AS builder

WORKDIR /app

COPY package.json bun.lock turbo.json tsconfig.json tsconfig.base.json ./
COPY apps/nova-web/package.json apps/nova-web/
COPY apps/nova-socket/package.json apps/nova-socket/
COPY apps/nova-socket/build.ts apps/nova-socket/
COPY packages/db/package.json packages/db/
COPY packages/env/package.json packages/env/
COPY packages/lib/package.json packages/lib/
COPY packages/print/package.json packages/print/

RUN bun install --frozen-lockfile

COPY apps apps
COPY packages packages

ENV SKIP_VALIDATION=true
ENV NODE_ENV=production

RUN bunx turbo run build --filter=@novastatus/web --filter=@novastatus/socket --only

FROM oven/bun:1.3.14-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY --from=builder /app/apps/nova-web/.next/standalone ./
COPY --from=builder /app/apps/nova-web/.next/static ./apps/nova-web/.next/static
COPY --from=builder /app/apps/nova-web/public ./apps/nova-web/public
COPY --from=builder /app/apps/nova-socket/out ./apps/nova-socket/out
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages

COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/entrypoint.sh"]
