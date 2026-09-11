#!/usr/bin/env python3
"""Assemble openapi.bundle.yaml from modular path sources without reshaping YAML."""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
ENTRY = ROOT / "openapi.yaml"
OUT = ROOT / "openapi.bundle.yaml"

PATH_REF = re.compile(
    r'^  (/[^\n]+):\n    \$ref: "(\./paths/[^"]+)"\s*$',
    re.M,
)


def indent(text: str, spaces: int) -> str:
    pad = " " * spaces
    return "".join(pad + line if line.strip() else line for line in text.splitlines(True))


def main() -> int:
    root_text = ENTRY.read_text()

    def replace_path(match: re.Match[str]) -> str:
        path_key, rel = match.group(1), match.group(2)
        body = (ROOT / rel).read_text()
        return f"  {path_key}:\n{indent(body, 4)}"

    bundled, n = PATH_REF.subn(replace_path, root_text)
    if n == 0:
        print("no path $refs found to inline", file=sys.stderr)
        return 1

    if not bundled.endswith("\n"):
        bundled += "\n"
    OUT.write_text(bundled)
    print(f"wrote {OUT.relative_to(ROOT)} ({OUT.stat().st_size} bytes, {len(bundled.splitlines())} lines, {n} paths)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
