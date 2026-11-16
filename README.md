# 國語圈詞聽寫 guoyu-dictation

國小國語課本「圈詞」的聽寫練習網。老師在課本上圈出 1～30 個詞，考試是老師念、學生寫。
這個站負責「念」：聽發音 → 寫在紙上 → 念完再對答案 → 寫錯的進錯字複習。

- 📖 **背誦**：所有詞的卡片，點了聽發音；這課生字用紅框標出
- 🎧 **聽寫**：全部照順序／隨機 10 題／第 1–10、11–20、21–30／只考錯過的。
  每題念「第 N 題 → 詞 → 課文句子 → 詞」，再倒數 15／25／40 秒給她寫；可再念一次、暫停、跳下一題
- ✅ **對答案**：預設全對，寫錯的按一下變 ✗
- 🔁 **錯字**：寫錯就進來，之後連續寫對 3 次才移出（存在這台瀏覽器的 localStorage）

刻意不讓她用注音打字：考的是手寫國字，打字練到的是選字。

## Stack

純靜態網頁（vanilla JS，無 build），GitHub Pages 部署，PWA 可加到 iPad 主畫面、可離線。
配音用 Edge TTS `zh-TW-HsiaoYuNeural` 預錄成 m4a。

## Setup

不需要 `.env`。產生配音需要：
- `edge-tts`（`uv tool install edge-tts`）、`ffmpeg`
- 驗音用 `mlx-whisper`（Python 3.11）

## 加新的一課

1. 照課本寫 `tools/lessons/lessonNN.json`（每題 `no`／`word`／`sentence`，加上這課 `newChars` 生字）
2. 產資料檔＋配音：
   ```bash
   /Library/Frameworks/Python.framework/Versions/3.11/bin/python3 tools/build_lesson.py tools/lessons/lessonNN.json
   ```
3. `index.html` 加一行 `<script src="lessonNN_data.js"></script>`
4. 驗音：`python3 tools/verify_audio.py tools/lessons/lessonNN.json`（只抓得到錯字，聲調要人耳聽）
5. 念錯的詞在 JSON 加 `"tts": "替代字"` 後 `--force` 重跑，並把 `sw.js` 的 `CACHE` 跳版

課文句子只存在 JSON 與音檔裡，網頁畫面不顯示；課本翻拍照放 `_source/`（不進 repo）。

## 啟動

```bash
python3 -m http.server 8790   # 開 http://localhost:8790
```

## 測試

```bash
node tools/test_dictation.js   # 出題、錯字池、資料檔與音檔完整性
```
