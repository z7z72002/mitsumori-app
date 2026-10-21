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
    ";this.__t={Store,defaultData,analyzeQuoteMail,mailFromPastedText,mailItemsForQuote,mailCodeCheckTagHtml,mergeImportedProducts};", ctx);
  const t = ctx.__t;
  t.Store.data = t.defaultData();
  t.Store.data.lineCodes = [{ id: "a", code: "P79-", name: "ﾊｲｳﾚｯｸｽP", newIndex: 0.85 }];
  t.Store.data.products = [
    P("P79-71416", "DEMO NAVY Q HX #3", 16, 41000), P("P79-71416", "DEMO NAVY Q HX #3", 4, 11500),
    P("P79-71922", "DEMO NAVY Q HX#2", 16, 40500), P("P79-71011", "DEMO NAVY Q HX", 16, 39800),
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
  const r = t.analyzeQuoteMail(t.mailFromPastedText(MAIL("・P79-71426 ハイウレックスP DEMO NAVY Q HX＃３")));
  const it = plain(r.items[0]);
  assert.equal(it.code, "P79-71426");
  assert.equal(it.registered, false);
  assert.equal(it.checked, true);
  assert.equal(it.codeCheck.requestedCode, "P79-71426");
  assert.equal(it.codeCheck.status, "ambiguous");
  assert.equal(it.codeCheck.candidates[0].code, "P79-71416");
  assert.deepEqual(it.codeCheck.candidates[0].reasons, ["品名が一致", "品番が1文字違い"]);
  assert.ok(r.notes.some(n => /品番要確認/.test(n)));
  assert.ok(!r.notes.some(n => /未登録の品番があります/.test(n)));
});

test("品名の合う製品が無い（品番が近いだけ）→ 今まで通り「未登録」（codeCheck なし・チェックなし）", () => {
  const t = loadApp();
  const r = t.analyzeQuoteMail(t.mailFromPastedText(MAIL("・P79-71426 新規 ゴールド メタリック")));
  const it = plain(r.items[0]);
  assert.equal(it.codeCheck, undefined);
  assert.equal(it.checked, false);
  assert.ok(r.notes.some(n => /未登録の品番があります/.test(n)));
});

test("作成：品番要確認の品目は、お客様記載の品番・品名のまま単価0・codeCheck 付き（16kg・4kg）", () => {
  const t = loadApp();
  const r = t.analyzeQuoteMail(t.mailFromPastedText(MAIL("・P79-71426 ハイウレックスP DEMO NAVY Q HX＃３")));
  const items = plain(t.mailItemsForQuote(r.items, "サンプル塗装株式会社"));
  assert.deepEqual(items.map(i => [i.code, i.capacity, i.unitPrice, i.priceWarning, i.note]),
    [["P79-71426", 16, 0, true, "(国内缶)"], ["P79-71426", 4, 0, true, "(国内缶)"]]);
  assert.ok(items.every(i => i.codeCheck && i.codeCheck.candidates[0].code === "P79-71416"));
  assert.ok(items.every(i => /DEMO NAVY Q HX#3/.test(i.name)));
});

test("作成：登録のある品番は今まで通り（特価が入る）", () => {
  const t = loadApp();
  const r = t.analyzeQuoteMail(t.mailFromPastedText(MAIL("・P79-71416 DEMO NAVY Q HX #3")));
  const items = plain(t.mailItemsForQuote(r.items, "サンプル塗装株式会社"));
  assert.deepEqual(items.map(i => [i.code, i.capacity, i.unitPrice]), [["P79-71416", 16, 41000], ["P79-71416", 4, 11500]]);
  assert.ok(items.every(i => !i.codeCheck));
});

test("確認画面の印：品番要確認（候補 1位の品番・品名 ほかN件）", () => {
  const t = loadApp();
  const r = t.analyzeQuoteMail(t.mailFromPastedText(MAIL("・P79-71426 ハイウレックスP DEMO NAVY Q HX＃３")));
  const html = t.mailCodeCheckTagHtml(r.items[0]);
  assert.match(html, /品番要確認（候補 P79-71416 DEMO NAVY Q HX #3 ほか2件）/);
  assert.match(html, /編集画面の「品番の確認」欄で選びます/);
});

test("取込の「既存に反映（マージ）」で増えた製品も、次のメールの品番候補に使う", () => {
  const t = loadApp();
  t.analyzeQuoteMail(t.mailFromPastedText(MAIL("・P79-71426 DEMO GOLD Z")));   // 一度照合しておく
  t.mergeImportedProducts(t.Store.data.products, [P("P79-71400", "DEMO GOLD Z", 16, 30000)], false);
  const r = t.analyzeQuoteMail(t.mailFromPastedText(MAIL("・P79-71426 DEMO GOLD Z")));
  assert.ok(r.items[0].codeCheck, "マージ後の製品が候補にならない");
  assert.equal(r.items[0].codeCheck.candidates[0].code, "P79-71400");
});

test("品番要確認の行も、品名の頭にライン名を付ける（お客様記載の品名は requestedName に残す）", () => {
  const t = loadApp();
  const r = t.analyzeQuoteMail(t.mailFromPastedText(MAIL("・P79-71426 DEMO NAVY Q HX#3")));
  const items = plain(t.mailItemsForQuote(r.items, "サンプル塗装株式会社"));
  assert.ok(items.every(i => i.name === "ﾊｲｳﾚｯｸｽP\nDEMO NAVY Q HX#3"), JSON.stringify(items.map(i => i.name)));
  assert.equal(items[0].codeCheck.requestedName, "DEMO NAVY Q HX#3");
});

test("同じ品番が何行かに出て、最初の行に品番が2つある時も、品名の書いてある行から品番要確認にする", () => {
  const t = loadApp();
  const body = "武蔵塗料　平井様\n\nサンプル塗装株式会社　山田です。\n\n・P79-71426 P79-71427 16kg\n・P79-71426 DEMO NAVY Q HX#3 4kg\n\nサンプル塗装株式会社\n山田 太郎\n";
  const r = t.analyzeQuoteMail(t.mailFromPastedText(body));
  const it = r.items.find(x => x.code === "P79-71426");
  assert.equal(it.name, "DEMO NAVY Q HX#3");
  assert.ok(it.codeCheck);
  assert.equal(it.codeCheck.candidates[0].code, "P79-71416");
});
