FROM debian:trixie-slim
ARG TARGETARCH
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
      fpc curl ca-certificates xz-utils procps time \
    && rm -rf /var/lib/apt/lists/*

# Node là runtime của agent, không lẫn vào phép đo.
# Node is the agent runtime and does not enter the measurement.
ARG NODE_VERSION=22.23.2
RUN set -eux; \
    case "$TARGETARCH" in arm64) na=arm64 ;; amd64) na=x64 ;; *) echo "arch?" && exit 1 ;; esac; \
    mkdir -p /opt/node; \
    curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${na}.tar.xz" \
      | tar -C /opt/node --strip-components=1 -xJ; \
    /opt/node/bin/node --version
ENV PATH=/opt/node/bin:$PATH
ENV LB_KIND=pascal
WORKDIR /bench
EXPOSE 8100
CMD ["node", "runner/agent/main.mjs"]
