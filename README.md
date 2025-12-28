# RISC-V Docker Toolchain

A portable, dockerized GNU Toolchain for RISC-V development. Supports Multilib (all extensions: rv32/rv64, I/M/A/F/D/C, Zba/Zbb) out of the box. Designed for Indigenous Processors and reproducible builds on Windows/WSL & Linux.

## Features

- **Multilib Support**: Supports both RV32 and RV64 with all standard extensions (I/M/A/F/D/C) and bit manipulation (Zba/Zbb)
- **Dockerized**: Consistent development environment across different platforms
- **`rv` CLI Wrapper**: Simple Python-based CLI for compilation, disassembly, and binary conversion
- **Bare-Metal Ready**: Includes linker scripts and startup code for bare-metal development
- **Portable**: Works on Linux, macOS, and Windows (via WSL or Docker Desktop)
- **Reproducible**: Consistent builds every time

## Directory Structure

```
root/
├── scripts/               # CLI wrapper and linker scripts
│   ├── rv                 # Python CLI tool (embedded in Docker image)
│   ├── riscv_32.ld        # Linker script for RV32 bare-metal
│   ├── riscv64.ld         # Linker script for RV64 bare-metal
│   ├── crt0_32.S          # Startup code for RV32
│   └── crt0_64.S          # Startup code for RV64
├── examples/              # Example programs
│   ├── blink.c            # GPIO blink patterns (SOS, heartbeat)
│   ├── hello_riscv.c      # Inline assembly and CSR access
│   ├── multiply_test.c    # M extension (mul/div/rem)
│   ├── atomic_test.c      # A extension (LR/SC, AMO operations)
│   ├── float_test.c       # F/D extension (floating point)
│   ├── compressed_test.c  # C extension (code size demo)
│   └── zba_zbb_test.c     # Zba/Zbb bit manipulation
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

| Command | Description |
|---------|-------------|
| `rv build <file> --arch <arch>` | Compile C source to ELF |
| `rv dump <file>` | Disassemble ELF file |
| `rv bin <file>` | Convert ELF to raw binary |
| `rv archs` | List supported architectures |
| `rv version` | Show toolchain version |
| `rv shell` | Start interactive shell |
| `rv build-image` | Build Docker image |
| `rv` | Start interactive REPL mode |

### Compiling Code

Use `rv build` to compile C source files to ELF:

```bash
# Basic compilation (--arch is required)
python scripts/rv build examples/blink.c --arch 32imac

# Specify output file and optimization
python scripts/rv build examples/blink.c --arch 32imac -o out.elf --opt O0

# Use custom architecture with extensions
python scripts/rv build examples/zba_zbb_test.c --arch 32imc_zba_zbb

# Add extra compiler flags
python scripts/rv build examples/float_test.c --arch 32imfc --cflags "-DDEBUG -Wall"

# Bare-metal build (no libc, uses included linker script)
python scripts/rv build examples/blink.c --arch 32imac --bare
```

**Build Options:**

| Option | Required | Description |
|--------|----------|-------------|
| `--arch` | Yes | Target architecture (e.g., `32imac`, `64imafdc`, `32imc_zba_zbb`) |
| `-o` | No | Output file path (default: `build/<filename>.elf`) |
| `--opt` | No | Optimization level: `O0`, `O1`, `O2`, `O3`, `Os`, `Oz` (default: `O2`) |
| `--bare` | No | Bare-metal build (no libc, uses included linker script and startup code) |
| `--cflags` | No | Additional compiler flags |

### Disassembling ELF Files

Use `rv dump` to disassemble compiled ELF files:

```bash
# Full disassembly
python scripts/rv dump build/blink.elf

# Filter for specific instructions
python scripts/rv dump build/zba_zbb_test.elf --grep clz
python scripts/rv dump build/multiply_test.elf --grep mul
```

### Converting ELF to Binary

Use `rv bin` to convert ELF files to raw binary (for flashing to hardware):

```bash
# Convert to binary (creates build/blink.bin)
python scripts/rv bin build/blink.elf

# Custom output name
python scripts/rv bin build/blink.elf -o firmware.bin
```

### Interactive REPL Mode

Start the CLI without arguments to enter interactive mode:

```bash
python scripts/rv
```

Then type commands without the `rv` prefix:
```
rv> build examples/blink.c --arch 32imac
rv> dump build/blink.elf
rv> bin build/blink.elf
rv> exit
```

## Bare-Metal Development

For true bare-metal development without newlib, use the provided linker scripts and startup code.

### Linker Scripts

| File | Use For |
|------|---------|
| `scripts/riscv_32.ld` | RV32 targets (all extensions) |
| `scripts/riscv64.ld` | RV64 targets (all extensions) |

### Startup Code

| File | Use For |
|------|---------|
| `scripts/crt0_32.S` | RV32 (32-bit load/store) |
| `scripts/crt0_64.S` | RV64 (64-bit load/store) |

### Bare-Metal Build Workflow

```bash
# 1. Build with --bare flag (automatically uses correct linker script & startup)
python scripts/rv build examples/blink.c --arch 32imac --bare

