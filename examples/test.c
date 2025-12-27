// examples/test.c
#include <stdint.h>

// --- TEST 1: Zbb (Bit Manipulation) ---
// The compiler should replace this with a single 'clz' instruction
int test_zbb_clz(int val) {
    return __builtin_clz(val);
}

// --- TEST 2: Zba (Address Generation) ---
// Zba accelerates array indexing.
// Accessing an integer array (4 bytes per element) typically requires:
// 1. Shift index by 2 (multiply by 4)
// 2. Add to base address
// Zba does this in ONE instruction: 'sh2add'
int test_zba_addressing(int *base_addr, int index) {
    return base_addr[index];
}

// Dummy main to make the linker happy
int main() {
    volatile int a = 0x00F0;
    volatile int arr[10] = {0};
    
    test_zbb_clz(a);
    test_zba_addressing((int*)arr, 5);
    
    return 0;
}