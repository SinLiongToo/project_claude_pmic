"""Build glossary.html, en/glossary.html and assets/glossary-data.js.

Sources: tools/glossary.py (site-wide terms) plus every <dl class="terms"> list on the chapter pages
(zh and en aligned by order), so the glossary page and the hover tooltips cover every defined term.
Run after editing:  python tools/build_glossary.py && python tools/build_index.py
"""
import html
import json
import re
import sys
from pathlib import Path

from glossary import CATS, GLOSS

ROOT = Path(__file__).resolve().parent.parent

CHECK = "--check" in sys.argv          # --check: report stale generated files instead of writing them
STALE = []


def emit(path, text):
    if CHECK:
        if not path.exists() or path.read_text(encoding="utf-8") != text:
            STALE.append(str(path.relative_to(ROOT)))
    else:
        path.write_text(text, encoding="utf-8")


def finish():
    if CHECK:
        if STALE:
            print("stale generated files:", ", ".join(STALE))
            sys.exit(1)
        print("generated files are up to date")
FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
         '<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Sans+Condensed:wght@600;700&family=Noto+Sans+TC:wght@400;500;700&display=swap" rel="stylesheet">')
CHAPTER_CAT = {"architecture": "ckt", "process": "basic", "design": "ckt", "production": "mfg", "test": "test",
               "application": "sys", "complaints": "qa", "sic": "wbg"}
ASCII = re.compile(r"^[A-Za-z0-9&.+\- ]{2,}$")
CJK = re.compile(r"^[一-鿿]{2,}$")
SPLIT_EN = re.compile(r"\s*/\s*|\s*[()（）]\s*")
SPLIT_ZH = re.compile(r"\s*/\s*|\s*[()（）]\s*|\s+")


def slug(term):
    return "g-" + (re.sub(r"[^a-z0-9]+", "-", term.lower()).strip("-") or "x")


def plain(h):
    return html.unescape(re.sub(r"<[^>]+>", "", h)).strip()


def harvest():
    """Every term list on the chapter pages, as glossary items linked to the section they sit in."""
    out = []
    for name, cat in CHAPTER_CAT.items():
        lists = []
        for path in (ROOT / (name + ".html"), ROOT / "en" / (name + ".html")):
            src = path.read_text(encoding="utf-8")
            found = []
            for m in re.finditer(r'<dl class="terms">(.*?)</dl>', src, re.S):
                heads = re.findall(r'<h2 id="([^"]+)"', src[:m.start()])
                for dt, dd in re.findall(r"<dt>(.*?)</dt>\s*<dd>(.*?)</dd>", m.group(1), re.S):
                    found.append((dt.strip(), dd.strip(), heads[-1] if heads else ""))
            lists.append(found)
        zh, en = lists
        assert len(zh) == len(en), name + ": zh/en term lists differ"
        for (zdt, zdd, sec), (edt, edd, _) in zip(zh, en):
            parts = set()
            # English phrases are kept whole (never split on spaces, so "Hot loop" never becomes "loop");
            # Chinese names are used only when they are at least 3 characters (avoids generic words like 補償)
            for p in SPLIT_EN.split(plain(edt)) + SPLIT_EN.split(plain(zdt)):
                p = p.strip()
                if p and ASCII.match(p):
                    parts.add(p)
            for p in SPLIT_ZH.split(plain(zdt)):
                p = p.strip()
                if CJK.match(p) and len(p) >= 3:
                    parts.add(p)
            out.append({"hz": zdt, "he": edt, "zd": zdd, "ed": edd, "l": name + ".html#" + sec, "c": cat, "m": sorted(parts)})
    return out


def items():
    """GLOSS entries first, then chapter terms that GLOSS does not already cover."""
    res, taken = [], set()
    for t, a, c, zf, zd, ef, ed, l in GLOSS:
        res.append({"s": slug(t), "hz": html.escape(t), "he": html.escape(t), "zf": zf, "ef": ef,
                    "zd": html.escape(zd), "ed": html.escape(ed), "l": l, "c": c, "m": [t] + a})
        taken.update([t] + a)
    for h in harvest():
        key = plain(h["he"])
        if key in taken or any(p in taken for p in h["m"] if ASCII.match(p)):
            continue
        h["m"] = [p for p in h["m"] if p not in taken]
        zname = plain(h["hz"])
        h.update({"s": slug(key), "zf": zname if zname != key else "", "ef": ""})
        res.append(h)
        taken.update(h["m"] + [key])
    seen = {}
    for r in res:                                       # unique slugs
        n = seen.get(r["s"], 0)
        seen[r["s"]] = n + 1
        if n:
            r["s"] += "-" + str(n + 1)
    return res


