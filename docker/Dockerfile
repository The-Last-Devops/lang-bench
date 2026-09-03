# lang-bench — một image chứa cả 5 bộ công cụ, phiên bản ghim cứng.
# lang-bench — one image with all five toolchains, versions pinned.
FROM debian:trixie-slim

ARG TARGETARCH
ARG GO_VERSION=1.27.0
ARG NODE_VERSION=22.16.0
ARG RUST_VERSION=1.96.0
ARG JDK_VERSION=25

ENV DEBIAN_FRONTEND=noninteractive

# g++ và PHP lấy từ Debian; Go / Node / Rust ghim phiên bản chính xác.
# g++ and PHP come from Debian; Go / Node / Rust are pinned exactly.
RUN apt-get update && apt-get install -y --no-install-recommends \
      g++ make pkg-config libssl-dev \
      php-cli php-opcache \
      python3 python3-dev \
      ruby ruby-dev \
      openjdk-${JDK_VERSION}-jdk-headless \
      ca-certificates curl xz-utils \
      procps time \
    && rm -rf /var/lib/apt/lists/*

# JIT của PHP phải bật, không thì so sánh không công bằng.
# PHP's JIT must be on, otherwise the comparison is not fair.
RUN set -eux; \
    dir="$(php -i | sed -n 's/^Scan this dir for additional .ini files => //p')"; \
    printf 'opcache.enable=1\nopcache.enable_cli=1\nopcache.jit=tracing\nopcache.jit_buffer_size=128M\nmemory_limit=6G\n' \
      > "$dir/99-lang-bench.ini"; \
    php -r 'exit(function_exists("opcache_get_status") && opcache_get_status(false)["jit"]["enabled"] ? 0 : 1);'

RUN set -eux; \
    curl -fsSL "https://go.dev/dl/go${GO_VERSION}.linux-${TARGETARCH}.tar.gz" | tar -C /usr/local -xz; \
    /usr/local/go/bin/go version
ENV PATH=/usr/local/go/bin:$PATH
ENV GOFLAGS=-buildvcs=false

RUN set -eux; \
    case "$TARGETARCH" in arm64) na=arm64 ;; amd64) na=x64 ;; *) echo "arch?" && exit 1 ;; esac; \
    curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${na}.tar.xz" \
      | tar -C /usr/local --strip-components=1 -xJ; \
    node --version

RUN set -eux; \
    curl --proto '=https' --tlsv1.2 -fsSL https://sh.rustup.rs \
      | sh -s -- -y --default-toolchain "${RUST_VERSION}" --profile minimal --no-modify-path; \
    /root/.cargo/bin/rustc --version
ENV PATH=/root/.cargo/bin:$PATH
ENV CARGO_TARGET_DIR=/tmp/cargo-target

# Xác nhận đủ 8 bộ công cụ trước khi image được coi là dựng xong.
# Confirm all eight toolchains before the image counts as built.
RUN set -eux; \
    c++ --version | head -1; \
    rustc --version; \
    go version; \
    javac -version; \
    node --version; \
    php --version | head -1; \
    python3 --version; \
    ruby --version

WORKDIR /bench
EXPOSE 8080

# Mặc định: chạy toàn bộ benchmark rồi bật web xem kết quả.
# Default: run the whole suite, then serve the dashboard.
CMD ["node", "runner/run.mjs", "--serve"]
