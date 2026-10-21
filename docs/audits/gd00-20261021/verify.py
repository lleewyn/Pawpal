"""Verify audit artifact consistency; no application execution or DB access."""
import collections
import csv
import hashlib
from pathlib import Path, PurePosixPath
import zipfile

folder = Path(__file__).resolve().parent
def rows(name):
    with (folder / name).open(encoding="utf-8-sig", newline="") as stream:
        return list(csv.DictReader(stream))

forms, scopes, fields = rows("forms.csv"), rows("form-scopes.csv"), rows("fields.csv")
opening = collections.Counter(row["file"] for row in forms)
closed = collections.Counter(row["file"] for row in scopes)
differences = dict(opening - closed)
archive = folder / "source-baseline.zip"
with zipfile.ZipFile(archive) as zipped:
    failure = zipped.testzip()
    names = zipped.namelist()
    no_env = not any(PurePosixPath(name).name.startswith(".env") for name in names)
digest = hashlib.sha256(archive.read_bytes()).hexdigest()
assert failure is None and no_env
assert len(fields) == 798 and len(forms) == 83
lines = [
    "Command: python docs/audits/gd00-20261021/verify.py",
    "Source HEAD: 37c274561460ff5351dafd175636cfc79697f6b0",
    "Archive: source-baseline.zip",
    f"SHA256: {digest}", f"Entries: {len(names)}", "CRC: OK", f"No env files: {no_env}",
    "Scope: tracked pages, scripts, styles, components, server.js, package files, AGENTS.md, CDSLfinal.md, enum.md, index.html, master plan.",
    "Not original Pawpal-main.zip, not a complete workspace or database backup.",
    f"Static controls: {len(fields)}; form opening tags: {len(forms)}; paired lexical form scopes: {len(scopes)}",
    f"Scope mismatch: {differences}",
    "Lexical mismatch requires manual source review; does not establish browser DOM structure.",
    "Runtime, CRUD, E2E, RLS: NOT RUN by this verification.", "Exit: 0",
]
(folder / "archive-verification.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")
print("\n".join(lines))
