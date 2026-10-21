"""Build assets/search-index.js (Chinese, root pages) and assets/search-index-en.js (English, en/ pages).

Indexes every <h2 id>/<h3 id> (with the text that follows it), every glossary <dt>/<dd>
and every case card (.case with an id). Run after editing any page:  python tools/build_index.py
"""
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

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
PAGES = [  # (file, group id used by site.js for the coloured tag)
    ("architecture.html", "arch"),
    ("process.html", "fab"),
    ("design.html", "design"),
    ("production.html", "mfg"),
    ("test.html", "test"),
    ("application.html", "app"),
    ("sic.html", "sic"),
    ("smartswitch.html", "hss"),
    ("issues.html", "issues"),
    ("complaints.html", "complaints"),
    ("roles.html", "roles"),
    ("glossary.html", "glossary"),
]
EXTRA = [  # interactive pages, written by hand
    {"p": "lab.html", "a": "bode", "t": "LDO 穩定度：Bode 圖與 ESR 穩定窗口", "s": "相位裕度 phase margin 交越頻率 輸出極點 ESR 零點 tunnel of death 陶瓷電容 鉭電容 內部補償 最小電容 振盪", "g": "lab", "lv": 1},
    {"p": "lab.html", "a": "psrr", "t": "PSRR 頻率響應模擬", "s": "電源抑制比 壓差裕度 dropout Buck 漣波 切換頻率 後級濾波 PMOS NMOS", "g": "lab", "lv": 1},
    {"p": "lab.html", "a": "transient", "t": "負載暫態模擬", "s": "load transient 下衝 過衝 ESR 迴路頻寬 相位裕度 振鈴 迴轉率 slew 負載調節", "g": "lab", "lv": 1},
    {"p": "lab.html", "a": "thermal", "t": "壓差、功耗與接面溫度", "s": "dropout 熱 θJA 封裝 SOT-23 DFN QFN 熱關機 TSD 打嗝 hiccup 效率", "g": "lab", "lv": 1},
    {"p": "lab.html", "a": "buck", "t": "Buck 電感漣波、輸出漣波與效率", "s": "duty cycle 漣波電流 飽和電流 Isat CCM DCM PFM FPWM t_ON,min 效率曲線", "g": "lab", "lv": 1},
    {"p": "lab.html", "a": "mlcc", "t": "MLCC DC bias 有效電容", "s": "陶瓷電容 直流偏壓 X5R X7R Y5V 尺寸 0402 0603 額定電壓 溫度 老化 容差", "g": "lab", "lv": 1},
    {"p": "lab.html", "a": "trim", "t": "修調與良率 / Cpk 模擬", "s": "trim 修調碼 LSB 位元數 封裝偏移 預補償 CP FT 良率 Cpk 蒙地卡羅", "g": "lab", "lv": 1},
    {"p": "quiz.html", "a": "", "t": "電源 IC 測驗", "s": "quiz 題庫 自我檢查 架構 製程 設計 生產 測試 應用 客訴", "g": "quiz", "lv": 1},
]

EXTRA_EN = [
    {"p": "lab.html", "a": "bode", "t": "LDO stability: Bode plot and ESR window", "s": "phase margin crossover output pole ESR zero tunnel of death ceramic tantalum internal compensation minimum capacitance oscillation", "g": "lab", "lv": 1},
    {"p": "lab.html", "a": "psrr", "t": "PSRR frequency-response simulation", "s": "power supply rejection headroom dropout buck ripple switching frequency post-regulation PMOS NMOS", "g": "lab", "lv": 1},
    {"p": "lab.html", "a": "transient", "t": "Load-transient simulation", "s": "undershoot overshoot ESR loop bandwidth phase margin ringing slew rate load regulation", "g": "lab", "lv": 1},
    {"p": "lab.html", "a": "thermal", "t": "Dropout, dissipation and junction temperature", "s": "dropout thermal θJA package SOT-23 DFN QFN thermal shutdown TSD hiccup efficiency", "g": "lab", "lv": 1},
    {"p": "lab.html", "a": "buck", "t": "Buck inductor ripple, output ripple and efficiency", "s": "duty cycle ripple current saturation current Isat CCM DCM PFM FPWM t_ON,min efficiency curve", "g": "lab", "lv": 1},
    {"p": "lab.html", "a": "mlcc", "t": "MLCC DC bias and effective capacitance", "s": "ceramic capacitor DC bias X5R X7R Y5V case size 0402 0603 rated voltage temperature ageing tolerance", "g": "lab", "lv": 1},
    {"p": "lab.html", "a": "trim", "t": "Trim, yield and Cpk simulation", "s": "trim code LSB bits package shift pre-compensation CP FT yield Cpk Monte Carlo", "g": "lab", "lv": 1},
    {"p": "quiz.html", "a": "", "t": "Power IC quiz", "s": "quiz questions self-check architecture process design production test applications complaints", "g": "quiz", "lv": 1},
]


