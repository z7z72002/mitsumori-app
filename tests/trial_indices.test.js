// 指数の5段（中心±0.05・±0.10。中心は推奨指数、無ければ0.75）と、新試算表の見出し・価格の一致のテスト（2026-10-21・仮のデータ）
// 実行: node --test tests/trial_indices.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs"), path = require("path"), vm = require("vm");

function loadApp() {
  const noop = () => {};
  const el = { addEventListener: noop, querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, createElement: () => ({ style: {} }), body: { appendChild: noop } };
  const ctx = { document: el, localStorage: { getItem: () => null, setItem: noop }, indexedDB: {}, navigator: {}, console, setTimeout, clearTimeout, Blob: function () {}, URL: {} };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "js", "app.js"), "utf8") +
    ";this.__t={Store,defaultData,calcPriceCandidates,buildTrialSheetGroups,renderTrialSheetHTML,addTrialWorksheet};", ctx);
  const t = ctx.__t;
  t.Store.data = t.defaultData();
  t.Store.data.lineCodes = [{ id: "g", code: "GR33-", name: "ﾒﾀﾙﾄﾞ", newIndex: 0.9 }];
  t.Store.data.products = [];
  return t;
}
const plain = v => JSON.parse(JSON.stringify(v));
const item = (code, kg, cost) => ({ code, name: "テスト", capacity: kg, unit: "Kg", unitPrice: 0, note: "(国内缶)", manualCostPerKg: cost });
const quote = items => ({ id: "q1", date: "2026-10-21", customerCompany: "サンプル塗装株式会社", customerPerson: "山田", items, seals: [null, null, null], trialSheetNote: "" });

test("指数の5段：推奨指数がある時は推奨を真ん中に±0.05・±0.10（0.9 → 0.80〜1.00、0.80 は 28,010円）", () => {
  const t = loadApp();
  const c = plain(t.calcPriceCandidates(626, t.Store.data.settings, 0.9).base);
  assert.deepEqual(c.map(x => x.index), [0.8, 0.85, 0.9, 0.95, 1]);
  assert.equal(c[0].price, 28010);
  assert.equal(c.filter(x => x.recommended).map(x => x.index)[0], 0.9);
});

test("指数の5段：推奨指数が無い時は 0.75 を真ん中に（0.65〜0.85）。推奨の印は付けない", () => {
  const t = loadApp();
  const c = plain(t.calcPriceCandidates(626, t.Store.data.settings, null).base);
  assert.deepEqual(c.map(x => x.index), [0.65, 0.7, 0.75, 0.8, 0.85]);
  assert.ok(c.every(x => !x.recommended));
});

test("新試算表：品番ごとにその品番の5段で計算する（推奨ありの品番は 0.80〜1.00、推奨なしは 0.65〜0.85）", () => {
  const t = loadApp();
  const g = plain(t.buildTrialSheetGroups(quote([item("SP26-90048(GR33-)", 16, 626), item("SP26-90777", 16, 800)]), t.Store.data.settings));
  assert.deepEqual(g[0].indices, [0.8, 0.85, 0.9, 0.95, 1]);
  assert.deepEqual(g[0].rows[0].candidates.map(c => c.index), [0.8, 0.85, 0.9, 0.95, 1]);
  assert.equal(g[0].rows[0].candidates[0].price, 28010);
  assert.deepEqual(g[1].indices, [0.65, 0.7, 0.75, 0.8, 0.85]);
  assert.deepEqual(g[1].rows[0].candidates.map(c => c.index), [0.65, 0.7, 0.75, 0.8, 0.85]);
});

test("新試算表（印刷・PDF）：見出しは1つ目の品番の5段。2つ目以降の品番の前に「指数」と5段の見出しの行", () => {
  const t = loadApp();
  const html = t.renderTrialSheetHTML(quote([item("SP26-90048(GR33-)", 16, 626), item("SP26-90777", 16, 800)]), t.Store.data.settings);
  const thead = html.match(/<thead>([\s\S]*?)<\/thead>/)[1];
  assert.deepEqual([...thead.matchAll(/class="col-idx">([\d.]+)</g)].map(m => m[1]), ["0.80", "0.85", "0.90", "0.95", "1.00"]);
  const sub = html.match(/<tr class="ts-subhead">([\s\S]*?)<\/tr>/);
  assert.ok(sub, "2つ目の品番の見出しの行が無い");
  assert.match(sub[1], />指数</);
  assert.doesNotMatch(sub[1], /推奨なし|中心/);
  assert.deepEqual([...sub[1].matchAll(/class="col-idx">([\d.]+)</g)].map(m => m[1]), ["0.65", "0.70", "0.75", "0.80", "0.85"]);
  assert.ok(html.indexOf("ts-subhead") < html.indexOf("SP26-90777"));
});

