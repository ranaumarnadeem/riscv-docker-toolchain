/*
 * multiply_test.c - M Extension Test (Integer Multiply/Divide)
 * 
 * Demonstrates:
 *   - MUL, MULH, MULHU, MULHSU (multiplication variants)
 *   - DIV, DIVU (division)
 *   - REM, REMU (remainder/modulo)
 * 
 * Build:
 *   rv build examples/multiply_test.c --arch 32im
 * 
 * Verify instructions:
 *   rv dump build/multiply_test.elf --grep mul
 *   rv dump build/multiply_test.elf --grep div
 *   rv dump build/multiply_test.elf --grep rem
 */

#include <stdint.h>

/* ============================================================================
 * Basic Multiplication (MUL)
 * ============================================================================ */

/**
 * 32-bit multiplication (lower 32 bits of result)
 * Compiles to: mul a0, a0, a1
 */
int32_t test_mul(int32_t a, int32_t b) {
    return a * b;
}

/**
 * Unsigned 32-bit multiplication
 * Compiles to: mul a0, a0, a1
 */
uint32_t test_mulu(uint32_t a, uint32_t b) {
    return a * b;
}

/**
 * Full 64-bit result from 32x32 signed multiplication
 * Uses: mul (low) + mulh (high)
 */
int64_t test_mul_full_signed(int32_t a, int32_t b) {
    return (int64_t)a * (int64_t)b;
}

/**
 * Full 64-bit result from 32x32 unsigned multiplication
 * Uses: mul (low) + mulhu (high)
 */
uint64_t test_mul_full_unsigned(uint32_t a, uint32_t b) {
    return (uint64_t)a * (uint64_t)b;
}

/**
 * Upper 32 bits of signed multiplication (MULH)
 * Useful for fixed-point math
 * Compiles to: mulh a0, a0, a1
 */
int32_t test_mulh(int32_t a, int32_t b) {
    int64_t result = (int64_t)a * (int64_t)b;
    return (int32_t)(result >> 32);
}

/**
 * Upper 32 bits of unsigned multiplication (MULHU)
 * Compiles to: mulhu a0, a0, a1
 */
uint32_t test_mulhu(uint32_t a, uint32_t b) {
    uint64_t result = (uint64_t)a * (uint64_t)b;
    return (uint32_t)(result >> 32);
}

/* ============================================================================
 * Division (DIV, DIVU)
 * ============================================================================ */

/**
 * Signed division
 * Compiles to: div a0, a0, a1
 */
int32_t test_div(int32_t a, int32_t b) {
    if (b == 0) return -1;  // Avoid division by zero
    return a / b;
}

/**
 * Unsigned division
 * Compiles to: divu a0, a0, a1
 */
uint32_t test_divu(uint32_t a, uint32_t b) {
    if (b == 0) return 0xFFFFFFFF;  // Avoid division by zero
    return a / b;
}

/* ============================================================================
 * Remainder (REM, REMU)
 * ============================================================================ */

/**
 * Signed remainder (modulo)
 * Compiles to: rem a0, a0, a1
 */
int32_t test_rem(int32_t a, int32_t b) {
    if (b == 0) return a;  // Avoid division by zero
    return a % b;
}

/**
 * Unsigned remainder (modulo)
 * Compiles to: remu a0, a0, a1
 */
uint32_t test_remu(uint32_t a, uint32_t b) {
    if (b == 0) return a;  // Avoid division by zero
    return a % b;
}

/* ============================================================================
 * Practical Examples
 * ============================================================================ */

/**
 * Check if a number is even
 * Uses: andi (no M extension needed, but good example)
 */
int is_even(int n) {
    return (n & 1) == 0;
}

/**
 * Check if a number is divisible by another
 * Uses: rem
 */
int is_divisible(int n, int divisor) {
    if (divisor == 0) return 0;
    return (n % divisor) == 0;
}

/**
 * Greatest Common Divisor (Euclidean algorithm)
 * Uses: rem
 */
