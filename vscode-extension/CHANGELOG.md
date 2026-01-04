# Changelog

All notable changes to the RISC-V Toolchain extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-01-04

### Added
- Initial release of RISC-V Toolchain extension
- Sidebar panel with build controls
- Support for compiling C/C++ files to RISC-V ELF
- Disassembly viewer with grep filtering
- Binary conversion from ELF to raw binary
- GCC error parsing with editor highlighting
- Architecture selector for RV32 and RV64 variants
- Optimization level selector (O0, O1, O2, O3, Os, Oz)
- Bare-metal build option
- Auto-detection of C/C++ files in workspace
- Docker-based compilation using ranaumarnadeem/riscv-toolchain image
