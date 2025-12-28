/*
 * zba_zbb_test.c - Bit Manipulation Extension Test
 * 
 * Demonstrates:
 *   - Zbb (Basic Bit Manipulation): clz, ctz, cpop, orc.b, rev8, etc.
 *   - Zba (Address Generation): sh1add, sh2add, sh3add
 * 
 * Build:
 *   rv build examples/zba_zbb_test.c --arch 32imc_zba_zbb
 * 
 * Verify instructions:
 *   rv dump build/zba_zbb_test.elf --grep clz
 *   rv dump build/zba_zbb_test.elf --grep sh2add
 *   rv dump build/zba_zbb_test.elf --grep cpop
 */

#include <stdint.h>

/* ============================================================================
 * Zbb (Basic Bit Manipulation) Tests
 * ============================================================================ */

/**
 * Count Leading Zeros (CLZ)
 * Returns the number of leading zero bits in val.
 * Compiles to: clz a0, a0
 */
int test_clz(unsigned int val) {
    return __builtin_clz(val);
}

/**
 * Count Trailing Zeros (CTZ)
 * Returns the number of trailing zero bits in val.
 * Compiles to: ctz a0, a0
 */
int test_ctz(unsigned int val) {
    return __builtin_ctz(val);
}

/**
 * Population Count (CPOP)
 * Returns the number of 1 bits in val.
 * Compiles to: cpop a0, a0
 */
int test_popcount(unsigned int val) {
    return __builtin_popcount(val);
}

/**
 * Find First Set (FFS)
 * Returns one plus the index of the least significant set bit, or 0 if val is 0.
 * Uses CTZ internally.
 */
int test_ffs(unsigned int val) {
    return __builtin_ffs(val);
}

/**
 * Parity
 * Returns 1 if number of 1 bits is odd, 0 if even.
 * Uses CPOP internally.
 */
int test_parity(unsigned int val) {
    return __builtin_parity(val);
}

/**
 * OR-Combine bytes (ORC.B)
 * For each byte, if any bit is set, all bits become 1.
 * Useful for string/byte processing.
 */
uint32_t test_orc_b(uint32_t val) {
    // This pattern typically generates orc.b with optimization
    uint32_t result = 0;
    for (int i = 0; i < 4; i++) {
        uint8_t byte = (val >> (i * 8)) & 0xFF;
        if (byte) {
            result |= (0xFF << (i * 8));
        }
    }
    return result;
}

/**
 * Byte-reverse (REV8)
 * Reverses the byte order (endianness swap).
 * Compiles to: rev8 a0, a0
 */
uint32_t test_bswap(uint32_t val) {
    return __builtin_bswap32(val);
}

/**
 * Minimum (signed)
 * Compiles to: min a0, a0, a1
 */
int test_min(int a, int b) {
    return (a < b) ? a : b;
}

/**
 * Maximum (signed)
 * Compiles to: max a0, a0, a1
 */
int test_max(int a, int b) {
    return (a > b) ? a : b;
}

/**
 * Sign-extend byte
 * Compiles to: sext.b a0, a0
 */
int test_sext_b(int val) {
    return (int)(int8_t)val;
}

/**
 * Sign-extend halfword
 * Compiles to: sext.h a0, a0
 */
int test_sext_h(int val) {
    return (int)(int16_t)val;
}

/**
 * Zero-extend halfword
 * Compiles to: zext.h a0, a0
 */
unsigned int test_zext_h(unsigned int val) {
    return val & 0xFFFF;
}

/**
 * AND with inverted operand (ANDN)
 * Compiles to: andn a0, a0, a1
 */
uint32_t test_andn(uint32_t a, uint32_t b) {
    return a & ~b;
}

/**
 * OR with inverted operand (ORN)
 * Compiles to: orn a0, a0, a1
 */
uint32_t test_orn(uint32_t a, uint32_t b) {
    return a | ~b;
}

/**
 * XOR with inverted operand (XNOR)
 * Compiles to: xnor a0, a0, a1
 */
uint32_t test_xnor(uint32_t a, uint32_t b) {
    return ~(a ^ b);
}

/**
 * Rotate left (ROL)
 * Compiles to: rol a0, a0, a1
 */
uint32_t test_rol(uint32_t val, int shift) {
    return (val << shift) | (val >> (32 - shift));
}

/**
 * Rotate right (ROR)
 * Compiles to: ror a0, a0, a1
 */
uint32_t test_ror(uint32_t val, int shift) {
    return (val >> shift) | (val << (32 - shift));
}

/* ============================================================================
 * Zba (Address Generation) Tests
 * ============================================================================ */

/**
 * SH1ADD - Shift left 1 and add
 * addr + (index * 2) - for 16-bit (halfword) array indexing
 * Compiles to: sh1add a0, a1, a0
 */
int16_t test_sh1add(int16_t *base, int index) {
    return base[index];
}

/**
 * SH2ADD - Shift left 2 and add
 * addr + (index * 4) - for 32-bit (word) array indexing
 * Compiles to: sh2add a0, a1, a0
 */
int32_t test_sh2add(int32_t *base, int index) {
    return base[index];
}

/**
 * SH3ADD - Shift left 3 and add
 * addr + (index * 8) - for 64-bit (doubleword) array indexing
 * Compiles to: sh3add a0, a1, a0
 */
int64_t test_sh3add(int64_t *base, int index) {
    return base[index];
}

/**
 * Practical example: Fast multiply by small constants
 * x * 3 = x + (x << 1) -> sh1add
 * x * 5 = x + (x << 2) -> sh2add
 * x * 9 = x + (x << 3) -> sh3add
 */
uint32_t test_mul3(uint32_t x) {
    return x * 3;  // Compiles to: sh1add a0, a0, a0
}

uint32_t test_mul5(uint32_t x) {
    return x * 5;  // Compiles to: sh2add a0, a0, a0
}

uint32_t test_mul9(uint32_t x) {
    return x * 9;  // Compiles to: sh3add a0, a0, a0
}

/* ============================================================================
 * Main - Exercise all functions
 * ============================================================================ */

int main(void) {
    volatile uint32_t val = 0x00F0F000;
    volatile int32_t arr32[10] = {0, 1, 2, 3, 4, 5, 6, 7, 8, 9};
    volatile int16_t arr16[10] = {0, 10, 20, 30, 40, 50, 60, 70, 80, 90};
    volatile int64_t arr64[4] = {100, 200, 300, 400};
    
    volatile int result = 0;
    
    // Zbb tests
    result += test_clz(val);
    result += test_ctz(val);
    result += test_popcount(val);
    result += test_ffs(val);
    result += test_parity(val);
    result += test_bswap(val);
    result += test_min(10, 20);
    result += test_max(10, 20);
    result += test_sext_b(0x80);
    result += test_sext_h(0x8000);
    result += test_zext_h(0xFFFF1234);
    result += test_andn(0xFF00, 0x0F00);
    result += test_orn(0xFF00, 0x0F00);
    result += test_xnor(0xFF00, 0x0F00);
    result += test_rol(0x80000001, 1);
    result += test_ror(0x80000001, 1);
    result += test_orc_b(0x00100001);
    
    // Zba tests
    result += test_sh2add((int32_t*)arr32, 5);
    result += test_sh1add((int16_t*)arr16, 3);
    result += test_sh3add((int64_t*)arr64, 2);
    result += test_mul3(10);
    result += test_mul5(10);
    result += test_mul9(10);
    
    return result;
}
