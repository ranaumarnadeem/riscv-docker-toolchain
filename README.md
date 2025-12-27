# RISC-V Docker Toolchain

A portable, dockerized GNU Toolchain for RISC-V development. Supports Multilib (all extensions: rv32/rv64, i/m/a/f/d/c) out of the box. Designed for Indigenous Processors and reproducible builds on Windows/WSL & Linux.

## Features

- **Multilib Support**: Supports both RV32 and RV64 with all standard extensions (I/M/A/F/D/C)
- **Dockerized**: Consistent development environment across different platforms
- **Easy to Use**: Simple wrapper scripts for common operations
- **Portable**: Works on Linux, macOS, and Windows (via WSL)
- **Reproducible**: Consistent builds every time

## Directory Structure

```
root/
├── .github/               # GitHub configuration
├── scripts/               # Wrapper scripts
│   ├── riscv-console.sh  # Enter container with interactive shell
│   └── riscv-make.sh     # Run 'make' inside container
├── examples/              # Example programs
│   └── blink.c           # Simple LED blink example
├── Dockerfile             # Multilib toolchain image
├── LICENSE                # MIT License
└── README.md              # This file
```

## Getting Started

### Prerequisites

- Docker installed on your system
- Basic knowledge of RISC-V architecture

### Building the Docker Image

Build the RISC-V toolchain Docker image:

```bash
docker build -t riscv-toolchain:multilib .
```

**Note**: This build process can take 30-60 minutes depending on your system, as it compiles the entire RISC-V GNU toolchain from source.

### Using the Toolchain

#### Option 1: Interactive Shell

Enter the container with an interactive shell:

```bash
./scripts/riscv-console.sh
```

Inside the container, you can use all RISC-V toolchain commands:

```bash
riscv64-unknown-elf-gcc --version
riscv32-unknown-elf-gcc --version
```

#### Option 2: Run Make

Execute `make` inside the container:

```bash
./scripts/riscv-make.sh
```

This will run `make` in your project directory using the RISC-V toolchain.

### Example: Compiling the Blink Program

Compile the example blink.c for RV32:

```bash
./scripts/riscv-console.sh
# Inside the container:
cd examples
riscv32-unknown-elf-gcc -march=rv32imac -mabi=ilp32 -o blink.elf blink.c
```

For RV64:

```bash
riscv64-unknown-elf-gcc -march=rv64imac -mabi=lp64 -o blink.elf blink.c
```

## Supported Architectures

The multilib toolchain supports various RISC-V configurations:

- **RV32I**: 32-bit base integer instruction set
- **RV32IM**: RV32I + Integer multiplication and division
- **RV32IMAC**: RV32IM + Atomic instructions + Compressed instructions
- **RV32IMAFC**: RV32IMAC + Single-precision floating-point
- **RV32IMAFDC**: Full-featured 32-bit (with double-precision FP)
- **RV64I/IM/IMAC/IMAFC/IMAFDC**: 64-bit equivalents

## Development Workflow

1. **Build the Docker image** (one-time setup)
2. **Write your RISC-V code** in your project directory
3. **Use the wrapper scripts** to compile and test
4. **Share your Docker image** for reproducible builds

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built on top of the official [RISC-V GNU Toolchain](https://github.com/riscv/riscv-gnu-toolchain)
- Designed for educational and professional RISC-V development