def build_page(lang, ALL):
    zh = lang == "zh"
    T = (lambda a, b: a) if zh else (lambda a, b: b)
    pre = "" if zh else "../"
    out = []
    for key, czh, cen in CATS:
        group = sorted([g for g in ALL if g["c"] == key], key=lambda g: plain(g["he"]).lstrip(".").lower())
        if not group:
            continue
        out.append(f'<h2 id="cat-{key}">{html.escape(T(czh, cen))}</h2>\n<dl class="terms gl-list">')
        for g in group:
            full = g["zf"] if zh else g["ef"]
            other = f' <span class="gl-other">{html.escape(g["ef"])}</span>' if zh and g["ef"] else ""
            shown = plain(g["he"])
            alias = [m for m in g["m"] if m != shown and m != g["zf"] and (zh or ASCII.match(m))]
            also = (f'<span class="gl-also">{T("也寫作：", "Also: ")}{html.escape(("、" if zh else ", ").join(alias))}</span>') if alias else ""
            out.append(f'  <div><dt id="{g["s"]}">{g["he"]}' + (f' <small>{html.escape(full)}</small>' if full else "") + "</dt>"
                       f'<dd>{g["zd"] if zh else g["ed"]}{other} {also} <a class="gl-more" href="{g["l"]}">{T("詳細說明 →", "Details →")}</a></dd></div>')
        out.append("</dl>")
    body = "\n".join(out)
    title = T("術語表 · PMIC Notes", "Glossary · PMIC Notes")
    desc = T("全站縮寫與術語：UVLO、PSRR、ESD、MLCC、AEC-Q100、SiC 等，依主題分類，每個附一句話解釋與詳細說明的連結。",
             "Every acronym and term on the site — UVLO, PSRR, ESD, MLCC, AEC-Q100, SiC and more — by topic, each with a one-line definition and a link to the details.")
    alt = '<link rel="alternate" hreflang="en" href="en/glossary.html">' if zh else '<link rel="alternate" hreflang="zh-Hant" href="../glossary.html">'
    lead = T("電源 IC 的文件充滿縮寫。這裡把全站用到的術語依主題整理，每個附一句話解釋，並連到詳細說明的章節。各章內文中，術語在每一節第一次出現時有虛線底線，滑鼠移上去（手機點一下）就會顯示這裡的解釋。",
             "Power-IC writing is full of acronyms. Every term used on this site is collected here by topic, each with a one-line definition and a link to the section that explains it. In the chapters, the first use of a term in each section is underlined with dots; hover it (or tap on a phone) to see the definition from this page.")
    note = T(f"包含各章「名詞解釋」與規格清單裡的術語，共 {len(ALL)} 個。", f"Includes the terms from every chapter glossary and spec list: {len(ALL)} in all.")
    return f'''<!doctype html>
<html lang="{T('zh-Hant', 'en')}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title>
<meta name="description" content="{html.escape(desc)}">
{alt}
{FONTS}
<link rel="stylesheet" href="{pre}assets/style.css">
</head>
<body data-page="glossary">
<main class="doc">
<nav class="toc" aria-label="{T('本頁目錄', 'On this page')}"></nav>
<article>
<div class="eyebrow">Glossary{T(' · 術語表', '')}</div>
<h1>{T('術語表：全站縮寫與名詞', 'Glossary: every acronym and term on the site')}</h1>
<p class="lead">{lead}</p>
<div class="gl-filter"><input id="glf" type="search" placeholder="{T('篩選：輸入 UVLO、電容、test…', 'Filter: type UVLO, capacitor, test…')}" autocomplete="off"><span id="glf-n"></span></div>
<p class="note">{note}</p>
{body}
</article>
</main>
<script src="{pre}assets/search-index{'' if zh else '-en'}.js"></script>
<script src="{pre}assets/site.js"></script>
<script>
(function(){{
  const q = document.getElementById('glf'), n = document.getElementById('glf-n');
  const rows = [...document.querySelectorAll('.gl-list > div')];
  function run(){{
    const w = q.value.trim().toLowerCase(); let k = 0;
    rows.forEach(r => {{ const hit = !w || r.textContent.toLowerCase().includes(w); r.hidden = !hit; if(hit) k++; }});
    document.querySelectorAll('.gl-list').forEach(dl => {{ const any = [...dl.children].some(c => !c.hidden); dl.hidden = !any; dl.previousElementSibling.hidden = !any; }});
    n.textContent = w ? k + '{T(' 筆', ' found')}' : '';
  }}
  q.addEventListener('input', run);
  if(location.hash){{ const el = document.getElementById(location.hash.slice(1)); if(el) el.parentElement.classList.add('gl-target'); }}
}})();
</script>
</body>
</html>
'''


def main():
    ALL = items()
    emit(ROOT / "glossary.html", build_page("zh", ALL))
    emit(ROOT / "en" / "glossary.html", build_page("en", ALL))
    data = [{"m": g["m"], "hz": g["hz"], "he": g["he"], "zf": g["zf"], "ef": g["ef"], "zd": plain(g["zd"]), "ed": plain(g["ed"]),
             "l": g["l"], "s": g["s"]} for g in ALL]
    js = "/* Generated by tools/build_glossary.py — do not edit by hand. */\nwindow.GLOSSARY = " + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n"
    emit(ROOT / "assets" / "glossary-data.js", js)
    print(f"{len(ALL)} terms ({len(GLOSS)} site-wide + {len(ALL) - len(GLOSS)} from chapter term lists)")


if __name__ == "__main__":
    main()
    finish()
