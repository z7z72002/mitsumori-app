// 共有の商品データファイルと連携した時、平井さん以外のPCは「読むだけ」にする（2026-10-20 平井さんの指示）のテスト（仮のデータ）
// 実行: node --test tests/product_file_readonly.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs"), path = require("path"), vm = require("vm");

function loadApp(opts) {
  opts = opts || {};
  const noop = () => {};
  const store = Object.assign({}, opts.storage || {});
  const el = { addEventListener: noop, querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, createElement: () => ({ style: {}, classList: { add: noop, remove: noop, toggle: noop } }), body: { appendChild: noop } };
  const ctx = {
    document: el, indexedDB: {}, navigator: {}, console, setTimeout, clearTimeout, Blob: function () {}, URL: {},
    requestAnimationFrame: noop, showDirectoryPicker: noop,
    localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "js", "app.js"), "utf8") +
    ";this.__t={Store,defaultData,ViewProducts,App,isProductFileWriter,setProductFileWriter,productFilePermissionMode,readProductFileIfChanged};", ctx);
  const t = ctx.__t;
  t.Store.data = t.defaultData();
  t.Store.data.products = opts.products || [P("A-1", 16)];
  Object.assign(t.ViewProducts, { filterCode: "", filterClient: "", filterKg: "", masterFolderHandle: opts.masterFolder || null });
  t.storage = store;
  return t;
}
const P = (code, kg) => ({ id: code + "-" + kg, code, name: "テスト品", specialKg: kg, specialPrice: 1000, client: "甲社", costPerKg: 900, standardPrice: 0, note: "" });

// 書き込まれた中身を記録する、仮の商品データファイル
function fakeFile(products, lastModified) {
  const h = { name: "商品データ.json", writes: [], content: JSON.stringify(products), lastModified,
    async getFile() { return { lastModified: h.lastModified, text: async () => h.content }; },
    async createWritable() { return { write: async s => { h.writes.push(s); }, close: async () => {} }; },
  };
  return h;
}
function link(t, h) { t.Store.productFileHandle = h; t.Store.productFileActive = true; }

test("標準は「読むだけ」：見積書などを保存しても、商品データファイルには書き込まない", async () => {
  const t = loadApp();
  const h = fakeFile([P("A-1", 16)], 1000);
  link(t, h);
  await t.Store.save();
  assert.equal(h.writes.length, 0);
  assert.equal(t.isProductFileWriter(), false);
});

test("「更新するPC」に切り替えたブラウザだけ、保存すると商品データファイルに書き込む（切り替えは覚えておく）", async () => {
  const t = loadApp();
  t.setProductFileWriter(true);
  const h = fakeFile([P("A-1", 16)], 1000);
  link(t, h);
  await t.Store.save();
  assert.equal(h.writes.length, 1);
  const t2 = loadApp({ storage: t.storage });
  assert.equal(t2.isProductFileWriter(), true);
  t2.setProductFileWriter(false);
  assert.equal(t2.isProductFileWriter(), false);
});

test("ファイルの使用許可は、読むだけなら「表示」、更新するPCなら「編集」を求める", () => {
  const t = loadApp();
  assert.equal(t.productFilePermissionMode(), "read");
  t.setProductFileWriter(true);
  assert.equal(t.productFilePermissionMode(), "readwrite");
});

test("ファイルの更新日時が前に読んだ時と同じなら読み直さず、変わっていれば新しい商品データを返す", async () => {
  const t = loadApp();
  const h = fakeFile([P("A-1", 16), P("B-2", 4)], 2000);
  assert.equal(await t.readProductFileIfChanged(h, 2000), null);
  const r = await t.readProductFileIfChanged(h, 1000);
  assert.equal(r.lastModified, 2000);
  assert.deepEqual(JSON.parse(JSON.stringify(r.products.map(p => p.id))), ["A-1-16", "B-2-4"]);
});

test("読むだけの画面：取込・自動更新フォルダ・新しいファイルに保存のボタンと取込の説明が無く、「読むだけ」と切り替えボタンが出る", () => {
  const t = loadApp({ masterFolder: { name: "G022_特価マスタ" } });
  link(t, fakeFile([], 1000));
  const html = t.ViewProducts.render();
  for (const id of ["btn-import-master", "btn-set-master-folder", "btn-run-master-sync", "btn-save-product-file"]) {
    assert.doesNotMatch(html, new RegExp(`id="${id}"`), id);
  }
  assert.doesNotMatch(html, /class="format-help"/);
  assert.match(html, /読むだけ/);
  assert.match(html, /id="btn-product-file-writer"[^>]*>このPCで商品データを更新する（パスワード）</);
  assert.match(html, /id="btn-open-product-file"/);
  assert.match(html, /id="btn-unlink-product-file"/);
  assert.match(html, /id="btn-export-xlsx"/);
});

test("更新するPCの画面：今までのボタンに加えて「更新するPC」と「読むだけに戻す」が出る", () => {
  const t = loadApp({ masterFolder: { name: "G022_特価マスタ" } });
  t.setProductFileWriter(true);
  link(t, fakeFile([], 1000));
  const html = t.ViewProducts.render();
  for (const id of ["btn-import-master", "btn-set-master-folder", "btn-run-master-sync", "btn-save-product-file", "btn-product-file-readonly"]) {
    assert.match(html, new RegExp(`id="${id}"`), id);
  }
  assert.match(html, /更新するPC/);
  assert.doesNotMatch(html, /id="btn-product-file-writer"/);
});

