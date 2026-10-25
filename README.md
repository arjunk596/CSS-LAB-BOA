# CSS-LAB-BOA — Buffer Overflow Attack Virtual Lab

An interactive, Docker-isolated educational lab for demonstrating classic
stack-based buffer overflow vulnerabilities in C, built for a
Cryptography & System Security course.

> ⚠️ **This repository contains intentionally vulnerable C code.**
> It exists purely to teach memory-safety concepts in a controlled,
> network-isolated sandbox. Do not run these binaries outside the provided
> Docker setup, deploy them anywhere public, or adapt them for real attacks.

## Status
🚧 Under active development.

## Covered demonstrations
- `gets()` — unbounded read into a fixed buffer
- `strcpy()` — unchecked copy overflow
- `strcat()` — unchecked concatenation overflow
- `sprintf()` — oversized formatted output
- `memcpy()` — incorrect byte-count out-of-bounds write
- Array indexing — invalid index detected via AddressSanitizer
- *(bonus)* control-flow redirection via return-address overwrite

## Structure
- `backend/` — Node.js service that compiles and runs each level in an
  isolated, resource-limited Docker container, bridged to the browser
  over a pty/websocket terminal
- `frontend/` — React UI: live terminal, level selector, and a
  WASM-based stack-memory visualizer
- `levels/` — one vulnerable + one fixed C source per demonstration
- `docs/` — theory, lab procedure, viva prep, references

## License
MIT — see [LICENSE](./LICENSE). Educational use; see disclaimer above.
