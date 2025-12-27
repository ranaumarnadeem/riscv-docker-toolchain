# --- Stage 1: The Builder ---
# We use this stage to compile the toolchain from source.
FROM ubuntu:22.04 AS builder

ENV DEBIAN_FRONTEND=noninteractive

# 1. Install dependencies required to build the toolchain
RUN apt-get update && apt-get install -y \
    autoconf automake autotools-dev curl python3 python3-pip \
    libmpc-dev libmpfr-dev libgmp-dev gawk build-essential \
    bison flex texinfo gperf libtool patchutils bc zlib1g-dev \
    libexpat-dev git \
    && rm -rf /var/lib/apt/lists/*

# 2. Clone the RISC-V GNU Toolchain
WORKDIR /opt
# We clone with depth 1 to save download time
RUN git clone --depth 1 https://github.com/riscv-collab/riscv-gnu-toolchain

# 3. Configure and Build (Universal / Multilib)
WORKDIR /opt/riscv-gnu-toolchain

# CRITICAL FLAG: --enable-multilib
# This tells the builder to create libraries for ALL architectures (rv32i, rv32imf, rv64, etc.)
# This ensures you never have to rebuild this container again.
RUN ./configure --prefix=/opt/riscv --enable-multilib

# Build newlib (default for bare-metal/embedded)
# Warning: This step takes 30-60 minutes depending on your CPU.
RUN make -j$(nproc)

# --- Stage 2: The Final Image ---
# We copy only the compiled binaries to a fresh, small image.
FROM ubuntu:22.04

# Install Make and CMake so you can run build scripts
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y make cmake ninja-build && rm -rf /var/lib/apt/lists/*

# Copy the compiled toolchain from the builder stage
COPY --from=builder /opt/riscv /opt/riscv

# Add the toolchain to the system PATH
ENV PATH="/opt/riscv/bin:${PATH}"

# specific directory where your code will live
WORKDIR /workspace

# Verify installation by printing version
RUN riscv64-unknown-elf-gcc --version