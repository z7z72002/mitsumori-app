// 「参考：他社価格」と「要再見積り（旧特価15%UP済み価格）」表記のテスト（仮のデータ）
// 実行: node --test tests/tasha_price.test.js
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
    ";this.__t={Store,defaultData,condPriceLabel,displayCandidateLabel,findOtherClientPrices,findConditionalPriceCandidates,otherPriceButtonHtml,candidateSelectHtml,mailCondTagText,tashaPopupPosition,mergeImportedProducts};", ctx);
  const t = ctx.__t;
  t.Store.data = t.defaultData();
  t.Store.data.products = products || [];
  return t;
}
// vm の中で作られた配列は、そのままだと deepEqual で別物扱いになるので、比べる前に普通の値に直す
const plain = v => JSON.parse(JSON.stringify(v));
const P = (code, kg, client, specialPrice, extra) => Object.assign({ code, name: "テスト品", specialKg: kg, specialPrice, client, costPerKg: 900, standardPrice: 0, note: "" }, extra || {});

test("条件付きの表記：条件名があれば後ろに付ける", () => {
  const t = loadApp();
  assert.equal(t.condPriceLabel("UN缶"), "要再見積り（旧特価15%UP済み価格）UN缶");
  assert.equal(t.condPriceLabel(""), "要再見積り（旧特価15%UP済み価格）");
});

test("古い表記「条件付き価格（○○）」を新しい表記に置き換える", () => {
  const t = loadApp();
  assert.equal(t.displayCandidateLabel("条件付き価格（国内缶）"), "要再見積り（旧特価15%UP済み価格）国内缶");
  assert.equal(t.displayCandidateLabel("条件付き価格（特価欄空・条件付き）"), "要再見積り（旧特価15%UP済み価格）");
  assert.equal(t.displayCandidateLabel("条件付き（旧特価15%UP済み価格）UN缶"), "要再見積り（旧特価15%UP済み価格）UN缶");
  assert.equal(t.displayCandidateLabel("原価900円/kg×指数0.85（推奨・新指数）"), "原価900円/kg×指数0.85（推奨・新指数）");
});

test("条件別の価格の候補は新しい表記で返る", () => {
  const t = loadApp([P("X-1", 4, "株式会社　大川", 0, { alternatives: [{ price: 15530, condition: "国内缶" }, { price: 16100, condition: "UN缶" }] })]);
  const c = t.findConditionalPriceCandidates("X-1", "株式会社　大川", 4, true);
  assert.equal(c[0].label, "要再見積り（旧特価15%UP済み価格）UN缶");
  assert.equal(c[0].price, 16100);
});

test("他社価格：同じ品番・同じ容量だけ、宛先と全く同じ取引先は除く", () => {
  const t = loadApp([
    P("X-1", 16, "杉村塗料株式会社　福島支店", 42670),
    P("X-1", 16, "萬座塗料株式会社　厚木営業所", 40350),
    P("X-1", 4, "萬座塗料株式会社　厚木営業所", 21000),
    P("X-2", 16, "友和塗料株式会社", 50000),
  ]);
  const r = t.findOtherClientPrices("X-1", 16, "杉村塗料株式会社　福島支店");
  assert.deepEqual(plain(r.map(x => x.client)), ["萬座塗料株式会社　厚木営業所"]);
});

