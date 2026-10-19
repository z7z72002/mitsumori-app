// 見積書一覧の「品番・品名でワード検索」（見積書の中身すべてを検索）のテスト（仮のデータ）
// 実行: node --test tests/quotes_search.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs"), path = require("path"), vm = require("vm");

function loadApp(quotes) {
  const noop = () => {};
  const el = { addEventListener: noop, querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, createElement: () => ({ style: {} }), body: { appendChild: noop } };
  const ctx = { document: el, localStorage: { getItem: () => null, setItem: noop }, indexedDB: {}, navigator: {}, console, setTimeout, clearTimeout, Blob: function () {}, URL: {}, showDirectoryPicker: noop };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "js", "app.js"), "utf8") +
    ";this.__t={Store,defaultData,ViewQuotes,quoteSearchMatch};", ctx);
  const t = ctx.__t;
  t.Store.data = t.defaultData();
  t.Store.data.quotes = quotes || [];
  t.ViewQuotes.showTrash = false;
  t.ViewQuotes.filterText = "";
  return t;
}
const plain = v => JSON.parse(JSON.stringify(v));
const Q = (id, extra, items, deleted) => Object.assign({
  id, number: "", date: "2026-10-19", customerCompany: "サンプル塗装株式会社", customerPerson: "山田", officeIndex: 0, theme: "",
  deliveryDate: "従来通り", deliveryPlace: "従来通り", tradeTerms: "従来通り", validPeriod: "発行後6カ月間",
  items: items || [{ code: "EC-GPX79-90001", name: "ECO HAIUREX P BLACK", capacity: 16, unit: "Kg", unitPrice: 1000, note: "(国内缶)" }],
  remarks: "上記価格は製品価格です", toning: "調色料", trialSheetNote: "", freightNotes: ["御取引先様店頭渡し"], seals: [null, null, null],
  deletedAt: deleted ? "2026-10-18T10:00:00Z" : null, createdAt: "2026-10-19T10:00:00Z", updatedAt: "2026-10-19T10:00:00Z" }, extra || {});
const item = (code, name, note) => ({ code, name: name || "テスト品", capacity: 4, unit: "Kg", unitPrice: 1000, note: note || "" });

test("1つ目の品目の品番で一致する", () => {
  const t = loadApp();
  const m = plain(t.quoteSearchMatch(Q("q1"), "GPX79"));
  assert.equal(m.match, true);
  assert.equal(m.hitCode, "");
});

test("2つ目以降の品目で一致したら、その品番を返す（一覧に「一致：」と出すため）", () => {
  const t = loadApp();
  const q = Q("q1", null, [item("EC-GPX79-90001"), item("EC-SW62-90002", "ECO SUNSHINE CLEAR")]);
  assert.deepEqual(plain(t.quoteSearchMatch(q, "SW62")), { match: true, hitCode: "EC-SW62-90002" });
  assert.deepEqual(plain(t.quoteSearchMatch(q, "sunshine")), { match: true, hitCode: "EC-SW62-90002" });
});

test("品名・備考・宛先・担当者・見積番号・テーマ・摘要・運賃の注記・試算表の備考・受渡し条件でも一致する", () => {
  const t = loadApp();
  const q = Q("q1", { number: "Q-2026-0042", theme: "レクサス内装", trialSheetNote: "試算メモ", deliveryPlace: "入間工場" },
    [item("EC-1", "ECO HAIUREX", "(UN缶)")]);
  for (const w of ["haiurex", "UN缶", "サンプル塗装", "山田", "0042", "レクサス", "製品価格", "店頭渡し", "試算メモ", "入間工場", "調色料"]) {
    assert.equal(t.quoteSearchMatch(q, w).match, true, w);
  }
});

test("古いデータ（運賃の注記が配列でない・項目が空）でも例外にならず、文字列の注記で一致する", () => {
  const t = loadApp();
  const q1 = Q("q1", { freightNotes: "御取引先様店頭渡し", remarks: null, theme: undefined, number: null });
  assert.equal(t.quoteSearchMatch(q1, "店頭渡し").match, true);
  const q2 = Q("q2", { freightNotes: { a: 1 } });
  assert.equal(t.quoteSearchMatch(q2, "XYZ").match, false);
  const q3 = Q("q3", { items: undefined });
  assert.equal(t.quoteSearchMatch(q3, "サンプル塗装").match, true);
});

test("全角・半角、大文字・小文字の違いを区別しない", () => {
  const t = loadApp();
  assert.equal(t.quoteSearchMatch(Q("q1"), "ｇｐｘ７９").match, true);
  assert.equal(t.quoteSearchMatch(Q("q1"), "ec-gpx79").match, true);
});

test("合わない時は match=false。空の検索語はすべて一致", () => {
  const t = loadApp();
  assert.equal(t.quoteSearchMatch(Q("q1"), "XYZ999").match, false);
  assert.equal(t.quoteSearchMatch(Q("q1"), "").match, true);
});

test("一覧：検索語に合う見積書だけを出し、件数と「一致：」を表示する", () => {
  const t = loadApp([
    Q("q1", null, [item("EC-GPX79-90001"), item("EC-SW62-90002")]),
    Q("q2", { customerCompany: "テスト工業株式会社" }, [item("EC-SW62-90002")]),
    Q("q3", { customerCompany: "見本化成株式会社" }, [item("EC-PX10-90003")]),
  ]);
  t.ViewQuotes.filterText = "SW62";
  const html = t.ViewQuotes.render();
  assert.match(html, /id="quote-search"[^>]*placeholder="品番・品名でワード検索"/);
  assert.match(html, /検索結果 2件/);
  assert.match(html, /data-id="q1"/);
  assert.match(html, /data-id="q2"/);
  assert.doesNotMatch(html, /data-id="q3"/);
  assert.match(html, /一致：EC-SW62-90002/);
});

test("一覧：見出しの「全○件」は、検索で絞り込んでも見積書の総数のまま", () => {
  const t = loadApp([Q("q1"), Q("q2", { customerCompany: "テスト工業株式会社" }), Q("q3", { customerCompany: "見本化成株式会社" })]);
  t.ViewQuotes.filterText = "テスト工業";
  assert.match(t.ViewQuotes.render(), /全 3 件/);
});

test("一覧：検索語が無い時は全件で、件数の表示は出さない", () => {
  const t = loadApp([Q("q1"), Q("q2")]);
  const html = t.ViewQuotes.render();
  assert.equal((html.match(/<tr data-id=/g) || []).length, 2);
  assert.doesNotMatch(html, /検索結果/);
});

test("ゴミ箱を表示中も、ゴミ箱の中を検索できる", () => {
  const t = loadApp([Q("q1", null, null, true), Q("q2", { customerCompany: "テスト工業株式会社" }, [item("EC-SW62-90002")], true)]);
  t.ViewQuotes.showTrash = true; t.ViewQuotes.filterText = "テスト工業";
  const html = t.ViewQuotes.render();
  assert.match(html, /data-id="q2"/);
  assert.doesNotMatch(html, /data-id="q1"/);
});
