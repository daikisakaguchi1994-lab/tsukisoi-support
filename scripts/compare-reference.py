#!/usr/bin/env python3
"""参考サイトと自サイト（dist/）の本文を照合し、共通する文字列を長い順に出す。

使い方:
  npm run build
  python3 scripts/compare-reference.py            # 参考サイトを取得して照合（最小一致 8 文字）
  python3 scripts/compare-reference.py --min 10   # 最小一致の文字数を変える
  python3 scripts/compare-reference.py --ref-dir <保存済みHTMLのフォルダ>   # 取得できない環境向け

空白と句読点を除いて比べる。ナビの項目名やごく短い定型句は一致しても問題ない（CLAUDE.md 2.）。
参照ページ単位で比べ、出典（参照ページ@正規化後の位置）を併記する。比較対象が0件なら終了コード2で失敗する。
文として一致・言い換え程度のものが出たら自前の文章に書き直し、tests/site.spec.ts の BORROWED_PHRASES に足す。
"""
import argparse
import glob
import os
import re
import sys
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


def find_runs(s, ref_text, grams, n):
    """s の中で ref_text に連続して存在する部分文字列（n 文字以上）を (開始位置, 文字列) で返す。"""
    runs, i = [], 0
    while i <= len(s) - n:
        if s[i:i + n] not in grams:
            i += 1
            continue
        j = i + n
        while j < len(s) and s[i:j + 1] in ref_text:
            j += 1
        runs.append(s[i:j])
        i = j
    return runs


def positive_int(value):
    n = int(value)
    if n < 1:
        raise argparse.ArgumentTypeError('1 以上の整数を指定してください')
    return n


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--min', type=positive_int, default=8)
    ap.add_argument('--ref-dir')
    ap.add_argument('--dist', default='dist')
    args = ap.parse_args()
    n = args.min

    # 参照ページごとに保持する。別ページの断片をつないで「一致」にしないため。
    refs = {name: normalize(html) for name, html in load_reference(args.ref_dir).items()}
    dist_files = glob.glob(os.path.join(args.dist, '**', '*.html'), recursive=True)
    if not refs or not dist_files:
        print(f'比較対象が0件です（参照HTML {len(refs)}件 / {args.dist} のHTML {len(dist_files)}件）。'
              '--ref-dir / --dist を確認してください。', file=sys.stderr)
        sys.exit(2)
    print(f'比較: 参照 {len(refs)} ページ × 自サイト {len(dist_files)} ページ（最小一致 {n} 文字）', file=sys.stderr)

    ref_grams = {name: {r[i:i + n] for i in range(len(r) - n + 1)} for name, r in refs.items()}
    hits = {}
    for f in dist_files:
        s = normalize(open(f, encoding='utf-8').read())
        page = os.path.relpath(f, args.dist)
        for name, r in refs.items():
            for text in find_runs(s, r, ref_grams[name], n):
                hits.setdefault(text, set()).add((page, os.path.basename(name.rstrip('/')) or name, r.find(text)))

    for text, srcs in sorted(hits.items(), key=lambda kv: -len(kv[0])):
        pages = ', '.join(sorted({p for p, _, _ in srcs}))
        found = sorted({(ref, pos) for _, ref, pos in srcs})
        origins = ', '.join(f'{ref}@{pos}' for ref, pos in found[:3]) + (f' ほか{len(found) - 3}件' if len(found) > 3 else '')
        print(f'{len(text):3d}  {text}  ({pages})  出典: {origins}')


if __name__ == '__main__':
    main()
