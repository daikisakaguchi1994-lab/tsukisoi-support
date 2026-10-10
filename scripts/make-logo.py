#!/usr/bin/env python3
"""public/images/logo-mark.png（白い背景に濃い緑の線画）から、透過のロゴ2種を作る。

  python3 scripts/make-logo.py

出力（余白は切り落とす）:
  public/images/logo-dark.png   濃い緑の線画。白い地の上（導入部など）に使う
  public/images/logo-white.png  白の線画。濃い緑の見出し帯や写真の上（ヘッダー）に使う
"""
import os
import sys

from PIL import Image

SRC = 'public/images/logo-mark.png'
STROKE = (46, 74, 53)  # --color-deep
PAD = 12

if not os.path.exists(SRC):
    sys.exit(f'{SRC} がありません。')

im = Image.open(SRC).convert('RGBA')
# 背景（白）を透明にし、線の濃さをそのまま透明度にする
rgb = im.convert('L')
low = rgb.getextrema()[0]
alpha = rgb.point(lambda v: 0 if v >= 238 else min(255, int((255 - v) * 255 / max(1, 255 - low))))
bbox = alpha.getbbox()
if bbox is None:
    sys.exit('線が見つかりません。白い背景に濃い線のロゴを置いてください。')
box = (max(0, bbox[0] - PAD), max(0, bbox[1] - PAD), min(im.width, bbox[2] + PAD), min(im.height, bbox[3] + PAD))

for name, color in (('logo-dark.png', STROKE), ('logo-white.png', (255, 255, 255))):
    out = Image.new('RGBA', im.size, color + (0,))
    out.putalpha(alpha)
    out.crop(box).save(f'public/images/{name}', optimize=True)
    print('wrote', name, out.crop(box).size)
