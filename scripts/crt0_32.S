/*
 * Minimal RISC-V Startup Code for Bare-Metal
 * 
 * This provides a minimal _start entry point that:
 * 1. Sets up the stack pointer
 * 2. Sets up the global pointer
 * 3. Clears BSS section
 * 4. Copies .data from ROM to RAM (if needed)
 * 5. Calls main()
 * 6. Loops forever after main returns
 *
 * Usage:
 *   rv build test.c --arch 32imac --cflags "-T scripts/riscv.ld scripts/crt0.S -nostartfiles"
 */

.section .text.init, "ax"
.global _start
.type _start, @function

_start:
    /* Disable interrupts */
    csrw    mie, zero
    
    /* Set up global pointer (for small data access) */
.option push
.option norelax
    la      gp, __global_pointer$
.option pop
    
    /* Set up stack pointer */
    la      sp, __stack_top
    
    /* Clear BSS section */
    la      t0, __bss_start
    la      t1, __bss_end
    bgeu    t0, t1, 2f
1:
    sw      zero, 0(t0)
    addi    t0, t0, 4
    bltu    t0, t1, 1b
2:
    
    /* Copy .data from ROM to RAM (if running from flash) */
    la      t0, __data_load_start
    la      t1, __data_start
    la      t2, __data_end
    bgeu    t1, t2, 4f
3:
    lw      t3, 0(t0)
    sw      t3, 0(t1)
    addi    t0, t0, 4
    addi    t1, t1, 4
    bltu    t1, t2, 3b
4:
    
    /* Clear registers (optional, for clean state) */
    li      a0, 0
    li      a1, 0
    li      a2, 0
    
    /* Call main */
    call    main
    
    /* If main returns, loop forever */
    j       .

.size _start, . - _start


/* Trap handler - can be overridden by user */
.section .text
.weak trap_handler
.type trap_handler, @function
trap_handler:
    j       trap_handler
.size trap_handler, . - trap_handler
