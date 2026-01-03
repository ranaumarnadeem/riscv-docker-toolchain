# RISC-V Docker Toolchain

A portable, dockerized GNU Toolchain for RISC-V development. Supports RV32/RV64 with all standard extensions (I/M/A/F/D/C) and bit manipulation (Zba/Zbb).

## Quick Start

```bash
# Build the Docker image
docker build -t riscv-toolchain .

# Set up alias (add to ~/.bashrc or ~/.zshrc for permanent use)
alias rv='docker run --rm -v "$(pwd):/src" riscv-toolchain rv'

rv build examples/blink.c --arch 32imac
rv dump build/blink.elf
rv bin build/blink.elf
```

**Windows PowerShell:**
```powershell
function rvc { docker run --rm -v "${PWD}:/src" riscv-toolchain rv $args }

rvc build examples/blink.c --arch 32imac
```

**Interactive mode:**
```bash
docker run --rm -it -v "$(pwd):/src" riscv-toolchain
rv build examples/blink.c --arch 32imac
```

## Commands

| Command | Description |
|---------|-------------|
| `rv build <file> --arch <arch>` | Compile C source to ELF |
| `rv dump <file> [--grep pattern]` | Disassemble ELF file |
| `rv bin <file> [-o output]` | Convert ELF to raw binary |
| `rv archs` | List supported architectures |
| `rv version` | Show toolchain version |

### Build Options

```bash
rv build file.c --arch 32imac                    # Basic build
rv build file.c --arch 32imac -o out.elf         # Custom output
rv build file.c --arch 32imac --opt O0           # Optimization: O0/O1/O2/O3/Os/Oz
rv build file.c --arch 32imac --bare             # Bare-metal (no libc)
rv build file.c --arch 32imc_zba_zbb             # Custom extensions
rv build file.c --arch 32imac --cflags "-DDEBUG" # Extra flags
```

## Architectures

| Preset | march | mabi |
|--------|-------|------|
| `32i` | rv32i | ilp32 |
| `32im` | rv32im | ilp32 |
| `32imac` | rv32imac | ilp32 |
| `32imafdc` | rv32imafdc | ilp32d |
| `64i` | rv64i | lp64 |
| `64imac` | rv64imac | lp64 |
| `64imafdc` | rv64imafdc | lp64d |

Custom architectures: `--arch 32imc_zba_zbb`, `--arch 64imac_zba`

## Examples

```bash
# M extension (multiply/divide)
rv build examples/multiply_test.c --arch 32im
rv dump build/multiply_test.elf --grep mul

# A extension (atomics)
rv build examples/atomic_test.c --arch 32ima
rv dump build/atomic_test.elf --grep amo

# Zba/Zbb (bit manipulation)
rv build examples/zba_zbb_test.c --arch 32imc_zba_zbb
rv dump build/zba_zbb_test.elf --grep clz

# Bare-metal build
rv build examples/blink.c --arch 32imac --bare
rv bin build/blink.elf -o firmware.bin
```

## Bare-Metal Development

The `--bare` flag uses included linker scripts and startup code:

| File | Purpose |
|------|---------|
| `riscv_32.ld` / `riscv64.ld` | Linker scripts |
| `crt0_32.S` / `crt0_64.S` | Startup code |

Customize memory layout in the linker script:

```ld
MEMORY {
    FLASH (rx)  : ORIGIN = 0x00000000, LENGTH = 256K
    RAM   (rwx) : ORIGIN = 0x80000000, LENGTH = 64K
}
```

## Toolchain

- **GCC**: 15.2.0
- **Binutils**: 2.44
- **Newlib**: Latest

## License

MIT License
