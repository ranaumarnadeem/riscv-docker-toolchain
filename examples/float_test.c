/*
 * float_test.c - Floating-Point Extension Test (F/D)
 * 
 * Demonstrates:
 *   - F Extension: Single-precision (float) operations
 *   - D Extension: Double-precision (double) operations
 * 
 * Build (single-precision only):
 *   rv build examples/float_test.c --arch 32imafc
 * 
 * Build (single + double precision):
 *   rv build examples/float_test.c --arch 32imafdc
 * 
 * Verify instructions:
 *   rv dump build/float_test.elf --grep fadd
 *   rv dump build/float_test.elf --grep fmul
 *   rv dump build/float_test.elf --grep fsqrt
 */

#include <stdint.h>

/* ============================================================================
 * F Extension (Single-Precision) Tests
 * ============================================================================ */

/**
 * Floating-point addition
 * Compiles to: fadd.s fa0, fa0, fa1
 */
float test_fadd(float a, float b) {
    return a + b;
}

/**
 * Floating-point subtraction
 * Compiles to: fsub.s fa0, fa0, fa1
 */
float test_fsub(float a, float b) {
    return a - b;
}

/**
 * Floating-point multiplication
 * Compiles to: fmul.s fa0, fa0, fa1
 */
float test_fmul(float a, float b) {
    return a * b;
}

/**
 * Floating-point division
 * Compiles to: fdiv.s fa0, fa0, fa1
 */
float test_fdiv(float a, float b) {
    return a / b;
}

/**
 * Floating-point square root
 * Compiles to: fsqrt.s fa0, fa0
 */
float test_fsqrt(float a) {
    // Manual Newton-Raphson approximation to avoid libm
    if (a <= 0.0f) return 0.0f;
    
    float x = a;
    float y = 1.0f;
    float epsilon = 0.00001f;
    
    while (x - y > epsilon) {
        x = (x + y) / 2.0f;
        y = a / x;
    }
    return x;
}

/**
 * Fused Multiply-Add (FMA)
 * Computes (a * b) + c in one operation with single rounding
 * Compiles to: fmadd.s fa0, fa0, fa1, fa2
 */
float test_fmadd(float a, float b, float c) {
    return a * b + c;
}

/**
 * Fused Multiply-Subtract
 * Computes (a * b) - c
 * Compiles to: fmsub.s fa0, fa0, fa1, fa2
 */
float test_fmsub(float a, float b, float c) {
    return a * b - c;
}

/**
 * Floating-point minimum
 * Compiles to: fmin.s fa0, fa0, fa1
 */
float test_fmin(float a, float b) {
    return (a < b) ? a : b;
}

/**
 * Floating-point maximum
 * Compiles to: fmax.s fa0, fa0, fa1
 */
float test_fmax(float a, float b) {
    return (a > b) ? a : b;
}

/**
 * Floating-point absolute value
 * Compiles to: fabs.s (pseudo-instruction) or fsgnjx.s
 */
float test_fabs(float a) {
    return (a < 0.0f) ? -a : a;
}

/**
 * Floating-point negation
 * Compiles to: fneg.s (pseudo-instruction) or fsgnjn.s
 */
float test_fneg(float a) {
    return -a;
}

/**
 * Float to integer conversion
 * Compiles to: fcvt.w.s a0, fa0
 */
int test_float_to_int(float a) {
    return (int)a;
}

/**
 * Integer to float conversion
 * Compiles to: fcvt.s.w fa0, a0
 */
float test_int_to_float(int a) {
    return (float)a;
}

/**
 * Float comparison (less than)
 * Compiles to: flt.s a0, fa0, fa1
 */
int test_flt(float a, float b) {
    return a < b;
}

/**
 * Float comparison (less than or equal)
 * Compiles to: fle.s a0, fa0, fa1
 */
int test_fle(float a, float b) {
    return a <= b;
}

