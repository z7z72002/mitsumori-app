// 品名欄にライン名を前に付ける（EC-GPX79-14908 → 「ｴｺﾊｲｳﾚｯｸｽP … GOLD IT」）のテスト（仮のデータ）
// 実行: node --test tests/line_name.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs"), path = require("path"), vm = require("vm");

function loadApp(products) {
  const noop = () => {};
  const el = { addEventListener: noop, querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, createElement: () => ({ style: {} }), body: { appendChild: noop } };
  const ctx = { document: el, localStorage: { getItem: () => null, setItem: noop }, indexedDB: {}, navigator: {}, console, setTimeout, clearTimeout, Blob: function () {}, URL: {} };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "js", "app.js"), "utf8") +
    ";this.__t={Store,defaultData,lineNamePrefixed,applyLineNames,itemNameForQuote,xlTextLines,xlItemRowHeight,itemsFromProductRow,buildQuoteItemsFromMail};", ctx);
  const t = ctx.__t;
  t.Store.data = t.defaultData();
  t.Store.data.lineCodes = [
    { id: "a", code: "EC-P79-", name: "ｴｺﾊｲｳﾚｯｸｽP", newIndex: 0.85 },
    { id: "b", code: "EC-GPX79-", name: "ｴｺﾊｲｳﾚｯｸｽP ｸﾞﾗﾝﾃﾞﾎﾞｰﾙ", newIndex: 0.7 },
    { id: "c", code: "EC-", name: "", newIndex: 0.8 },
  ];
  t.Store.data.products = products || [];
  return t;
}
const plain = v => JSON.parse(JSON.stringify(v));
const P = (code, name, kg, client, sp) => ({ id: code + kg, code, name, specialKg: kg, specialPrice: sp, client, costPerKg: 866, standardPrice: 0, note: "" });

test("ライン名を品名の前に空白でつなげて付ける（一番長く一致したラインコード）", () => {
  const t = loadApp();
  assert.equal(t.lineNamePrefixed("EC-GPX79-14908", "GOLD IT"), "ｴｺﾊｲｳﾚｯｸｽP ｸﾞﾗﾝﾃﾞﾎﾞｰﾙ GOLD IT");
  assert.equal(t.lineNamePrefixed("EC-P79-36701", "2755C ﾈｲﾋﾞｰ"), "ｴｺﾊｲｳﾚｯｸｽP 2755C ﾈｲﾋﾞｰ");
});

test("品名がすでにライン名で始まっていれば二重に付けない（改行・全角半角の違いも同じとみなす）", () => {
  const t = loadApp();
  assert.equal(t.lineNamePrefixed("EC-P79-36701", "ｴｺﾊｲｳﾚｯｸｽP\n2755C ﾈｲﾋﾞｰ"), "ｴｺﾊｲｳﾚｯｸｽP\n2755C ﾈｲﾋﾞｰ");
  assert.equal(t.lineNamePrefixed("EC-P79-36701", "エコハイウレックスP 2755C"), "エコハイウレックスP 2755C");
});

test("ラインコードが無い・ライン名が空・品番が空なら、品名はそのまま", () => {
  const t = loadApp();
  assert.equal(t.lineNamePrefixed("XX-99-1", "TEST"), "TEST");
  assert.equal(t.lineNamePrefixed("EC-ZZ-1", "TEST"), "TEST");   // EC- はライン名が空
  assert.equal(t.lineNamePrefixed("", "TEST"), "TEST");
});

test("品名が空ならライン名だけを入れる", () => {
  const t = loadApp();
  assert.equal(t.lineNamePrefixed("EC-P79-1", ""), "ｴｺﾊｲｳﾚｯｸｽP");
});

test("applyLineNames は渡した品目の品名にライン名を付けた新しい配列を返す（元の品目は変えない）", () => {
  const t = loadApp();
  const src = [{ code: "EC-GPX79-14908", name: "GOLD IT", capacity: 16 }];
  const out = plain(t.applyLineNames(src));
  assert.equal(out[0].name, "ｴｺﾊｲｳﾚｯｸｽP ｸﾞﾗﾝﾃﾞﾎﾞｰﾙ GOLD IT");
  assert.equal(src[0].name, "GOLD IT");
});

test("ラインコードの表を引数で渡せる（見積スキル用）。アプリのデータが無くても例外にならない", () => {
  const t = loadApp();
  assert.equal(t.lineNamePrefixed("ZZ-1-1", "A", [{ code: "ZZ-1-", name: "ﾃｽﾄﾗｲﾝ" }]), "ﾃｽﾄﾗｲﾝ A");
  t.Store.data = null;
  assert.equal(t.lineNamePrefixed("EC-P79-1", "A"), "A");
});

