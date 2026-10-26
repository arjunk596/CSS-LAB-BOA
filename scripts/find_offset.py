#!/usr/bin/env python3
"""
Finds the offset from a buffer's start to the saved return address, using
a proper de Bruijn cyclic pattern (the same technique pwntools' cyclic()/
cyclic_find() use) rather than a repeated-'A' guess or a non-unique ad hoc
pattern. Run this fresh for every build -- the offset is NOT portable
across compilers, optimization levels, or architectures. See
docs/HARDENING.md.

No external dependencies beyond gdb -- deliberately avoids pulling in
pwntools as a project dependency for what is, in this lab's scope, a
single optional bonus exercise.

Usage (inside the sandbox):
    python3 find_offset.py /tmp/07-bonus-redirect-vuln        # 64-bit (default)
    python3 find_offset.py /tmp/07-bonus-redirect-vuln 4      # 32-bit
"""
import subprocess
import sys
import struct

ALPHABET = "abcdefghijklmnopqrstuvwxyz"
SUBSEQ_LEN = 4  # every 4-byte window of the generated sequence is unique

def de_bruijn(alphabet, n):
    """Standard recursive de Bruijn sequence construction: every length-n
    substring over `alphabet` appears exactly once."""
    k = len(alphabet)
    a = [0] * k * n
    sequence = []

    def db(t, p):
        if t > n:
            if n % p == 0:
                sequence.extend(a[1:p + 1])
        else:
            a[t] = a[t - p]
            db(t + 1, p)
            for j in range(a[t - p] + 1, k):
                a[t] = j
                db(t + 1, t)

    db(1, 1)
    return "".join(alphabet[i] for i in sequence)

def cyclic_pattern(length):
    seq = de_bruijn(ALPHABET, SUBSEQ_LEN)
    return (seq * (length // len(seq) + 1))[:length]

def cyclic_find(pattern, value, width=8):
    """Locate a crash address's little-endian byte sequence within the
    pattern. width=8 for a 64-bit address, 4 for 32-bit."""
    size = {4: "<I", 8: "<Q"}[width]
    needle = struct.pack(size, value & ((1 << (width * 8)) - 1))
    try:
        needle_str = needle.decode("ascii")
    except UnicodeDecodeError:
        return None
    return pattern.find(needle_str)

def main():
    if len(sys.argv) < 2:
        print("Usage: find_offset.py <path-to-binary> [width: 4|8]")
        sys.exit(1)

    binary = sys.argv[1]
    width = int(sys.argv[2]) if len(sys.argv) > 2 else 8
    pattern = cyclic_pattern(200)

    print(f"[*] Running {binary} under gdb with a 200-byte de Bruijn pattern...")
    print("[*] This derives the offset for THIS exact build, right now -- it is")
    print("    not guaranteed to match any previous or future compile.")

    result = subprocess.run(
        ["gdb", "--batch", "-ex", f"run {pattern}", "-ex", "info registers", binary],
        capture_output=True, text=True, timeout=15,
    )
    print(result.stdout)

    candidates = {}
    for line in result.stdout.splitlines():
        parts = line.split()
        if len(parts) >= 2 and parts[0] in ("pc", "lr", "rip", "x30"):
            try:
                candidates[parts[0]] = int(parts[1], 16)
            except ValueError:
                pass

    if not candidates:
        print("[!] No pc/lr/rip found in gdb's output above.")
        print(f"    Pattern used (match a crash address by hand if needed):\n{pattern}")
        sys.exit(1)

    for reg, val in candidates.items():
        offset = cyclic_find(pattern, val, width=width)
        if offset is not None and offset >= 0:
            print(f"[+] {reg} = 0x{val:x} -> offset {offset} into the pattern")
        else:
            print(f"[-] {reg} = 0x{val:x} -> not found directly in the pattern")

if __name__ == "__main__":
    main()
