// 品番が誤っている時の品番候補（品名・品番から候補を順位付けする）のテスト（仮の品番・品名）
// 実行: node --test tests/code_candidates.test.js
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
    ";this.__t={rankCodeCandidates,codeNameScore,codeNameKey};", ctx);
  return ctx.__t;
}
const plain = v => JSON.parse(JSON.stringify(v));
const ENTRIES = [
  { code: "P79-71416", name: "DEMO NAVY Q HX #3" },
  { code: "P79-71922", name: "DEMO NAVY Q HX#2" },
  { code: "P79-71011", name: "DEMO NAVY Q HX" },
  { code: "AT20-5512", name: "DEMO NAVY #3" },
  { code: "EC-GB31-6603", name: "BLACK" },
  { code: "EC-P79-71426LE", name: "TEST AS-TD" },
  { code: "EC-GPX79-11097", name: "GOLD IT" },
];
const LC = [{ code: "P79-", name: "ﾊｲｳﾚｯｸｽP" }, { code: "EC-GPX79-", name: "ｴｺﾊｲｳﾚｯｸｽP ｸﾞﾗﾝﾃﾞﾎﾞﾇｰﾙ" }];
const REQ_NAME = "ハイウレックスP DEMO NAVY Q HX＃３";

test("品番が1文字違いで品名が一致：P79-71426 の1位は P79-71416（品名が一致・品番が1文字違い、140点）", () => {
  const t = loadApp();
  const r = plain(t.rankCodeCandidates("P79-71426", REQ_NAME, ENTRIES, LC));
  assert.equal(r[0].code, "P79-71416");
  assert.equal(r[0].name, "DEMO NAVY Q HX #3");
  assert.equal(r[0].score, 140);
  assert.deepEqual(r[0].reasons, ["品名が一致", "品番が1文字違い"]);
});

test("2位 P79-71922（80点）、3位 P79-71011（60点）。BLACK・DEMO NAVY #3・TEST AS-TD は候補に出ない", () => {
  const t = loadApp();
  const r = plain(t.rankCodeCandidates("P79-71426", REQ_NAME, ENTRIES, LC));
  assert.deepEqual(r.map(c => [c.code, c.score]), [["P79-71416", 140], ["P79-71922", 80], ["P79-71011", 60]]);
});

test("品名が空なら、品番の文字違いだけで候補を出す（P79-71416 が「品番が1文字違い」40点）", () => {
  const t = loadApp();
  const r = plain(t.rankCodeCandidates("P79-71426", "", ENTRIES, LC));
  assert.equal(r[0].code, "P79-71416");
  assert.equal(r[0].score, 40);
  assert.deepEqual(r[0].reasons, ["品番が1文字違い"]);
});

test("書き方違い：EC-GPX7911097・GPX79-11097 は EC-GPX79-11097 を「品番の書き方違い」で出す", () => {
  const t = loadApp();
  for (const req of ["EC-GPX7911097", "GPX79-11097"]) {
    const r = plain(t.rankCodeCandidates(req, "", ENTRIES, LC));
    assert.equal(r[0].code, "EC-GPX79-11097", req);
    assert.ok(r[0].reasons.includes("品番の書き方違い"), req);
  }
});

test("書き方違いは区切り（-）ごとの末尾一致だけ：P79-71426 は EC-LP79-71426 と一致しない、1区切りだけの品番（9146）は末尾一致にしない", () => {
  const t = loadApp();
  const e = [{ code: "EC-LP79-71426", name: "OTHER" }, { code: "EC-GB31-6603", name: "BLACK" }, { code: "GM62-6603", name: "X" }];
  assert.equal(plain(t.rankCodeCandidates("P79-71426", "", e, LC)).filter(c => c.code === "EC-LP79-71426" && c.reasons.includes("品番の書き方違い")).length, 0);
  assert.equal(plain(t.rankCodeCandidates("6603", "", e, LC)).length, 0);
});

test("半角カナのライン名・半角の#でも、1位は同じ", () => {
  const t = loadApp();
  const r = plain(t.rankCodeCandidates("P79-71426", "ﾊｲｳﾚｯｸｽP DEMO NAVY Q HX#3", ENTRIES, LC));
  assert.equal(r[0].code, "P79-71416");
  assert.equal(r[0].score, 140);
});

test("codeNameScore：一致100・ほぼ一致60・違う0（ライン名を外して比べる）", () => {
  const t = loadApp();
  assert.equal(t.codeNameScore(REQ_NAME, "DEMO NAVY Q HX #3", LC), 100);
  assert.equal(t.codeNameScore(REQ_NAME, "DEMO NAVY Q HX#2", LC), 60);
  assert.equal(t.codeNameScore(REQ_NAME, "TEST AS-TD", LC), 0);
  assert.equal(t.codeNameScore(REQ_NAME, "BLACK", LC), 0);
});

test("1語だけのよくある品名（ブラック）の一致は、品番が近い時だけ候補にする（品番が遠い同名品で上位が埋まらない）", () => {
  const t = loadApp();
  const e = [{ code: "AA-1111", name: "ブラック" }, { code: "BB-2222", name: "ブラック" }, { code: "P79-71417", name: "ブラック" }, { code: "P79-71410", name: "ホワイト" }];
  const r = plain(t.rankCodeCandidates("P79-71416", "ブラック", e, LC));
  assert.deepEqual(r.map(c => c.code), ["P79-71417", "P79-71410"]);
  assert.deepEqual(r[0].reasons, ["品名が一致", "品番が1文字違い"]);
});

test("候補は最大5件、点0は含めない", () => {
  const t = loadApp();
  const many = Array.from({ length: 8 }, (_, i) => ({ code: "P79-7142" + i, name: "X" + i }));
  const r = plain(t.rankCodeCandidates("P79-71426", "", many, LC));
  assert.equal(r.length, 5);
  assert.ok(r.every(c => c.score > 0));
});

test("2万件の登録・105件のラインコードでも、1件の照合は1秒未満", () => {
  const t = loadApp();
  const e = Array.from({ length: 20000 }, (_, i) => ({ code: "Z" + (i % 50) + "-" + String(10000 + i), name: "NAME " + (i % 300) + " COLOR" }));
  const lcs = Array.from({ length: 105 }, (_, i) => ({ code: "Z" + i + "-", name: "ﾗｲﾝ" + i }));
  const t0 = Date.now();
  t.rankCodeCandidates("Z3-10003", "ﾗｲﾝ3 NAME 3 COLOR", e, lcs);
  assert.ok(Date.now() - t0 < 1000, String(Date.now() - t0) + "ms");
});