/**
 * Float comparison (equal)
 * Compiles to: feq.s a0, fa0, fa1
 */
int test_feq(float a, float b) {
    return a == b;
}

/* ============================================================================
 * D Extension (Double-Precision) Tests - Only with 32imafdc or 64imafdc
 * ============================================================================ */

#ifdef __riscv_fdiv  // Check if D extension is available

/**
 * Double-precision addition
 * Compiles to: fadd.d fa0, fa0, fa1
 */
double test_dadd(double a, double b) {
    return a + b;
}

/**
 * Double-precision multiplication
 * Compiles to: fmul.d fa0, fa0, fa1
 */
double test_dmul(double a, double b) {
    return a * b;
}

/**
 * Double-precision division
 * Compiles to: fdiv.d fa0, fa0, fa1
 */
double test_ddiv(double a, double b) {
    return a / b;
}

/**
 * Float to double conversion
 * Compiles to: fcvt.d.s fa0, fa0
 */
double test_float_to_double(float a) {
    return (double)a;
}

/**
 * Double to float conversion
 * Compiles to: fcvt.s.d fa0, fa0
 */
float test_double_to_float(double a) {
    return (float)a;
}

#endif

/* ============================================================================
 * Practical Examples
 * ============================================================================ */

/**
 * Dot product of two vectors (common in graphics/ML)
 */
float dot_product_3d(float *a, float *b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/**
 * Linear interpolation (lerp)
 */
float lerp(float a, float b, float t) {
    return a + t * (b - a);  // Uses FMA: fmadd.s
}

/**
 * Simple 2D distance (without sqrt for performance)
 */
float distance_squared(float x1, float y1, float x2, float y2) {
    float dx = x2 - x1;
    float dy = y2 - y1;
    return dx * dx + dy * dy;  // Uses FMA
}

/**
 * Clamp value to range
 */
float clamp(float val, float min_val, float max_val) {
    if (val < min_val) return min_val;
    if (val > max_val) return max_val;
    return val;
}

/**
 * Simple moving average filter
 */
float moving_average(float *samples, int count) {
    float sum = 0.0f;
    for (int i = 0; i < count; i++) {
        sum += samples[i];
    }
    return sum / (float)count;
}

/* ============================================================================
 * Main - Exercise all functions
 * ============================================================================ */

int main(void) {
    volatile float a = 3.14159f;
    volatile float b = 2.71828f;
    volatile float c = 1.41421f;
    volatile float result = 0.0f;
    
    // Basic operations
    result += test_fadd(a, b);
    result += test_fsub(a, b);
    result += test_fmul(a, b);
    result += test_fdiv(a, b);
    result += test_fsqrt(a);
    
    // FMA operations
    result += test_fmadd(a, b, c);
    result += test_fmsub(a, b, c);
    
    // Min/Max/Abs
    result += test_fmin(a, b);
    result += test_fmax(a, b);
    result += test_fabs(-a);
    result += test_fneg(a);
    
    // Conversions
    volatile int i = test_float_to_int(a);
    result += test_int_to_float(i);
    
    // Comparisons
    volatile int cmp = 0;
    cmp += test_flt(a, b);
    cmp += test_fle(a, b);
    cmp += test_feq(a, a);
    
    // Practical examples
    volatile float vec_a[3] = {1.0f, 2.0f, 3.0f};
    volatile float vec_b[3] = {4.0f, 5.0f, 6.0f};
    result += dot_product_3d((float*)vec_a, (float*)vec_b);
    result += lerp(0.0f, 10.0f, 0.5f);
    result += distance_squared(0.0f, 0.0f, 3.0f, 4.0f);
    result += clamp(15.0f, 0.0f, 10.0f);
    
    volatile float samples[5] = {1.0f, 2.0f, 3.0f, 4.0f, 5.0f};
    result += moving_average((float*)samples, 5);
    
    return (int)result;
}
