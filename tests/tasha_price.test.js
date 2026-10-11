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
    ";this.__t={Store,defaultData,condPriceLabel,displayCandidateLabel,findOtherClientPrices,findConditionalPriceCandidates,otherPriceButtonHtml,candidateSelectHtml,mailCondTagText,tashaPopupPosition,mergeImportedProducts,itemsFromProductRow,candidateOptionLabel,deriveFromBigPrice,UN_CAN_ADD_FEE,noteForChosenCandidate,buildQuoteItemsFromMail};", ctx);
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
  assert.match(html, /旧特価15%UP済み価格 UN缶：¥16,100/);   // プルダウンの中は「要再見積り」を付けない
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

test("他社価格：通常の特価の行は、備考が違っても同じ取引先・同じ価格なら1件にまとめる", () => {
  const t = loadApp([P("X-1", 16, "萬座塗料株式会社", 40350, { note: "A" }), P("X-1", 16, "萬座塗料株式会社", 40350, { note: "B" })]);
  assert.equal(t.findOtherClientPrices("X-1", 16, "杉村塗料株式会社").length, 1);
});

test("他社価格：条件別の価格が数値でないものは無視し、残らなければ出さない", () => {
  const t = loadApp([P("X-1", 16, "株式会社　大川", 0, { alternatives: [{ price: "abc", condition: "国内缶" }] })]);
  assert.deepEqual(plain(t.findOtherClientPrices("X-1", 16, "杉村塗料株式会社")), []);
});
// ---- 特価/原価管理リストの【コピー】：特価が0円の容量に、国内缶／UN缶などの価格候補を付ける ----
test("コピー：特価が0円の容量に条件別の価格を候補として付ける（18kgの特価はそのまま）", () => {
  const t = loadApp([
    P("X-1", 4, "株式会社　大川", 0, { alternatives: [{ price: 15530, condition: "国内缶" }, { price: 16100, condition: "UN缶" }] }),
    P("X-1", 16, "株式会社　大川", 0, { alternatives: [{ price: 33350, condition: "" }] }),
    P("X-1", 18, "株式会社　大川", 39100),
  ]);
  const items = plain(t.itemsFromProductRow(t.Store.data.products[0]));
  assert.deepEqual(items.map(i => i.capacity), [16, 4, 18]);
  const i16 = items[0], i4 = items[1], i18 = items[2];
  assert.equal(i16.unitPrice, 0);
  assert.deepEqual(i16.calcCandidates.map(c => c.price), [33350]);
  assert.deepEqual(i4.calcCandidates.map(c => [c.label, c.price]), [
    ["要再見積り（旧特価15%UP済み価格）国内缶", 15530], ["要再見積り（旧特価15%UP済み価格）UN缶", 16100]]);
  assert.equal(i18.unitPrice, 39100);
  assert.equal(i18.calcCandidates, undefined);
});

test("コピー：条件別の価格が無い行は、これまでどおり候補を付けない", () => {
  const t = loadApp([P("X-2", 16, "株式会社　大川", 0)]);
  const items = plain(t.itemsFromProductRow(t.Store.data.products[0]));
  assert.deepEqual(items.map(i => i.capacity), [16, 4]);
  assert.equal(items[0].calcCandidates, undefined);
  assert.equal(items[0].priceWarning, true);
});

test("コピー：18kgは条件別の価格が登録されている時だけ行を追加する", () => {
  const t = loadApp([
    P("X-3", 16, "株式会社　大川", 0),
    P("X-3", 18, "株式会社　大川", 0, { alternatives: [{ price: 47610, condition: "" }] }),
  ]);
  const items = plain(t.itemsFromProductRow(t.Store.data.products[0]));
  assert.deepEqual(items.map(i => i.capacity), [16, 4, 18]);
  assert.equal(items[2].unitPrice, 0);
  assert.deepEqual(items[2].calcCandidates.map(c => c.price), [47610]);
});

// ---- 価格候補の一覧（プルダウン）の中の表記：「要再見積り」は付けない ----
test("プルダウン内の表記：要再見積りを外し「旧特価15%UP済み価格 国内缶」の形にする", () => {
  const t = loadApp();
  assert.equal(t.candidateOptionLabel("要再見積り（旧特価15%UP済み価格）国内缶"), "旧特価15%UP済み価格 国内缶");
  assert.equal(t.candidateOptionLabel("要再見積り（旧特価15%UP済み価格）"), "旧特価15%UP済み価格");
  assert.equal(t.candidateOptionLabel("条件付き価格（UN缶）"), "旧特価15%UP済み価格 UN缶");
  assert.equal(t.candidateOptionLabel("原価900円/kg×指数0.85（推奨・新指数）"), "原価900円/kg×指数0.85（推奨・新指数）");
});

