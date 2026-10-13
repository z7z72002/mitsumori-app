// 特価/原価管理リストの Kg 絞り込みのテスト（仮のデータ）
// 実行: node --test tests/products_kg_filter.test.js
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
    ";this.__t={Store,defaultData,ViewProducts,productKgOptions,filterProductsByKg,KG_BLANK};", ctx);
  const t = ctx.__t;
  t.Store.data = t.defaultData();
  t.Store.data.products = products || [];
  t.ViewProducts.filterCode = ""; t.ViewProducts.filterClient = ""; t.ViewProducts.filterKg = "";
  return t;
}
const plain = v => JSON.parse(JSON.stringify(v));
const P = (code, kg, client) => ({ id: code + "-" + kg + "-" + client, code, name: "テスト品", specialKg: kg, specialPrice: 1000, client, costPerKg: 900, standardPrice: 0, note: "" });
const DATA = () => [P("A-1", 16, "甲社"), P("A-1", 4, "乙社"), P("B-2", 18, "甲社"), P("B-2", 16, "丙社"), P("C-3", "", "甲社"), P("C-3", 4, "甲社")];

test("Kgの選択肢は、データにある値を小さい順に並べ、空欄の行があれば最後に（空欄）を付ける", () => {
  const t = loadApp(DATA());
  assert.deepEqual(plain(t.productKgOptions(t.Store.data.products)), [
    { value: "4", label: "4" }, { value: "16", label: "16" }, { value: "18", label: "18" }, { value: t.KG_BLANK, label: "（空欄）" },
  ]);
});

test("空欄の行が無ければ（空欄）は出さない", () => {
  const t = loadApp([P("A-1", 16, "甲社"), P("A-1", 4, "乙社")]);
  assert.deepEqual(plain(t.productKgOptions(t.Store.data.products)).map(o => o.value), ["4", "16"]);
});

test("Kgで絞り込む：すべて（空文字）なら全件、値を選べばそのKgだけ、（空欄）なら空欄の行だけ", () => {
  const t = loadApp(DATA());
  const ps = t.Store.data.products;
  assert.equal(t.filterProductsByKg(ps, "").length, 6);
  assert.deepEqual(plain(t.filterProductsByKg(ps, "16")).map(p => p.code + "/" + p.client), ["A-1/甲社", "B-2/丙社"]);
  assert.deepEqual(plain(t.filterProductsByKg(ps, t.KG_BLANK)).map(p => p.code), ["C-3"]);
});

test("一覧の表示：Kgの見出しにプルダウンがあり、選んだKgの行だけが表示される", () => {
  const t = loadApp(DATA());
  t.ViewProducts.filterKg = "4";
  const html = t.ViewProducts.render();
  assert.match(html, /<select[^>]*id="product-filter-kg"/);
  assert.match(html, /<option value="4" selected>4<\/option>/);
  assert.equal((html.match(/<tr data-id=/g) || []).length, 2);
});

test("一覧の表示：Kgの絞り込みは品番・品名、取引先の文字検索と組み合わせて使える", () => {
  const t = loadApp(DATA());
  t.ViewProducts.filterKg = "16"; t.ViewProducts.filterClient = "甲社";
  const html = t.ViewProducts.render();
  assert.equal((html.match(/<tr data-id=/g) || []).length, 1);
  assert.match(html, /data-id="A-1-16-甲社"/);
});

test("品番・品名の検索語が変わったら、Kgの選択は「すべて」に戻る", () => {
  const t = loadApp(DATA());
  t.ViewProducts.filterKg = "16";
  t.ViewProducts.setCodeFilter("B-2");
  assert.equal(t.ViewProducts.filterCode, "B-2");
  assert.equal(t.ViewProducts.filterKg, "");
});

test("品番・品名の検索語が同じままなら、Kgの選択は残る", () => {
  const t = loadApp(DATA());
  t.ViewProducts.filterCode = "B-2"; t.ViewProducts.filterKg = "16";
  t.ViewProducts.setCodeFilter("B-2");
  assert.equal(t.ViewProducts.filterKg, "16");
});

test("書き出しの対象：Kgの絞り込みだけを反映し、文字検索は反映しない", () => {
  const t = loadApp(DATA());
  t.ViewProducts.filterKg = "16"; t.ViewProducts.filterCode = "A-1"; t.ViewProducts.filterClient = "甲社";
  assert.deepEqual(plain(t.ViewProducts.exportTargets()).map(p => p.id), ["A-1-16-甲社", "B-2-16-丙社"]);
  t.ViewProducts.filterKg = "";
  assert.equal(t.ViewProducts.exportTargets().length, 6);
});
