FROM debian:trixie-slim
ARG TARGETARCH
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
      php-cli php-opcache curl ca-certificates xz-utils procps time \
    && rm -rf /var/lib/apt/lists/*

# JIT của PHP phải bật, không thì đây là phép đo trình thông dịch chứ không phải PHP như
# người ta chạy thật. Kiểm ngay trong lúc build: sai là image không dựng được.
# PHP's JIT must be on, or this measures the interpreter rather than PHP as it actually runs.
# Verified during the build: if it is off, the image does not exist.
RUN set -eux; \
    dir="$(php -i | sed -n 's/^Scan this dir for additional .ini files => //p')"; \
    printf 'opcache.enable=1\nopcache.enable_cli=1\nopcache.jit=tracing\nopcache.jit_buffer_size=128M\nmemory_limit=-1\n' \
      > "$dir/99-lang-bench.ini"; \
    php -r 'exit(function_exists("opcache_get_status") && opcache_get_status(false)["jit"]["enabled"] ? 0 : 1);'

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
ENV LB_KIND=php
WORKDIR /bench
EXPOSE 8100
CMD ["node", "runner/agent/main.mjs"]
