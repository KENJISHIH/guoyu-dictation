// node tools/test_dictation.js — 聽寫純邏輯＋資料檔／音檔完整性
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SITE = path.resolve(__dirname, '..');
const D = require(path.join(SITE, 'dictation.js'));

// 用同一個 registerLesson 載入所有 lessonNN_data.js
const lessonFiles = fs.readdirSync(SITE).filter(f => /^lesson\d+_data\.js$/.test(f));
for (const f of lessonFiles) vm.runInNewContext(fs.readFileSync(path.join(SITE, f), 'utf8'), { registerLesson: l => D.registerLesson(JSON.parse(JSON.stringify(l))) });

let n = 0;
const t = (name, fn) => { fn(); n++; console.log('✓', name); };

t('至少載入一課', () => assert(D.LESSONS.length >= 1));
const L = D.LESSONS.find(l => l.id === 'l07');

t('第七課 30 題、編號 1..30 連續', () => {
    assert.strictEqual(L.items.length, 30);
    L.items.forEach((it, i) => assert.strictEqual(it.no, i + 1));
});
t('第 27 題是「披著外套」', () => assert.strictEqual(L.items[26].word, '披著外套'));
t('資料檔不含課文句子', () => L.items.forEach(it => assert.deepStrictEqual(Object.keys(it).sort(), ['no', 'word'])));
t('15 個生字都出現在某個詞裡', () => {
    assert.strictEqual(Array.from(L.newChars).length, 15);
    for (const ch of L.newChars) assert(L.items.some(it => it.word.includes(ch)), ch);
});

t('每課每題都有詞與句子音檔，第 N 題音檔齊', () => {
    for (const l of D.LESSONS) for (const it of l.items) {
        const nn = String(it.no).padStart(2, '0');
        for (const f of [`${nn}.m4a`, `${nn}_s.m4a`]) assert(fs.existsSync(path.join(SITE, 'audio', l.id, f)), `${l.id}/${f}`);
        assert(fs.existsSync(path.join(SITE, 'audio', 'num', `${it.no}.m4a`)), `num/${it.no}`);
    }
});

t('index.html 有載入每個資料檔', () => {
    const html = fs.readFileSync(path.join(SITE, 'index.html'), 'utf8');
    for (const f of lessonFiles) assert(html.includes(`src="${f}"`), f);
});

t('itemKey 補零', () => assert.strictEqual(D.itemKey('l07', 5), 'l07-05'));

t('all：30 題照順序', () => {
    const q = D.buildQuiz(L, 'all');
    assert.deepStrictEqual(q.map(x => x.no), L.items.map(x => x.no));
    assert.strictEqual(q[4].key, 'l07-05');
});
t('range：11–20 共 10 題照順序', () => {
    const q = D.buildQuiz(L, 'range', { from: 11, to: 20 });
    assert.deepStrictEqual(q.map(x => x.no), [11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
});
t('random：10 題不重複', () => {
    const q = D.buildQuiz(L, 'random');
    assert.strictEqual(q.length, 10);
    assert.strictEqual(new Set(q.map(x => x.no)).size, 10);
});
t('wrong：空池 0 題', () => assert.strictEqual(D.buildQuiz(L, 'wrong', { progress: D.emptyProgress() }).length, 0));

t('答錯進池、連對 3 次才移出、中途錯一次重來', () => {
    let p = D.emptyProgress();
    p = D.applyResults(p, [{ key: 'l07-12', ok: false }, { key: 'l07-01', ok: true }]);
    assert.deepStrictEqual(Object.keys(p.wrong), ['l07-12']);
    assert.strictEqual(D.buildQuiz(L, 'wrong', { progress: p })[0].word, '愈嚼愈香');
    p = D.applyResults(p, [{ key: 'l07-12', ok: true }]);
    p = D.applyResults(p, [{ key: 'l07-12', ok: true }]);
    p = D.applyResults(p, [{ key: 'l07-12', ok: false }]);
    assert.strictEqual(p.wrong['l07-12'].streak, 0);
    for (let i = 0; i < 2; i++) p = D.applyResults(p, [{ key: 'l07-12', ok: true }]);
    assert(p.wrong['l07-12']);
    p = D.applyResults(p, [{ key: 'l07-12', ok: true }]);
    assert(!p.wrong['l07-12']);
    assert.deepStrictEqual(p.history['l07-12'], { right: 5, wrong: 2 });
});
t('舊存檔缺欄位不會壞', () => {
    const p = D.applyResults({}, [{ key: 'l07-03', ok: false }]);
    assert(p.wrong['l07-03'] && p.history['l07-03']);
});
t('markNewChars 標出生字', () => {
    const m = D.markNewChars('愈嚼愈香', L.newChars);
    assert.deepStrictEqual(m.map(c => c.isNew), [true, true, true, false]);
});

t('手寫格子：第七課最長 4 字 → 4 格；短課也至少 4 格；長詞會撐開', () => {
    assert.strictEqual(D.padBoxes(L), 4);
    assert.strictEqual(D.padBoxes({ items: [{ word: '老街' }] }), 4);
    assert.strictEqual(D.padBoxes({ items: [{ word: '一二三四五' }] }), 5);
});
t('手寫格排法：iPad 直拿（寬 650、高 560）排 2×2 約 280px', () => {
    assert.deepStrictEqual(D.padLayout(4, 650, 560, 320), { cols: 2, rows: 2, box: 280 });
});
t('手寫格排法：高度不夠（橫拿）就 4 格一排', () => {
    assert.deepStrictEqual(D.padLayout(4, 1000, 260, 320), { cols: 4, rows: 1, box: 250 });
});
t('手寫格排法：不超過上限、5 格會排 3+2', () => {
    assert.strictEqual(D.padLayout(4, 2000, 2000, 320).box, 320);
    assert.deepStrictEqual(D.padLayout(5, 650, 560, 320), { cols: 3, rows: 2, box: 216 });
});
t('倒數：紙上模式時間到就結束', () => {
    assert.strictEqual(D.countdownDone(100, 0, null), false);
    assert.strictEqual(D.countdownDone(0, 0, null), true);
});
t('倒數：手寫中（筆在畫面上、或 2 秒內剛寫過）不換題', () => {
    assert.strictEqual(D.countdownDone(0, 10000, { penDown: true, lastInk: 0 }), false);
    assert.strictEqual(D.countdownDone(0, 10000, { penDown: false, lastInk: 9000 }), false);
    assert.strictEqual(D.countdownDone(0, 10000, { penDown: false, lastInk: 8000 }), true);
    assert.strictEqual(D.countdownDone(500, 10000, { penDown: false, lastInk: 0 }), false);
});

console.log(`\n${n} 項全部通過`);
