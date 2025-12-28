/*
 * RISC-V 64-bit Linker Script for Bare-Metal
 * 
 * Same sections as riscv.ld but with 64-bit alignment.
 * Customize MEMORY regions for your specific hardware.
 *
 * Usage:
 *   rv build test.c --arch 64imac --cflags "-T scripts/riscv64.ld -nostartfiles"
 */

ENTRY(_start)

/* Memory regions - CUSTOMIZE FOR YOUR HARDWARE */
MEMORY
{
    /* QEMU virt machine 64-bit layout */
    ROM (rx)  : ORIGIN = 0x80000000, LENGTH = 32M
    RAM (rwx) : ORIGIN = 0x82000000, LENGTH = 32M
}

/* Stack size */
__stack_size = DEFINED(__stack_size) ? __stack_size : 8K;

SECTIONS
{
    .text :
    {
        . = ALIGN(8);
        *(.text.init)
        *(.text.unlikely .text.unlikely.*)
        *(.text.startup .text.startup.*)
        *(.text .text.*)
        *(.gnu.linkonce.t.*)
        . = ALIGN(8);
    } > ROM

    .rodata :
    {
        . = ALIGN(8);
        *(.rodata .rodata.*)
        *(.gnu.linkonce.r.*)
        *(.srodata .srodata.*)
        . = ALIGN(8);
    } > ROM

    .eh_frame :
    {
        KEEP(*(.eh_frame))
    } > ROM

    .data :
    {
        . = ALIGN(8);
        __data_start = .;
        *(.data .data.*)
        *(.gnu.linkonce.d.*)
        *(.sdata .sdata.*)
        *(.sdata2 .sdata2.*)
        . = ALIGN(8);
        __data_end = .;
    } > RAM AT > ROM

    __data_load_start = LOADADDR(.data);

    .bss (NOLOAD) :
    {
        . = ALIGN(8);
        __bss_start = .;
        *(.bss .bss.*)
        *(.gnu.linkonce.b.*)
        *(.sbss .sbss.*)
        *(COMMON)
        . = ALIGN(8);
        __bss_end = .;
    } > RAM

    .stack (NOLOAD) :
    {
        . = ALIGN(16);
        __stack_bottom = .;
        . = . + __stack_size;
        __stack_top = .;
    } > RAM

    .heap (NOLOAD) :
    {
        . = ALIGN(8);
        __heap_start = .;
        . = ORIGIN(RAM) + LENGTH(RAM);
        __heap_end = .;
    } > RAM

    PROVIDE(__global_pointer$ = __data_start + 0x800);
    PROVIDE(_end = __heap_start);
}
