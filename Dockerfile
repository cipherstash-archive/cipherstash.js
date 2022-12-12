# Build the container with:
#
#   docker build -t cipherstash-js .
#
# Start a bash shell in the container with:
#
#   docker run --mount src=$(pwd),target=/home/cipherstash/build,type=bind -it cipherstash-js bash
#
# From within you can:
#
#   cd build
#   ./build.sh build # or test # etc

# This will install a base image specific to the host architecture.
FROM ubuntu:latest

# This will force non-interactive apt package installs, choosing sensible
# default options
ARG DEBIAN_FRONTEND=noninteractive

# Add package source for NodeJS 14.X
RUN apt update
RUN apt -y install curl
RUN curl -sL https://deb.nodesource.com/setup_14.x | bash -

RUN apt update
RUN apt -y install git build-essential vim \
    protobuf-compiler libreadline-dev zlib1g-dev libssl-dev \
    uuid-dev unzip postgresql postgresql-contrib nodejs \
    shellcheck shfmt libssl-dev pkg-config

RUN sudo; \
    useradd --create-home --shell /bin/bash cipherstash; \
    /bin/bash -c 'echo "cipherstash:password" | chpasswd'; \
    adduser cipherstash sudo

USER cipherstash
WORKDIR /home/cipherstash

# Install Rust
RUN curl --proto '=https' --tlsv1.3 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/home/cipherstash/.cargo/bin:${PATH}"
RUN rustup default nightly

# Make it so that "npm install -g foo" writes into a location where the
# cipherstash user has write permissions
RUN mkdir -p /home/cipherstash/.local/bin
ENV PATH="${PATH}:/home/cipherstash/.local/bin"
RUN npm config set prefix '/home/cipherstash/.local/'

# Install pnpm
ENV PNPM_HOME="/home/cipherstash/.local/share/pnpm"
ENV PATH="${PATH}:${PNPM_HOME}"
RUN npm install --global pnpm
# When running pnpm in the docker container we need to ensure its store is
# local to the container (and not shared with the store on the host).  This is
# because the store uses hard links and hard links do not work across mounts.
RUN pnpm config set store-dir /home/cipherstash/.pnpm-store
