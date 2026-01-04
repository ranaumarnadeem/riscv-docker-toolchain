# RISC-V Toolchain

Build, disassemble, and convert RISC-V programs directly from VS Code using a Docker-based GNU toolchain.

## Features

### Sidebar Build Panel
A dedicated sidebar panel provides quick access to all build controls including architecture selection, optimization levels, and bare-metal configuration.

### One-Click Compilation
Compile C/C++ source files to RISC-V ELF executables with a single click. The extension automatically detects open C/C++ files in your workspace.

### Disassembly Viewer
View the compiled assembly output with syntax highlighting. Filter the disassembly using grep patterns to find specific instructions or symbols.

### Binary Conversion
Convert ELF executables to raw binary format suitable for flashing to embedded devices or FPGA memory initialization.

### Integrated Error Highlighting
GCC compiler errors and warnings are parsed and displayed directly in the VS Code editor with proper line highlighting and problem panel integration.

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
