FROM node:22-bookworm-slim

ENV NODE_ENV=production \
    PORT=8080 \
    OPENCLAW_STATE_DIR=/tmp/.openclaw \
    OPENCLAW_WORKSPACE_DIR=/tmp/workspace \
    GIT_SSL_CAINFO=/etc/ssl/certs/ca-certificates.crt \
    SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt

RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates git && \
    rm -rf /var/lib/apt/lists/*

RUN git config --global url."https://github.com/".insteadOf ssh://git@github.com/ && \
    git config --global --add url."https://github.com/".insteadOf git@github.com:

RUN npm install -g openclaw@latest

WORKDIR /app

COPY render-config.mjs /app/render-config.mjs
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 8080

ENTRYPOINT ["docker-entrypoint.sh"]
