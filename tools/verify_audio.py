#!/usr/bin/env python3
"""用 mlx-whisper 把每題詞音檔轉回文字，和課本的詞比對（抓「念成別的字」）。

⚠️ 只能抓錯字，抓不到聲調／破音字念法（例：嚼念 jué 還是 jiáo），那幾個要人耳聽。
用法：python3 tools/verify_audio.py tools/lessons/lesson07.json
"""
import json
import sys
from pathlib import Path

import mlx_whisper

SITE = Path(__file__).resolve().parent.parent
MODEL = "mlx-community/whisper-large-v3-turbo"

lesson = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
bad = 0
for it in lesson["items"]:
    f = SITE / "audio" / lesson["id"] / f"{it['no']:02d}.m4a"
    text = mlx_whisper.transcribe(str(f), path_or_hf_repo=MODEL, language="zh",
                                  initial_prompt="以下是繁體中文。")["text"].strip()
    clean = text.strip("。，,.!！ ")
    ok = clean == it["word"]
    bad += not ok
    print(f"{'✓' if ok else '？'} {it['no']:>2} {it['word']:<6} → {text}")
print(f"\n不一致 {bad} 個（簡體／同音字也會被列出，要人工看）")
