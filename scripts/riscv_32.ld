/*
 * Basic RISC-V Linker Script for Bare-Metal
 * 
 * This is a generic linker script for bare-metal RISC-V applications.
 * You may need to customize MEMORY regions for your specific hardware.
 *
 * Usage:
 *   rv build test.c --arch 32imac --cflags "-T scripts/riscv.ld -nostartfiles"
 *
 * Default memory layout (customize for your target):
 *   ROM: 0x00000000 - 16MB (code and read-only data)
 *   RAM: 0x80000000 - 16MB (data and stack)
 */

/* Entry point */
ENTRY(_start)

/* Memory regions - CUSTOMIZE THESE FOR YOUR HARDWARE */
MEMORY
{
    /* Example: QEMU virt machine layout */
    ROM (rx)  : ORIGIN = 0x80000000, LENGTH = 16M
    RAM (rwx) : ORIGIN = 0x81000000, LENGTH = 16M
    
    /* Alternative: Typical embedded layout
    FLASH (rx)  : ORIGIN = 0x00000000, LENGTH = 256K
    RAM   (rwx) : ORIGIN = 0x80000000, LENGTH = 64K
    */
}

/* Stack size */
__stack_size = DEFINED(__stack_size) ? __stack_size : 4K;

SECTIONS
{
    /* Code section */
    .text :
    {
        . = ALIGN(4);
        *(.text.init)       /* Startup code */
        *(.text.unlikely .text.unlikely.*)
        *(.text.startup .text.startup.*)
        *(.text .text.*)    /* Program code */
        *(.gnu.linkonce.t.*)
        . = ALIGN(4);
    } > ROM

    /* Read-only data */
    .rodata :
    {
        . = ALIGN(4);
        *(.rodata .rodata.*)
        *(.gnu.linkonce.r.*)
        *(.srodata .srodata.*)
        . = ALIGN(4);
    } > ROM

    /* Exception handling (C++) */
    .eh_frame :
    {
        KEEP(*(.eh_frame))
    } > ROM

    /* Initialized data - stored in ROM, copied to RAM at startup */
    .data :
    {
        . = ALIGN(4);
        __data_start = .;
        *(.data .data.*)
        *(.gnu.linkonce.d.*)
        *(.sdata .sdata.*)
        *(.sdata2 .sdata2.*)
        . = ALIGN(4);
        __data_end = .;
    } > RAM AT > ROM

    /* Load address for .data (in ROM) */
    __data_load_start = LOADADDR(.data);

    /* Uninitialized data (BSS) */
    .bss (NOLOAD) :
    {
        . = ALIGN(4);
        __bss_start = .;
        *(.bss .bss.*)
        *(.gnu.linkonce.b.*)
        *(.sbss .sbss.*)
        *(COMMON)
        . = ALIGN(4);
        __bss_end = .;
    } > RAM

    /* Stack */
    .stack (NOLOAD) :
    {
        . = ALIGN(16);
        __stack_bottom = .;
        . = . + __stack_size;
        __stack_top = .;
    } > RAM

    /* Heap (everything remaining in RAM) */
    .heap (NOLOAD) :
    {
        . = ALIGN(8);
        __heap_start = .;
        . = ORIGIN(RAM) + LENGTH(RAM);
        __heap_end = .;
    } > RAM

    /* Provide symbols for startup code */
    PROVIDE(__global_pointer$ = __data_start + 0x800);
    PROVIDE(_end = __heap_start);
}
