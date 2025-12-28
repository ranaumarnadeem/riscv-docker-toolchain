/*
 * Minimal RISC-V 64-bit Startup Code for Bare-Metal
 * 
 * Same as crt0.S but uses 64-bit load/store instructions.
 * Use this for RV64 targets.
 *
 * Usage:
 *   rv build test.c --arch 64imac --cflags "-T scripts/riscv64.ld scripts/crt0_64.S -nostartfiles"
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
    
    /* Clear BSS section (64-bit stores) */
    la      t0, __bss_start
    la      t1, __bss_end
    bgeu    t0, t1, 2f
1:
    sd      zero, 0(t0)
    addi    t0, t0, 8
    bltu    t0, t1, 1b
2:
    
    /* Copy .data from ROM to RAM (64-bit loads/stores) */
    la      t0, __data_load_start
    la      t1, __data_start
    la      t2, __data_end
    bgeu    t1, t2, 4f
3:
    ld      t3, 0(t0)
    sd      t3, 0(t1)
    addi    t0, t0, 8
    addi    t1, t1, 8
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
