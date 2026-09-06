# Ảnh Node dùng cho CẢ agent lẫn bài test — phiên bản truyền qua NODE_VERSION, nên thêm
# một phiên bản nữa chỉ là thêm một service trong compose.
# The Node image runs BOTH the agent and the benchmarks; the version comes from
# NODE_VERSION, so adding another version is just another compose service.
FROM debian:trixie-slim
ARG TARGETARCH
ARG NODE_VERSION=22.16.0
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
      curl ca-certificates xz-utils procps time libatomic1 \
    && rm -rf /var/lib/apt/lists/*
RUN set -eux; \
    case "$TARGETARCH" in arm64) na=arm64 ;; amd64) na=x64 ;; *) echo "arch?" && exit 1 ;; esac; \
    curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${na}.tar.xz" \
      | tar -C /usr/local --strip-components=1 -xJ; \
    node --version
ENV LB_KIND=node
WORKDIR /bench
EXPOSE 8100
CMD ["node", "runner/agent/main.mjs"]