test("他社価格：同じ会社の別支店を先頭、その他は安い順、標準価格は最後", () => {
  const t = loadApp([
    P("X-1", 16, "萬座塗料株式会社　厚木営業所", 40350),
    P("X-1", 16, "友和塗料株式会社　東京営業所", 43900, { standardPrice: 46500 }),
    P("X-1", 16, "杉村塗料株式会社　北上営業所", 41800),
    P("X-1", 16, "杉村塗料株式会社", 42670),
    P("X-1", 16, "株式会社　大川", 0, { alternatives: [{ price: 41060, condition: "国内缶" }, { price: 41630, condition: "UN缶" }] }),
  ]);
  const r = t.findOtherClientPrices("X-1", 16, "杉村塗料株式会社　福島支店");
  assert.deepEqual(plain(r.map(x => x.client)), [
    "杉村塗料株式会社　北上営業所", "杉村塗料株式会社",
    "萬座塗料株式会社　厚木営業所", "株式会社　大川", "友和塗料株式会社　東京営業所", "標準価格",
  ]);
  assert.equal(r[0].sameCompany, true);
  assert.equal(r[2].sameCompany, false);
  const okawa = r.find(x => x.client === "株式会社　大川");
  // 特価欄は0円のまま出し、旧特価15%UP済みの価格は備考に入れる（並び順はその価格で決める）
  assert.equal(okawa.note, "要再見積り（旧特価15%UP済み価格：国内缶 ¥41,060／UN缶 ¥41,630）");
  assert.deepEqual(plain(okawa.prices.map(p => [p.label, p.price])), [["", 0]]);
  assert.equal(r[r.length - 1].isStandard, true);
  assert.equal(r[r.length - 1].prices[0].price, 46500);
});

test("他社価格：特価も条件別の価格も無い取引先は出さない", () => {
  const t = loadApp([P("X-1", 16, "空の会社", 0, { note: "【次回注文時に価格見直し】" })]);
  assert.deepEqual(plain(t.findOtherClientPrices("X-1", 16, "杉村塗料株式会社")), []);
});

test("画面：他社価格が無い行には印を出さない", () => {
  const t = loadApp([P("X-1", 16, "杉村塗料株式会社　福島支店", 42670)]);
  assert.equal(t.otherPriceButtonHtml({ code: "X-1", capacity: 16 }, "杉村塗料株式会社　福島支店"), "");
});

test("画面：他社価格がある行は「参考：他社価格」とポップアップの一覧を出す", () => {
  const t = loadApp([
    P("X-1", 16, "杉村塗料株式会社　北上営業所", 41800),
    P("X-1", 16, "株式会社　大川", 0, { alternatives: [{ price: 41060, condition: "国内缶" }] }),
  ]);
  const html = t.otherPriceButtonHtml({ code: "X-1", capacity: 16 }, "杉村塗料株式会社　福島支店");
  assert.match(html, /参考：他社価格/);
  assert.match(html, /X-1　16kg の他のお客様の価格（2件）/);
  assert.match(html, /同じ会社/);
  assert.match(html, /要再見積り（旧特価15%UP済み価格：国内缶 ¥41,060）/);
  assert.match(html, /<td class="p">¥0<\/td>/);
});

test("画面：価格候補リストの古い表記は新しい表記で表示する", () => {
  const t = loadApp();
  const html = t.candidateSelectHtml([{ label: "条件付き価格（UN缶）", price: 16100 }]);
  assert.match(html, /要再見積り（旧特価15%UP済み価格）UN缶：¥16,100/);
  assert.doesNotMatch(html, /条件付き価格（/);
});
test("画面：メールから作成の確認画面も新しい表記で出す", () => {
  const t = loadApp();
  assert.equal(t.mailCondTagText(4, [{ label: "要再見積り（旧特価15%UP済み価格）UN缶", price: 16100 }]),
    "4kg 要再見積り（旧特価15%UP済み価格）UN缶 ¥16,100");
});
test("ポップアップの位置：印の右下にそろえ、画面の左右からはみ出さない", () => {
  const t = loadApp();
  const pos = plain(t.tashaPopupPosition({ left: 1300, right: 1400, top: 300, bottom: 320 }, 460, 250, 1500, 900));
  assert.deepEqual(pos, { left: 940, top: 326 });
  const nearLeft = plain(t.tashaPopupPosition({ left: 100, right: 200, top: 300, bottom: 320 }, 460, 250, 1500, 900));
  assert.equal(nearLeft.left, 8);
});

