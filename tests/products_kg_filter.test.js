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
    ";this.__t={Store,defaultData,ViewProducts,PRODUCT_KG_CHOICES,filterProductsByKg};", ctx);
  const t = ctx.__t;
  t.Store.data = t.defaultData();
  t.Store.data.products = products || [];
  t.ViewProducts.filterCode = ""; t.ViewProducts.filterClient = ""; t.ViewProducts.filterKg = "";
  return t;
}
const plain = v => JSON.parse(JSON.stringify(v));
const P = (code, kg, client) => ({ id: code + "-" + kg + "-" + client, code, name: "テスト品", specialKg: kg, specialPrice: 1000, client, costPerKg: 900, standardPrice: 0, note: "" });
const DATA = () => [P("A-1", 16, "甲社"), P("A-1", 4, "乙社"), P("B-2", 18, "甲社"), P("B-2", 16, "丙社"), P("C-3", "", "甲社"), P("C-3", 0.4, "甲社"), P("D-4", 20, "乙社")];
const optionValues = html => [...html.match(/<select[^>]*id="product-filter-kg"[\s\S]*?<\/select>/)[0].matchAll(/<option value="([^"]*)"/g)].map(m => m[1]);

test("Kgの選択肢は 18・16・13・4・1.6・1・0.4 の順で固定（データに無いKgも出し、データにある他のKgは出さない）", () => {
  const t = loadApp(DATA());
  assert.deepEqual(plain(t.PRODUCT_KG_CHOICES), ["18", "16", "13", "4", "1.6", "1", "0.4"]);
  assert.deepEqual(optionValues(t.ViewProducts.render()), ["", "18", "16", "13", "4", "1.6", "1", "0.4"]);
});

test("Kgで絞り込む：すべて（空文字）なら全件、値を選べばそのKgだけ", () => {
  const t = loadApp(DATA());
  const ps = t.Store.data.products;
  assert.equal(t.filterProductsByKg(ps, "").length, 7);
  assert.deepEqual(plain(t.filterProductsByKg(ps, "16")).map(p => p.code + "/" + p.client), ["A-1/甲社", "B-2/丙社"]);
  assert.deepEqual(plain(t.filterProductsByKg(ps, "0.4")).map(p => p.code), ["C-3"]);
});

test("Kgが数値・文字列・\"16.0\"で混ざっていても同じKgとして絞り込む", () => {
  const t = loadApp([P("A-1", 16, "甲社"), P("A-2", "16", "乙社"), P("A-3", "16.0", "丙社"), P("A-4", 4, "甲社"), P("A-5", "1.60", "甲社")]);
  assert.equal(t.filterProductsByKg(t.Store.data.products, "16").length, 3);
  assert.equal(t.filterProductsByKg(t.Store.data.products, "1.6").length, 1);
});

test("一覧の表示：Kgの見出しにプルダウンがあり、選んだKgの行だけが表示される", () => {
  const t = loadApp(DATA());
  t.ViewProducts.filterKg = "4";
  const html = t.ViewProducts.render();
  assert.match(html, /<option value="4" selected>4<\/option>/);
  assert.equal((html.match(/<tr data-id=/g) || []).length, 1);
});

test("一覧の表示：データに無いKg（13）を選ぶと「該当する製品がありません」", () => {
  const t = loadApp(DATA());
  t.ViewProducts.filterKg = "13";
  const html = t.ViewProducts.render();
  assert.equal((html.match(/<tr data-id=/g) || []).length, 0);
  assert.match(html, /該当する製品がありません/);
});

test("選択肢に無いKgが選ばれていたら「すべて」に戻る", () => {
  const t = loadApp(DATA());
  t.ViewProducts.filterKg = "20";
  const html = t.ViewProducts.render();
  assert.equal(t.ViewProducts.filterKg, "");
  assert.equal((html.match(/<tr data-id=/g) || []).length, 7);
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

// 2026-10-19 平井さんの指示で「Excel はその時の検索結果のみ」に変更（Kg・品番品名・取引先のすべてを反映）
test("書き出しの対象：Kg・品番品名・取引先の検索結果だけ", () => {
  const t = loadApp(DATA());
  t.ViewProducts.filterKg = "16"; t.ViewProducts.filterCode = "A-1"; t.ViewProducts.filterClient = "甲社";
  assert.deepEqual(plain(t.ViewProducts.exportTargets()).map(p => p.id), ["A-1-16-甲社"]);
  t.ViewProducts.filterKg = ""; t.ViewProducts.filterCode = ""; t.ViewProducts.filterClient = "";
  assert.equal(t.ViewProducts.exportTargets().length, 7);
});