uint32_t gcd(uint32_t a, uint32_t b) {
    while (b != 0) {
        uint32_t temp = b;
        b = a % b;
        a = temp;
    }
    return a;
}

/**
 * Least Common Multiple
 * Uses: mul, div
 */
uint32_t lcm(uint32_t a, uint32_t b) {
    if (a == 0 || b == 0) return 0;
    return (a / gcd(a, b)) * b;  // Divide first to avoid overflow
}

/**
 * Integer power (a^n)
 * Uses: mul
 */
uint32_t power(uint32_t base, uint32_t exp) {
    uint32_t result = 1;
    while (exp > 0) {
        if (exp & 1) {
            result *= base;
        }
        base *= base;
        exp >>= 1;
    }
    return result;
}

/**
 * Integer square root (floor)
 * Uses: mul
 */
uint32_t isqrt(uint32_t n) {
    if (n < 2) return n;
    
    uint32_t x = n;
    uint32_t y = (x + 1) / 2;
    
    while (y < x) {
        x = y;
        y = (x + n / x) / 2;
    }
    return x;
}

/**
 * Factorial (n!)
 * Uses: mul
 */
uint32_t factorial(uint32_t n) {
    uint32_t result = 1;
    for (uint32_t i = 2; i <= n; i++) {
        result *= i;
    }
    return result;
}

/**
 * Fibonacci number
 * Uses: mul (in some optimized versions)
 */
uint32_t fibonacci(uint32_t n) {
    if (n <= 1) return n;
    
    uint32_t a = 0, b = 1;
    for (uint32_t i = 2; i <= n; i++) {
        uint32_t temp = a + b;
        a = b;
        b = temp;
    }
    return b;
}

/**
 * Fixed-point multiplication (Q16.16 format)
 * Uses: mul, mulh (or 64-bit multiply + shift)
 * 
 * In Q16.16: integer is upper 16 bits, fraction is lower 16 bits
 * Example: 1.5 = 0x00018000, 2.25 = 0x00024000
 */
int32_t fixed_mul(int32_t a, int32_t b) {
    int64_t result = (int64_t)a * (int64_t)b;
    return (int32_t)(result >> 16);
}

/**
 * Fixed-point division (Q16.16 format)
 * Uses: div
 */
int32_t fixed_div(int32_t a, int32_t b) {
    if (b == 0) return 0;
    int64_t temp = ((int64_t)a << 16);
    return (int32_t)(temp / b);
}

/**
 * Convert float to Q16.16 fixed-point
 */
int32_t float_to_fixed(float f) {
    return (int32_t)(f * 65536.0f);
}

/**
 * Convert Q16.16 fixed-point to integer
 */
int32_t fixed_to_int(int32_t fixed) {
    return fixed >> 16;
}

/* ============================================================================
 * Main - Exercise all functions
 * ============================================================================ */

int main(void) {
    volatile int32_t result = 0;
    
    // Basic multiplication
    result += test_mul(123, 456);
    result += test_mulu(1000, 2000);
    result += test_mulh(0x7FFFFFFF, 2);
    result += test_mulhu(0xFFFFFFFF, 2);
    
    // Division
    result += test_div(100, 7);
    result += test_divu(100, 7);
    
    // Remainder
    result += test_rem(100, 7);
    result += test_remu(100, 7);
    
    // Practical examples
    result += is_even(42);
    result += is_divisible(100, 5);
    result += gcd(48, 18);           // 6
    result += lcm(4, 6);             // 12
    result += power(2, 10);          // 1024
    result += isqrt(100);            // 10
    result += factorial(5);          // 120
    result += fibonacci(10);         // 55
    
    // Fixed-point math
    int32_t fp_a = float_to_fixed(1.5f);
    int32_t fp_b = float_to_fixed(2.5f);
    int32_t fp_result = fixed_mul(fp_a, fp_b);
    result += fixed_to_int(fp_result);  // 3 (1.5 * 2.5 = 3.75 -> 3)
    
    return result;
}
