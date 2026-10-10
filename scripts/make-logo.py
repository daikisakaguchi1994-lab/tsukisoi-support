#!/usr/bin/env python3
"""public/images/logo-mark.png から、余白を切り落とした透過のロゴ2種を作る。

  python3 scripts/make-logo.py

元画像は次のどちらでもよい。
  - 背景が透明な PNG（線の色はそのまま使う）
  - 白い背景に濃い線の画像（背景を透明にする）

出力:
  public/images/logo-dark.png   元の色（濃い緑）の線画。白い地の上（導入部など）に使う
  public/images/logo-white.png  白の線画。濃い緑の帯や写真の上（ヘッダー）に使う
"""
import os
import sys

from PIL import Image

SRC = 'public/images/logo-mark.png'
PAD = 12

if not os.path.exists(SRC):
    sys.exit(f'{SRC} がありません。')

im = Image.open(SRC).convert('RGBA')
alpha = im.getchannel('A')
if alpha.getextrema()[0] == 255:
    # 不透明な画像: 白い背景を透明にし、線の濃さを透明度にする
    gray = im.convert('L')
    low = gray.getextrema()[0]
    alpha = gray.point(lambda v: 0 if v >= 238 else min(255, int((255 - v) * 255 / max(1, 255 - low))))
    im.putalpha(alpha)
# ごく薄いにじみ（ノイズ）は無視して、線の範囲を求める
bbox = alpha.point(lambda v: 255 if v > 40 else 0).getbbox()
if bbox is None:
    sys.exit('線が見つかりません。')
box = (max(0, bbox[0] - PAD), max(0, bbox[1] - PAD), min(im.width, bbox[2] + PAD), min(im.height, bbox[3] + PAD))

im.putalpha(alpha.point(lambda v: 0 if v < 12 else v))  # 薄いにじみを消す
dark = im.crop(box)
dark.save('public/images/logo-dark.png', optimize=True)
white = Image.new('RGBA', dark.size, (255, 255, 255, 0))
white.putalpha(dark.getchannel('A'))
white.save('public/images/logo-white.png', optimize=True)
print('wrote logo-dark.png / logo-white.png', dark.size)