test("プルダウン：一覧の選択肢は「要再見積り」を含まない（他の場所の表記は変えない）", () => {
  const t = loadApp();
  const html = t.candidateSelectHtml([{ label: "要再見積り（旧特価15%UP済み価格）UN缶", price: 16100 }]);
  assert.match(html, /旧特価15%UP済み価格 UN缶：¥16,100/);
  assert.doesNotMatch(html, /要再見積り/);
  assert.equal(t.condPriceLabel("UN缶"), "要再見積り（旧特価15%UP済み価格）UN缶");
});

// ---- 18kg特価・16kg特価からの算出：16kg（18kgから逆算）、4kg国内缶、4kg UN缶（国内缶＋600円） ----
test("算出：18kg特価39,100円から16kg33,690円・4kg国内缶17,640円・UN缶18,240円", () => {
  const t = loadApp();
  const s = t.Store.data.settings;
  assert.equal(t.UN_CAN_ADD_FEE, 600);
  assert.deepEqual(plain(t.deriveFromBigPrice(39100, s)), { base: 33690, small: 17640, smallUN: 18240 });
});

test("算出：18kgが0円・数値でない・加算額（1,200円）以下なら算出しない", () => {
  const t = loadApp();
  const s = t.Store.data.settings;
  [0, NaN, "abc", undefined, 1200, -5].forEach(v => assert.equal(t.deriveFromBigPrice(v, s), null));
});

test("コピー：18kg特価だけの製品は、16kgを逆算し、4kgに国内缶・UN缶の候補を出す", () => {
  const t = loadApp([P("D-1", 18, "株式会社　大川", 39100)]);
  const items = plain(t.itemsFromProductRow(t.Store.data.products[0]));
  assert.deepEqual(items.map(i => i.capacity), [16, 4, 18]);
  assert.equal(items[0].unitPrice, 0);
  assert.equal(items[0].calcCandidate, 33690);
  assert.equal(items[0].calcCandidateLabel, "18KG特価より算出");
  assert.deepEqual(items[1].calcCandidates.map(c => [c.label, c.price]), [
    ["国内缶（16KG算出価格より）", 17640], ["UN缶（国内缶＋¥600）", 18240]]);
  assert.equal(items[2].unitPrice, 39100);
  assert.equal(items[2].calcCandidates, undefined);
});

test("コピー：16kg特価と18kg特価が両方ある時は16kg特価を優先して4kg UN缶を出す", () => {
  const t = loadApp([P("D-2", 16, "株式会社　大川", 35000), P("D-2", 18, "株式会社　大川", 39100)]);
  const items = plain(t.itemsFromProductRow(t.Store.data.products[0]));
  assert.equal(items[0].unitPrice, 35000);
  assert.equal(items[0].calcCandidate, undefined);
  assert.equal(items[1].calcCandidate, 18130);
  assert.deepEqual(items[1].calcCandidates.map(c => [c.label, c.price]), [["UN缶（国内缶＋¥600）", 18730]]);
});

test("コピー：16kg特価だけでも4kg UN缶（国内缶＋600円）を出す", () => {
  const t = loadApp([P("D-3", 16, "株式会社　大川", 35000)]);
  const items = plain(t.itemsFromProductRow(t.Store.data.products[0]));
  assert.equal(items[1].calcCandidate, 18130);
  assert.deepEqual(items[1].calcCandidates.map(c => c.price), [18730]);
});

test("コピー：4kg特価がある時は、UN缶の算出候補を付けず、16kgは従来の逆算のまま", () => {
  const t = loadApp([P("D-4", 4, "株式会社　大川", 18000), P("D-4", 18, "株式会社　大川", 39100)]);
  const items = plain(t.itemsFromProductRow(t.Store.data.products[0]));
  assert.equal(items[1].unitPrice, 18000);
  assert.equal(items[1].calcCandidates, undefined);
  assert.equal(items[0].calcCandidateLabel, "4KG特価より算出");
});

test("コピー：4kgのUN缶の価格が登録済みなら、算出のUN缶候補は付けずに登録された価格を出す", () => {
  const t = loadApp([
    P("D-5", 18, "株式会社　大川", 39100),
    P("D-5", 4, "株式会社　大川", 0, { alternatives: [{ price: 16100, condition: "UN缶" }] }),
  ]);
  const items = plain(t.itemsFromProductRow(t.Store.data.products[0]));
  const labels = items[1].calcCandidates.map(c => c.label);
  assert.equal(items[1].calcCandidates[0].price, 16100);
  assert.ok(labels.some(l => /国内缶（16KG算出価格より）/.test(l)));
  assert.ok(!labels.some(l => /国内缶＋¥600/.test(l)));
});

