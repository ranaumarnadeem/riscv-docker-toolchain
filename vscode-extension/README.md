# RISC-V Toolchain VS Code Extension

Build, disassemble, and convert RISC-V programs directly from VS Code using a Docker-based GNU toolchain.

## Features

- **Sidebar Panel** — Build controls with architecture selector, optimization level, and bare-metal toggle
- **One-Click Build** — Compile C/C++ to RISC-V ELF with a single click
- **Disassembly View** — View compiled assembly with grep filtering
- **Binary Conversion** — Convert ELF to raw binary for flashing
- **GCC Error Highlighting** — See compile errors directly in the editor
- **Auto File Detection** — Automatically detects open C/C++ files

## Requirements

- Docker Desktop installed and running
- The Docker image: `docker pull ranaumarnadeem/riscv-toolchain`

## Usage

1. Open a C/C++ file in your workspace
2. Click the RISC-V icon in the activity bar
3. Select architecture and optimization
4. Click **Build**

## Development

```bash
cd vscode-extension
npm install
npm run compile
```

Press F5 to launch Extension Development Host.

## Publishing

```bash
npm install -g @vscode/vsce
vsce package
vsce publish
```
