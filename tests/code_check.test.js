// 見積書の編集画面の「品番の確認」欄（品番が誤っている時の品番候補から選ぶ）のテスト（仮のデータ）
// 実行: node --test tests/code_check.test.js
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
    ";this.__t={Store,defaultData,App,ViewEditor,codeCheckGroups,codeCheckHtml,resolveCodeCheck};", ctx);
  const t = ctx.__t;
  t.Store.data = t.defaultData();
  t.Store.data.lineCodes = [{ id: "a", code: "P79-", name: "ﾊｲｳﾚｯｸｽP", newIndex: 0.85 }];
  t.Store.data.products = [
    P("P79-71416", "DEMO NAVY Q HX #3", 16, 41000), P("P79-71416", "DEMO NAVY Q HX #3", 4, 11500), P("P79-71416", "DEMO NAVY Q HX #3", 18, 45000),
    P("P79-71922", "DEMO NAVY Q HX#2", 16, 40500),
    { id: "x", code: "P79-99990", name: "NO SPECIAL", specialKg: 16, specialPrice: 0, client: "別の会社", costPerKg: 900, standardPrice: 0, note: "" },
  ];
  return t;
}
const P = (code, name, kg, sp) => ({ id: code + kg, code, name, specialKg: kg, specialPrice: sp, client: "サンプル塗装株式会社", costPerKg: 900, standardPrice: 0, note: "" });
const plain = v => JSON.parse(JSON.stringify(v));
const CC = (code = "P79-71426") => ({ requestedCode: code, requestedName: "ハイウレックスP DEMO NAVY Q HX＃３", status: "not_found",
  candidates: [{ code: "P79-71416", name: "DEMO NAVY Q HX #3", reasons: ["品名が一致", "品番が1文字違い"] }, { code: "P79-71922", name: "DEMO NAVY Q HX#2", reasons: ["品名がほぼ一致"] }] });
const row = (kg, note = "(国内缶)", code = "P79-71426") => ({ code, name: "ハイウレックスP DEMO NAVY Q HX＃３", capacity: kg, unit: "Kg", unitPrice: 0, note, priceWarning: true, codeCheck: CC(code) });
const quote = (items) => ({ id: "q1", number: "", date: "2026-10-21", customerCompany: "サンプル塗装株式会社", customerPerson: "山田", officeIndex: 0, items,
  remarks: "", seals: [null, null, null], deletedAt: null, createdAt: "", updatedAt: "", freightNotes: [] });

test("16kg・4kg の2行は欄が1つにまとまり、最初の行の位置になる", () => {
  const t = loadApp();
  const g = plain(t.codeCheckGroups([{ code: "A", capacity: 16 }, row(16), row(4)]));
  assert.equal(g.length, 1);
  assert.deepEqual(g[0].indexes, [1, 2]);
  assert.equal(g[0].requestedCode, "P79-71426");
});

