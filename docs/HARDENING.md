# Hardening Notes — What's Disabled, Why, and What It Isn't

This lab disables specific compiler/linker mitigations on the vulnerable
build of each level, **and only that build** — never the secure
counterpart, never a default anywhere else in this repo. This document
exists because that distinction matters and is easy to lose track of.

## What's disabled, and where

| Level | Flags on `vuln.c` | Why |
|---|---|---|
| 01–06 | `-fno-stack-protector` | Makes the overflow's effect on adjacent memory observable instead of caught by a canary before it matters |
| 07 (bonus) | `-fno-stack-protector -fno-pie -no-pie -z execstack` | All three stripped specifically to make a return-address overwrite demonstrable in a single, deterministic session |

**None of this reflects what a real, hardened binary looks like.** It's a
reduced teaching environment, built that way on purpose, and should be
described to anyone grading or reviewing this repo as exactly that — not
as representative exploit research.

## What the secure builds actually use

Not just "the one function swapped out" — real hardening defaults:

-O2 -fstack-protector-strong -fPIE -pie -D_FORTIFY_SOURCE=2
-Wl,-z,relro,-z,now -Wl,-z,noexecstack


Canary, position-independent executable, fortified libc calls, full RELRO,
non-executable stack. Use `make LEVEL=<level> secure` to build this way.

## Why hardcoded offsets (level 07) are a debugging artifact, not an exploit

The offset from a buffer to a saved return address depends on compiler
version, optimization level, stack alignment, architecture, and even the
exact environment variables and argv present at runtime — all of which
shift stack layout. A payload built against one `gdb` session on one
machine is not a working exploit; it's a one-time local observation.

This repo does not hardcode that offset anywhere in its documentation.
`docs/solution.md`'s bonus-level section requires finding it interactively
via `gdb` for your own build, every time — see
`scripts/find_offset.py` below for a reproducible way to do that instead
of eyeballing `x/20xg $sp` output.

## What this lab is, and isn't

**Is:** a controlled demonstration of six classic memory-safety bugs and
their fixes, plus one optional, explicitly-labeled walkthrough of a
classic (and, on any modern hardened/ASLR'd target, non-functional)
control-flow hijack technique.

**Isn't:** a red-team exploit-development reference, a demonstration of
exploitation against a realistic hardened target, or guidance applicable
outside this specific, deliberately weakened sandbox.
## The four mitigations this lab touches

| Mitigation | Flag | What it actually stops |
|---|---|---|
| Stack canary | `-fstack-protector[-strong]` | Detects a corrupted return-address region before `ret` executes; aborts via `__stack_chk_fail` rather than jumping anywhere |
| NX / DEP | `-Wl,-z,noexecstack` | Blocks direct execution of injected bytes on the stack — not a general fix, only blocks this one technique |
| ASLR + PIE | `-fPIE -pie` | Randomizes code/data layout per run; a real exploit against this needs an information leak or ROP, not a fixed address |
| Full RELRO | `-Wl,-z,relro,-z,now` | Makes the GOT read-only after startup, closing off GOT-overwrite as a redirection technique |

## Local debugging artifact vs. portable exploit

The bonus level (07) is built with all four of the above disabled,
simultaneously, on one specific binary, on one specific machine. That is
a **local GDB debugging artifact** — a single-binary, same-environment
demonstration that control-flow hijacking is mechanically possible. It is
**not** a portable exploit: a real target with any one of these
mitigations re-enabled, a different compiler version, a different stack
alignment, or ASLR active would require substantially more work
(information disclosure, ROP chaining, or both) that this lab does not
attempt to teach. Treat every offset and address this level produces as
valid for exactly the build that produced it, and nothing else.
