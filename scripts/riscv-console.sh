#!/bin/bash
set -e
# Wrapper script to enter the RISC-V Docker container with an interactive shell

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

IMAGE_NAME="riscv-toolchain:multilib"

# Check if the image exists
if ! docker image inspect "$IMAGE_NAME" >/dev/null 2>&1; then
    echo "Error: Docker image '$IMAGE_NAME' not found."
    echo "Please build the image first using: docker build -t $IMAGE_NAME ."
    exit 1
fi

# Run the container with an interactive shell
echo "Starting RISC-V toolchain container..."
docker run --rm -it \
    -v "$PROJECT_ROOT:/workspace" \
    -w /workspace \
    "$IMAGE_NAME" \
    /bin/bash
