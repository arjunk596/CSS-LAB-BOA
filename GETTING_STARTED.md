# Quickstart Guide: CSS-LAB-BOA Sandbox & Test Harness

This guide walks you through setting up the local environment, building the multi-architecture Docker sandbox, launching the interactive web UI terminal, running standalone CLI containers, and executing the automated test suite.

---

## Prerequisites

Ensure you have the following installed on your host machine (macOS or Linux):
* **Docker Desktop** (running and healthy)
* **Node.js 18+ & npm** (for the web interface & terminal backend)
* **Python 3.10+** (for the automated test harness)
* **Git**

---

## 1. Environment Setup

Clone the repository and set up the dependencies:

```bash
# Clone the repository
git clone https://github.com/beeth73/CSS-LAB-BOA.git
cd CSS-LAB-BOA

# Set up Python virtual environment for automated tests
cd scripts
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd ..

# Install backend Node.js dependencies
cd backend
npm install
cd ..
```

---

## 2. Build the Docker Sandbox Image

The lab runs inside a sandboxed container based on Debian Bookworm with `gcc-multilib`, `libc6-dev-i386`, `gdb`, and memory sanitizer toolchains pre-installed.

1. Ensure **Docker Desktop** is open and active:
   ```bash
   # On macOS:
   open -a Docker
   ```
2. Build and tag the isolated sandbox image:
   ```bash
   docker compose build sandbox-image
   ```

---

## 3. Workflow Option A: Interactive Web UI Terminal (Recommended)

The easiest way to work through the lab is using the integrated web app, which spawns isolated Docker sessions attached to an in-browser `xterm.js` live terminal.

1. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
2. Create your `.env` configuration file if not already present:
   ```bash
   cp .env.example .env 2>/dev/null || true
   ```
3. Start the backend server:
   ```bash
   npm start
   ```

### Expected Terminal Output:
```text
> css-lab-boa-backend@0.1.0 start
> node src/server.js

CSS-LAB-BOA backend listening on :4000
Open http://localhost:4000 in your browser
Session started: container f16e8da99761 (1/10)
```

4. Open your browser and go to:
   ```text
   http://localhost:4000
   ```
   *(Note: Do **not** use port 5500 / Live Server. Open port `4000` directly so the live terminal can communicate with the backend WebSocket).*

---

## 4. Workflow Option B: Manual CLI Docker Shell

If you prefer to debug directly in your terminal rather than the browser, spin up a standalone container with `SYS_PTRACE` enabled (required for GDB to inspect stack memory):

```bash
docker run --rm -it \
  --platform linux/amd64 \
  --cap-add=SYS_PTRACE \
  --security-opt seccomp=unconfined \
  css-lab-boa-sandbox /bin/bash
```

You will drop directly into the container shell as the `student` user:
```bash
student@<container_id>:~$ cd /opt/levels/01-gets
student@<container_id>:/opt/levels/01-gets$ ls -la
student@<container_id>:/opt/levels/01-gets$ gcc -g -fno-stack-protector -z execstack -no-pie -o /tmp/vuln vuln.c
student@<container_id>:/opt/levels/01-gets$ gdb /tmp/vuln
```
*(Type `exit` when you want to leave the container).*

---

## 5. Workflow Option C: Automated Test Suite

To verify all 6 vulnerability levels and their secure counterparts across ephemeral containers:

```bash
# Activate your scripts virtual environment
cd scripts
source .venv/bin/activate

# Run the test suite
python -m pytest test_all_levels.py -v
```

### Expected Output:
```text
test_all_levels.py::test_level_compiles_and_runs_clean[01-gets] PASSED
test_all_levels.py::test_level_secure_variant_compiles[01-gets] PASSED
...
========================== 12 passed in 19.82s ==========================
```

---

## 6. Troubleshooting & Common Pitfalls

| Issue | Cause | Fix |
| :--- | :--- | :--- |
| `dial unix .../docker.sock: connect: no such file or directory` | Docker Desktop is closed. | Launch Docker Desktop (`open -a Docker`) and wait for the engine to initialize. |
| Terminal stuck on `🟡 connecting...` in browser | Browser opened via Live Server (port 5500) or backend is not running. | Run `npm start` inside `backend/` and visit **`http://localhost:4000`**. |
| `ModuleNotFoundError: No module named 'yaml'` | Python venv missing PyYAML. | Run `pip install -r scripts/requirements.txt` inside your activated `.venv`. |
| `open ... .json: no space left on device` | Mac SSD is full. | Run `docker builder prune -f` and clean cache/trash to free at least 5 GB of space. |
| GDB throws `ptrace: Operation not permitted` | Missing Linux tracing capabilities. | Add `--cap-add=SYS_PTRACE --security-opt seccomp=unconfined` to your `docker run` command. |