test("コピー：4kgの国内缶だけ登録済みなら、UN缶は登録済みの国内缶＋600円にする（18kg特価のみ）", () => {
  const t = loadApp([
    P("D-8", 18, "株式会社　大川", 39100),
    P("D-8", 4, "株式会社　大川", 0, { alternatives: [{ price: 15530, condition: "国内缶" }] }),
  ]);
  const items = plain(t.itemsFromProductRow(t.Store.data.products[0]));
  assert.deepEqual(items[1].calcCandidates.map(c => [c.label, c.price]), [
    ["要再見積り（旧特価15%UP済み価格）国内缶", 15530], ["UN缶（国内缶＋¥600）", 16130]]);
});

test("コピー：4kgの国内缶が登録済みなら、16kg特価がある場合もUN缶は登録済みの国内缶＋600円にする", () => {
  const t = loadApp([
    P("D-9", 16, "株式会社　大川", 35000),
    P("D-9", 4, "株式会社　大川", 0, { alternatives: [{ price: 15530, condition: "国内缶" }] }),
  ]);
  const items = plain(t.itemsFromProductRow(t.Store.data.products[0]));
  assert.deepEqual(items[1].calcCandidates.map(c => c.price), [15530, 16130]);
});

test("コピー：国内缶・UN缶ともに登録済みなら、算出の候補は付けない", () => {
  const t = loadApp([
    P("D-7", 18, "株式会社　大川", 39100),
    P("D-7", 4, "株式会社　大川", 0, { alternatives: [{ price: 15530, condition: "国内缶" }, { price: 16100, condition: "UN缶" }] }),
  ]);
  const items = plain(t.itemsFromProductRow(t.Store.data.products[0]));
  assert.deepEqual(items[1].calcCandidates.map(c => c.price), [15530, 16100]);
});

test("候補を選んだ時の備考：UN缶の候補なら「(UN缶)」、国内缶の候補なら「(国内缶)」に切り替える", () => {
  const t = loadApp();
  assert.equal(t.noteForChosenCandidate("(国内缶)", "UN缶（国内缶＋¥600）"), "(UN缶)");
  assert.equal(t.noteForChosenCandidate("(国内缶)", "要再見積り（旧特価15%UP済み価格）UN缶"), "(UN缶)");
  assert.equal(t.noteForChosenCandidate("(UN缶)", "国内缶（16KG算出価格より）"), "(国内缶)");
  assert.equal(t.noteForChosenCandidate("", "UN缶（国内缶＋¥600）"), "(UN缶)");
});

test("候補を選んだ時の備考：国内缶・UN缶と関係の無い候補や、手で書いた備考は変えない", () => {
  const t = loadApp();
  assert.equal(t.noteForChosenCandidate("(国内缶)", "原価900円/kg×指数0.85（推奨・新指数）"), "(国内缶)");
  assert.equal(t.noteForChosenCandidate("(特注色)", "UN缶（国内缶＋¥600）"), "(特注色)");
  assert.equal(t.noteForChosenCandidate("(UN缶)", "要再見積り（旧特価15%UP済み価格）"), "(UN缶)");
});

// ---- メールから見積書を作る経路（buildQuoteItemsFromMail）にも、18kg・16kgからの算出候補を出す ----
const mailCands = (t, kgs, un, code = "M-1") =>
  plain(t.buildQuoteItemsFromMail(code, "テスト品", "株式会社　大川", kgs, un));
const only = (items, kg) => items.find(i => i.capacity === kg);
const calcOnly = list => list.filter(c => !/^原価/.test(c.label)).map(c => [c.label, c.price]);

test("メール経路：18kg特価だけで4kg・UN缶指定なら、UN缶・国内缶の算出候補が先頭に並ぶ", () => {
  const t = loadApp([P("M-1", 18, "株式会社　大川", 39100)]);
  const i4 = only(mailCands(t, [4], true), 4);
  assert.equal(i4.note, "(UN缶)");
  assert.deepEqual(calcOnly(i4.calcCandidates), [["UN缶（国内缶＋¥600）", 18240], ["国内缶（16KG算出価格より）", 17640]]);
  assert.equal(i4.calcCandidates[0].price, 18240);
});

test("メール経路：18kg特価だけで4kg・国内缶指定なら、国内缶を先に、UN缶を後に並べる", () => {
  const t = loadApp([P("M-1", 18, "株式会社　大川", 39100)]);
  const i4 = only(mailCands(t, [4], false), 4);
  assert.deepEqual(calcOnly(i4.calcCandidates), [["国内缶（16KG算出価格より）", 17640], ["UN缶（国内缶＋¥600）", 18240]]);
});

test("メール経路：18kg特価だけで16kgを依頼されたら、18kgからの逆算を候補にする", () => {
  const t = loadApp([P("M-1", 18, "株式会社　大川", 39100)]);
  const items = mailCands(t, [16, 4, 18], false);
  assert.deepEqual(calcOnly(only(items, 16).calcCandidates), [["18KG特価より算出", 33690]]);
  assert.equal(only(items, 18).unitPrice, 39100);
});

