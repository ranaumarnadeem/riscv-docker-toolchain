/*
 * compressed_test.c - C Extension Test (Compressed Instructions)
 * 
 * Demonstrates:
 *   - Code that benefits from compressed (16-bit) instructions
 *   - Common patterns that generate compressed code
 * 
 * Build WITHOUT compression:
 *   rv build examples/compressed_test.c --arch 32im -o build/no_compress.elf
 * 
 * Build WITH compression:
 *   rv build examples/compressed_test.c --arch 32imc -o build/compressed.elf
 * 
 * Compare sizes (inside container shell):
 *   size build/no_compress.elf build/compressed.elf
 * 
 * The compressed version should be 25-30% smaller!
 * 
 * Note: The C extension doesn't add new functionality - it provides
 * 16-bit encodings for common 32-bit instructions, reducing code size.
 * The compiler automatically uses compressed instructions when beneficial.
 */

#include <stdint.h>

/* ============================================================================
 * Common patterns that benefit from C extension
 * ============================================================================
 * 
 * Compressed instructions include:
 *   - c.addi, c.addi16sp, c.addi4spn (stack operations)
 *   - c.li, c.lui (load immediate)
 *   - c.lw, c.sw (load/store using sp or common registers)
 *   - c.mv (move)
 *   - c.add (add)
 *   - c.j, c.jal, c.jr, c.jalr (jumps)
 *   - c.beqz, c.bnez (conditional branches)
 *   - c.slli, c.srli, c.srai (shifts)
 *   - c.and, c.or, c.xor, c.sub (bitwise, subtract)
 *   - c.nop (no-operation)
 */

/* ============================================================================
 * Stack-heavy code (benefits from c.addi16sp, c.addi4spn)
 * ============================================================================ */

/**
 * Function with many local variables
 * Stack frame setup uses compressed instructions
 */
int many_locals(int input) {
    int a = input + 1;
    int b = a + 2;
    int c = b + 3;
    int d = c + 4;
    int e = d + 5;
    int f = e + 6;
    int g = f + 7;
    int h = g + 8;
    return a + b + c + d + e + f + g + h;
}

/**
 * Deep call stack
 * Returns use c.jr ra
 */
int level4(int x) { return x + 4; }
int level3(int x) { return level4(x) + 3; }
int level2(int x) { return level3(x) + 2; }
int level1(int x) { return level2(x) + 1; }

/* ============================================================================
 * Small immediate operations (benefits from c.li, c.addi)
 * ============================================================================ */

/**
 * Small constant operations
 * Uses c.li for loading small immediates (-32 to 31)
 */
int small_constants(int x) {
    x += 5;
    x -= 3;
    x += 15;
    x -= 10;
    return x;
}

/**
 * Increment/decrement patterns
 * Uses c.addi
 */
int increment_decrement(int x) {
    x++;
    x++;
    x--;
    x++;
    return x;
}

/* ============================================================================
 * Register moves (benefits from c.mv)
 * ============================================================================ */

/**
 * Many register-to-register moves
 * Uses c.mv
 */
int register_moves(int a, int b, int c, int d) {
    int t1 = a;
    int t2 = b;
    a = c;
    b = d;
    c = t1;
    d = t2;
    return a + b + c + d;
}

/* ============================================================================
 * Branches and loops (benefits from c.beqz, c.bnez, c.j)
 * ============================================================================ */

/**
 * Simple loop with branch
 * Uses c.beqz, c.bnez, c.j
 */
int simple_loop(int n) {
    int sum = 0;
    while (n > 0) {
        sum += n;
        n--;
    }
    return sum;
}

/**
 * Conditional with zero comparison
 * Uses c.beqz, c.bnez
 */
int null_check(int *ptr) {
    if (ptr == 0) {
        return -1;
    }
    return *ptr;
}

/**
 * Multiple zero comparisons
 */
int multi_zero_check(int a, int b, int c) {
    if (a == 0) return 1;
    if (b == 0) return 2;
    if (c == 0) return 3;
    return 0;
}

/* ============================================================================
 * Shifts (benefits from c.slli, c.srli, c.srai)
 * ============================================================================ */

