# Architecture, Deliverables & Validation Plan

**Project:** CSS-LAB-BOA — Buffer Overflow Attack Virtual Lab
**Author:** Bhushan Ladgaonkar | Roll No. 10611 | TE Computer Engineering, Div A
**College:** Fr. Conceicao Rodrigues College of Engineering, Bandra (W), Mumbai

This document reflects the actual, as-built architecture — not the
original plan. Earlier drafts specified React, node-pty, an activity
logger and a win-condition checker; none of those were built, by
deliberate choice, and this document has been corrected to match reality.

---

## 1. System Architecture (as built)

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser (single HTML page)                │
│  backend/public/index.html — vanilla HTML/CSS/JS, no build    │
│  step, no framework. Theory, levels, FAQ, references, and a   │
│  live terminal (xterm.js, loaded as a static local script)    │
│                              │ websocket (raw I/O)             │
└──────────────────────────────┼────────────────────────────────┘
                                │
┌──────────────────────────────┼────────────────────────────────┐
│                  Backend (Node.js + Express)                   │
│  server.js — serves the static page, exposes GET /api/levels,  │
│  and on each websocket connection: creates a session container │
│  and opens a real shell inside it via Docker's own exec API    │
│  (Tty: true gives a hijacked duplex stream — no node-pty        │
│  dependency needed on the host)                                 │
└──────────────────────────────┬────────────────────────────────┘
                                │ Docker Engine API (dockerode)
