# 1. Configuration
TARGET_NAME = test
BUILD_DIR = build
SRC_DIR = examples

# Tools
CC = riscv-none-elf-gcc
DUMP = riscv-none-elf-objdump

# 2. Compilation Flags
# -march=rv32imc_zba_zbb : Enable the specific extensions
# -mabi=ilp32            : Use soft-float ABI
# -O2                    : Optimization level 2 (Required to trigger Zba/Zbb usage)
CFLAGS = -march=rv32imc_zba_zbb -mabi=ilp32 -O2 -g --specs=nosys.specs

# 3. Files
SRC = $(SRC_DIR)/test.c
ELF = $(BUILD_DIR)/$(TARGET_NAME).elf

# 4. Default Rule: Build and Verify
all: $(ELF) verify

# 5. Build Step
# Creates the build directory if it doesn't exist, then compiles
$(ELF): $(SRC)
	@mkdir -p $(BUILD_DIR)
	@echo "Compiling $(SRC)..."
	$(CC) $(CFLAGS) $(SRC) -o $(ELF)

# 6. Verification Step
# Runs objdump and searches for the specific instructions
verify: $(ELF)
	@echo "------------------------------------------------"
	@echo "Verifying Zbb (BitMainp) Usage..."
	@$(DUMP) -d $(ELF) | grep "clz" && echo "SUCCESS: Found 'clz' instruction (Zbb)" || echo "FAIL: 'clz' not found!"
	
	@echo "------------------------------------------------"
	@echo "Verifying Zba (AddressGen) Usage..."
	@$(DUMP) -d $(ELF) | grep "sh2add" && echo "SUCCESS: Found 'sh2add' instruction (Zba)" || echo "FAIL: 'sh2add' not found!"
	@echo "------------------------------------------------"

# 7. Clean
clean:
	rm -rf $(BUILD_DIR)