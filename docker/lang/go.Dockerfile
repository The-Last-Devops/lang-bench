FROM debian:trixie-slim
ARG TARGETARCH
ARG GO_VERSION=1.27.0
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
      curl ca-certificates xz-utils procps time \
    && rm -rf /var/lib/apt/lists/*
RUN set -eux; \
    curl -fsSL "https://go.dev/dl/go${GO_VERSION}.linux-${TARGETARCH}.tar.gz" | tar -C /usr/local -xz; \
    /usr/local/go/bin/go version
ENV PATH=/usr/local/go/bin:$PATH
ENV GOFLAGS=-buildvcs=false
# Node là runtime của agent. Nó không lẫn vào phép đo: agent chỉ spawn tiến trình con rồi
# chờ, còn đồng hồ bấm quanh chính tiến trình con đó.
# Node is the agent runtime. It does not enter the measurement: the agent spawns the child
# and waits, and the clock is around that child.
ARG NODE_VERSION=22.16.0
RUN set -eux; \
    case "$TARGETARCH" in arm64) na=arm64 ;; amd64) na=x64 ;; *) echo "arch?" && exit 1 ;; esac; \
    mkdir -p /opt/node; \
    curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${na}.tar.xz" \
      | tar -C /opt/node --strip-components=1 -xJ; \
    /opt/node/bin/node --version
ENV PATH=/opt/node/bin:$PATH
ENV LB_KIND=go
WORKDIR /bench
EXPOSE 8100
CMD ["node", "runner/agent/main.mjs"]
