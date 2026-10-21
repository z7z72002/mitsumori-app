// 「メールから作成」でも、登録に無い品番に品名の合う製品があれば品番要確認にする（2026-10-21）のテスト（仮のデータ）
// 実行: node --test tests/mail_code_check.test.js
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
    ";this.__t={Store,defaultData,analyzeQuoteMail,mailFromPastedText,mailItemsForQuote,mailCodeCheckTagHtml};", ctx);
  const t = ctx.__t;
  t.Store.data = t.defaultData();
  t.Store.data.lineCodes = [{ id: "a", code: "P79-", name: "ﾊｲｳﾚｯｸｽP", newIndex: 0.85 }];
  t.Store.data.products = [
    P("P79-90828", "SAMPLE BLACK P GB #3", 16, 41000), P("P79-90828", "SAMPLE BLACK P GB #3", 4, 11500),
    P("P79-90534", "SAMPLE BLACK P GB#2", 16, 40500), P("P79-90623", "SAMPLE BLACK P GB", 16, 39800),
    P("P79-80001", "OTHER SILVER", 16, 30000),
  ];
  return t;
}
const P = (code, name, kg, sp) => ({ id: code + kg, code, name, specialKg: kg, specialPrice: sp, client: "サンプル塗装株式会社", costPerKg: 900, standardPrice: 0, note: "" });
const plain = v => JSON.parse(JSON.stringify(v));
const MAIL = (line) => "武蔵塗料　平井様\n\nお世話になります。サンプル塗装株式会社　山田です。\n\n下記御見積をお願いします。\n\n" + line +
  "\n　4㎏\n　16㎏\n\n何卒宜しくお願い致します。\n\nサンプル塗装株式会社\n山田 太郎\n";

test("登録に無い品番で品名の合う製品がある → 品番要確認（codeCheck・候補1位・最初からチェックあり）", () => {
  const t = loadApp();
  const r = t.analyzeQuoteMail(t.mailFromPastedText(MAIL("・P79-90838 ハイウレックスP SAMPLE BLACK P GB＃３")));
  const it = plain(r.items[0]);
  assert.equal(it.code, "P79-90838");
  assert.equal(it.registered, false);
  assert.equal(it.checked, true);
  assert.equal(it.codeCheck.requestedCode, "P79-90838");
  assert.equal(it.codeCheck.status, "ambiguous");
  assert.equal(it.codeCheck.candidates[0].code, "P79-90828");
  assert.deepEqual(it.codeCheck.candidates[0].reasons, ["品名が一致", "品番が1文字違い"]);
  assert.ok(r.notes.some(n => /品番要確認/.test(n)));
  assert.ok(!r.notes.some(n => /未登録の品番があります/.test(n)));
});

test("品名の合う製品が無い（品番が近いだけ）→ 今まで通り「未登録」（codeCheck なし・チェックなし）", () => {
  const t = loadApp();
  const r = t.analyzeQuoteMail(t.mailFromPastedText(MAIL("・P79-90838 新規 ゴールド メタリック")));
  const it = plain(r.items[0]);
  assert.equal(it.codeCheck, undefined);
  assert.equal(it.checked, false);
  assert.ok(r.notes.some(n => /未登録の品番があります/.test(n)));
});

test("作成：品番要確認の品目は、お客様記載の品番・品名のまま単価0・codeCheck 付き（16kg・4kg）", () => {
  const t = loadApp();
  const r = t.analyzeQuoteMail(t.mailFromPastedText(MAIL("・P79-90838 ハイウレックスP SAMPLE BLACK P GB＃３")));
  const items = plain(t.mailItemsForQuote(r.items, "サンプル塗装株式会社"));
  assert.deepEqual(items.map(i => [i.code, i.capacity, i.unitPrice, i.priceWarning, i.note]),
    [["P79-90838", 16, 0, true, "(国内缶)"], ["P79-90838", 4, 0, true, "(国内缶)"]]);
  assert.ok(items.every(i => i.codeCheck && i.codeCheck.candidates[0].code === "P79-90828"));
  assert.ok(items.every(i => /SAMPLE BLACK P GB#3/.test(i.name)));
});

test("作成：登録のある品番は今まで通り（特価が入る）", () => {
  const t = loadApp();
  const r = t.analyzeQuoteMail(t.mailFromPastedText(MAIL("・P79-90828 SAMPLE BLACK P GB #3")));
  const items = plain(t.mailItemsForQuote(r.items, "サンプル塗装株式会社"));
  assert.deepEqual(items.map(i => [i.code, i.capacity, i.unitPrice]), [["P79-90828", 16, 41000], ["P79-90828", 4, 11500]]);
  assert.ok(items.every(i => !i.codeCheck));
});

test("確認画面の印：品番要確認（候補 1位の品番・品名 ほかN件）", () => {
  const t = loadApp();
  const r = t.analyzeQuoteMail(t.mailFromPastedText(MAIL("・P79-90838 ハイウレックスP SAMPLE BLACK P GB＃３")));
  const html = t.mailCodeCheckTagHtml(r.items[0]);
  assert.match(html, /品番要確認（候補 P79-90828 SAMPLE BLACK P GB #3 ほか2件）/);
  assert.match(html, /編集画面の「品番の確認」欄で選びます/);
});
