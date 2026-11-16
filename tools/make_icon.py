#!/usr/bin/env python3
"""產生 App 圖示：紅底白字「聽」。輸出 icons/ 下的 512／192／180／favicon。"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

SITE = Path(__file__).resolve().parent.parent
FONT = "/System/Library/Fonts/STHeiti Medium.ttc"
BG = (217, 83, 79)


def make(size: int) -> Image.Image:
    img = Image.new("RGB", (size, size), BG)
    d = ImageDraw.Draw(img)
    font = ImageFont.truetype(FONT, int(size * 0.58))
    box = d.textbbox((0, 0), "聽", font=font)
    w, h = box[2] - box[0], box[3] - box[1]
    d.text(((size - w) / 2 - box[0], (size - h) / 2 - box[1]), "聽", font=font, fill="white")
    return img


out = SITE / "icons"
out.mkdir(exist_ok=True)
for name, size in [("icon-512.png", 512), ("icon-192.png", 192), ("apple-touch-icon.png", 180), ("favicon.png", 64)]:
    make(size).save(out / name)
    print("✓", name)