class Collector(HTMLParser):
    def __init__(self):
        super().__init__()
        self.entries = []
        self.cur = None          # entry being filled
        self.mode = None         # 'head' | 'body' | 'dt' | 'dd' | 'case'
        self.section = ""        # id of the latest h2
        self.skip = 0            # depth inside svg/script/style
        self.in_article = False

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "article":
            self.in_article = True
        if not self.in_article:
            return
        if tag in ("svg", "script", "style", "figure"):
            self.skip += 1
            return
        if self.skip:
            return
        if tag in ("h2", "h3") and a.get("id"):
            if tag == "h2":
                self.section = a["id"]
            self.cur = {"a": a["id"], "t": "", "s": "", "lv": 1 if tag == "h2" else 2}
            self.entries.append(self.cur)
            self.mode = "head"
        elif tag == "div" and "case" in (a.get("class") or "").split() and a.get("id"):
            self.cur = {"a": a["id"], "t": "", "s": "", "lv": 2}
            self.entries.append(self.cur)
            self.mode = None
        elif tag == "b" and self.cur and self.cur["lv"] == 2 and self.cur["a"].startswith("c-") and not self.cur["t"]:
            self.mode = "case"
        elif tag == "dt" and not (self.cur and self.cur["a"].startswith("c-")):
            self.cur = {"a": a.get("id") or self.section, "t": "", "s": "", "lv": 3}
            self.entries.append(self.cur)
            self.mode = "dt"
        elif tag == "dd":
            self.mode = "dd"

    def handle_endtag(self, tag):
        if tag == "article":
            self.in_article = False
        if tag in ("svg", "script", "style", "figure") and self.skip:
            self.skip -= 1
            return
        if tag in ("h2", "h3") and self.mode == "head":
            self.mode = "body"
        elif tag == "b" and self.mode == "case":
            self.mode = "body"
        elif tag == "dt" and self.mode == "dt":
            self.mode = None
        elif tag == "dd":
            self.mode = None

    def handle_data(self, data):
        if self.skip or not self.cur:
            return
        if self.mode in ("head", "dt", "case"):
            self.cur["t"] += data
        elif self.mode in ("body", "dd") and len(self.cur["s"]) < 260:
            self.cur["s"] += data
        elif self.mode is None and self.cur["a"].startswith("c-") and len(self.cur["s"]) < 260:
            self.cur["s"] += data


def clean(s):
    return re.sub(r"\s+", " ", s).strip()


def build(subdir, extra, out_name):
    out = []
    for fname, group in PAGES:
        c = Collector()
        c.feed((ROOT / subdir / fname).read_text(encoding="utf-8"))
        for e in c.entries:
            t = clean(e["t"])
            if not t:
                continue
            out.append({"p": fname, "a": e["a"], "t": t, "s": clean(e["s"])[:240], "g": group, "lv": e["lv"]})
    out.extend(extra)
    js = "/* Generated by tools/build_index.py — do not edit by hand. */\nwindow.SEARCH_INDEX = " + json.dumps(out, ensure_ascii=False, separators=(",", ":")) + ";\n"
    emit(ROOT / "assets" / out_name, js)
    print(f"{len(out)} entries -> assets/{out_name}")


def main():
    build("", EXTRA, "search-index.js")
    build("en", EXTRA_EN, "search-index-en.js")


if __name__ == "__main__":
    main()
    finish()
