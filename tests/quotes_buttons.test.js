// 見積書一覧のボタン整理（今すぐ取込む・エクスポート・インポート・共有フォルダを削除、ゴミ箱は常に表示）のテスト（仮のデータ）
// 実行: node --test tests/quotes_buttons.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs"), path = require("path"), vm = require("vm");

function loadApp(quotes) {
  const noop = () => {};
  const el = { addEventListener: noop, querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, createElement: () => ({ style: {} }), body: { appendChild: noop } };
  const ctx = { document: el, localStorage: { getItem: () => null, setItem: noop }, indexedDB: {}, navigator: {}, console, setTimeout, clearTimeout, Blob: function () {}, URL: {} };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "js", "app.js"), "utf8") +
    ";this.__t={Store,defaultData,ViewQuotes};", ctx);
  const t = ctx.__t;
  t.Store.data = t.defaultData();
  t.Store.data.quotes = quotes || [];
  t.ViewQuotes.showTrash = false;
  return t;
}
const Q = (id, deleted) => ({ id, number: id, date: "2026-10-19", customerCompany: "サンプル塗装株式会社", customerPerson: "山田", officeIndex: 0,
  items: [{ code: "EC-1", name: "テスト品", capacity: 16, unit: "Kg", unitPrice: 1000, note: "" }], remarks: "", seals: [null, null, null],
  deletedAt: deleted ? "2026-10-18T10:00:00Z" : null, createdAt: "2026-10-19T10:00:00Z", updatedAt: "2026-10-19T10:00:00Z" });

test("見積書一覧：今すぐ取込む・見積書をエクスポート・見積書をインポート・共有フォルダの設定と保存フォルダの表示が無い", () => {
  const t = loadApp([Q("q1")]);
  t.ViewQuotes.autoImportHandle = { name: "見積取込待ち" };
  const html = t.ViewQuotes.render();
  for (const id of ["btn-run-autoimport", "btn-export-quotes", "btn-import-quotes", "btn-set-folder", "quotes-file-import"]) {
    assert.doesNotMatch(html, new RegExp(`id="${id}"`), id);
  }
  assert.doesNotMatch(html, /保存フォルダ/);
  assert.match(html, /id="btn-new-quote"/);
  assert.match(html, /id="btn-mail-quote"/);
});

test("見積書一覧：ゴミ箱が0件でも「ゴミ箱を表示（0件）」を出す", () => {
  const t = loadApp([Q("q1")]);
  assert.match(t.ViewQuotes.render(), /id="btn-show-trash"[^>]*>🗑 ゴミ箱を表示（0件）</);
});

test("見積書一覧：ゴミ箱に入っている件数を出す", () => {
  const t = loadApp([Q("q1"), Q("q2", true), Q("q3", true)]);
  assert.match(t.ViewQuotes.render(), /ゴミ箱を表示（2件）/);
});