test("ポップアップの位置：下に入りきらない時は印の上に出す", () => {
  const t = loadApp();
  const pos = plain(t.tashaPopupPosition({ left: 1300, right: 1400, top: 800, bottom: 820 }, 460, 250, 1500, 900));
  assert.equal(pos.top, 800 - 6 - 250);
});
test("他社価格：標準価格しか無い品目は空（印を出さない）", () => {
  const t = loadApp([P("X-1", 16, "杉村塗料株式会社　福島支店", 42670, { standardPrice: 46500 })]);
  assert.deepEqual(plain(t.findOtherClientPrices("X-1", 16, "杉村塗料株式会社　福島支店")), []);
  assert.equal(t.otherPriceButtonHtml({ code: "X-1", capacity: 16 }, "杉村塗料株式会社　福島支店"), "");
});

test("他社価格：件数に標準価格は含めない", () => {
  const t = loadApp([P("X-1", 16, "萬座塗料株式会社", 40350, { standardPrice: 46500 })]);
  assert.match(t.otherPriceButtonHtml({ code: "X-1", capacity: 16 }, "杉村塗料株式会社"), /の他のお客様の価格（1件）/);
});

test("他社価格：同じ取引先・同じ価格の重複行は1件にまとめる", () => {
  const t = loadApp([P("X-1", 16, "萬座塗料株式会社", 40350), P("X-1", 16, "萬座塗料株式会社", 40350)]);
  assert.equal(t.findOtherClientPrices("X-1", 16, "杉村塗料株式会社").length, 1);
});

test("他社価格：マージで行が足されたら、次の検索に反映される", () => {
  const t = loadApp([P("X-1", 16, "萬座塗料株式会社", 40350)]);
  assert.equal(t.findOtherClientPrices("X-1", 16, "杉村塗料株式会社").length, 1);
  t.mergeImportedProducts(t.Store.data.products, [P("X-1", 16, "友和塗料株式会社", 43900)], false);
  assert.equal(t.findOtherClientPrices("X-1", 16, "杉村塗料株式会社").length, 2);
});

test("マージ：CSV/Excelの取込みでは、条件別の価格を消さない", () => {
  const t = loadApp([P("X-1", 4, "株式会社　大川", 0, { alternatives: [{ price: 15530, condition: "国内缶" }] })]);
  t.mergeImportedProducts(t.Store.data.products, [P("X-1", 4, "株式会社　大川", 0)], false);
  assert.equal(t.Store.data.products[0].alternatives.length, 1);
});

test("マージ：特価マスタの取込みでは、条件別の価格を最新にし、無くなったものは消す", () => {
  const t = loadApp([
    P("X-1", 4, "株式会社　大川", 0, { alternatives: [{ price: 15530, condition: "国内缶" }] }),
    P("X-2", 4, "株式会社　大川", 0, { alternatives: [{ price: 9000, condition: "国内缶" }] }),
  ]);
  const r = plain(t.mergeImportedProducts(t.Store.data.products, [
    P("X-1", 4, "株式会社　大川", 0, { alternatives: [{ price: 16000, condition: "国内缶" }] }),
    P("X-2", 4, "株式会社　大川", 8800),
  ], true));
  assert.equal(t.Store.data.products[0].alternatives[0].price, 16000);
  assert.equal("alternatives" in t.Store.data.products[1], false);
  assert.deepEqual(r, { added: 0, updated: 2 });
});
test("他社価格：条件名の無い価格は「要再見積り（旧特価15%UP済み価格：¥29,560）」", () => {
  const t = loadApp([P("X-1", 16, "杉村塗料株式会社", 0, { alternatives: [{ price: 29560, condition: "" }] })]);
  const r = t.findOtherClientPrices("X-1", 16, "萬座塗料株式会社");
  assert.equal(r[0].note, "要再見積り（旧特価15%UP済み価格：¥29,560）");
  assert.equal(r[0].prices[0].price, 0);
});
