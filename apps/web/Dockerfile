FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN npm ci
COPY packages/shared packages/shared
COPY apps/web apps/web
# Next.js compiles the /backend rewrite and NEXT_PUBLIC_* values into the build. Only public values belong here.
ARG API_URL
ARG NEXT_PUBLIC_APP_ENV=production
ARG NEXT_PUBLIC_APP_URL
RUN test -n "$API_URL" || (echo "Pass --build-arg API_URL=https://api.<domain>" && exit 1)
ENV API_URL=$API_URL \
    NEXT_PUBLIC_API_URL=$API_URL \
    NEXT_PUBLIC_APP_ENV=$NEXT_PUBLIC_APP_ENV \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
RUN npm run build --workspace=@estateflow/shared \
  && npm run build --workspace=@estateflow/web

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN apk add --no-cache wget \
  && addgroup -S estateflow && adduser -S estateflow -G estateflow
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public
USER estateflow
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
