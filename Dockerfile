# Multilib RISC-V GNU Toolchain Dockerfile
# Supports rv32/rv64 with all standard extensions (i/m/a/f/d/c)

FROM ubuntu:22.04

# Avoid interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install build dependencies
RUN apt-get update && apt-get install -y \
    autoconf \
    automake \
    autotools-dev \
    curl \
    python3 \
    python3-pip \
    libmpc-dev \
    libmpfr-dev \
    libgmp-dev \
    gawk \
    build-essential \
    bison \
    flex \
    texinfo \
    gperf \
    libtool \
    patchutils \
    bc \
    zlib1g-dev \
    libexpat-dev \
    git \
    cmake \
    ninja-build \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /opt

# Clone the RISC-V GNU Toolchain repository
RUN git clone --recursive https://github.com/riscv/riscv-gnu-toolchain

# Build the toolchain with multilib support
WORKDIR /opt/riscv-gnu-toolchain
RUN ./configure --prefix=/opt/riscv --enable-multilib --with-cmodel=medany && \
    make -j$(nproc)

# Add the toolchain to PATH
ENV PATH="/opt/riscv/bin:${PATH}"

# Set the default working directory
WORKDIR /workspace

# Default command
CMD ["/bin/bash"]
