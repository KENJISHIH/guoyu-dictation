#!/usr/bin/env python3
"""把 tools/lessons/lessonNN.json 轉成網站用的資料檔＋配音。

產出：
    lessonNN_data.js        網頁讀的資料（只有詞，不含課文句子）
    audio/<id>/NN.m4a       詞（念慢一點）
    audio/<id>/NN_s.m4a     提示句（課文原句，只在聽寫時播，不顯示）
    audio/num/N.m4a         「第 N 題」

破音字念錯時，在 JSON 那一題加 "tts"（詞的替代念法）或 "sentence_tts"（句子的替代念法），
再用 --force 重跑。換聲音／語速後也要 --force，並把 sw.js 的 CACHE 跳版。

用法：
    python3 tools/build_lesson.py tools/lessons/lesson07.json
    python3 tools/build_lesson.py tools/lessons/lesson07.json --force
"""
import json
import subprocess
import sys
import tempfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent
VOICE = "zh-TW-HsiaoYuNeural"  # HsiaoChen 會把餅、早念得像第四聲（2026-11-16 whisper 對照）
WORD_RATE = "-25%"
SENTENCE_RATE = "-20%"
EDGE_TTS = Path.home() / ".local/bin/edge-tts"
MAX_NUMBER = 30


def synth(text: str, rate: str, dst: Path, force: bool) -> tuple[str, bool, str]:
    if dst.exists() and not force:
        return str(dst.relative_to(SITE)), True, "skip"
    dst.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
        mp3 = Path(tmp.name)
    try:
        subprocess.run([str(EDGE_TTS), "--voice", VOICE, f"--rate={rate}",
                        "--text", text, "--write-media", str(mp3)],
                       check=True, capture_output=True)
        subprocess.run(["ffmpeg", "-y", "-i", str(mp3), "-c:a", "aac", "-b:a", "32k",
                        "-ac", "1", "-ar", "24000", str(dst)],
                       check=True, capture_output=True)
        return str(dst.relative_to(SITE)), True, f"{dst.stat().st_size // 1024} KB"
    except subprocess.CalledProcessError as e:
        return str(dst.relative_to(SITE)), False, (e.stderr or b"").decode()[-200:]
    finally:
        mp3.unlink(missing_ok=True)


def write_js(lesson: dict, src: Path) -> Path:
    items = [{"no": it["no"], "word": it["word"]} for it in lesson["items"]]
    data = {"id": lesson["id"], "title": lesson["title"], "version": lesson.get("version", ""),
            "newChars": lesson.get("newChars", ""), "items": items}
    out = SITE / f"{src.stem}_data.js"
    out.write_text(
        f"// 由 tools/build_lesson.py 從 {src.relative_to(SITE)} 產生，請改 JSON 後重跑，不要手改\n"
        f"registerLesson({json.dumps(data, ensure_ascii=False, indent=2)});\n",
        encoding="utf-8")
    return out


def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    force = "--force" in sys.argv
    if not args:
        sys.exit(__doc__)
    src = Path(args[0]).resolve()
    lesson = json.loads(src.read_text(encoding="utf-8"))
    print("資料檔：", write_js(lesson, src).name)

    jobs = []
    lid = lesson["id"]
    for it in lesson["items"]:
        nn = f"{it['no']:02d}"
        jobs.append((it.get("tts", it["word"]), WORD_RATE, SITE / "audio" / lid / f"{nn}.m4a"))
        jobs.append((it.get("sentence_tts", it["sentence"]), SENTENCE_RATE,
                     SITE / "audio" / lid / f"{nn}_s.m4a"))
    for n in range(1, MAX_NUMBER + 1):
        jobs.append((f"第{n}題", SENTENCE_RATE, SITE / "audio" / "num" / f"{n}.m4a"))

    failed = 0
    with ThreadPoolExecutor(4) as ex:
        for path, ok, msg in ex.map(lambda j: synth(*j, force=force), jobs):
            if not ok:
                failed += 1
                print("✗", path, msg)
            elif msg != "skip":
                print("✓", path, msg)
    print(f"完成，失敗 {failed} 個")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