test("今ある見積書に同じ品番の行があれば、その行の品名に合わせる（表記をそろえ、見積書で1つにまとまるように）", () => {
  const t = loadApp();
  const q = { items: [{ code: "EC-GPX79-14908", name: "GOLD IT", capacity: 16 }] };
  assert.equal(t.itemNameForQuote(q, "EC-GPX79-14908", "GOLD IT"), "GOLD IT");
  assert.equal(t.itemNameForQuote(q, " EC-GPX79-14908 ", "GOLD IT"), "GOLD IT");
  assert.equal(t.itemNameForQuote(q, "EC-P79-1", "NAVY"), "ｴｺﾊｲｳﾚｯｸｽP NAVY");
  assert.equal(t.itemNameForQuote({ items: [] }, "EC-GPX79-14908", "GOLD IT"), "ｴｺﾊｲｳﾚｯｸｽP ｸﾞﾗﾝﾃﾞﾎﾞｰﾙ GOLD IT");
});

test("Excel：品名の行数を幅から見積もる（全角は2、半角は1として数え、改行も数える）", () => {
  const t = loadApp();
  assert.equal(t.xlTextLines("GOLD IT", 30), 1);
  assert.equal(t.xlTextLines("ｴｺﾊｲｳﾚｯｸｽP ｸﾞﾗﾝﾃﾞﾎﾞﾇｰﾙ TR-1989 WKC-509 ﾗｲﾄﾌﾞﾗｳﾝﾒﾀﾘｯｸ NO.2", 30), 2);
  assert.equal(t.xlTextLines("あいうえおかきくけこさしすせそたちつてと", 30), 2);   // 全角20文字＝幅40
  assert.equal(t.xlTextLines("ｴｺﾊｲｳﾚｯｸｽP\n2755C ﾈｲﾋﾞｰ", 30), 2);
  assert.equal(t.xlTextLines("", 30), 1);
});

test("Excel：品名が収まるよう、結合した行の高さを広げる（1行の高さ20を下回らない）", () => {
  const t = loadApp();
  assert.equal(t.xlItemRowHeight("GOLD IT", 2, 30, 20), 20);
  const h1 = t.xlItemRowHeight("ｴｺﾊｲｳﾚｯｸｽP ｸﾞﾗﾝﾃﾞﾎﾞﾇｰﾙ TR-1989 WKC-509 ﾗｲﾄﾌﾞﾗｳﾝﾒﾀﾘｯｸ NO.2", 1, 30, 20);
  assert.ok(h1 >= 30, String(h1));   // 2行分（1容量だけの行でも2行目が見える）
  assert.equal(t.xlItemRowHeight("ｴｺﾊｲｳﾚｯｸｽP ｸﾞﾗﾝﾃﾞﾎﾞﾇｰﾙ TR-1989 WKC-509 ﾗｲﾄﾌﾞﾗｳﾝﾒﾀﾘｯｸ NO.2", 2, 30, 20), 20);   // 2行あれば足りる
});

test("既存製品より選択（itemsFromProductRow）で作る品目に付く", () => {
  const t = loadApp([P("EC-GPX79-14908", "GOLD IT", 16, "サンプル塗装株式会社", 40000), P("EC-GPX79-14908", "GOLD IT", 4, "サンプル塗装株式会社", 20000)]);
  const items = plain(t.itemsFromProductRow(t.Store.data.products[0]));
  assert.ok(items.length >= 2);
  assert.ok(items.every(it => it.name === "ｴｺﾊｲｳﾚｯｸｽP ｸﾞﾗﾝﾃﾞﾎﾞｰﾙ GOLD IT"), JSON.stringify(items.map(i => i.name)));
});

test("メールから作成（buildQuoteItemsFromMail）で作る品目に付く", () => {
  const t = loadApp([P("EC-GPX79-14908", "GOLD IT", 16, "サンプル塗装株式会社", 40000)]);
  const items = plain(t.buildQuoteItemsFromMail("EC-GPX79-14908", "GOLD IT", "サンプル塗装株式会社", [16], false));
  assert.ok(items.length >= 1);
  assert.ok(items.every(it => it.name === "ｴｺﾊｲｳﾚｯｸｽP ｸﾞﾗﾝﾃﾞﾎﾞｰﾙ GOLD IT"), JSON.stringify(items.map(i => i.name)));
});