test("新試算表（印刷・PDF）：品番が1つだけなら、見出しの行は増えない", () => {
  const t = loadApp();
  const html = t.renderTrialSheetHTML(quote([item("SP26-90048(GR33-)", 16, 626), item("SP26-90048(GR33-)", 4, 626)]), t.Store.data.settings);
  assert.doesNotMatch(html, /ts-subhead/);
});

// Excel の新試算表：セルに書いた値を記録する仮のワークシート
function fakeWorkbook() {
  const cells = new Map();
  const ws = {
    getCell: (r, c) => { const k = r + "," + c; if (!cells.has(k)) cells.set(k, {}); return cells.get(k); },
    getRow: () => ({}), mergeCells: () => {}, set columns(v) {}, addImage: () => {},
  };
  const wb = { addWorksheet: () => ws, addImage: () => 0 };
  const rowValues = r => { const out = []; for (let c = 1; c <= 20; c++) { const v = cells.get(r + "," + c); out.push(v ? v.value : undefined); } return out; };
  return { wb, cells, rowValues };
}

test("新試算表（Excel）：見出しは1つ目の品番の5段、2つ目以降の品番の前に「指数」と5段の行。価格は見出しの指数と一致", () => {
  const t = loadApp();
  const f = fakeWorkbook();
  t.addTrialWorksheet(f.wb, quote([item("SP26-90048(GR33-)", 16, 626), item("SP26-90777", 16, 800)]), t.Store.data.settings);
  assert.deepEqual(f.rowValues(5).slice(8, 13), ["0.80", "0.85", "0.90", "0.95", "1.00"]);
  assert.equal(f.rowValues(6)[8], 28010);
  let subRow = 0;
  for (let r = 7; r < 30; r++) if (f.rowValues(r).includes("指数")) { subRow = r; break; }
  assert.ok(subRow, "Excel に2つ目の品番の見出しの行が無い");
  assert.deepEqual(f.rowValues(subRow).slice(8, 13), ["0.65", "0.70", "0.75", "0.80", "0.85"]);
  assert.equal(f.rowValues(subRow + 1)[0], "SP26-90777");
  assert.equal(f.rowValues(subRow + 1)[8], 40040);   // 原価800の16kg・指数0.65
});

test("推奨指数が 0・空欄・数字でない・小さすぎる（0.05）時は、推奨なしと同じ 0.75 を真ん中にした5段（推奨の印なし）", () => {
  const t = loadApp();
  for (const v of [0, "", "abc", 0.05, 0.1]) {
    const c = plain(t.calcPriceCandidates(626, t.Store.data.settings, v).base);
    assert.deepEqual(c.map(x => x.index), [0.65, 0.7, 0.75, 0.8, 0.85], String(v));
    assert.ok(c.every(x => !x.recommended), String(v));
  }
});

test("推奨指数が文字の \"0.9\" でも、小数3桁の 0.775 でも、5段になり真ん中に推奨の印が付く", () => {
  const t = loadApp();
  const a = plain(t.calcPriceCandidates(626, t.Store.data.settings, "0.9").base);
  assert.deepEqual(a.map(x => x.index), [0.8, 0.85, 0.9, 0.95, 1]);
  assert.equal(a.find(x => x.recommended).index, 0.9);
  const b = plain(t.calcPriceCandidates(626, t.Store.data.settings, 0.775).base);
  assert.equal(b.length, 5);
  assert.equal(b.filter(x => x.recommended).length, 1);
  assert.equal(b[2].recommended, true);
});

test("新試算表：推奨指数が 0 のラインの品番も 0.75 を真ん中にした5段で、列がずれない", () => {
  const t = loadApp();
  t.Store.data.lineCodes.push({ id: "z", code: "ZZ9-", name: "ﾃｽﾄ", newIndex: 0 });
  const html = t.renderTrialSheetHTML(quote([item("SP26-90048(GR33-)", 16, 626), item("ZZ9-1001", 16, 800)]), t.Store.data.settings);
  const sub = html.match(/<tr class="ts-subhead">([\s\S]*?)<\/tr>/)[1];
  assert.deepEqual([...sub.matchAll(/class="col-idx">([\d.]+)</g)].map(m => m[1]), ["0.65", "0.70", "0.75", "0.80", "0.85"]);
});
