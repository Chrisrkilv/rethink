# The Supervisor's build context is only this folder, so the source is cloned
# rather than copied. Pinned to a commit so a rebuild gives the same image.
ARG RETHINK_REPO=https://github.com/Chrisrkilv/rethink
ARG RETHINK_REF=169b7858a55e02329f42e3fd4b9b7350d3a3f443

# Build stage
FROM alpine:3.20 AS build
ARG RETHINK_REPO
ARG RETHINK_REF
WORKDIR /app

RUN apk add --no-cache nodejs npm git

RUN git clone "$RETHINK_REPO" . && git checkout --detach "$RETHINK_REF"
RUN npm ci --ignore-scripts

RUN GIT_REVISION="$RETHINK_REF" npm run build && npm prune --omit=dev

# Production stage
FROM alpine:3.20 AS runtime
WORKDIR /app

RUN apk add --no-cache nodejs \
	&& addgroup -S app \
	&& adduser -S -G app app

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/config.jsonc /app/config.json

RUN mkdir -p /app/data

EXPOSE 443 8883 1884 46030 47878 44401
# In Home Assistant add-on mode the manifest sets RETHINK_HASSIO_OPTIONS, and the configuration
# comes from there rather than from a file - so neither seed nor pass one.
CMD ["sh", "-c", "if [ -n \"$RETHINK_HASSIO_OPTIONS\" ]; then exec node dist/rethink-cloud.js; fi; [ -f /app/data/config.json ] || cp /app/config.json /app/data/config.json; exec node dist/rethink-cloud.js /app/data/config.json"]
