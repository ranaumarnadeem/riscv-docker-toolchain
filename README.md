# RISC-V Docker Toolchain

A portable, dockerized GNU Toolchain for RISC-V development. Supports Multilib (all extensions: rv32/rv64, i/m/a/f/d/c) out of the box. Designed for Indigenous Processors and reproducible builds on Windows/WSL & Linux.

## Features

- **Multilib Support**: Supports both RV32 and RV64 with all standard extensions (I/M/A/F/D/C)
- **Dockerized**: Consistent development environment across different platforms
- **`rv` CLI Wrapper**: Simple Python-based CLI for compilation and disassembly
- **Portable**: Works on Linux, macOS, and Windows (via WSL or Docker Desktop)
- **Reproducible**: Consistent builds every time

## Directory Structure

```
root/
├── .github/               # GitHub configuration
├── scripts/               # CLI wrapper
│   └── rv                 # Python CLI tool (embedded in Docker image)
├── examples/              # Example programs
│   ├── blink.c           # Simple LED blink example
│   └── test.c            # Zba/Zbb extension test
├── build/                 # Compiled output (generated)
├── Dockerfile             # Multilib toolchain image
├── Makefile               # Example build configuration
├── LICENSE                # MIT License
└── README.md              # This file
```

## Getting Started

### Prerequisites

- Docker installed on your system
- Python 3.6+ (for running the `rv` CLI on your host machine)
- Basic knowledge of RISC-V architecture

### Building the Docker Image

Build the RISC-V toolchain Docker image using the `rv` CLI:

```bash
# Using the rv CLI (recommended)
python scripts/rv build-image

# Or manually with Docker
docker build -t riscv-toolchain .
```

## Using the `rv` CLI

The `rv` command is a Python CLI wrapper that **automatically handles Docker** for you. No need to type `docker run` commands!

### Quick Reference

```bash
# Show help
python scripts/rv --help

# Build Docker image (first-time setup)
python scripts/rv build-image

# List supported architectures
python scripts/rv archs

# Show toolchain version
python scripts/rv version

# Start interactive shell
python scripts/rv shell
```

### Compiling Code

Use `rv build` to compile C source files to ELF:

```bash
# Basic compilation (--arch is required)
python scripts/rv build examples/test.c --arch 32imac

# Specify output file and optimization
python scripts/rv build examples/test.c --arch 32imac -o out.elf --opt O0

# Use custom architecture with extensions
python scripts/rv build examples/test.c --arch 32imc_zba_zbb

# Add extra compiler flags
python scripts/rv build examples/test.c --arch 64imafdc --cflags "-DDEBUG -Wall"
```

**Options:**
| Option | Required | Description |
|--------|----------|-------------|
| `--arch` | Yes | Target architecture (e.g., `32imac`, `64imafdc`, `32imc_zba_zbb`) |
| `-o` | No | Output file path (default: `build/<filename>.elf`) |
| `--opt` | No | Optimization level: `O0`, `O1`, `O2`, `O3`, `Os`, `Oz` (default: `O2`) |
| `--cflags` | No | Additional compiler flags |

### Disassembling ELF Files

Use `rv dump` to disassemble compiled ELF files:

```bash
# Full disassembly
python scripts/rv dump build/test.elf

# Filter for specific instructions
python scripts/rv dump build/test.elf --grep clz
python scripts/rv dump build/test.elf --grep sh2add
```

### Interactive Shell

Start an interactive shell inside the container:

```bash
python scripts/rv shell
```

Inside the container, you have access to:
- `rv` - The CLI wrapper (also works inside container)
- `riscv-none-elf-gcc` - GCC compiler
- `riscv-none-elf-objdump` - Disassembler
- `riscv-none-elf-ld`, `as`, `ar`, `nm`, `size`, etc.

## Supported Architectures

Run `rv archs` to see all presets:

| Preset | -march | -mabi | Description |
|--------|--------|-------|-------------|
| `32i` | rv32i | ilp32 | Base 32-bit integer |
| `32im` | rv32im | ilp32 | + Multiplication/Division |
| `32imac` | rv32imac | ilp32 | + Atomic + Compressed |
| `32imafc` | rv32imafc | ilp32f | + Single-precision FP |
| `32imafdc` | rv32imafdc | ilp32d | Full 32-bit with double FP |
| `64i` | rv64i | lp64 | Base 64-bit integer |
| `64imac` | rv64imac | lp64 | + Atomic + Compressed |
| `64imafdc` | rv64imafdc | lp64d | Full 64-bit with double FP |

**Custom architectures** are also supported:
```bash
--arch 32imc_zba_zbb   # RV32 with bit manipulation extensions
--arch 64imac_zba      # RV64 with address generation extension
```

The ABI is automatically inferred from the architecture string.

## Examples

### Compile and Verify Zba/Zbb Extensions

```bash
# Build with Zba/Zbb extensions
python scripts/rv build examples/test.c --arch 32imc_zba_zbb

# Verify Zbb (clz instruction)
python scripts/rv dump build/test.elf --grep clz

# Verify Zba (sh2add instruction)
python scripts/rv dump build/test.elf --grep sh2add
```

### Compile Bare-Metal Blink Example

```bash
python scripts/rv build examples/blink.c --arch 32imac -o build/blink.elf
```

## Adding `rv` to PATH (Optional)

For easier access, add the scripts directory to your PATH:

**Linux/macOS (bash/zsh):**
```bash
export PATH="$PATH:/path/to/riscv-docker-toolchain/scripts"
# Then use: rv build examples/test.c --arch 32imac
```

**Windows (PowerShell):**
```powershell
$env:PATH += ";C:\path\to\riscv-docker-toolchain\scripts"
# Then use: python rv build examples/test.c --arch 32imac
```

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built on top of Alpine Linux's RISC-V toolchain packages
- Designed for educational and professional RISC-V development
