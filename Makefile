# Usage: make LEVEL=01-gets vuln | secure | asan | clean
LEVEL ?= 01-gets
DIR   := levels/$(LEVEL)
BIN   := /tmp/$(LEVEL)

# Deliberately weakened — this is the point of the lab. Never used for
# anything but vuln.c, and never as a default anywhere else in this repo.
VULN_FLAGS := -g -O0 -fno-stack-protector

# Hardened defaults for the secure counterpart — what a real build should
# actually ship with, not just "doesn't have the one specific bug".
SECURE_FLAGS := -O2 -fstack-protector-strong -fPIE -pie -D_FORTIFY_SOURCE=2 \
                -Wl,-z,relro,-z,now -Wl,-z,noexecstack

ASAN_FLAGS := -g -fsanitize=address -fno-stack-protector

vuln:
	gcc $(VULN_FLAGS) -o $(BIN)-vuln $(DIR)/vuln.c
	@echo "built (demonstration-only, mitigations disabled): $(BIN)-vuln"

secure:
	gcc $(SECURE_FLAGS) -o $(BIN)-secure $(DIR)/secure.c
	@echo "built (hardened defaults): $(BIN)-secure"

asan:
	gcc $(ASAN_FLAGS) -o $(BIN)-asan $(DIR)/vuln.c
	@echo "built (ASan diagnostic build): $(BIN)-asan"

clean:
	rm -f /tmp/*-vuln /tmp/*-secure /tmp/*-asan /tmp/payload core core.* *.core

.PHONY: vuln secure asan clean