/**
 * Shift operations with small amounts
 * Uses c.slli, c.srli, c.srai
 */
int shift_operations(int x) {
    x <<= 2;    // c.slli
    x >>= 1;    // c.srai (arithmetic) or c.srli (logical for unsigned)
    x <<= 4;    // c.slli
    return x;
}

/**
 * Power of 2 multiplication/division
 */
int power_of_2_ops(int x) {
    int doubled = x << 1;       // x * 2
    int quadrupled = x << 2;    // x * 4
    int halved = x >> 1;        // x / 2
    return doubled + quadrupled + halved;
}

/* ============================================================================
 * Bitwise operations (benefits from c.and, c.or, c.xor)
 * ============================================================================ */

/**
 * Bitwise operations
 * Uses c.and, c.or, c.xor
 */
int bitwise_ops(int a, int b) {
    int r1 = a & b;
    int r2 = a | b;
    int r3 = a ^ b;
    return r1 + r2 + r3;
}

/**
 * Mask operations
 */
uint32_t mask_operations(uint32_t x) {
    x &= 0xFF;          // Keep lower 8 bits
    x |= 0x100;         // Set bit 8
    x ^= 0x01;          // Toggle bit 0
    return x;
}

/* ============================================================================
 * Load/Store patterns (benefits from c.lw, c.sw)
 * ============================================================================ */

/**
 * Array access with small offsets
 * Uses c.lw, c.sw with sp-relative or register-relative addressing
 */
int array_access(int *arr) {
    int sum = 0;
    sum += arr[0];
    sum += arr[1];
    sum += arr[2];
    sum += arr[3];
    return sum;
}

/**
 * Structure access
 */
typedef struct {
    int x;
    int y;
    int z;
    int w;
} Point4D;

int struct_access(Point4D *p) {
    return p->x + p->y + p->z + p->w;
}

/* ============================================================================
 * Practical example: Bubble sort (combines many patterns)
 * ============================================================================ */

void bubble_sort(int *arr, int n) {
    for (int i = 0; i < n - 1; i++) {
        for (int j = 0; j < n - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                // Swap
                int temp = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = temp;
            }
        }
    }
}

/* ============================================================================
 * Practical example: memcpy (combines many patterns)
 * ============================================================================ */

void *simple_memcpy(void *dest, const void *src, uint32_t n) {
    uint8_t *d = (uint8_t *)dest;
    const uint8_t *s = (const uint8_t *)src;
    
    while (n--) {
        *d++ = *s++;
    }
    
    return dest;
}

/* ============================================================================
 * Practical example: strlen
 * ============================================================================ */

uint32_t simple_strlen(const char *s) {
    uint32_t len = 0;
    while (*s++) {
        len++;
    }
    return len;
}

/* ============================================================================
 * Main - Exercise all functions
 * ============================================================================ */

int main(void) {
    volatile int result = 0;
    
    // Stack-heavy code
    result += many_locals(1);
    result += level1(0);
    
    // Small immediates
    result += small_constants(10);
    result += increment_decrement(5);
    
    // Register moves
    result += register_moves(1, 2, 3, 4);
    
    // Branches and loops
    result += simple_loop(10);
    volatile int val = 42;
    result += null_check((int*)&val);
    result += multi_zero_check(1, 2, 3);
    result += multi_zero_check(0, 2, 3);
    
    // Shifts
    result += shift_operations(8);
    result += power_of_2_ops(16);
    
    // Bitwise
    result += bitwise_ops(0xFF, 0x0F);
    result += mask_operations(0x12345678);
    
    // Load/Store
    int arr[] = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10};
    result += array_access(arr);
    
    Point4D point = {10, 20, 30, 40};
    result += struct_access(&point);
    
    // Bubble sort
    int unsorted[] = {5, 3, 8, 1, 9, 2, 7, 4, 6, 0};
    bubble_sort(unsorted, 10);
    result += unsorted[0];  // Should be 0 after sort
    result += unsorted[9];  // Should be 9 after sort
    
    // String operations
    const char *str = "Hello, RISC-V!";
    result += simple_strlen(str);
    
    // Memcpy
    char dest[16];
    simple_memcpy(dest, str, 14);
    result += dest[0];
    
    return result;
}
