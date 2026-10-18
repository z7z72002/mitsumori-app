// 特価/原価管理リスト・指数・最低価格のボタン整理（CSV と取込みを削除、Excel は検索結果のみ）と、指数・最低価格のロックのテスト（仮のデータ）
// 実行: node --test tests/export_lock.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs"), path = require("path"), vm = require("vm");

function loadApp(products, lineCodes) {
  const noop = () => {};
  const el = { addEventListener: noop, querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, createElement: () => ({ style: {} }), body: { appendChild: noop } };
  const ctx = { document: el, localStorage: { getItem: () => null, setItem: noop }, indexedDB: {}, navigator: {}, console, setTimeout, clearTimeout, Blob: function () {}, URL: {} };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "js", "app.js"), "utf8") +
    ";this.__t={Store,defaultData,ViewProducts,ViewLineCodes,ViewSettings};", ctx);
  const t = ctx.__t;
  t.Store.data = t.defaultData();
  t.Store.data.products = products || [];
  if (lineCodes) t.Store.data.lineCodes = lineCodes;
  Object.assign(t.ViewProducts, { filterCode: "", filterClient: "", filterKg: "" });
  Object.assign(t.ViewLineCodes, { filterText: "", unlocked: false });
  return t;
}
const plain = v => JSON.parse(JSON.stringify(v));
const P = (code, kg, client) => ({ id: code + "-" + kg + "-" + client, code, name: "テスト品", specialKg: kg, specialPrice: 1000, client, costPerKg: 900, standardPrice: 0, note: "" });
const DATA = () => [P("A-1", 16, "甲社"), P("A-1", 4, "乙社"), P("B-2", 16, "甲社"), P("B-2", 4, "丙社")];
const LC = () => [{ id: "l1", code: "EC-GPX79", name: "エコハイウレックスP", newIndex: 0.7 }, { id: "l2", code: "EC-SW62", name: "エコサンシャイン", newIndex: 0.55 }, { id: "l3", code: "P79", name: "ハイウレックスP", newIndex: 0.65 }];

test("特価/原価管理リスト：CSVで書き出す・CSV/Excelから取込むのボタンが無く、Excelは「検索結果のみ」と書いてある", () => {
  const t = loadApp(DATA());
  const html = t.ViewProducts.render();
  assert.doesNotMatch(html, /id="btn-export-csv"/);
  assert.doesNotMatch(html, /id="btn-import"/);
  assert.doesNotMatch(html, /id="file-import"/);
  assert.match(html, /id="btn-export-xlsx"[^>]*>Excelで書き出す（検索結果のみ）</);
  assert.match(html, /特価マスタファイルを取込む/);
  assert.doesNotMatch(html, /取込用ファイルの列見出し/);
  assert.doesNotMatch(html, /CSV \/ Excel ファイルの取込み/);
});

test("特価/原価管理リスト：Excelの書き出し対象は、品番・品名、取引先、Kg の検索結果すべて", () => {
  const t = loadApp(DATA());
  t.ViewProducts.filterCode = "A-1";
  assert.deepEqual(plain(t.ViewProducts.exportTargets()).map(p => p.id), ["A-1-16-甲社", "A-1-4-乙社"]);
  t.ViewProducts.filterClient = "甲社";
  assert.deepEqual(plain(t.ViewProducts.exportTargets()).map(p => p.id), ["A-1-16-甲社"]);
  t.ViewProducts.filterCode = ""; t.ViewProducts.filterKg = "16";
  assert.deepEqual(plain(t.ViewProducts.exportTargets()).map(p => p.id), ["A-1-16-甲社", "B-2-16-甲社"]);
});

test("特価/原価管理リスト：書き出しは画面の表示上限（200件）で切らない", () => {
  const many = Array.from({ length: 250 }, (_, i) => P("C-" + i, 16, "甲社"));
  const t = loadApp(many);
  assert.equal(t.ViewProducts.exportTargets().length, 250);
});

test("指数・最低価格：CSVで書き出す・CSV/Excelから取込むのボタンが無く、Excelは「検索結果のみ」", () => {
  const t = loadApp([], LC());
  const html = t.ViewLineCodes.render();
  assert.doesNotMatch(html, /id="btn-export-csv"/);
  assert.doesNotMatch(html, /id="btn-import"/);
  assert.doesNotMatch(html, /id="lc-file-import"/);
  assert.doesNotMatch(html, /取込用ファイルの列見出し/);
  assert.match(html, /id="btn-export-xlsx"[^>]*>Excelで書き出す（検索結果のみ）</);
});

test("指数・最低価格：Excelの書き出し対象は検索結果だけ", () => {
  const t = loadApp([], LC());
  t.ViewLineCodes.filterText = "GPX";
  assert.deepEqual(plain(t.ViewLineCodes.exportTargets()).map(l => l.id), ["l1"]);
  t.ViewLineCodes.filterText = "";
  assert.equal(t.ViewLineCodes.exportTargets().length, 3);
});

test("指数・最低価格：開いた時はロックされていて、表と1件追加が使えない（検索とExcelは使える）", () => {
  const t = loadApp([], LC());
  const html = t.ViewLineCodes.render();
  assert.match(html, /settings-lock-banner is-locked/);
  assert.match(html, /id="btn-unlock-linecodes"/);
  assert.match(html, /class="settings-lock-wrap locked"/);
  assert.match(html, /id="btn-add-lc"[^>]*disabled/);
  assert.doesNotMatch(html, /id="lc-search"[^>]*disabled/);
  assert.doesNotMatch(html, /id="btn-export-xlsx"[^>]*disabled/);
});

test("指数・最低価格：解除すると編集でき、「ロックする」ボタンが出る。設定画面のロックとは別", () => {
  const t = loadApp([], LC());
  t.ViewLineCodes.unlocked = true;
  const html = t.ViewLineCodes.render();
  assert.match(html, /settings-lock-banner is-unlocked/);
  assert.match(html, /id="btn-relock-linecodes"/);
  assert.doesNotMatch(html, /settings-lock-wrap locked/);
  assert.doesNotMatch(html, /id="btn-add-lc"[^>]*disabled/);
  assert.doesNotMatch(html, /<tbody>[\s\S]*disabled[\s\S]*<\/tbody>/);
});

test("指数・最低価格：ロック中は表の入力欄と削除ボタンもすべて押せない（キーボード操作も不可）", () => {
  const t = loadApp([], LC());
  const html = t.ViewLineCodes.render();
  const body = html.match(/<tbody>([\s\S]*)<\/tbody>/)[1];
  const inputs = body.match(/<input[^>]*>/g);
  assert.equal(inputs.length, 15);
  assert.ok(inputs.every(s => / disabled/.test(s)));
  assert.equal((body.match(/data-act="del" disabled/g) || []).length, 3);
});

test("指数・最低価格と設定画面のロックは互いに影響しない", () => {
  const t = loadApp([], LC());
  t.ViewSettings.unlocked = false;
  t.ViewLineCodes.unlocked = true;
  assert.equal(t.ViewSettings.unlocked, false);
  assert.match(t.ViewLineCodes.render(), /settings-lock-banner is-unlocked/);
  t.ViewLineCodes.unlocked = false; t.ViewSettings.unlocked = true;
  assert.match(t.ViewLineCodes.render(), /settings-lock-banner is-locked/);
});
