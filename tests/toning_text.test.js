// 調色料の注記をオフにした時の文（2026-10-21：「今回は調色料の請求は御座いません」）のテスト（仮のデータ）
// 実行: node --test tests/toning_text.test.js
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
    ";this.__t={Store,defaultData,renderQuoteSheetHTML,addQuoteWorksheet,DEFAULT_TONING};", ctx);
  const t = ctx.__t;
  t.Store.data = t.defaultData();
  return t;
}
const quote = (toningEnabled) => ({ id: "q1", number: "", date: "2026-10-21", customerCompany: "サンプル塗装株式会社", customerPerson: "山田", officeIndex: 0, theme: "",
  deliveryDate: "従来通り", deliveryPlace: "従来通り", tradeTerms: "従来通り", validPeriod: "発行後6カ月間",
  items: [{ code: "TEST-1", name: "テスト", capacity: 16, unit: "Kg", unitPrice: 10000, note: "(国内缶)" }],
  remarks: "", toning: "調色料は別途ご請求となります", toningEnabled, trialSheetNote: "", freightNotes: [], seals: [null, null, null] });
const OFF = "今回は調色料の請求は御座いません";

test("印刷・PDF：調色料の注記をオフにすると「今回は調色料の請求は御座いません」", () => {
  const t = loadApp();
  const html = t.renderQuoteSheetHTML(quote(false), t.Store.data.settings);
  assert.ok(html.includes(OFF));
});

test("印刷・PDF：オンの時は今まで通り、入力した注記の文", () => {
  const t = loadApp();
  const html = t.renderQuoteSheetHTML(quote(true), t.Store.data.settings);
  assert.ok(!html.includes(OFF));
  assert.ok(html.includes("調色料は別途ご請求となります"));
});

test("Excel：調色料の注記をオフにすると「今回は調色料の請求は御座いません」", async () => {
  const t = loadApp();
  const values = [];
  const ws = {
    getCell: () => { const c = {}; return new Proxy(c, { set: (o, k, v) => { if (k === "value") values.push(v); o[k] = v; return true; } }); },
    getRow: () => ({}), mergeCells: () => {}, set columns(v) {}, addImage: () => {}, pageSetup: {}, headerFooter: {},
  };
  const wb = { addWorksheet: () => ws, addImage: () => 0 };
  await t.addQuoteWorksheet(wb, quote(false), t.Store.data.settings);
  assert.ok(values.some(v => typeof v === "string" && v.includes(OFF)), "Excel にオフの文が無い");
});
