/*
 * blink.c
 * A simple LED blink example for RISC-V microcontrollers
 * This is a basic template for testing the RISC-V toolchain
 */

#include <stdint.h>

// Memory-mapped GPIO base address (example - adjust for your target)
#define GPIO_BASE    0x10012000
#define GPIO_OUTPUT  (*(volatile uint32_t *)(GPIO_BASE + 0x08))
#define GPIO_ENABLE  (*(volatile uint32_t *)(GPIO_BASE + 0x0C))

// LED pin (example - adjust for your board)
#define LED_PIN      5
#define LED_MASK     (1 << LED_PIN)

// Simple delay function using busy-wait loop
// NOTE: This is for demonstration only. For production code, use hardware timers
// for accurate and consistent timing across different RISC-V implementations.
void delay(uint32_t count) {
    for (volatile uint32_t i = 0; i < count; i++) {
        __asm__ volatile ("nop");
    }
}

int main(void) {
    // Enable the LED pin as output
    GPIO_ENABLE |= LED_MASK;
    
    // Main loop: blink the LED
    while (1) {
        // Turn LED on
        GPIO_OUTPUT |= LED_MASK;
        delay(1000000);
        
        // Turn LED off
        GPIO_OUTPUT &= ~LED_MASK;
        delay(1000000);
    }
    
    return 0;
}
