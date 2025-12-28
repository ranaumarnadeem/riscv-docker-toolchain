# Use the lightweight Alpine Linux
FROM alpine:latest

# Install the complete Toolchain & Verification Utils
# 1. gcc-riscv-none-elf    : The Compiler
# 2. newlib-riscv-none-elf : The Standard C Library (libc)
# 3. binutils-riscv-none-elf: Includes 'objdump', 'ld', 'as', 'ar'
# 4. make                  : The Build System
# 5. build-base            : Standard Linux build tools (optional but recommended)
# 6. file                  : Utility to check file headers
# 7. python3               : For the rv CLI wrapper
RUN apk add --no-cache \
    gcc-riscv-none-elf \
    newlib-riscv-none-elf \
    binutils-riscv-none-elf \
    make \
    build-base \
    file \
    python3

# Copy the rv CLI wrapper and make it executable
# Use sed to convert Windows CRLF to Unix LF line endings
COPY scripts/rv /usr/local/bin/rv
RUN sed -i 's/\r$//' /usr/local/bin/rv && chmod +x /usr/local/bin/rv

# Set the working directory to /src so you land there automatically
WORKDIR /src

# Default command shows rv help
CMD ["rv", "--help"]