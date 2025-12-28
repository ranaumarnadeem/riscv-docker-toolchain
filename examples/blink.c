/*
 * blink.c - LED Blink Example for RISC-V Microcontrollers
 * 
 * Demonstrates:
 *   - Memory-mapped I/O for GPIO control
 *   - Bare-metal programming without OS
 *   - Basic embedded patterns for RISC-V
 * 
 * Build:
 *   rv build examples/blink.c --arch 32imac
 * 
 * Target: Generic RISC-V MCU (adjust GPIO addresses for your board)
 */

#include <stdint.h>

/* ============================================================================
 * CONFIGURATION - Adjust these for your specific board/MCU
 * ============================================================================ */

// GPIO Configuration (example addresses - modify for your target)
// Common targets:
//   - SiFive FE310:     0x10012000
//   - ESP32-C3:         0x60004000
//   - GD32VF103:        0x40010800 (GPIOA)
#define GPIO_BASE       0x10012000

// GPIO Register Offsets (typical for SiFive-style GPIO)
#define GPIO_INPUT_VAL  (*(volatile uint32_t *)(GPIO_BASE + 0x00))
#define GPIO_INPUT_EN   (*(volatile uint32_t *)(GPIO_BASE + 0x04))
#define GPIO_OUTPUT_EN  (*(volatile uint32_t *)(GPIO_BASE + 0x08))
#define GPIO_OUTPUT_VAL (*(volatile uint32_t *)(GPIO_BASE + 0x0C))
#define GPIO_PUE        (*(volatile uint32_t *)(GPIO_BASE + 0x10))  // Pull-up enable
#define GPIO_IOF_EN     (*(volatile uint32_t *)(GPIO_BASE + 0x38))  // I/O function enable

// LED Configuration
#define LED_PIN         5
#define LED_MASK        (1U << LED_PIN)

// Timing (adjust based on your clock frequency)
#define DELAY_COUNT     500000

/* ============================================================================
 * DELAY FUNCTIONS
 * ============================================================================ */

/**
 * Simple busy-wait delay
 * NOTE: For production, use hardware timers (MTIME/MTIMECMP) instead
 */
static inline void delay(uint32_t count) {
    for (volatile uint32_t i = 0; i < count; i++) {
        __asm__ volatile ("nop");
    }
}

/**
 * More accurate delay using NOP sled
 * Each iteration is approximately 3-4 cycles
 */
static inline void delay_cycles(uint32_t cycles) {
    cycles >>= 2;  // Divide by ~4 for loop overhead
    while (cycles--) {
        __asm__ volatile (
            "nop\n\t"
            "nop\n\t"
            "nop\n\t"
            "nop\n\t"
        );
    }
}

/* ============================================================================
 * GPIO FUNCTIONS
 * ============================================================================ */

/**
 * Initialize GPIO pin as output
 */
static void gpio_init_output(uint32_t pin_mask) {
    GPIO_IOF_EN &= ~pin_mask;     // Disable I/O functions (use as GPIO)
    GPIO_INPUT_EN &= ~pin_mask;   // Disable input
    GPIO_OUTPUT_EN |= pin_mask;   // Enable output
}

/**
 * Set GPIO pin high
 */
static inline void gpio_set(uint32_t pin_mask) {
    GPIO_OUTPUT_VAL |= pin_mask;
}

/**
 * Set GPIO pin low
 */
static inline void gpio_clear(uint32_t pin_mask) {
    GPIO_OUTPUT_VAL &= ~pin_mask;
}

/**
 * Toggle GPIO pin
 */
static inline void gpio_toggle(uint32_t pin_mask) {
    GPIO_OUTPUT_VAL ^= pin_mask;
}

/* ============================================================================
 * BLINK PATTERNS
 * ============================================================================ */

/**
 * Simple on/off blink
 */
static void blink_simple(uint32_t on_time, uint32_t off_time) {
    gpio_set(LED_MASK);
    delay(on_time);
    gpio_clear(LED_MASK);
    delay(off_time);
}

/**
 * SOS pattern (... --- ...)
 */
static void blink_sos(void) {
    // S: three short
    for (int i = 0; i < 3; i++) {
        blink_simple(DELAY_COUNT / 4, DELAY_COUNT / 4);
    }
    delay(DELAY_COUNT / 2);
    
    // O: three long
    for (int i = 0; i < 3; i++) {
        blink_simple(DELAY_COUNT, DELAY_COUNT / 4);
    }
    delay(DELAY_COUNT / 2);
    
    // S: three short
    for (int i = 0; i < 3; i++) {
        blink_simple(DELAY_COUNT / 4, DELAY_COUNT / 4);
    }
    delay(DELAY_COUNT * 2);
}

/**
 * Heartbeat pattern (two quick blinks)
 */
static void blink_heartbeat(void) {
    blink_simple(DELAY_COUNT / 8, DELAY_COUNT / 8);
    blink_simple(DELAY_COUNT / 8, DELAY_COUNT * 2);
}

/* ============================================================================
 * MAIN
 * ============================================================================ */

int main(void) {
    // Initialize LED pin
    gpio_init_output(LED_MASK);
    
    // Select blink pattern (change to try different patterns)
    #define PATTERN_SIMPLE      0
    #define PATTERN_HEARTBEAT   1
    #define PATTERN_SOS         2
    
    int pattern = PATTERN_SIMPLE;
    
    // Main loop
    while (1) {
        switch (pattern) {
            case PATTERN_HEARTBEAT:
                blink_heartbeat();
                break;
            case PATTERN_SOS:
                blink_sos();
                break;
            case PATTERN_SIMPLE:
            default:
                blink_simple(DELAY_COUNT, DELAY_COUNT);
                break;
        }
    }
    
    return 0;  // Never reached
}
