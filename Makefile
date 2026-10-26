# Usage: make LEVEL=01-gets vuln | secure | asan | clean
CC ?= gcc
CFLAGS ?= -Wall -Wextra -Wpedantic -g
LEVEL ?= 01-gets
DIR := levels/$(LEVEL)
BIN := /tmp/$(LEVEL)

# Base weakening applied to every vulnerable build — enough to make the
# overflow's effect on adjacent memory observable, nothing more.
VULN_FLAGS := $(CFLAGS) -O0 -U_FORTIFY_SOURCE -fno-stack-protector -fno-omit-frame-pointer

# Level 07 alone additionally needs PIE/NX off to make a return-address
# redirect demonstrable. Deliberately NOT applied to any other level —
# folding these into every build would contradict the "disable only what
# a given level needs, only where it needs it" principle in
# docs/HARDENING.md. Levels 01-06 don't need PIE or NX off to show their
# overflow under ASan.
ifeq ($(LEVEL),07-bonus-redirect)
VULN_FLAGS += -fno-pie -no-pie -z execstack
endif

# Hardened defaults for the secure counterpart.
SECURE_FLAGS := $(CFLAGS) -O2 -fstack-protector-strong -fPIE -pie \
                -D_FORTIFY_SOURCE=2 -Wl,-z,relro,-z,now -Wl,-z,noexecstack -fno-plt

# -O0 kept (not -O1) to match every ASan run already validated in this
# project at -O0; -fno-sanitize-recover=all aborts on the first violation
# instead of continuing, which is what every ASan run in docs/solution.md
# already assumes.
ASAN_FLAGS := $(CFLAGS) -O0 -fno-omit-frame-pointer \
              -fsanitize=address -fno-sanitize-recover=all -fno-stack-protector

vuln: $(DIR)/vuln.c
	$(CC) $(VULN_FLAGS) -o $(BIN)-vuln $(DIR)/vuln.c
	@echo "built (demonstration-only; mitigations intentionally disabled, see docs/HARDENING.md): $(BIN)-vuln"

secure: $(DIR)/secure.c
	$(CC) $(SECURE_FLAGS) -o $(BIN)-secure $(DIR)/secure.c
	@echo "built (hardened defaults): $(BIN)-secure"

asan: $(DIR)/vuln.c
	$(CC) $(ASAN_FLAGS) -o $(BIN)-asan $(DIR)/vuln.c
	@echo "built (AddressSanitizer diagnostic binary, aborts on first violation): $(BIN)-asan"

clean:
	rm -f /tmp/*-vuln /tmp/*-secure /tmp/*-asan /tmp/payload core core.* *.core

.PHONY: vuln secure asan clean