test("欄にお客様記載・候補（品番・品名・理由）・「どれでもない」・「この品番にする」がある", () => {
  const t = loadApp();
  const q = quote([row(16), row(4)]);
  const html = t.codeCheckHtml(t.codeCheckGroups(q.items)[0], q);
  assert.match(html, /品番の確認（2行：16kg・4kg）/);
  assert.match(html, /P79-71426/);
  assert.match(html, /ハイウレックスP DEMO NAVY Q HX＃３/);
  assert.match(html, /1位　P79-71416　DEMO NAVY Q HX #3　（品名が一致・品番が1文字違い）/);
  assert.match(html, /2位　P79-71922/);
  assert.match(html, /<option value="">どれでもない（お客様記載のまま・新規品番として扱う）<\/option>/);
  assert.match(html, /data-act="code-check-apply"[^>]*data-code="P79-71426"/);
});

test("編集画面：欄は最初の行の上に出る。検印済みなら出ない", () => {
  const t = loadApp();
  const q = quote([row(16), row(4)]);
  t.Store.data.quotes = [q]; t.App.editingQuoteId = "q1";
  const html = t.ViewEditor.render();
  assert.ok(html.indexOf("code-check-row") >= 0 && html.indexOf("code-check-row") < html.indexOf('<tr data-i="0">'));
  assert.equal((html.match(/code-check-row/g) || []).length, 1);
  q.seals = ["平井", null, null];
  assert.doesNotMatch(t.ViewEditor.render(), /code-check-row/);
});

test("この品番にする：2行とも P79-71416 になり、品名にライン名、そのお客様の特価が入り、codeCheck が消える", () => {
  const t = loadApp();
  const q = quote([row(16), row(4)]);
  t.resolveCodeCheck(q, "P79-71426", "P79-71416");
  const it = plain(q.items);
  assert.deepEqual(it.map(i => [i.code, i.name, i.capacity, i.unitPrice]),
    [["P79-71416", "ﾊｲｳﾚｯｸｽP\nDEMO NAVY Q HX #3", 16, 41000], ["P79-71416", "ﾊｲｳﾚｯｸｽP\nDEMO NAVY Q HX #3", 4, 11500]]);
  assert.ok(it.every(i => !i.codeCheck && !i.priceWarning));
});

test("UN缶の行は置き換え後も備考 (UN缶)、容量と行の位置を保つ（18kg・UN缶の4kg が混在）", () => {
  const t = loadApp();
  const q = quote([{ code: "Z-1", name: "他の品目", capacity: 16, unit: "Kg", unitPrice: 100, note: "" }, row(18), row(4, "(UN缶)")]);
  t.resolveCodeCheck(q, "P79-71426", "P79-71416");
  const it = plain(q.items);
  assert.deepEqual(it.map(i => [i.code, i.capacity, i.note]), [["Z-1", 16, ""], ["P79-71416", 18, "(国内缶)"], ["P79-71416", 4, "(UN缶)"]]);
});

test("特価が無い品番を選ぶと単価0・特価無しのまま、指数の候補が付く", () => {
  const t = loadApp();
  const q = quote([row(16)]);
  t.resolveCodeCheck(q, "P79-71426", "P79-99990");
  const it = plain(q.items[0]);
  assert.equal(it.code, "P79-99990");
  assert.equal(it.unitPrice, 0);
  assert.equal(it.priceWarning, true);
  assert.ok((it.calcCandidates || []).some(c => /指数/.test(c.label)));
  assert.equal(it.codeCheck, undefined);
});

test("要確認の品番が2つ：片方を選んでも、もう片方の欄は残る", () => {
  const t = loadApp();
  const q = quote([row(16), row(16, "(国内缶)", "P79-72222")]);
  t.resolveCodeCheck(q, "P79-71426", "P79-71416");
  const g = plain(t.codeCheckGroups(q.items));
  assert.deepEqual(g.map(x => x.requestedCode), ["P79-72222"]);
});

test("どれでもない：品番・品名・単価はそのまま、codeCheck だけ消える", () => {
  const t = loadApp();
  const q = quote([row(16), row(4)]);
  t.resolveCodeCheck(q, "P79-71426", null);
  const it = plain(q.items);
  assert.deepEqual(it.map(i => [i.code, i.name, i.unitPrice]), [["P79-71426", "ハイウレックスP DEMO NAVY Q HX＃３", 0], ["P79-71426", "ハイウレックスP DEMO NAVY Q HX＃３", 0]]);
  assert.ok(it.every(i => i.codeCheck === undefined));
});

test("手で書き足した備考は、品番を選び直しても残す（既定の (国内缶)・(UN缶) は作り直す）", () => {
  const t = loadApp();
  const q = quote([row(16, "(国内缶) 10月末納期"), row(4, "(UN缶)")]);
  t.resolveCodeCheck(q, "P79-71426", "P79-71416");
  assert.deepEqual(plain(q.items).map(i => i.note), ["(国内缶) 10月末納期", "(UN缶)"]);
});

test("UN缶かどうかは備考の「(UN缶)」で決める（備考に UN を含む別の文字があっても国内缶のまま）", () => {
  const t = loadApp();
  const q = quote([row(4, "(国内缶) UNIT確認")]);
  t.resolveCodeCheck(q, "P79-71426", "P79-71416");
  const it = plain(q.items[0]);
  assert.equal(it.note, "(国内缶) UNIT確認");
  assert.equal(it.unitPrice, 11500);
});

test("欄の容量の表示もエスケープする", () => {
  const t = loadApp();
  const r = row(16); r.capacity = "<b>16</b>";
  const q = quote([r]);
  assert.doesNotMatch(t.codeCheckHtml(t.codeCheckGroups(q.items)[0], q), /<b>16<\/b>kg/);
});
