FROM node:24-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
COPY scripts ./scripts
RUN npm run build

FROM node:24-alpine AS runtime

ENV NODE_ENV=production \
    INTERNAL_FILE_STORAGE_ROOT=/app/storage
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY migrations ./migrations
RUN mkdir -p /app/storage && chown node:node /app/storage
USER node
VOLUME ["/app/storage"]
EXPOSE 4000
CMD ["node", "dist/src/server.js"]