# 2. Convert to raw binary for flashing
python scripts/rv bin build/blink.elf

# 3. Verify the output
python scripts/rv dump build/blink.elf
```

**Note:** The `--bare` flag automatically selects the correct linker script and startup code based on architecture (32-bit or 64-bit).

### Customizing Memory Layout

Edit the `MEMORY` section in the linker script for your hardware:

```ld
MEMORY
{
    /* Example: Your custom board */
    FLASH (rx)  : ORIGIN = 0x00000000, LENGTH = 256K
    RAM   (rwx) : ORIGIN = 0x80000000, LENGTH = 64K
}
```

## Supported Architectures

Run `rv archs` to see all presets:

| Preset | -march | -mabi | Description |
|--------|--------|-------|-------------|
| `32i` | rv32i | ilp32 | Base 32-bit integer |
| `32im` | rv32im | ilp32 | + Multiplication/Division |
| `32ima` | rv32ima | ilp32 | + Atomic |
| `32imac` | rv32imac | ilp32 | + Compressed |
| `32imafc` | rv32imafc | ilp32f | + Single-precision FP |
| `32imafdc` | rv32imafdc | ilp32d | Full 32-bit with double FP |
| `64i` | rv64i | lp64 | Base 64-bit integer |
| `64im` | rv64im | lp64 | + Multiplication/Division |
| `64ima` | rv64ima | lp64 | + Atomic |
| `64imac` | rv64imac | lp64 | + Compressed |
| `64imafc` | rv64imafc | lp64f | + Single-precision FP |
| `64imafdc` | rv64imafdc | lp64d | Full 64-bit with double FP |

**Custom architectures** are also supported:
```bash
--arch 32imc_zba_zbb   # RV32 with bit manipulation extensions
--arch 64imac_zba      # RV64 with address generation extension
--arch 32imfc          # RV32 with multiply and single-precision FP
```

The ABI is automatically inferred from the architecture string.

## Examples

The `examples/` directory contains demonstration programs for various RISC-V extensions:

| Example | Extension | Description |
|---------|-----------|-------------|
| `blink.c` | Base | GPIO patterns: simple, SOS, heartbeat |
| `hello_riscv.c` | Base | Inline assembly, CSR access (misa, mhartid) |
| `multiply_test.c` | M | Multiplication/division: mul, mulh, div, rem |
| `atomic_test.c` | A | Atomics: LR/SC, AMO operations, spinlock |
| `float_test.c` | F/D | Floating point: fadd, fmul, fdiv, fma |
| `compressed_test.c` | C | Code size comparison demo |
| `zba_zbb_test.c` | Zba/Zbb | Bit manipulation: clz, ctz, cpop, sh1add |

### Build and Verify Examples

```bash
# M extension - verify mul/div instructions
python scripts/rv build examples/multiply_test.c --arch 32im
python scripts/rv dump build/multiply_test.elf --grep mul

# A extension - verify atomic instructions
python scripts/rv build examples/atomic_test.c --arch 32ima
python scripts/rv dump build/atomic_test.elf --grep amo

# F extension - verify floating point instructions
python scripts/rv build examples/float_test.c --arch 32imfc
python scripts/rv dump build/float_test.elf --grep fadd

# Zba/Zbb - verify bit manipulation instructions
python scripts/rv build examples/zba_zbb_test.c --arch 32imc_zba_zbb
python scripts/rv dump build/zba_zbb_test.elf --grep clz

# C extension - compare code size
python scripts/rv build examples/compressed_test.c --arch 32im -o build/no_compress.elf
python scripts/rv build examples/compressed_test.c --arch 32imc -o build/compressed.elf
# compressed.elf will be smaller!
```

## Interactive Shell

Start an interactive shell inside the container:

```bash
python scripts/rv shell
```

Inside the container, you have access to:
- `rv` - The CLI wrapper (also works inside container)
- `riscv-none-elf-gcc` - GCC compiler
- `riscv-none-elf-objdump` - Disassembler
- `riscv-none-elf-objcopy` - Binary converter
- `riscv-none-elf-ld`, `as`, `ar`, `nm`, `size`, etc.

## Adding `rv` to PATH (Optional)

For easier access, add the scripts directory to your PATH:

**Linux/macOS (bash/zsh):**
```bash
export PATH="$PATH:/path/to/riscv-docker-toolchain/scripts"
# Then use: rv build examples/blink.c --arch 32imac
```

**Windows (PowerShell):**
```powershell
$env:PATH += ";C:\path\to\riscv-docker-toolchain\scripts"
# Then use: python rv build examples/blink.c --arch 32imac
```

## Toolchain Information

The Docker image includes:

| Tool | Version | Purpose |
|------|---------|---------|
| `riscv-none-elf-gcc` | 15.2.0 | C/C++ compiler |
| `binutils` | 2.44 | Assembler, linker, objdump, objcopy |
| `newlib` | Latest | C library for embedded systems |
| Python 3 | Latest | CLI wrapper runtime |

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built on top of Alpine Linux's RISC-V toolchain packages
- Designed for educational and professional RISC-V development