test("メール経路：16kg特価があれば16kg特価を優先して4kgを算出し、UN缶も出す（18kgがあっても）", () => {
  const t = loadApp([P("M-1", 16, "株式会社　大川", 35000), P("M-1", 18, "株式会社　大川", 39100)]);
  const i4 = only(mailCands(t, [4], true), 4);
  assert.deepEqual(calcOnly(i4.calcCandidates), [["UN缶（国内缶＋¥600）", 18730], ["16KG特価より算出", 18130]]);
});

test("メール経路：4kgのUN缶が登録済みなら算出のUN缶候補は付けず、登録価格が先頭", () => {
  const t = loadApp([
    P("M-1", 18, "株式会社　大川", 39100),
    P("M-1", 4, "株式会社　大川", 0, { alternatives: [{ price: 16100, condition: "UN缶" }] }),
  ]);
  const i4 = only(mailCands(t, [4], true), 4);
  assert.equal(i4.calcCandidates[0].price, 16100);
  assert.ok(!calcOnly(i4.calcCandidates).some(([l]) => /国内缶＋¥600/.test(l)));
});

test("メール経路：16kg特価があり国内缶も登録済み：16KG特価より算出は残り、UN缶は登録国内缶＋600円", () => {
  const t = loadApp([
    P("M-3", 16, "株式会社　大川", 35000),
    P("M-3", 4, "株式会社　大川", 0, { alternatives: [{ price: 17000, condition: "国内缶" }] }),
  ]);
  const i4 = only(mailCands(t, [4], true, "M-3"), 4);
  assert.deepEqual(i4.calcCandidates.filter(c => !/^原価/.test(c.label)).map(c => c.price), [17000, 17600, 18130]);
  assert.deepEqual(calcOnly(i4.calcCandidates).slice(1), [["UN缶（国内缶＋¥600）", 17600], ["16KG特価より算出", 18130]]);
});

test("メール経路：18kg特価のみで国内缶が登録済み：算出の国内缶は付けず、UN缶は登録国内缶＋600円", () => {
  const t = loadApp([
    P("M-4", 18, "株式会社　大川", 39100),
    P("M-4", 4, "株式会社　大川", 0, { alternatives: [{ price: 15530, condition: "国内缶" }] }),
  ]);
  const i4 = only(mailCands(t, [4], true, "M-4"), 4);
  assert.deepEqual(calcOnly(i4.calcCandidates).map(([, p]) => p), [15530, 16130]);
});

test("メール経路：4kg特価が登録済みなら単価に入り、算出候補は付かない", () => {
  const t = loadApp([P("M-5", 4, "株式会社　大川", 18000), P("M-5", 18, "株式会社　大川", 39100)]);
  const i4 = only(mailCands(t, [4], true, "M-5"), 4);
  assert.equal(i4.unitPrice, 18000);
  assert.equal(i4.calcCandidates, undefined);
});

test("メール経路：18kg特価が数値でない・1,200円以下なら算出候補を付けない", () => {
  ["abc", 1200].forEach((v, n) => {
    const t = loadApp([P("M-6", 18, "株式会社　大川", v, { costPerKg: 0 })]);
    const items = mailCands(t, [16, 4], true, "M-6");
    assert.equal(only(items, 4).calcCandidates, undefined, String(v));
    assert.equal(only(items, 16).calcCandidates, undefined, String(v));
  });
});

test("メール経路：取引先が空の行の18kg特価は拾わない（取引先が分からない時に他の取引先の価格を出さない）", () => {
  const t = loadApp([P("M-7", 18, "", 39100, { costPerKg: 0 })]);
  const items = plain(t.buildQuoteItemsFromMail("M-7", "テスト品", "", [16, 4], true));
  assert.equal(only(items, 4).calcCandidates, undefined);
  assert.equal(only(items, 16).calcCandidates, undefined);
});

test("メール経路：16kg・18kgの特価が無ければ、これまでどおり原価×指数の候補だけ", () => {
  const t = loadApp([P("M-2", 4, "株式会社　大川", 0, { costPerKg: 900 })]);
  const i4 = only(mailCands(t, [4], true, "M-2"), 4);
  assert.deepEqual(calcOnly(i4.calcCandidates), []);
});

test("コピー：18kg特価が数値でなければ算出の候補を付けない", () => {
  const t = loadApp([P("D-6", 18, "株式会社　大川", "abc")]);
  const items = plain(t.itemsFromProductRow(t.Store.data.products[0]));
  assert.equal(items[0].calcCandidate, undefined);
  assert.equal(items[1].calcCandidates, undefined);
});