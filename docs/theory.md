# Theory — Buffer Overflow Attacks

**Author:** Bhushan Ladgaonkar | Roll No. 10611 | TE Computer Engineering, Div A
**College:** Fr. Conceicao Rodrigues College of Engineering, Bandra (W), Mumbai
**Subject:** Cryptography & System Security

---

## 1. What is a Buffer Overflow?

A buffer overflow is a memory-safety vulnerability that occurs when a program
writes more data into a fixed-size buffer than it was allocated to hold. The
excess data overwrites adjacent memory — other variables, saved registers,
or control-flow metadata — leading to data corruption, crashes, or, in the
worst case, execution of attacker-controlled code.

Buffer overflows are possible in languages like C and C++ because the
language does not automatically check array/buffer bounds on every access.
The programmer is responsible for ensuring writes stay within allocated
memory; when that responsibility is neglected, the overflow is silent until
something downstream breaks.

## 2. Memory Layout Primer

A running process's address space is typically divided into:

| Segment | Contents |
|---|---|
| Text | Compiled machine code (read-only) |
| Data / BSS | Global and static variables |
| Heap | Dynamically allocated memory (`malloc`, `new`), grows upward |
| Stack | Local variables, function parameters, return addresses, grows downward |

The stack is organized into **stack frames**, one per active function call.
A typical frame (x86-64, simplified) contains, from higher to lower address:

```
[ return address      ]  <- where execution resumes after the function returns
[ saved base pointer   ]
[ local variables      ]  <- e.g. char buffer[8]
[ ... ]
```

Because local buffers sit *below* the saved return address in memory, and
the stack grows downward while a buffer overflow writes *upward* (toward
higher addresses), an overflowing write into a local buffer can march
straight into the saved base pointer and then the return address — which is
exactly what makes stack-based overflows dangerous, not just buggy.

## 3. Types of Buffer Overflow

### 3.1 Stack-based Buffer Overflow
Occurs when a buffer allocated on the stack is overrun. The overflow can
corrupt adjacent local variables, the saved frame pointer, or the return
address itself. Overwriting the return address is the classic technique
behind control-flow-hijacking exploits.

### 3.2 Heap-based Buffer Overflow
Occurs when a dynamically allocated buffer (`malloc`) is overrun. Rather
than corrupting a return address, this typically corrupts heap metadata or
adjacent heap-allocated objects, which can lead to crashes or, in advanced
exploitation, heap-metadata-based control-flow attacks.

### 3.3 Off-by-One Overflow
A special case where a loop or copy writes exactly one byte beyond the
buffer's bound — frequently from an incorrect `<=` instead of `<` in a loop
condition, or forgetting to reserve a byte for a string's null terminator.
Seemingly minor, but can still corrupt an adjacent byte (e.g. a saved frame
pointer's low byte) in a way that is exploitable.

## 4. Root Causes Demonstrated in This Lab

| # | Function | Root cause |
|---|---|---|
| 1 | `gets()` | Reads an unbounded line from stdin with **no length argument at all** — it is impossible to use this function safely, which is why it was removed from the C11 standard. |
| 2 | `strcpy()` | Copies a C string until it hits a null terminator, with no awareness of the destination buffer's size. |
| 3 | `strcat()` | Appends a C string to the end of an existing one, again with no bound on the destination's remaining capacity. |
| 4 | `sprintf()` | Writes formatted output into a buffer with no limit on the resulting string's length — a format string with wide or many arguments can overrun the destination. |
| 5 | `memcpy()` | Copies a programmer-specified number of raw bytes; the vulnerability arises when that byte count is miscalculated (e.g. taken from untrusted input) and exceeds the destination's actual size. |
| 6 | Array indexing | Writing or reading `arr[i]` without validating that `i` lies within `[0, size)`; a negative or oversized index reads/writes arbitrary memory relative to the array. |

## 5. Detecting the Overflow: AddressSanitizer (ASan)

AddressSanitizer is a compile-time instrumentation tool (`-fsanitize=address`)
that places "redzones" — poisoned guard memory — around stack and heap
allocations. Any read or write that touches a redzone is caught immediately
and reported with:
- The type of violation (stack-buffer-overflow, heap-buffer-overflow, etc.)
- The exact faulting address and instruction
- A stack trace of the call that caused it

This lab uses ASan specifically for the array-indexing demonstration, and
optionally for all other levels in their "diagnostic" build, to produce
precise, readable evidence of the invalid memory access for the report.

## 6. Mitigations (and why this lab disables some of them deliberately)

| Mitigation | What it does | Status in this lab |
|---|---|---|
| Stack canary (`-fstack-protector`) | A random value placed before the return address; checked before the function returns, aborts if altered | Disabled in vulnerable builds, so the overflow's real effect is observable |
| ASLR | Randomizes memory layout per run, making addresses unpredictable | Disabled inside the sandbox container for the control-flow-redirect bonus level only, to make the demonstration deterministic |
| NX / DEP | Marks the stack non-executable, preventing injected shellcode from running | Left enabled except where the bonus level specifically discusses it |
| PIE | Randomizes the base load address of the binary itself | Disabled (`-no-pie`) only for the bonus level |
| Safe library functions | `fgets`, `strncpy`, `strncat`, `snprintf`, bounds-checked `memcpy`/array access | Used in every "secure" counterpart binary in this lab |

Disabling a mitigation is done per-level and only where necessary to make
the underlying vulnerability visible — this mirrors how real vulnerability
research isolates one variable at a time, and is the basis for the viva
discussion on defense-in-depth.

## 7. Real-World Relevance

Buffer overflows are catalogued under **CWE-120** (and its more specific
children, CWE-121 stack-based and CWE-122 heap-based) and have been the root
cause of some of the most consequential vulnerabilities in computing history
— including the 1988 Morris Worm (an early internet-wide incident that
exploited a `gets()`-style overflow) and countless CVEs in C/C++ codebases
since. They remain a recurring category in OWASP and CWE Top 25 lists, which
is part of why memory-safe languages (Rust, Go) and hardened C idioms exist.

## 8. Summary

A buffer overflow is fundamentally a *bounds-checking failure*. Every
demonstration in this lab reduces to the same question: did the code verify
that a write stays inside its allocated memory before performing it? The six
functions studied here are different doors to the same room — and the fix,
in every case, is to replace an unbounded operation with its
length-aware counterpart.