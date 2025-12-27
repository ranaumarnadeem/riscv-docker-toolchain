#!/bin/bash
# Wrapper script to run 'make' inside the RISC-V Docker container

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

IMAGE_NAME="riscv-toolchain:multilib"

# Check if the image exists
if ! docker image inspect "$IMAGE_NAME" >/dev/null 2>&1; then
    echo "Error: Docker image '$IMAGE_NAME' not found."
    echo "Please build the image first using: docker build -t $IMAGE_NAME ."
    exit 1
fi

# Run make inside the container
echo "Running 'make' in RISC-V toolchain container..."
docker run --rm \
    -v "$PROJECT_ROOT:/workspace" \
    -w /workspace \
    "$IMAGE_NAME" \
    make "$@"
