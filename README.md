# CSS-LAB-BOA — Buffer Overflow Attack Virtual Lab

An interactive, Docker-isolated educational lab demonstrating six classic
stack-based buffer overflow vulnerabilities in C, with a live browser
terminal into a disposable sandbox, a WebAssembly-backed stack
visualizer, and a self-check quiz — built for a Cryptography & System
Security course.

> ⚠️ **Contains intentionally vulnerable C code.** This exists purely to
> teach memory-safety concepts in a controlled, network-isolated sandbox.
> Never run these binaries outside the provided Docker setup. See
> [docs/HARDENING.md](./docs/HARDENING.md) for exactly which compiler
> protections are disabled, where, and why — this is a reduced teaching
> environment, not representative hardened-target exploit research.

## Author

**Bhushan Ladgaonkar**
Roll No. 10611 — TE Computer Engineering, Division A
Fr. Conceicao Rodrigues College of Engineering, Bandra (W), Mumbai
(Autonomous College affiliated to University of Mumbai)

Subject: Cryptography & System Security

---

## Quick start

Requires Docker Desktop (or Docker Engine) and Node.js 18+.

```bash
# 1. Build the sandbox image (rebuild this any time levels/ changes —
#    level files are baked into the image at build time, not mounted live)
docker compose build sandbox-image

# 2. Install and start the backend
cd backend
npm install
npm start
```

Then open **http://localhost:4000** in a browser. That one page is the
whole product: theory, all 7 levels with exact run commands, a live
terminal into the sandbox, the WASM stack visualizer, a quiz, FAQ, and
references. Nothing else needs to be opened separately.

If port 4000 is already in use:
```bash
lsof -ti:4000 | xargs kill -9
```

## What you'll see at localhost:4000

| Section | What it is |
|---|---|
| **Live terminal** | A real bash shell inside a disposable sandbox container — compile and run any level's C code here |
| **Theory** | One-minute primer on stack layout and why buffer overflows happen |
| **Levels** | All 7, each with the vulnerable call, the exact trigger command, and the fix |
| **Visualizer** | A genuine compiled WebAssembly module animates a payload overflowing a simulated 16-byte buffer into 8 adjacent bytes — real WASM linear memory, not a JS simulation |
| **Quiz** | 6 self-check questions, instant scoring, nothing sent anywhere |
| **FAQ / Links** | Troubleshooting notes pulled from real issues hit while building this, plus references |

## Running a level yourself

Inside the live terminal (or any `docker run -it ... css-lab-boa-sandbox` shell), from `/opt/levels/<level>/`:

```bash
cd 01-gets
gcc -g -fsanitize=address -fno-stack-protector -o /tmp/v vuln.c
echo "Bhushan" | /tmp/v                      # clean run
python3 -c "print('A'*40)" | /tmp/v          # trips AddressSanitizer
```

Every level follows this same shape — see **[docs/solution.md](./docs/solution.md)** for the exact command for all 7, including the bonus level's return-address exploit walkthrough.

## Using the Makefile (preferred over hand-typed gcc)

From the repo root, for any `LEVEL=` matching a `levels/` subdirectory:

```bash
make LEVEL=02-strcpy vuln      # builds the vulnerable binary (mitigations off, by design)
make LEVEL=02-strcpy secure    # builds the secure binary (real hardening: canary, PIE, FORTIFY_SOURCE, full RELRO)
make LEVEL=02-strcpy asan      # builds with AddressSanitizer for diagnostic output
make clean                     # removes all built binaries and payload files from /tmp
```

