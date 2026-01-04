# RISC-V Toolchain

Build, disassemble, and convert RISC-V programs directly from VS Code using a Docker-based GNU toolchain.

> **🚀 Compile RISC-V code right on Windows!** No need to switch to Linux or set up complex toolchains. Just install this extension, run Docker Desktop, and you're ready to build, disassemble, and flash RISC-V programs—all from within VS Code.

## Features

### Sidebar Build Panel
A dedicated sidebar panel provides quick access to all build controls including architecture selection, optimization levels, and bare-metal configuration.

### One-Click Compilation
Compile C/C++ source files to RISC-V ELF executables with a single click. The extension automatically detects open C/C++ files in your workspace.

### Bare-Metal Mode
Enable the **Bare-Metal** toggle when you want to compile code for running directly on hardware without an operating system. This mode:
- Uses minimal startup code (`crt0`) for proper CPU initialization
- Links with a bare-metal linker script for memory layout control
- Produces standalone executables suitable for embedded systems, FPGAs, or RISC-V simulators
- Perfect for writing bootloaders, firmware, or hardware test programs

### Disassembly Viewer
View the compiled assembly output with syntax highlighting. Filter the disassembly using grep patterns to find specific instructions or symbols.

#### Using the Filter Feature
The filter input allows you to search through disassembly output using grep patterns:
- Enter a function name (e.g., `main`) to jump to that symbol
- Use instruction patterns (e.g., `addi`, `lw`, `sw`) to find specific operations
- Search for register names (e.g., `a0`, `sp`) to track register usage
- Combine patterns with `\|` for multiple matches (e.g., `main\|loop`)

### Binary Conversion
Convert ELF executables to raw binary format suitable for flashing to embedded devices or FPGA memory initialization.

### Integrated Error Highlighting
GCC compiler errors and warnings are parsed and displayed directly in the VS Code editor with proper line highlighting and problem panel integration.

### Custom Linker and Startup Scripts
You can compile using your own linker scripts and startup assembly files for full control over memory layout and initialization:
- Provide a custom linker script (`.ld`) to define memory regions, section placement, and entry points
- Supply your own startup code (`crt0.S`) to handle stack setup, BSS clearing, and hardware initialization
- Place custom scripts in your project directory and the toolchain will use them automatically when bare-metal mode is enabled

### Make and Bash Scripts for Automation
For advanced workflows, you can use Makefiles or Bash scripts with the Docker toolchain:

**Example Makefile:**
```makefile
CC = docker run --rm -v $(PWD):/work ranaumarnadeem/riscv-toolchain riscv64-unknown-elf-gcc
CFLAGS = -march=rv32imac -mabi=ilp32 -O2

all: program.elf

program.elf: main.c
	$(CC) $(CFLAGS) -o /work/$@ /work/$<
```

**Example Bash Script:**
```bash
#!/bin/bash
DOCKER_IMAGE="ranaumarnadeem/riscv-toolchain"
docker run --rm -v "$(pwd):/work" $DOCKER_IMAGE \
    riscv64-unknown-elf-gcc -march=rv32imac -mabi=ilp32 -O2 \
    -o /work/output.elf /work/main.c
```

### Architecture Support
Support for multiple RISC-V architecture configurations:
- RV32I, RV32IM, RV32IMAC, RV32IMAFC
- RV64I, RV64IM, RV64IMAC, RV64IMAFC
- Custom architecture strings

### Optimization Levels
Choose from standard GCC optimization levels:
- O0 (No optimization)
- O1 (Basic optimization)
- O2 (Recommended)
- O3 (Aggressive optimization)
- Os (Optimize for size)
- Oz (Aggressive size optimization)

## Requirements

- Docker Desktop installed and running
- Pull the Docker image before first use:

```bash
docker pull ranaumarnadeem/riscv-toolchain
```

## Getting Started

1. Install Docker Desktop and ensure it is running
2. Pull the RISC-V toolchain Docker image
3. Open a C or C++ file in your workspace
4. Click the RISC-V icon in the activity bar to open the sidebar
5. Select your target architecture and optimization level
6. Click Build to compile your program

## Extension Settings

This extension contributes the following settings:

- `riscv-toolchain.dockerImage`: Docker image to use for compilation (default: `ranaumarnadeem/riscv-toolchain`)
- `riscv-toolchain.defaultArch`: Default architecture preset (default: `32imac`)
- `riscv-toolchain.defaultOptimization`: Default optimization level (default: `O2`)
- `riscv-toolchain.bareMetal`: Use bare-metal build by default (default: `false`)

## Commands

The extension provides three main action buttons in the sidebar:

### Build Button
Compiles your C/C++ source file into a RISC-V ELF executable. This runs the GCC compiler with your selected architecture, optimization level, and bare-metal settings. The resulting `.elf` file contains the compiled program with debug symbols.

### Dump Button (Disassemble)
Disassembles the compiled ELF file and displays the assembly instructions in a new editor tab. Use this to:
- Verify the compiler generated the expected instructions
- Debug optimization issues
- Understand how your C code translates to RISC-V assembly
- Check instruction encodings for specific extensions (e.g., compressed, floating-point)

### Binary Button
Converts the ELF executable to a raw binary file (`.bin`). This strips all headers and debug information, producing a flat binary image suitable for:
- Flashing directly to embedded device memory
- Loading into FPGA block RAM
- Initializing memory in HDL simulations
- Burning to ROM/Flash chips

---

- `RISC-V: Build` - Compile the current file
- `RISC-V: Disassemble` - View disassembly of compiled ELF
- `RISC-V: Convert to Binary` - Convert ELF to raw binary
- `RISC-V: Select Source File` - Choose a source file to build
- `RISC-V: Refresh` - Refresh the sidebar panel

## Troubleshooting

### Docker not found
Ensure Docker Desktop is installed and the Docker daemon is running. You can verify by running `docker --version` in a terminal.

### Build fails with permission errors
On Linux/macOS, ensure your user has permission to run Docker commands without sudo. Add your user to the docker group:
```bash
sudo usermod -aG docker $USER
```

### Image not found
Pull the toolchain image manually:
```bash
docker pull ranaumarnadeem/riscv-toolchain
```

## License

MIT License - see the LICENSE file for details.
