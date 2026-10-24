"""Stamp every page with a "last updated" date, placed right after </main>.

A page whose content (ignoring the stamp itself) differs from the last commit gets today's date;
an unchanged page keeps the date it already has, or, the first time, the date of its last commit.
Run after the other generators, before committing:
    python tools/build_glossary.py && python tools/build_index.py && python tools/stamp_updated.py
--check reports pages whose stamp is missing or out of date (used by the static test).
"""
import datetime
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CHECK = "--check" in sys.argv
STAMP = re.compile(r'<footer class="updated">.*?</footer>\n', re.S)
DATE = re.compile(r'datetime="(\d{4}-\d{2}-\d{2})"')


def git(*args):
    r = subprocess.run(["git", *args], cwd=ROOT, capture_output=True)
    return r.stdout.decode("utf-8") if r.returncode == 0 else None


def stamp(date, en):
    label = "Last updated: " if en else "最後更新："
    return f'<footer class="updated">{label}<time datetime="{date}">{date}</time></footer>\n'


def main():
    today = datetime.date.today().isoformat()
    stale = []
    pages = sorted(ROOT.glob("*.html")) + sorted((ROOT / "en").glob("*.html"))
    for path in pages:
        rel = path.relative_to(ROOT).as_posix()
        text = path.read_text(encoding="utf-8")
        body = STAMP.sub("", text)
        head = git("show", "HEAD:" + rel)
        if head is None or STAMP.sub("", head.replace("\r\n", "\n")) != body.replace("\r\n", "\n"):
            date = today                                          # new or edited since the last commit
        else:
            m = DATE.search(STAMP.search(head).group(0)) if STAMP.search(head) else None
            date = m.group(1) if m else (git("log", "-1", "--format=%cs", "--", rel) or today).strip()
        assert body.count("</main>\n") == 1, rel + ": expected one </main>"
        new = body.replace("</main>\n", "</main>\n" + stamp(date, rel.startswith("en/")), 1)
        if new != text:
            stale.append(rel)
            if not CHECK:
                path.write_text(new, encoding="utf-8")
    if CHECK:
        if stale:
            print("stale update dates:", ", ".join(stale))
            sys.exit(1)
        print("update dates are up to date")
    else:
        print(f"{len(pages)} pages, {len(stale)} stamped")


if __name__ == "__main__":
    main()
