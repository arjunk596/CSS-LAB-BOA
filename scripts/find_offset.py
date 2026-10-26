#!/usr/bin/env python3
"""
Finds the offset from a buffer's start to the saved return address for a
given binary, by pattern-cycling (a De Bruijn-style unique-byte pattern)
rather than a hardcoded guess. Run this fresh for every build — the
offset is NOT portable across compilers, optimization levels, or
architectures, which is the entire point of keeping it out of the docs.

Usage (inside the sandbox):
    python3 find_offset.py /tmp/vuln-asan
"""
import subprocess
import sys
import string

def cyclic_pattern(length):
    """Generate a De Bruijn-ish unique pattern so a crash address can be
    mapped back to an exact offset, instead of guessing with repeated 'A's."""
    alphabet = string.ascii_uppercase
    pattern = []
    i = 0
    while len(pattern) < length:
        pattern.append(alphabet[i % 26])
        pattern.append(string.digits[(i // 26) % 10])
        i += 1
    return "".join(pattern)[:length]

def main():
    if len(sys.argv) < 2:
        print("Usage: find_offset.py <path-to-binary>")
        sys.exit(1)

    binary = sys.argv[1]
    pattern = cyclic_pattern(200)
    print(f"[*] Running {binary} with a 200-byte unique pattern under gdb...")
    print("[*] This finds the offset for THIS build, right now — it is not")
    print("    guaranteed to match any previous or future compile of the same source.")

    gdb_script = f"""
run {pattern}
info registers
quit
"""
    result = subprocess.run(
        ["gdb", "--batch", "-ex", f"run {pattern}", "-ex", "info registers", binary],
        capture_output=True, text=True, timeout=15
    )
    print(result.stdout)
    print("[*] Look for the crashing PC/LR/RIP value above, find its 4-byte")
    print("    slice in the pattern below, and that position is your offset.")
    print()
    print(pattern)

if __name__ == "__main__":
    main()
