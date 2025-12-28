/*
 * atomic_test.c - A Extension Test (Atomic Operations)
 * 
 * Demonstrates:
 *   - LR/SC (Load-Reserved / Store-Conditional)
 *   - AMO (Atomic Memory Operations): swap, add, and, or, xor, min, max
 * 
 * Build:
 *   rv build examples/atomic_test.c --arch 32ima
 * 
 * Verify instructions:
 *   rv dump build/atomic_test.elf --grep "lr.w\|sc.w"
 *   rv dump build/atomic_test.elf --grep "amo"
 * 
 * Note: These operations are essential for multi-threaded/multi-hart systems
 * and are used to implement locks, semaphores, and other synchronization primitives.
 */

#include <stdint.h>

/* ============================================================================
 * Load-Reserved / Store-Conditional (LR/SC)
 * ============================================================================
 * 
 * LR.W: Load word and reserve the address
 * SC.W: Store word if reservation is still valid
 * 
 * This pair allows implementing any atomic read-modify-write operation.
 * SC.W returns 0 on success, non-zero on failure (reservation lost).
 */

/**
 * Compare-and-Swap (CAS) using LR/SC
 * Atomically: if (*ptr == expected) { *ptr = desired; return 1; } else return 0;
 */
int atomic_cas(volatile int32_t *ptr, int32_t expected, int32_t desired) {
    int32_t tmp;
    int result;
    
    __asm__ volatile (
        "1:\n\t"
        "lr.w   %0, (%2)\n\t"       // Load-reserved: tmp = *ptr
        "bne    %0, %3, 2f\n\t"     // If tmp != expected, fail
        "sc.w   %1, %4, (%2)\n\t"   // Store-conditional: *ptr = desired
        "bnez   %1, 1b\n\t"         // If SC failed, retry
        "li     %1, 1\n\t"          // Success: result = 1
        "j      3f\n\t"
        "2:\n\t"
        "li     %1, 0\n\t"          // Failure: result = 0
        "3:\n\t"
        : "=&r"(tmp), "=&r"(result)
        : "r"(ptr), "r"(expected), "r"(desired)
        : "memory"
    );
    
    return result;
}

/**
 * Atomic fetch-and-add using LR/SC
 * Atomically: old = *ptr; *ptr += val; return old;
 */
int32_t atomic_fetch_add_lrsc(volatile int32_t *ptr, int32_t val) {
    int32_t old, tmp;
    int sc_result;
    
    __asm__ volatile (
        "1:\n\t"
        "lr.w   %0, (%3)\n\t"       // Load-reserved: old = *ptr
        "add    %1, %0, %4\n\t"     // tmp = old + val
        "sc.w   %2, %1, (%3)\n\t"   // Store-conditional: *ptr = tmp
        "bnez   %2, 1b\n\t"         // If SC failed, retry
        : "=&r"(old), "=&r"(tmp), "=&r"(sc_result)
        : "r"(ptr), "r"(val)
        : "memory"
    );
    
    return old;
}

/* ============================================================================
 * Atomic Memory Operations (AMO)
 * ============================================================================
 * 
 * These are single-instruction atomic operations.
 * Format: AMO<op>.W rd, rs2, (rs1)
 * Atomically: rd = *rs1; *rs1 = op(rd, rs2);
 */

/**
 * Atomic swap
 * Atomically: old = *ptr; *ptr = val; return old;
 * Compiles to: amoswap.w a0, a1, (a0)
 */
int32_t atomic_swap(volatile int32_t *ptr, int32_t val) {
    int32_t old;
    __asm__ volatile (
        "amoswap.w %0, %1, (%2)"
        : "=r"(old)
        : "r"(val), "r"(ptr)
        : "memory"
    );
    return old;
}

/**
 * Atomic add
 * Atomically: old = *ptr; *ptr += val; return old;
 * Compiles to: amoadd.w a0, a1, (a0)
 */
int32_t atomic_add(volatile int32_t *ptr, int32_t val) {
    int32_t old;
    __asm__ volatile (
        "amoadd.w %0, %1, (%2)"
        : "=r"(old)
        : "r"(val), "r"(ptr)
        : "memory"
    );
    return old;
}