┌──────────────────────────────┼────────────────────────────────┐
│           Sandboxed container (per session, disposable)        │
│  --network none --cap-drop=ALL --security-opt no-new-privileges│
│  --memory=256m --cpus=1 --pids-limit=64 --read-only             │
│  tmpfs /tmp and /home/student, both rw,exec,mode=1777           │
│  non-root 'student' user, gcc + gdb preinstalled                │
│                                                                  │
│  /opt/levels/01-gets/{vuln.c, secure.c, expected_output.txt}    │
│  ...                                                             │
│  /opt/levels/07-bonus-redirect/{...}                             │
│  /opt/levels/levels.yaml                                         │
└──────────────────────────────────────────────────────────────┘
```

**Deliberately not built, and why:**
- **React** — one page, no complex shared state, no multi-developer
  coordination. A build step and framework would add dependencies and
  indirection with no functional gain over vanilla JS.
- **node-pty** — Docker's own `exec` API with `Tty: true` already
  provides a real hijacked duplex stream; a second pty layer on the host
  would be redundant.
- **WASM stack visualizer** — its value was simulating an overflow
  client-side as a supplement to a real terminal. Since the real sandbox
  already demonstrates the actual overflow, a simulated animation adds
  limited teaching value for the added complexity. Cut by deliberate
  scope decision, not left incomplete.
- **Activity logger / win-condition checker** — the project's scope
  settled on direct terminal access to compile and run each level
  yourself, matching the lab sheet's requirements, rather than a gamified
  pass/fail layer. Levels 01–06 (required) and 07 (bonus) are all
  runnable and documented with expected output in `docs/solution.md`.

## 2. Components (as built)

| Component | Responsibility |
|---|---|
| `levels/` | Vulnerable + secure C source per demo, plus `levels.yaml` (level metadata) and `expected_output.txt` per level |
| `docker/sandbox.Dockerfile` | Sandbox image: gcc, gdb, non-root user, levels baked in at build time |
| `backend/src/sessionManager.js` | Spawns/destroys locked-down session containers; opens a shell via Docker exec |
| `backend/src/server.js` | Express static file server + websocket bridge (browser ↔ sandbox shell) |
| `backend/public/index.html` | The entire frontend: theory, levels, FAQ, references, live terminal — vanilla HTML/CSS/JS |
| `docs/` | `theory.md`, `ARCHITECTURE.md` (this file), `solution.md` (exact commands + expected output per level), `guide.html` (standalone version of the teaching content) |
| `scripts/validate_sandbox.py` | Automated pytest suite validating sandbox isolation |
| Root | README, LICENSE, `docker-compose.yml` (builds the sandbox image) |

## 3. Phase Status

### Phase 0 — Repo Scaffold ✅ DONE
Directory structure, `.gitignore`, README, MIT LICENSE, author attribution.

### Phase 1 — Documentation ✅ DONE (revised scope)
- [x] `docs/theory.md`
- [x] `docs/solution.md` — supersedes the originally planned `procedure.md`; gives exact commands and expected output per level
- [x] `docs/guide.html` — supersedes the originally planned `viva.md`/`references.md` as separate files; viva Q&A lives in the formal report, references are in the guide and report
- [x] This file, rewritten to match reality

### Phase 2 — Level Sources ✅ DONE
All of `vuln.c`, `secure.c`, `expected_output.txt` present and validated:
- [x] 01-gets
- [x] 02-strcpy
- [x] 03-strcat
- [x] 04-sprintf
- [x] 05-memcpy (flag-flip win condition implemented)
- [x] 06-array-indexing (ASan-focused, positive and negative index both tested)
- [x] 07-bonus-redirect (implemented and documented; exploit itself is manual/gdb-driven, not automated — this is correct, the point is a hands-on walkthrough)

### Phase 3 — Sandbox & Backend ✅ DONE
- [x] `docker/sandbox.Dockerfile`
- [x] Session manager (Docker exec-based shell, no node-pty)
- [x] Browser ↔ backend ↔ sandbox terminal bridge, proven end-to-end
- [x] Resource limits enforced and tested (`scripts/validate_sandbox.py`)
- [ ] Idle session reaper — not implemented; sessions end on websocket close, which covers the actual usage pattern (one browser tab, one session)

### Phase 4 — Frontend ✅ DONE (vanilla JS, not React)
- [x] Single page: theory, level list with exact run commands, FAQ, references
- [x] xterm.js terminal wired to the backend websocket, loaded as a local script (not a CDN — see dev notes)
- [ ] Level status tracking (locked/attempted/solved) — not implemented; out of scope per the win-condition-checker decision above

### Phase 5 — WASM Stack Visualizer ✅ DONE
Implemented after reconsidering the earlier "cut" decision. A hand-written
WebAssembly Text (WAT) module (`backend/public/vendor/src/overflow.wat`),
compiled to a genuine 147-byte `.wasm` binary via `wat2wasm`, exports a
deliberately unchecked `write_byte` — the same unbounded-write shape as
the C vulnerabilities above, running in real WebAssembly linear memory,
not a JS array standing in for one. The page animates a payload being
written byte-by-byte across a simulated 16-byte buffer + 8-byte adjacent
region, visually spilling into the adjacent cells exactly as the real C
levels do on the stack.

### Phase 6 — Assessment & Polish ✅ DONE
- [x] 6-question scored quiz (vanilla JS, no framework), covering gets(),
      ASan, canaries, memcpy's real bug, ASLR, and the array-indexing
      root cause — instant feedback and score, nothing sent anywhere
- [x] Vulnerable-vs-secure code shown per level (inline in the level accordion, not a separate compare view)
- [x] README reflects current status

### Phase 7 — Formal Lab Report ✅ DONE
`CSS-LAB-BOA_Lab_Report.docx` — Aim, Objective, CO mapping, Theory,
Procedure + code + expected output per level, Observed Output Summary,
Conclusion, 8 Viva Q&A, References. Generated outside the repo (course
submission artifact, not project source).

## 4. Testing & Validation Plan

### 4.1 Per-level functional tests — all 6 required levels passed
1. `vuln.c` compiles with the level's specified flags, no errors
2. Oversized input reproduces the intended failure (ASan report)
3. Normal, in-bounds input behaves correctly — no false positive
4. `secure.c` handles the same oversized input gracefully, no corruption
5. Output matches `levels/<n>/expected_output.txt`

Verified manually (`docker run -it`) and via the live browser terminal
bridge for levels 01–06.

### 4.2 Sandbox isolation tests — automated, 6/6 passing
`scripts/validate_sandbox.py`:
- No network reachability (`--network none`)
- pids-limit enforced (read via cgroup `pids.max`, not a racy fork-bomb exit code)
- Read-only root filesystem
- `/tmp` and `/home/student` both writable and executable
- Level 01 clean run (no false positive)
- Level 01 oversized run (ASan trips correctly)

### 4.3 Browser/backend integration — verified manually
Terminal I/O round-trips correctly over the websocket with no byte loss,
confirmed by running every required level's full compile/run cycle live
in the browser terminal and matching output against manual testing.

### 4.4 Acceptance criteria — met
- All 6 lab-sheet-required levels run end-to-end in the browser terminal
  inside the sandbox, each with a working secure counterpart
- `docs/theory.md`, `docs/solution.md` complete
- Formal report assembled and verified
- Bonus level 07, WASM visualizer, and quiz were all explicitly optional
  scope — the project is complete and submittable without them

## 5. Current Status

- [x] Phase 0 — done
- [x] Phase 1 — done (revised scope)
- [x] Phase 2 — done, all 7 levels (6 required + bonus)
- [x] Phase 3 — done
- [x] Phase 4 — done (vanilla JS)
- [x] Phase 5 — cut by deliberate decision
- [x] Phase 6 — done (WASM visualizer + quiz)
- [x] Phase 7 — done

**Project status: feature-complete and submittable.** No open items remain.