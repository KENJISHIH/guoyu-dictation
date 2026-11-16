// dictation.js — 聽寫的純邏輯：出題、錯字複習池、批改紀錄
// 不碰 DOM，tools/test_dictation.js 用 node 直接載入測試。畫面與播音在 index.html。

// ─── 可調參數（要改節奏改這裡）────────────────────────────
const DICTATION = {
    pauseOptions: [15, 25, 40],  // 每題念完留幾秒給她寫（秒），畫面上可選
    defaultPause: 25,
    stepGapMs: 500,              // 「第 N 題」→ 詞 → 提示句 → 詞，每段之間停多久
    stepMaxMs: 12000,            // 單段播音最多等多久（音檔壞掉時不會卡死）
    randomCount: 10,             // 「隨機抽題」一次幾題
    graduateStreak: 3,           // 錯字複習：連續答對幾次就移出
};

// 已註冊的課（各 lessonNN_data.js 呼叫 registerLesson）
const LESSONS = [];
function registerLesson(lesson) {
    LESSONS.push(lesson);
    LESSONS.sort((a, b) => a.id.localeCompare(b.id));
}

// 每一題的全站唯一 key，例：l07-05
function itemKey(lessonId, no) {
    return `${lessonId}-${String(no).padStart(2, '0')}`;
}

function shuffle(arr, rng) {
    const r = rng || Math.random;
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(r() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// 出題。mode：
//   'all'    全部照課本順序
//   'random' 隨機抽 randomCount 題（不足就全出）
//   'range'  第 from～to 題，照順序
//   'wrong'  錯字複習池裡屬於這課的，打亂
// 回傳 [{ key, lessonId, no, word }]
function buildQuiz(lesson, mode, opts = {}) {
    const all = lesson.items.map(it => ({ key: itemKey(lesson.id, it.no), lessonId: lesson.id, no: it.no, word: it.word }));
    if (mode === 'all') return all;
    if (mode === 'range') {
        const from = opts.from || 1, to = opts.to || all.length;
        return all.filter(q => q.no >= from && q.no <= to);
    }
    if (mode === 'random') return shuffle(all, opts.rng).slice(0, opts.count || DICTATION.randomCount);
    if (mode === 'wrong') {
        const pool = (opts.progress && opts.progress.wrong) || {};
        return shuffle(all.filter(q => pool[q.key]), opts.rng);
    }
    throw new Error('unknown mode: ' + mode);
}

// 進度存檔格式：{ wrong: { key: { streak } }, history: { key: { right, wrong } } }
function emptyProgress() {
    return { wrong: {}, history: {} };
}

// 批改完寫回進度。results：[{ key, ok }]
//   答錯 → 進複習池（streak 歸零）
//   答對且在池裡 → streak+1，到 graduateStreak 就移出
function applyResults(progress, results) {
    const p = progress || emptyProgress();
    p.wrong = p.wrong || {};
    p.history = p.history || {};
    for (const { key, ok } of results) {
        const h = p.history[key] || (p.history[key] = { right: 0, wrong: 0 });
        if (ok) {
            h.right++;
            if (p.wrong[key]) {
                p.wrong[key].streak++;
                if (p.wrong[key].streak >= DICTATION.graduateStreak) delete p.wrong[key];
            }
        } else {
            h.wrong++;
            p.wrong[key] = { streak: 0 };
        }
    }
    return p;
}

// 詞裡哪幾個字是這課生字（背誦頁加紅框用）
function markNewChars(word, newChars) {
    return Array.from(word).map(ch => ({ ch, isNew: (newChars || '').includes(ch) }));
}

if (typeof module !== 'undefined') {
    module.exports = { DICTATION, LESSONS, registerLesson, itemKey, shuffle, buildQuiz, emptyProgress, applyResults, markNewChars };
}