/**
 * Atomic AND
 * Atomically: old = *ptr; *ptr &= val; return old;
 * Compiles to: amoand.w a0, a1, (a0)
 */
int32_t atomic_and(volatile int32_t *ptr, int32_t val) {
    int32_t old;
    __asm__ volatile (
        "amoand.w %0, %1, (%2)"
        : "=r"(old)
        : "r"(val), "r"(ptr)
        : "memory"
    );
    return old;
}

/**
 * Atomic OR
 * Atomically: old = *ptr; *ptr |= val; return old;
 * Compiles to: amoor.w a0, a1, (a0)
 */
int32_t atomic_or(volatile int32_t *ptr, int32_t val) {
    int32_t old;
    __asm__ volatile (
        "amoor.w %0, %1, (%2)"
        : "=r"(old)
        : "r"(val), "r"(ptr)
        : "memory"
    );
    return old;
}

/**
 * Atomic XOR
 * Atomically: old = *ptr; *ptr ^= val; return old;
 * Compiles to: amoxor.w a0, a1, (a0)
 */
int32_t atomic_xor(volatile int32_t *ptr, int32_t val) {
    int32_t old;
    __asm__ volatile (
        "amoxor.w %0, %1, (%2)"
        : "=r"(old)
        : "r"(val), "r"(ptr)
        : "memory"
    );
    return old;
}

/**
 * Atomic signed minimum
 * Atomically: old = *ptr; *ptr = min(*ptr, val); return old;
 * Compiles to: amomin.w a0, a1, (a0)
 */
int32_t atomic_min(volatile int32_t *ptr, int32_t val) {
    int32_t old;
    __asm__ volatile (
        "amomin.w %0, %1, (%2)"
        : "=r"(old)
        : "r"(val), "r"(ptr)
        : "memory"
    );
    return old;
}

/**
 * Atomic signed maximum
 * Atomically: old = *ptr; *ptr = max(*ptr, val); return old;
 * Compiles to: amomax.w a0, a1, (a0)
 */
int32_t atomic_max(volatile int32_t *ptr, int32_t val) {
    int32_t old;
    __asm__ volatile (
        "amomax.w %0, %1, (%2)"
        : "=r"(old)
        : "r"(val), "r"(ptr)
        : "memory"
    );
    return old;
}

/**
 * Atomic unsigned minimum
 * Compiles to: amominu.w a0, a1, (a0)
 */
uint32_t atomic_minu(volatile uint32_t *ptr, uint32_t val) {
    uint32_t old;
    __asm__ volatile (
        "amominu.w %0, %1, (%2)"
        : "=r"(old)
        : "r"(val), "r"(ptr)
        : "memory"
    );
    return old;
}

/**
 * Atomic unsigned maximum
 * Compiles to: amomaxu.w a0, a1, (a0)
 */
uint32_t atomic_maxu(volatile uint32_t *ptr, uint32_t val) {
    uint32_t old;
    __asm__ volatile (
        "amomaxu.w %0, %1, (%2)"
        : "=r"(old)
        : "r"(val), "r"(ptr)
        : "memory"
    );
    return old;
}

/* ============================================================================
 * Practical Synchronization Primitives
 * ============================================================================ */

/**
 * Simple spinlock
 */
typedef volatile int32_t spinlock_t;

#define SPINLOCK_UNLOCKED 0
#define SPINLOCK_LOCKED   1

/**
 * Initialize spinlock
 */
void spinlock_init(spinlock_t *lock) {
    *lock = SPINLOCK_UNLOCKED;
}

/**
 * Acquire spinlock (blocking)
 * Uses amoswap to atomically try to acquire
 */
void spinlock_lock(spinlock_t *lock) {
    while (atomic_swap(lock, SPINLOCK_LOCKED) == SPINLOCK_LOCKED) {
        // Spin until we acquire the lock
        // In real code, add a pause/yield here
    }
}

/**
 * Try to acquire spinlock (non-blocking)
 * Returns 1 if acquired, 0 if already locked
 */
int spinlock_trylock(spinlock_t *lock) {
    return atomic_swap(lock, SPINLOCK_LOCKED) == SPINLOCK_UNLOCKED;
}

