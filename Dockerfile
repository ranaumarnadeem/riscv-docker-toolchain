# Use the lightweight Alpine Linux
FROM alpine:latest

# Install the complete Toolchain & Verification Utils
# 1. gcc-riscv-none-elf    : The Compiler
# 2. newlib-riscv-none-elf : The Standard C Library (libc)
# 3. binutils-riscv-none-elf: Includes 'objdump', 'ld', 'as', 'ar'
# 4. make                  : The Build System
# 5. build-base            : Standard Linux build tools (optional but recommended)
# 6. file                  : Utility to check file headers
RUN apk add --no-cache \
    gcc-riscv-none-elf \
    newlib-riscv-none-elf \
    binutils-riscv-none-elf \
    make \
    build-base \
    file

# Set the working directory to /src so you land there automatically
WORKDIR /src

# (Optional) Default command runs 'make' if you don't type anything else
CMD ["make"]