## Project structure
backend/
src/server.js — Express static server + websocket bridge to the sandbox
src/sessionManager.js — spawns/destroys locked-down Docker sessions, opens a real shell via Docker exec
src/levelRegistry.js — reads levels/levels.yaml
public/index.html — the entire frontend (vanilla HTML/CSS/JS, no build step)
public/vendor/ — local xterm.js + the compiled overflow.wasm module (+ source .wat)
docker/
sandbox.Dockerfile — the sandbox image: gcc, gdb, non-root user, levels baked in
levels/
01-gets/ ... 07-bonus-redirect/
vuln.c, secure.c, expected_output.txt
levels.yaml — level metadata driving the backend and docs
scripts/
validate_sandbox.py — automated isolation tests (network, filesystem, resource limits)
test_all_levels.py — automated compile/run validation for every required level
find_offset.py — cyclic-pattern offset discovery for the bonus level (never hardcode offsets)
requirements.txt
docs/
theory.md — buffer overflow fundamentals, written up formally
ARCHITECTURE.md — full design, phase history, and testing plan
solution.md — exact compile/run commands and expected output, every level
HARDENING.md — exactly what mitigations are disabled, where, and why
guide.html — standalone offline copy of the teaching content (may lag the live page at :4000 — the live page is the source of truth)
.github/workflows/ci.yml — runs the full pytest suite on every push/PR
Makefile — vuln / secure / asan / clean build targets
docker-compose.yml — builds the sandbox image


## Running the automated tests

```bash
cd scripts
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt pyyaml

# Sandbox isolation (network, filesystem, resource limits)
python -m pytest validate_sandbox.py -v

# Every required level compiles and runs cleanly
python -m pytest test_all_levels.py -v
```

Both suites also run automatically in CI on every push (`.github/workflows/ci.yml`).

## Covered demonstrations

| # | Function | Root cause | Fix |
|---|---|---|---|
| 01 | `gets()` | No length argument exists for it to respect | `fgets()` |
| 02 | `strcpy()` | Copies until null byte, blind to destination size | `strncpy()` |
| 03 | `strcat()` | Appends with no bound on remaining capacity | `strncat()` |
| 04 | `sprintf()` | No limit on formatted output length | `snprintf()` |
| 05 | `memcpy()` | Unvalidated, caller-controlled byte count | clamp length to buffer size |
| 06 | array indexing | No bound on the index, positive or negative | validate `0 ≤ idx < size` |
| 07 *(bonus)* | return-address overwrite | Redirects control flow via a crafted stack overflow | `secure.c` uses `strncpy`, never reaches the return address |

Every level ships a vulnerable and a secure C source side by side.

## Sandbox isolation

Every session runs in a disposable container with:
--network none --cap-drop=ALL --security-opt no-new-privileges
--memory=256m --cpus=1 --pids-limit=64 --read-only root filesystem
non-root user, tmpfs /tmp and /home/student (rw,exec,mode=1777)


The backend additionally caps concurrent sessions (`MAX_SESSIONS`, default 10), enforces an idle timeout, and destroys every live container on shutdown (`Ctrl+C`) so nothing is orphaned. See `docs/ARCHITECTURE.md` §4 for the full testing rationale.

## Development notes

- **Rebuild the sandbox image after any change under `levels/`** — `docker compose build sandbox-image`. Level files are baked into the image at build time, not mounted live; this is the single most common "why isn't my change showing up" cause.
- If `npm start` fails with `EADDRINUSE`, something is already bound to port 4000: `lsof -ti:4000 | xargs kill -9`.
- `docker ps --filter ancestor=css-lab-boa-sandbox -q | xargs -r docker rm -f` clears any orphaned sandbox containers from a previous ungraceful shutdown.
- Environment variables (`backend/.env`, copy from `.env.example`): `PORT`, `SANDBOX_IMAGE`, `MAX_SESSIONS`, `SESSION_IDLE_TIMEOUT_MS`.

## Hardening & scope disclaimer

This lab deliberately disables specific compiler mitigations on
vulnerable builds only — never on secure builds, never as a project-wide
default. See **[docs/HARDENING.md](./docs/HARDENING.md)** for exactly
what's off, where, why, and an explicit statement that this is a reduced
teaching environment, not representative hardened-target exploit
research.

## Formal lab report

A separate submission artifact (`CSS-LAB-BOA_Lab_Report.docx` — Aim,
Theory, Procedure, Code, Output, Conclusion, Viva Q&A) was generated from
this repo's documentation and is not tracked in version control; it lives
alongside other course submissions.

## License

MIT — see [LICENSE](./LICENSE). Educational use; see disclaimer above.