/**
 * Release spinlock
 */
void spinlock_unlock(spinlock_t *lock) {
    *lock = SPINLOCK_UNLOCKED;
    __asm__ volatile ("fence" ::: "memory");  // Ensure visibility
}

/**
 * Atomic counter
 */
typedef volatile int32_t atomic_int_t;

void atomic_store(atomic_int_t *ptr, int32_t val) {
    *ptr = val;
    __asm__ volatile ("fence" ::: "memory");
}

int32_t atomic_load(atomic_int_t *ptr) {
    __asm__ volatile ("fence" ::: "memory");
    return *ptr;
}

int32_t atomic_increment(atomic_int_t *ptr) {
    return atomic_add(ptr, 1);
}

int32_t atomic_decrement(atomic_int_t *ptr) {
    return atomic_add(ptr, -1);
}

/**
 * Semaphore (simplified)
 */
typedef struct {
    atomic_int_t count;
    spinlock_t lock;
} semaphore_t;

void semaphore_init(semaphore_t *sem, int initial_count) {
    atomic_store(&sem->count, initial_count);
    spinlock_init(&sem->lock);
}

/**
 * Wait on semaphore (decrement, blocking)
 */
void semaphore_wait(semaphore_t *sem) {
    while (1) {
        int32_t count = atomic_load(&sem->count);
        if (count > 0 && atomic_cas(&sem->count, count, count - 1)) {
            break;
        }
        // Spin (in real code, would yield/sleep)
    }
}

/**
 * Signal semaphore (increment)
 */
void semaphore_signal(semaphore_t *sem) {
    atomic_add(&sem->count, 1);
}

/* ============================================================================
 * Main - Exercise all functions
 * ============================================================================ */

int main(void) {
    // Aligned storage for atomic operations
    volatile int32_t __attribute__((aligned(4))) counter = 0;
    volatile int32_t __attribute__((aligned(4))) shared_val = 100;
    volatile uint32_t __attribute__((aligned(4))) unsigned_val = 50;
    
    int32_t result = 0;
    
    // Test atomic swap
    result += atomic_swap(&shared_val, 200);  // Returns 100, shared_val = 200
    
    // Test atomic add
    result += atomic_add(&counter, 10);       // Returns 0, counter = 10
    result += atomic_add(&counter, 5);        // Returns 10, counter = 15
    
    // Test atomic bitwise ops
    shared_val = 0xFF;
    result += atomic_and(&shared_val, 0x0F);  // Returns 0xFF, shared_val = 0x0F
    result += atomic_or(&shared_val, 0xF0);   // Returns 0x0F, shared_val = 0xFF
    result += atomic_xor(&shared_val, 0x55);  // Returns 0xFF, shared_val = 0xAA
    
    // Test atomic min/max
    shared_val = 50;
    result += atomic_min(&shared_val, 30);    // Returns 50, shared_val = 30
    result += atomic_max(&shared_val, 40);    // Returns 30, shared_val = 40
    
    // Test unsigned min/max
    result += atomic_minu(&unsigned_val, 25); // Returns 50, unsigned_val = 25
    result += atomic_maxu(&unsigned_val, 75); // Returns 25, unsigned_val = 75
    
    // Test CAS
    shared_val = 100;
    result += atomic_cas(&shared_val, 100, 200);  // Success: returns 1
    result += atomic_cas(&shared_val, 100, 300);  // Fail: returns 0 (val is 200)
    
    // Test LR/SC fetch-add
    result += atomic_fetch_add_lrsc(&counter, 5);
    
    // Test spinlock
    spinlock_t lock;
    spinlock_init(&lock);
    spinlock_lock(&lock);
    counter += 1;
    spinlock_unlock(&lock);
    
    // Test trylock
    if (spinlock_trylock(&lock)) {
        counter += 1;
        spinlock_unlock(&lock);
    }
    
    // Test semaphore
    semaphore_t sem;
    semaphore_init(&sem, 1);
    semaphore_wait(&sem);
    counter += 1;
    semaphore_signal(&sem);
    
    result += counter;
    
    return result;
}