test("更新するPC：ほかの所でファイルが更新されていたら書き込まず、ファイルの内容を読み直す", async () => {
  const t = loadApp();
  t.setProductFileWriter(true);
  const h = fakeFile([P("A-1", 16), P("Z-9", 4)], 1000);
  link(t, h);
  t.Store.productFileLastModified = 500;   // 前に読んだのは古い日時
  await t.Store.save();
  assert.equal(h.writes.length, 0);
  assert.deepEqual(JSON.parse(JSON.stringify(t.Store.data.products.map(p => p.id))), ["A-1-16", "Z-9-4"]);
  assert.equal(t.Store.productFileLastModified, 1000);
});

test("更新するPC：書き込んだ後は、ファイルの新しい更新日時を覚える（自分の書き込みを「新しくなった」と思わない）", async () => {
  const t = loadApp();
  t.setProductFileWriter(true);
  const h = fakeFile([P("A-1", 16)], 1000);
  h.createWritable = async () => ({ write: async s => { h.writes.push(s); h.content = s; h.lastModified = 3000; }, close: async () => {} });
  link(t, h);
  t.Store.productFileLastModified = 1000;
  await t.Store.save();
  assert.equal(h.writes.length, 1);
  assert.equal(t.Store.productFileLastModified, 3000);
});

test("更新するPC：保存が続けて2回走っても、自分の1回目の書き込みを「ほかの所の更新」と取り違えない", async () => {
  const t = loadApp();
  t.setProductFileWriter(true);
  const h = fakeFile([P("A-1", 16)], 1000);
  let n = 1000, second = null;
  // 1回目の書き込みが終わった直後（覚えている日時を更新する前）に、2回目の保存が始まる
  h.createWritable = async () => ({ write: async s => { h.writes.push(s); h.content = s; h.lastModified = ++n; if (!second) second = t.Store.save(); }, close: async () => {} });
  link(t, h);
  t.Store.productFileLastModified = 1000;
  t.Store.data.products.push(P("NEW", 4));
  await t.Store.save();
  await second;
  assert.equal(h.writes.length, 2);
  assert.equal(t.Store.data.products.length, 2);
  assert.equal(t.Store.productFileLastModified, n);
});

test("読み直しは読むだけのPCだけ。更新するPCでは読み直さない", async () => {
  const t = loadApp();
  const h = fakeFile([P("A-1", 16), P("B-2", 4)], 2000);
  link(t, h);
  t.Store.productFileLastModified = 1000;
  t.setProductFileWriter(true);
  await t.App.reloadProductFileIfChanged();
  assert.equal(t.Store.data.products.length, 1);
  t.setProductFileWriter(false);
  await t.App.reloadProductFileIfChanged();
  assert.equal(t.Store.data.products.length, 2);
  assert.equal(t.Store.productFileLastModified, 2000);
});

test("読み直しの途中で別のファイルに切り替えたら、前のファイルの内容は入れない", async () => {
  const t = loadApp();
  const h = fakeFile([P("A-1", 16), P("B-2", 4)], 2000);
  const h2 = fakeFile([P("C-3", 16)], 9000);
  let release;
  h.getFile = () => new Promise(r => { release = () => r({ lastModified: 2000, text: async () => h.content }); });
  link(t, h);
  t.Store.productFileLastModified = 1000;
  const p = t.App.reloadProductFileIfChanged();
  t.Store.productFileHandle = h2; t.Store.data.products = [P("C-3", 16)]; t.Store.productFileLastModified = 9000;
  release();
  await p;
  assert.equal(t.Store.data.products[0].id, "C-3-16");
  assert.equal(t.Store.productFileLastModified, 9000);
});

test("更新するPCへの切り替え：先にファイルを読み直してから書き込めるようにし、特価マスタの自動更新を確かめる", async () => {
  const t = loadApp();
  const h = fakeFile([P("A-1", 16), P("B-2", 4)], 2000);
  h.requestPermission = async () => "granted";
  h.queryPermission = async () => "prompt";
  link(t, h);
  t.Store.productFileLastModified = 1000;
  let synced = 0;
  t.App.maybeRunMasterSync = async () => { synced++; };
  assert.equal(await t.App.enableProductFileWriter(), true);
  assert.equal(t.isProductFileWriter(), true);
  assert.equal(t.Store.data.products.length, 2);
  assert.equal(t.Store.productFileLastModified, 2000);
  assert.equal(synced, 1);
});

test("更新するPCへの切り替え：編集の許可が断られたら、読むだけのままにする", async () => {
  const t = loadApp();
  const h = fakeFile([P("A-1", 16)], 1000);
  h.requestPermission = async () => "denied";
  h.queryPermission = async () => "prompt";
  link(t, h);
  assert.equal(await t.App.enableProductFileWriter(), false);
  assert.equal(t.isProductFileWriter(), false);
});

test("読むだけのPCでは、特価マスタの自動更新を行わない（フォルダを見に行かない）", async () => {
  let looked = 0;
  const dir = { name: "G022_特価マスタ", queryPermission: async () => "granted", values: () => { looked++; return [][Symbol.iterator](); } };
  const t = loadApp({ masterFolder: dir });
  link(t, fakeFile([], 1000));
  await t.App.runMasterSync({ silent: true });
  await t.App.maybeRunMasterSync();
  assert.equal(looked, 0);
});
