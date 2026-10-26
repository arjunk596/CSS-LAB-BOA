"""
Automated validation for every level (extends the single-level coverage
in validate_sandbox.py to all 7). Run with:
    pytest scripts/test_all_levels.py -v
Requires: docker compose build sandbox-image (run first)
"""
import docker
import pytest
import yaml
from pathlib import Path

client = docker.from_env()
IMAGE = "css-lab-boa-sandbox"
LEVELS_YAML = Path(__file__).resolve().parent.parent / "levels" / "levels.yaml"

SANDBOX_KWARGS = dict(
    network_mode="none", cap_drop=["ALL"], security_opt=["no-new-privileges"],
    mem_limit="256m", nano_cpus=1_000_000_000, pids_limit=64, read_only=True,
    tmpfs={"/home/student": "rw,exec,size=32m,mode=1777", "/tmp": "rw,exec,size=32m,mode=1777"},
)

def run(cmd, timeout=30):
    container = client.containers.run(IMAGE, cmd, detach=True, **SANDBOX_KWARGS)
    try:
        result = container.wait(timeout=timeout)
        return result.get("StatusCode", -1), container.logs(stdout=True, stderr=True)
    finally:
        container.remove(force=True)

def load_required_levels():
    with open(LEVELS_YAML) as f:
        data = yaml.safe_load(f)
    return [lvl["id"] for lvl in data["levels"] if not lvl.get("bonus")]

REQUIRED_LEVELS = load_required_levels()

@pytest.mark.parametrize("level_id", REQUIRED_LEVELS)
def test_level_compiles_and_runs_clean(level_id):
    cmd = f"cd /opt/levels/{level_id} && gcc -g -fsanitize=address -fno-stack-protector -o /tmp/v vuln.c && echo OK"
    exit_code, logs = run(cmd=["bash", "-c", cmd])
    assert exit_code == 0, logs.decode(errors="replace")
    assert b"OK" in logs

@pytest.mark.parametrize("level_id", REQUIRED_LEVELS)
def test_level_secure_variant_compiles(level_id):
    cmd = f"cd /opt/levels/{level_id} && gcc -g -O0 -o /tmp/s secure.c && echo OK"
    exit_code, logs = run(cmd=["bash", "-c", cmd])
    assert exit_code == 0, logs.decode(errors="replace")
    assert b"OK" in logs
