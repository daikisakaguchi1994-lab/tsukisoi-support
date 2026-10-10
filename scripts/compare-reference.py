#!/usr/bin/env python3
"""参考サイトと自サイト（dist/）の本文を照合し、共通する文字列を長い順に出す。

使い方:
  npm run build
  python3 scripts/compare-reference.py            # 参考サイトを取得して照合（最小一致 8 文字）
  python3 scripts/compare-reference.py --min 10   # 最小一致の文字数を変える
  python3 scripts/compare-reference.py --ref-dir <保存済みHTMLのフォルダ>   # 取得できない環境向け

空白と句読点を除いて比べる。ナビの項目名やごく短い定型句は一致しても問題ない（CLAUDE.md 2.）。
文として一致・言い換え程度のものが出たら自前の文章に書き直し、tests/site.spec.ts の BORROWED_PHRASES に足す。
"""
import argparse
import glob
import os
import re
import urllib.request
from html.parser import HTMLParser

REF_BASE = 'https://travelbuddy.jp/'
REF_PAGES = [
    '', 'service/', 'profile/', 'link/', 'articles/', 'contact_form/', 'english_guide/', 'travel-arrangement/',
    '2024_1207/', '20250324-2/', '202503_01/', '2025_01/', '20260630-2/',
]
SKIP = {'script', 'style', 'noscript', 'svg'}


class TextParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts, self.depth = [], 0

    def handle_starttag(self, tag, attrs):
        if tag in SKIP:
            self.depth += 1

    def handle_endtag(self, tag):
        if tag in SKIP and self.depth:
            self.depth -= 1

    def handle_data(self, data):
        if not self.depth:
            self.parts.append(data)


def normalize(html):
    p = TextParser()
    p.feed(html)
    return re.sub(r'[\s　、。・「」『』（）()!！?？,.:：]', '', ''.join(p.parts))


def load_reference(ref_dir):
    if ref_dir:
        return {f: open(f, encoding='utf-8', errors='ignore').read() for f in glob.glob(os.path.join(ref_dir, '*.html'))}
    pages = {}
    for path in REF_PAGES:
        req = urllib.request.Request(REF_BASE + path, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=30) as res:
            pages[REF_BASE + path] = res.read().decode('utf-8', errors='ignore')
    return pages


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--min', type=int, default=8)
    ap.add_argument('--ref-dir')
    ap.add_argument('--dist', default='dist')
    args = ap.parse_args()
    n = args.min

    grams = set()
    for html in load_reference(args.ref_dir).values():
        s = normalize(html)
        grams.update(s[i:i + n] for i in range(len(s) - n + 1))

    hits = {}
    for f in glob.glob(os.path.join(args.dist, '**', '*.html'), recursive=True):
        s = normalize(open(f, encoding='utf-8').read())
        i = 0
        while i <= len(s) - n:
            if s[i:i + n] not in grams:
                i += 1
                continue
            j = i + n
            while j < len(s) and s[j - n + 1:j + 1] in grams:
                j += 1
            hits.setdefault(s[i:j], set()).add(os.path.relpath(f, args.dist))
            i = j

    for text, files in sorted(hits.items(), key=lambda kv: -len(kv[0])):
        print(f'{len(text):3d}  {text}  ({", ".join(sorted(files))})')


if __name__ == '__main__':
    main()
