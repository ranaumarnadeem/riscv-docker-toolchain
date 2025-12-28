/*
 * hello_riscv.c - Minimal RISC-V Example with Inline Assembly
 * 
 * Demonstrates:
 *   - Basic inline assembly syntax
 *   - Reading RISC-V CSRs (Control and Status Registers)
 *   - Direct register manipulation
 * 
 * Build:
 *   rv build examples/hello_riscv.c --arch 32imac
 * 
 * This is the simplest possible RISC-V program that actually
 * does something interesting with the architecture.
 */

#include <stdint.h>

/* ============================================================================
 * CSR (Control and Status Register) Access
 * ============================================================================ */

/**
 * Read MISA register - Machine ISA Register
 * Contains information about supported extensions
 * 
 * Bits [25:0] encode extensions (A-Z):
 *   Bit 0 = A (Atomic)
 *   Bit 2 = C (Compressed)
 *   Bit 3 = D (Double-precision FP)
 *   Bit 5 = F (Single-precision FP)
 *   Bit 8 = I (Base Integer)
 *   Bit 12 = M (Multiply/Divide)
 *   etc.
 * 
 * Note: This requires machine mode access. May trap in user mode.
 */
static inline uint32_t read_misa(void) {
    uint32_t misa;
    __asm__ volatile ("csrr %0, misa" : "=r"(misa));
    return misa;
}

/**
 * Read MHARTID - Hardware Thread ID
 * Returns the unique ID of the current hardware thread (hart)
 */
static inline uint32_t read_mhartid(void) {
    uint32_t hartid;
    __asm__ volatile ("csrr %0, mhartid" : "=r"(hartid));
    return hartid;
}

/**
 * Read MCYCLE - Machine Cycle Counter (lower 32 bits)
 * Counts the number of clock cycles
 */
static inline uint32_t read_mcycle(void) {
    uint32_t cycle;
    __asm__ volatile ("csrr %0, mcycle" : "=r"(cycle));
    return cycle;
}

/**
 * Read MINSTRET - Machine Instructions Retired (lower 32 bits)
 * Counts the number of instructions executed
 */
static inline uint32_t read_minstret(void) {
    uint32_t instret;
    __asm__ volatile ("csrr %0, minstret" : "=r"(instret));
    return instret;
}

/* ============================================================================
 * Basic Inline Assembly Examples
 * ============================================================================ */

/**
 * No-operation (NOP)
 * Does nothing - useful for timing loops
 */
static inline void nop(void) {
    __asm__ volatile ("nop");
}

/**
 * Add two numbers using inline assembly
 * Demonstrates input/output operand syntax
 */
static inline int asm_add(int a, int b) {
    int result;
    __asm__ volatile (
        "add %0, %1, %2"
        : "=r"(result)       // Output: result in any register
        : "r"(a), "r"(b)     // Inputs: a and b in any registers
    );
    return result;
}

/**
 * Multiply using inline assembly (M extension)
 * Demonstrates the mul instruction
 */
static inline int asm_mul(int a, int b) {
    int result;
    __asm__ volatile (
        "mul %0, %1, %2"
        : "=r"(result)
        : "r"(a), "r"(b)
    );
    return result;
}

/**
 * Bitwise AND using inline assembly
 */
static inline uint32_t asm_and(uint32_t a, uint32_t b) {
    uint32_t result;
    __asm__ volatile (
        "and %0, %1, %2"
        : "=r"(result)
        : "r"(a), "r"(b)
    );
    return result;
}

/**
 * Bitwise OR using inline assembly
 */
static inline uint32_t asm_or(uint32_t a, uint32_t b) {
    uint32_t result;
    __asm__ volatile (
        "or %0, %1, %2"
        : "=r"(result)
        : "r"(a), "r"(b)
    );
    return result;
}

/**
 * Bitwise XOR using inline assembly
 */
static inline uint32_t asm_xor(uint32_t a, uint32_t b) {
    uint32_t result;
    __asm__ volatile (
        "xor %0, %1, %2"
        : "=r"(result)
        : "r"(a), "r"(b)
    );
    return result;
}

/**
 * Shift left logical
 */
static inline uint32_t asm_sll(uint32_t val, int shift) {
    uint32_t result;
    __asm__ volatile (
        "sll %0, %1, %2"
        : "=r"(result)
        : "r"(val), "r"(shift)
    );
    return result;
}

/**
 * Shift right logical
 */
static inline uint32_t asm_srl(uint32_t val, int shift) {
    uint32_t result;
    __asm__ volatile (
        "srl %0, %1, %2"
        : "=r"(result)
        : "r"(val), "r"(shift)
    );
    return result;
}

/**
 * Shift right arithmetic (preserves sign)
 */
static inline int32_t asm_sra(int32_t val, int shift) {
    int32_t result;
    __asm__ volatile (
        "sra %0, %1, %2"
        : "=r"(result)
        : "r"(val), "r"(shift)
    );
    return result;
}

/**
 * Set if less than (signed)
 */
static inline int asm_slt(int a, int b) {
    int result;
    __asm__ volatile (
        "slt %0, %1, %2"
        : "=r"(result)
        : "r"(a), "r"(b)
    );
    return result;
}

/**
 * Set if less than (unsigned)
 */
static inline int asm_sltu(uint32_t a, uint32_t b) {
    int result;
    __asm__ volatile (
        "sltu %0, %1, %2"
        : "=r"(result)
        : "r"(a), "r"(b)
    );
    return result;
}

/* ============================================================================
 * Memory Fence Operations
 * ============================================================================ */

/**
 * Full memory fence
 * Ensures all previous memory accesses complete before any subsequent ones
 */
static inline void fence(void) {
    __asm__ volatile ("fence" ::: "memory");
}

/**
 * Instruction fence
 * Ensures all previous stores to instruction memory are visible
 */
static inline void fence_i(void) {
    __asm__ volatile ("fence.i" ::: "memory");
}

/* ============================================================================
 * Decode MISA Extensions
 * ============================================================================ */

/**
 * Check if a specific extension is supported
 */
static inline int has_extension(uint32_t misa, char ext) {
    if (ext >= 'A' && ext <= 'Z') {
        return (misa >> (ext - 'A')) & 1;
    }
    if (ext >= 'a' && ext <= 'z') {
        return (misa >> (ext - 'a')) & 1;
    }
    return 0;
}

/* ============================================================================
 * Main
 * ============================================================================ */

int main(void) {
    volatile int result = 0;
    
    // Test inline assembly arithmetic
    result += asm_add(10, 20);       // 30
    result += asm_mul(5, 6);         // 30
    
    // Test bitwise operations
    uint32_t bits = asm_and(0xFF00, 0x0FF0);    // 0x0F00
    bits = asm_or(bits, 0x000F);                // 0x0F0F
    bits = asm_xor(bits, 0x0F00);               // 0x000F
    result += bits;
    
    // Test shifts
    uint32_t shifted = asm_sll(1, 4);           // 16
    shifted = asm_srl(shifted, 2);              // 4
    result += shifted;
    
    // Test comparison
    result += asm_slt(-5, 5);        // 1 (true)
    result += asm_sltu(5, 10);       // 1 (true)
    
    // Read some CSRs (may trap if not in machine mode)
    // Uncomment if running in machine mode:
    // uint32_t misa = read_misa();
    // uint32_t hartid = read_mhartid();
    // uint32_t cycles = read_mcycle();
    
    // Memory fence example
    fence();
    
    // Do some NOPs
    for (int i = 0; i < 10; i++) {
        nop();
    }
    
    return result;
}
