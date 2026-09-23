/* ==========================================================
   見積書作成アプリ ロジック本体
   ========================================================== */
"use strict";

/* ---------- 定数・初期データ ---------- */
const STORAGE_KEY = "mitsumoriApp_v1";
const FIXED_SEAL_DEPT = "営業";

const DEFAULT_SETTINGS = {
  manufacturingCostPerKg: 420,
  canFeeBase: 500,
  sgaRate: 0.30,
  baseContainerKg: 16,
  smallContainerKg: 4,
  smallAddKg: 2,
  smallAddFee: 5000,
  bigContainerKg: 18,
  bigAddFee: 1200,
  indices: [0.62, 0.72, 0.77, 0.82, 0.87],
  managerApprovalIndex: 0.95,
  minPrice4kg: 13500,
  sealNames: ["平井"],
  offices: [
    { name: "武蔵塗料株式会社　営業部", address: "358-0032　埼玉県入間市狭山ヶ原11-2\nTEL:04-2908-7634　FAX:04-2935-0273" },
    { name: "武蔵塗料株式会社　名古屋営業所", address: "485-0029　愛知県小牧市中央一丁目267\n小牧ガスビル3階\nTEL:0568-54-2113　FAX:0568-54-2117" },
    { name: "武蔵塗料株式会社　大阪営業所", address: "" }
  ]
};

const DEFAULT_REMARKS =
"上記価格は製品価格であり、運賃・調色料・消費税は含まれておりません";
const DEFAULT_TONING = "調色料(1色、1回につき、36㎏以下の場合、¥7,000別建て）";
const DEFAULT_FREIGHT = [
  "1)　御取引先様店頭渡し　：　仕様毎の定額運賃　+　最低運賃補償額（納入量が既定数量以下の場合）",
  "2)　御取引先様ご指定の場所へ直送　：　直送運賃実費請求",
  "3）　弊社入間工場へお引取り頂いた場合は、定額運賃の請求はございません"
];

const SAMPLE_PRODUCTS = [
  { code: "EC-GM62-1793M\n(SP26-10591)", name: "ｴｺﾒﾀﾙﾄﾞ\nﾌﾟﾛｼｵﾝｼﾙﾊﾞｰ KW-TD", costPerKg: 847, note: "※メタリック色" },
  { code: "EC-GM62-1794\n(SP26-10592)", name: "ｴｺﾒﾀﾙﾄﾞ\n7416C ｵﾚﾝｼﾞｸﾘﾔｰ", costPerKg: 866, note: "※エナメル色" },
  { code: "EC-GM62-1795\n(SP26-10595)", name: "ｴｺﾒﾀﾙﾄﾞ\n3935C ｲｴﾛｰｸﾘﾔｰ KW-TD", costPerKg: 874, note: "※メタリック色" },
  { code: "EC-P79-36701\n(SP26-10593)", name: "ｴｺﾊｲｳﾚｯｸｽP\n2755C ﾈｲﾋﾞｰ KW-TD", costPerKg: 1394, note: "※メタリック色" },
  { code: "SP26-10594\n(EC-P79-)", name: "ｴｺﾊｲｳﾚｯｸｽP\nﾌﾟﾛｼｵﾝﾏｯﾄｸﾘﾔｰ", costPerKg: 594, note: "※エナメル色" }
];

/* 新指数＆最低価格シートより: [ラインコード, ライン名, 新指数, 最低価格(エナメル16kg), 最低価格(メタリック16kg)] */
const DEFAULT_LINE_CODES_RAW = [
  ["AB59-","MPC",0.8,21800,null],
  ["LB33-","MPC",0.9,19200,27200],
  ["FM91-","MPC FM",0.9,22600,null],
  ["AT20-","ｱｰﾏﾄｯﾌﾟ",0.65,23300,24400],
  ["XT20-","ｱｰﾏﾄｯﾌﾟ",0.65,23300,24400],
  ["AQ-PB●●-","ｱｸｱｺ ﾊｲｳﾚｯｸｽP",0.7,null,null],
  ["AQ-PB80-","ｱｸｱｺ ﾊﾟﾅｺ",0.7,24400,null],
  ["AQ-PA●●-","ｱｸｱｺ ﾌﾟﾗｴｰｽ",0.7,23000,26000],
  ["AQ-MA32-","ｱｸｱｺ ﾒﾀﾙﾄﾞ",0.7,null,null],
  ["787-","ｱﾙﾃｨﾊﾟﾜｰﾙﾄﾞ",0.75,23000,25000],
  ["S79-","ｳﾙﾄﾗｼｬｲﾝ",0.75,22500,23600],
  ["BS79-","ｳﾙﾄﾗｼｬｲﾝ金属用",0.75,21500,22600],
  ["UV11-","ｳﾙﾄﾗﾊﾞｲﾝ",0.60,null,null],
  ["UV50-","ｳﾙﾄﾗﾊﾞｲﾝ",0.60,null,null],
  ["UV71-","ｳﾙﾄﾗﾊﾞｲﾝ",0.60,null,null],
  ["UV72-","ｳﾙﾄﾗﾊﾞｲﾝ",0.60,null,null],
  ["UV75-","ｳﾙﾄﾗﾊﾞｲﾝ",0.60,null,null],
  ["UV82-","ｳﾙﾄﾗﾊﾞｲﾝ",0.60,null,null],
  ["UV84-","ｳﾙﾄﾗﾊﾞｲﾝ",0.60,null,null],
  ["UV88-","ｳﾙﾄﾗﾊﾞｲﾝ",0.60,null,null],
  ["UVA72-","ｳﾙﾄﾗﾊﾞｲﾝ",0.60,null,null],
  ["EA-NVA86-","ｳﾞｨｰﾀ ﾊﾟﾅｺ",0.60,null,null],
  ["EA-NVB62-","ｳﾞｨｰﾀ ｳﾚｯｸｽ",0.75,null,null],
  ["EC-UV14-","ｴｺｳﾙﾄﾗﾊﾞｲﾝ",0.60,null,null],
  ["EC-UV16-","ｴｺｳﾙﾄﾗﾊﾞｲﾝ",0.60,null,null],
  ["EC-UV75-","ｴｺｳﾙﾄﾗﾊﾞｲﾝ",0.60,null,null],
  ["EC-UV90-","ｴｺｳﾙﾄﾗﾊﾞｲﾝ",0.8,42000,null],
  ["EC-AM62-","ｴｺｱｰﾊﾞｽｳﾚｯｸｽ ﾏｯﾄ",0.9,27700,null],
  ["EC-MH62-","ｴｺｻﾝｼｬｲﾝｽｰﾊﾟｰMH",0.8,23100,25600],
  ["EC-RMA62-","ｴｺｻﾝｼｬｲﾝｽｰﾊﾟｰMH",0.8,23100,25600],
  ["EC-NW79-","ｴｺﾈｵｳﾚｯｸｽ",0.65,27900,null],
  ["EC-NE62-","ｴｺﾈｵﾒｯｷｬﾝﾃｯｸｽ",0.8,22900,null],
  ["EC-CH79-","ｴｺﾊｲｳﾚｯｸｽCH",0.7,28000,32000],
  ["EC-JM62-","ｴｺﾊｲｳﾚｯｸｽJM",0.75,24000,null],
  ["EC-NNY62-","ｴｺﾊｲｳﾚｯｸｽNY",0.7,null,null],
  ["EC-AG62-","ｴｺﾊｲｳﾚｯｸｽP",0.8,26100,null],
  ["EC-NP79-","ｴｺﾊｲｳﾚｯｸｽP",0.7,null,25500],
  ["EC-P79-","ｴｺﾊｲｳﾚｯｸｽP",0.85,20000,23500],
  ["EC-UNP79-","ｴｺﾊｲｳﾚｯｸｽP",0.75,null,25500],
  ["EC-GPX79-","ｴｺﾊｲｳﾚｯｸｽP ｸﾞﾗﾝﾃﾞﾎﾞﾇｰﾙ",0.7,null,30300],
  ["EC-RGA62-","ｴｺﾊｲｳﾚｯｸｽP ｸﾞﾗﾝﾃﾞﾎﾞﾇｰﾙ",0.7,null,30300],
  ["EC-KNP79-","ｴｺﾊｲｳﾚｯｸｽP ﾎﾞﾇｰﾙﾄｰﾝ",0.8,null,26700],
  ["EC-LP79-","ｴｺﾊｲｳﾚｯｸｽP ﾚｰｻﾞｰｶｯﾄﾖｳ",0.75,22200,25500],
  ["EC-RPA62-","ｴｺﾊｲｳﾚｯｸｽP ﾚｰｻﾞｰｶｯﾄﾖｳ",0.75,22200,25500],
  ["EC-SW62-GG","ｴｺﾊｲｳﾚｯｸｽPﾌﾞﾗｲﾄｰﾝ",0.55,null,29900],
  ["EC-SW62-","ｴｺﾊｲｳﾚｯｸｽPﾌﾞﾗｲﾄｰﾝ",0.55,null,52000],
  ["EC-YP62-","ｴｺﾊｲｳﾚｯｸｽP",0.9,25100,null],
  ["EC-RF62-","ｴｺﾊｲｳﾚｯｸｽRF",0.8,null,26700],
  ["EC-SR62-","ｴｺﾊｲｳﾚｯｸｽSR",0.5,61400,null],
  ["EC-VJ62-","ｴｺﾊｲｳﾚｯｸｽVJ",0.7,23500,null],
  ["EC-FC52-","ｴｺﾌﾟﾗｴｰｽ",0.8,20000,23500],
  ["EC-FG50-","ｴｺﾌﾟﾗｴｰｽ",0.9,null,null],
  ["EC-FJ50-","ｴｺﾌﾟﾗｴｰｽ",0.9,24800,27000],
  ["EC-MX50-","ｴｺﾌﾟﾗｴｰｽ",0.75,20000,23500],
  ["EC-TK52-","ｴｺﾌﾟﾗｴｰｽPP",0.9,25900,null],
  ["EC-BE62-","ｴｺﾐﾗｰｴｰｼﾞｪﾝﾄ",0.7,26880,null],
  ["EC-ME59-","ｴｺﾐﾗｰｴｰｼﾞｪﾝﾄ",0.7,null,254800],
  ["EC-TE62-","ｴｺﾐﾗｰｴｰｼﾞｪﾝﾄ",0.7,26880,null],
  ["EC-MM82-","ｴｺﾐﾗｰｴｰｼﾞｪﾝﾄ BC",0.75,27700,null],
  ["EC-MT62-","ｴｺﾐﾗｰｴｰｼﾞｪﾝﾄ TC",0.9,26700,null],
  ["EC-GB31-","ｴｺﾒﾀﾙﾄﾞ",0.85,27200,31300],
  ["EC-GM62-M","ｴｺﾒﾀﾙﾄﾞ",0.65,null,32600],
  ["EC-GM62-","ｴｺﾒﾀﾙﾄﾞ",0.8,24600,24600],
  ["EC20-","ｴｺﾘﾙｺﾝ",0.9,18300,18800],
  ["BI-P79-","ｺｰｷﾝ ﾊｲｳﾚｯｸｽP",0.9,42600,null],
  ["BI-B20-","ｺｰｷﾝ ﾘﾙｺﾝB",0.65,48900,null],
  ["8954-","ｽｰﾊﾟｰﾌﾟﾗｲﾏｰ",0.6,33600,null],
  ["NY79-","ﾅｲﾃｯｸ",0.85,21500,23200],
  ["NW62-","ﾈｵｳﾚｯｸｽ",0.9,20300,null],
  ["NW79-","ﾈｵｳﾚｯｸｽ",0.9,18200,19300],
  ["BC74-","ﾈｵﾁｬｸﾛﾝ",0.8,18400,19500],
  ["N783-","ﾈｵﾋﾟｰﾁｽｷﾝ",0.4,58000,60000],
  ["N781-","ﾈｵﾗﾊﾞｻﾝ",0.55,48000,50000],
  ["TA64-","ﾈｵﾗﾊﾞｻﾝ",0.55,50000,52000],
  ["NS781-","ﾈｵﾗﾊﾞｻﾝｿﾌﾄ",0.55,50000,52000],
  ["NT781-","ﾈｵﾗﾊﾞﾛﾝ",0.55,50000,52000],
  ["X717-","ﾉﾘｻﾞｲﾝ",0.9,20600,21700],
  ["CH79-","ﾊｲｳﾚｯｸｽCH",0.7,28000,32000],
  ["M79-","ﾊｲｳﾚｯｸｽM",0.9,18700,19800],
  ["GS62-","ﾊｲｳﾚｯｸｽP",0.8,29700,null],
  ["NP79-","ﾊｲｳﾚｯｸｽP",0.75,null,25500],
  ["P79-","ﾊｲｳﾚｯｸｽP",0.85,20000,23500],
  ["UNP79-","ﾊｲｳﾚｯｸｽP",0.7,null,25500],
  ["GP79-","ﾊｲｳﾚｯｸｽP ｸﾞﾗﾝﾃﾞﾎﾞﾇｰﾙ",0.6,null,30300],
  ["GPX79-","ﾊｲｳﾚｯｸｽP ｸﾞﾗﾝﾃﾞﾎﾞﾇｰﾙ",0.6,null,30300],
  ["KNP79-","ﾊｲｳﾚｯｸｽP ﾎﾞﾇｰﾙﾄｰﾝ",0.8,null,26700],
  ["LP79-","ﾊｲｳﾚｯｸｽP ﾚｰｻﾞｰｶｯﾄﾖｳ",0.8,22200,25500],
  ["NLP79-","ﾊｲｳﾚｯｸｽP ﾚｰｻﾞｰｶｯﾄﾖｳ",0.7,null,25500],
  ["YM79-SN","ﾊｲｳﾚｯｸｽYM",0.9,21900,null],
  ["N894-","ﾊﾟﾅｺPA",0.6,33600,null],
  ["855-","ﾊﾟﾅｺSMG",0.75,28000,null],
  ["736-","ﾌﾟﾗｴｰｽ",0.8,21300,24500],
  ["A716-","ﾌﾟﾗｴｰｽ",0.9,17500,18600],
  ["BS716-","ﾌﾟﾗｴｰｽ",0.8,null,26000],
  ["H716-","ﾌﾟﾗｴｰｽ",0.9,21400,null],
  ["K716-","ﾌﾟﾗｴｰｽ",0.9,17500,18600],
  ["LS716-","ﾌﾟﾗｴｰｽ ﾚｻﾞｰｻﾃﾝ",0.9,20800,27600],
  ["OK20-","ﾎﾟﾘｷﾝｸﾞ",0.9,15800,16900],
  ["GR33-","ﾒﾀﾙﾄﾞ",0.9,22000,22000],
  ["HB20-","ﾘﾙｺﾝ ﾀﾚﾝﾄﾞ",0.9,21600,null],
  ["B20-","ﾘﾙｺﾝB",0.9,14800,15800],
  ["TB20-","ﾘﾙｺﾝB",0.9,19400,null],
  ["KN20-","ﾘﾙｺﾝB ﾎﾞﾇｰﾙﾄｰﾝ",0.9,null,17800],
  ["LL20-","ﾘﾙｺﾝLL",0.9,14800,15800],
  ["M773-","ﾜﾝﾀﾞｰﾄﾝM",0.75,23800,24900]
];

function makeSampleQuote(products){
  const today = new Date();
  return {
    id: uid(),
    number: "№１－１",
    date: toDateInputValue(today),
    customerCompany: "株式会社　スリードリーム",
    customerPerson: "高沢",
    officeIndex: 0,
    theme: "",
    deliveryDate: "従来通り",
    deliveryPlace: "従来通り",
    tradeTerms: "従来通り",
    validPeriod: "発行後6カ月間",
    items: [
      { code: products[0].code, name: products[0].name, capacity: 16, unit: "Kg", unitPrice: 43600, note: "(国内缶)" },
      { code: products[0].code, name: products[0].name, capacity: 4, unit: "Kg", unitPrice: 21400, note: "(国内缶)" },
      { code: products[1].code, name: products[1].name, capacity: 16, unit: "Kg", unitPrice: 35600, note: "(国内缶)" },
      { code: products[1].code, name: products[1].name, capacity: 4, unit: "Kg", unitPrice: 18400, note: "(国内缶)" },
      { code: products[2].code, name: products[2].name, capacity: 16, unit: "Kg", unitPrice: 35800, note: "(国内缶)" },
      { code: products[2].code, name: products[2].name, capacity: 4, unit: "Kg", unitPrice: 18500, note: "(国内缶)" },
      { code: products[3].code, name: products[3].name, capacity: 16, unit: "Kg", unitPrice: 46900, note: "(国内缶)" },
      { code: products[3].code, name: products[3].name, capacity: 4, unit: "Kg", unitPrice: 22600, note: "(国内缶)" },
      { code: products[4].code, name: products[4].name, capacity: 16, unit: "Kg", unitPrice: 26600, note: "(国内缶)" },
      { code: products[4].code, name: products[4].name, capacity: 4, unit: "Kg", unitPrice: 15000, note: "(国内缶)" }
    ],
    remarks: DEFAULT_REMARKS,
    toning: DEFAULT_TONING,
    toningEnabled: true,
    trialSheetNote: "",
    freightNotes: DEFAULT_FREIGHT.slice(),
    seals: [null, null, null],
    createdAt: today.toISOString(),
    updatedAt: today.toISOString()
  };
}

function defaultLineCodes(){
  return DEFAULT_LINE_CODES_RAW.map(([code,name,newIndex,minEnamel16,minMetallic16])=>(
    { id: uid(), code, name, newIndex, minEnamel16: minEnamel16||null, minMetallic16: minMetallic16||null }
  ));
}

/* 販売店リスト.xlsx より: [得意先コード, 会社名] */
const DEFAULT_DEALERS_RAW = [
["3","有限会社　池田塗料店"],
["6","株式会社　オオイ　千葉営業所"],
["7","株式会社　オオイ　東京営業所"],
["8","【休眠】扇屋塗料株式会社　埼玉営業所"],
["10","扇屋塗料株式会社　東京営業所"],
["11","オーウエル株式会社　群馬営業所"],
["13","株式会社　板通　高崎支店"],
["16","株式会社　エビナ"],
["24","株式会社　アサヅマ"],
["25","扇屋塗料株式会社"],
["29","株式会社　オカジマ"],
["33","オーウエル株式会社　つくば営業所"],
["37","オーウエル株式会社　国際営業部　国際グループ"],
["38","石井塗料株式会社"],
["43","オーウエル株式会社　丸亀営業所"],
["44","オーウエル株式会社　尾道・福山営業所"],
["45","石狩ペイント株式会社"],
["48","カナリア産業株式会社　水島営業所"],
["50","オーウエル株式会社　埼玉営業所"],
["58","オーウエル株式会社　名古屋営業所"],
["62","オーウエル株式会社　下松営業所"],
["63","オーウエル株式会社　広島営業所"],
["65","オーウエル株式会社　水島営業所"],
["66","カナリア産業株式会社　姫路営業所"],
["68","オーウエル株式会社"],
["70","【休眠】オーウエル株式会社　栃木営業所"],
["73","オーウエル株式会社　千葉営業所"],
["74","オーウエル株式会社　仙台営業所"],
["76","オーウエル株式会社　北九州営業所"],
["83","（３４８）株式会社　アイテック"],
["84","株式会社　大川"],
["85","オーウエル株式会社　和歌山事務所"],
["87","株式会社　大江"],
["88","オーウエル株式会社　三河営業所"],
["105","株式会社　小島範三郎商店"],
["107","加藤株式会社"],
["108","亀谷塗料株式会社"],
["113","株式会社　東海理化クリエイト　工業資材営業部"],
["115","株式会社　栗山商店"],
["116","久野塗料株式会社"],
["119","株式会社　熊野屋"],
["125","株式会社　小島商会"],
["130","【休眠】小柳商事株式会社"],
["133","岸田塗料株式会社"],
["136","岸田塗料株式会社 市岡営業所"],
["145","株式会社　川柳商店"],
["155","【休眠】株式会社　協立塗料商会（大阪市）"],
["156","小柳商事株式会社　横浜営業所"],
["159","株式会社川柳商店　静岡営業所"],
["161","ケミサンクコーポレーション株式会社"],
["165","株式会社　小松塗料商会"],
["169","キクチカラー株式会社　本社"],
["170","株式会社　コイデ"],
["201","株式会社　斎藤塗料"],
["203","有限会社　佐久間商店"],
["204","有限会社　三恵塗料商事"],
["205","株式会社　三和塗料"],
["210","株式会社　親和 (本社)"],
["213","株式会社　シモダ"],
["215","三枝塗料株式会社(本社)"],
["220","株式会社　昭和　東京営業所"],
["221","株式会社　昭和　群馬営業所"],
["224","杉村塗料株式会社　福島支店"],
["225","佐野塗料株式会社"],
["232","下田通商株式会社　東京営業所"],
["233","株式会社　スリードリーム"],
["238","昭和通商株式会社"],
["239","杉村塗料株式会社(本社)"],
["241","島田塗料株式会社"],
["246","三共商事株式会社　埼玉営業所"],
["248","有限会社　須賀調色センター"],
["254","昭和通商株式会社　静岡支店"],
["255","昭和通商株式会社　福島支店"],
["257","昭和通商株式会社　神奈川支店"],
["258","株式会社　スガタ商事　山形営業所"],
["259","株式会社　親和　郡山営業所"],
["260","株式会社　昭和　神奈川営業所"],
["261","株式会社　阪上商店"],
["268","三京塗料株式会社　九州営業所"],
["270","三京塗料株式会社　相模原営業所"],
["271","三京塗料株式会社　栃木営業所"],
["276","三枝塗料株式会社　岡谷営業所"],
["277","三枝塗料株式会社　東北信営業所　上田グループ"],
["278","三枝塗料株式会社　飯田営業所"],
["279","三枝塗料株式会社　東北信営業所　長野グループ"],
["280","株式会社　三王　埼玉支店"],
["281","三和商工株式会社"],
["282","株式会社 関水金属"],
["287","三晃化成　株式会社"],
["289","株式会社　スガタ商事"],
["291","三共塗料株式会社"],
["292","株式会社　親和　鈴鹿営業所"],
["293","株式会社　サンライト（世田谷）"],
["300","三恵　株式会社"],
["301","太陽鉛筆株式会社"],
["312","ＤＴ　竹屋塗料株式会社"],
["315","トキワケミカル株式会社"],
["318","東邦化成株式会社（１１０４）"],
["319","【休眠】株式会社　リンペイ"],
["321","第一ペイント株式会社"],
["325","テーオー塗料株式会社"],
["327","東邦化成工業株式会社"],
["332","田辺塗料株式会社"],
["333","株式会社　大和産商"],
["341","タクボエンジニアリング 株式会社"],
["348","大東産業株式会社"],
["357","株式会社　ダイワ　埼玉支店"],
["359","株式会社　ダイワ　仙台支店"],
["360","株式会社　ダイワ　新潟支店"],
["361","株式会社　ダイワ　厚木営業所"],
["364","株式会社　ダイワ　東京支店"],
["371","株式会社　ツジタケ　営業部"],
["375","ナガセケミカル株式会社"],
["377","【休眠】豊田通商株式会社 自動車材料第一部 総合資材グループ"],
["381","株式会社　ﾃｨｰｼｰｲｰｺｰﾎﾟﾚｰｼｮﾝ"],
["413","株式会社　ニシイ　関東営業所"],
["416","西東京ケミックス株式会社　国内営業部"],
["427","株式会社　ニシイ　東熊本センター"],
["428","株式会社　ニシイ　熊本営業所"],
["432","株式会社　ニシイ　久留米営業所"],
["433","株式会社　ニシイ　ＡＺショップ"],
["435","有限会社　二瓶商店"],
["436","株式会社　ニシイ　大分営業所"],
["438","株式会社  成瀬塗料"],
["439","株式会社　ニシイ　苅田営業所"],
["441","株式会社　ニシイ　直方営業所"],
["442","株式会社　ニシイ　福岡支店第二グループ"],
["503","不二化成品株式会社　沼津事業所"],
["515","【休眠】日之丸塗料株式会社"],
["516","日之丸塗料株式会社 北関東支店"],
["518","原田塗料株式会社"],
["523","藤野商事株式会社"],
["527","不二化成品株式会社　浜松事業所"],
["528","富士塗料興業株式会社(本社）"],
["532","フタバペイント株式会社"],
["535","富士塗料興業株式会社　北上営業所"],
["536","富士塗料興業株式会社　山形営業所"],
["537","富士塗料興業株式会社　郡山支店"],
["538","不二化成品株式会社　清水事業所"],
["602","萬座塗料株式会社　高崎営業所"],
["603","萬座塗料株式会社　東京営業所"],
["604","松原塗料株式会社"],
["606","萬座塗料株式会社　名古屋営業所"],
["609","守田屋塗料株式会社"],
["610","丸加塗料株式会社"],
["614","株式会社モリヤマ"],
["616","松崎化成株式会社(本社)"],
["625","槙田塗料店"],
["633","株式会社　松永商店"],
["639","萬座塗料株式会社　浜松営業所"],
["640","萬座塗料株式会社　厚木営業所"],
["641","萬座塗料株式会社　郡山営業所"],
["643","松崎化成株式会社　浜松支店"],
["648","萬座塗料株式会社　下館営業所"],
["661","萬座塗料株式会社　九州営業所"],
["709","高崎ユ―キ塗料株式会社"],
["710","友和塗料株式会社　東京営業所"],
["717","株式会社　ユーバン"],
["719","友和塗料株式会社　群馬営業所"],
["720","友和塗料株式会社　静岡営業所"],
["721","友和塗料株式会社　岡崎営業所"],
["722","友和塗料株式会社　九州営業所"],
["723","株式会社　ユノカワ　"],
["724","三京塗料株式会社　広島営業所"],
["725","株式会社　ニシイ　佐世保営業所"],
["726","株式会社　レスターサプライチェーンソリューション"],
["727","シナノア株式会社"],
["805","株式会社　リンペイ　いわき支店"],
["999","雑口"]
];
const DEALER_DATALIST_OPTIONS_HTML = DEFAULT_DEALERS_RAW.map(([code,name])=>
  `<option value="${escapeHtml(name)}" label="${escapeHtml(code)} - ${escapeHtml(name)}"></option>`
).join("");

function defaultData(){
  const products = SAMPLE_PRODUCTS.map(p => ({ id: uid(), ...p }));
  return {
    version: 1,
    settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)),
    products: products,
    lineCodes: defaultLineCodes(),
    quotes: [ makeSampleQuote(products) ],
    activeQuoteId: null,
    lastSealName: "",
    backups: []
  };
}

/* ---------- ユーティリティ ---------- */
function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,8); }
function roundUp10(v){ return Math.ceil(v/10)*10; }
function roundUp100(v){ return Math.ceil(v/100)*100; }
function unitForName(name){ return /シンナー|ｼﾝﾅｰ|thinner/i.test(name||"") ? "L" : "Kg"; }
function isThinnerProduct(p){
  if(typeof p === "string") return /シンナー|ｼﾝﾅｰ|thinner/i.test(p);
  return /シンナー|ｼﾝﾅｰ|thinner/i.test((p && p.name) || "") || /シンナー|ｼﾝﾅｰ|thinner/i.test((p && p.note) || "");
}
function yen(v){
  if (v === null || v === undefined || v === "") return "";
  const n = Number(v);
  if (Number.isNaN(n)) return "";
  return "¥" + n.toLocaleString("ja-JP");
}
function escapeHtml(s){
  return String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function nl2br(s){ return escapeHtml(s).replace(/\n/g, "<br>"); }
function toDateInputValue(d){
  const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,"0"), day=String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}
function formatDateJp(isoDate){
  if(!isoDate) return "";
  const [y,m,d] = isoDate.split("-");
  if(!y) return "";
  return `${y}年${Number(m)}月${Number(d)}日`;
}
function formatDateTimeJp(iso){
  const d = new Date(iso);
  return `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}`;
}
function formatDateDots(iso){
  const d = new Date(iso);
  const p = n => String(n).padStart(2,"0");
  return `${d.getFullYear()}.${p(d.getMonth()+1)}.${p(d.getDate())}`;
}
function sealStampInnerHTML(seal){
  const hasDept = !!seal.dept;
  return `
    ${hasDept ? `<div class="st-dept">${escapeHtml(seal.dept)}</div>` : ""}
    <div class="st-date ${hasDept?"st-line-top":""} st-line-bottom">${formatDateDots(seal.sealedAt)}</div>
    <div class="st-name">${escapeHtml(seal.name)}</div>`;
}

let toastTimer = null;
function toast(msg, isError){
  let el = document.querySelector(".toast");
  if(!el){ el = document.createElement("div"); el.className="toast"; document.body.appendChild(el); }
  el.textContent = msg;
  el.classList.toggle("error", !!isError);
  requestAnimationFrame(()=> el.classList.add("show"));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=> el.classList.remove("show"), 2600);
}

/* ---------- 永続化 ---------- */
const TRASH_RETENTION_DAYS = 30;
const TRASH_RETENTION_MS = TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;
const BACKUP_RETENTION_DAYS = 14;
const BACKUP_RETENTION_MS = BACKUP_RETENTION_DAYS * 24 * 60 * 60 * 1000;
const BACKUP_HOUR = 16;
function localDateKey(d){
  return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
}
function snapshotOf(data){
  // 商品データファイル連携中は、商品データ自体がファイルとして既にバックアップされているため、
  // 日次/手動バックアップのスナップショットには含めない（巨大な配列を毎回複製しない）
  const snap = {
    settings: data.settings, products: Store.productFileActive ? [] : data.products, lineCodes: data.lineCodes,
    quotes: data.quotes, activeQuoteId: data.activeQuoteId, lastSealName: data.lastSealName
  };
  return JSON.parse(JSON.stringify(snap));
}

const Store = {
  data: null,
  productFileHandle: null,
  productFileActive: false,
  pendingProductFileHandle: null,
  load(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(raw){ this.data = JSON.parse(raw); this.migrate(); }
      else { this.data = defaultData(); this.save(); }
    }catch(e){
      console.error("load failed", e);
      this.data = defaultData();
    }
    this.purgeExpiredTrash();
    this.checkDailyBackup();
    return this.data;
  },
  migrate(){
    const d = this.data;
    if(!d.settings) d.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    if(!d.products) d.products = [];
    if(!d.quotes) d.quotes = [];
    if(!d.lineCodes) d.lineCodes = defaultLineCodes();
    if(!d.backups) d.backups = [];
    for(const k in DEFAULT_SETTINGS){ if(!(k in d.settings)) d.settings[k] = DEFAULT_SETTINGS[k]; }
    if(!d.settings.offices || !d.settings.offices.length) d.settings.offices = JSON.parse(JSON.stringify(DEFAULT_SETTINGS.offices));
    if(!d.settings.indices || !d.settings.indices.length) d.settings.indices = DEFAULT_SETTINGS.indices.slice();
    if(!d.settings.sealNames || !d.settings.sealNames.length) d.settings.sealNames = JSON.parse(JSON.stringify(DEFAULT_SETTINGS.sealNames));
    if(typeof d.lastSealName !== "string") d.lastSealName = "";
    d.quotes.forEach(q=>{
      if(!q.seals) q.seals=[null,null,null];
      if(!q.freightNotes) q.freightNotes=DEFAULT_FREIGHT.slice();
      if(q.toningEnabled===undefined) q.toningEnabled=true;
      if(q.trialSheetNote===undefined) q.trialSheetNote="";
      if(q.officeIndex===undefined) q.officeIndex=0;
      if(q.deletedAt===undefined) q.deletedAt=null;
      (q.items||[]).forEach(it=>{ if(unitForName(it.name)==="L" && it.unit!=="L") it.unit="L"; });
    });
  },
  purgeExpiredTrash(){
    const now = Date.now();
    const before = this.data.quotes.length;
    this.data.quotes = this.data.quotes.filter(q=>{
      if(!q.deletedAt) return true;
      return (now - new Date(q.deletedAt).getTime()) < TRASH_RETENTION_MS;
    });
    if(this.data.quotes.length !== before) this.save();
  },
  purgeOldBackups(){
    const now = Date.now();
    const before = this.data.backups.length;
    this.data.backups = this.data.backups.filter(b=> (now - new Date(b.createdAt).getTime()) < BACKUP_RETENTION_MS);
    return this.data.backups.length !== before;
  },
  checkDailyBackup(){
    const now = new Date();
    let changed = this.purgeOldBackups();
    if(now.getHours() >= BACKUP_HOUR){
      const dateKey = localDateKey(now);
      const already = this.data.backups.some(b=> b.dateKey===dateKey && !b.manual);
      if(!already){
        this.data.backups.push({ id: uid(), dateKey, createdAt: now.toISOString(), manual:false, snapshot: snapshotOf(this.data) });
        changed = true;
      }
    }
    if(changed) this.save();
  },
  createManualBackup(){
    const now = new Date();
    this.data.backups.push({ id: uid(), dateKey: localDateKey(now), createdAt: now.toISOString(), manual:true, snapshot: snapshotOf(this.data) });
    this.purgeOldBackups();
    this.save();
  },
  restoreBackup(id){
    const b = this.data.backups.find(x=>x.id===id);
    if(!b) return false;
    const snap = JSON.parse(JSON.stringify(b.snapshot));
    this.data.settings = snap.settings;
    // 商品データファイル連携中は、スナップショットの商品データ（空）で現在のデータを消さない
    if(!this.productFileActive) this.data.products = snap.products;
    this.data.lineCodes = snap.lineCodes;
    this.data.quotes = snap.quotes;
    this.data.activeQuoteId = snap.activeQuoteId;
    this.data.lastSealName = snap.lastSealName;
    this.save();
    return true;
  },
  async save(){
    if(this.productFileActive && this.productFileHandle){
      try{ await writeProductsToFile(this.productFileHandle, this.data.products); }
      catch(e){
        console.error("product file save failed", e);
        // ファイルへの書き込みに失敗した場合、products を localStorage から除外したままにすると
        // データがどこにも保存されずに消えてしまう。ファイル連携を切り離し、
        // 「再連携が必要」な状態に戻した上で、products も含めてlocalStorageに退避する。
        this.pendingProductFileHandle = this.productFileHandle;
        this.productFileHandle = null;
        this.productFileActive = false;
        toast("商品データファイルへの保存に失敗しました。ファイルとの連携が切れたため、いったんブラウザ内に保存します。「今すぐ再連携」から接続し直してください", true);
        if(typeof App !== "undefined" && App.view === "products") App.render();
      }
    }
    try{
      const payload = this.productFileActive ? Object.assign({}, this.data, { products: [] }) : this.data;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    }catch(e){ console.error("save failed", e); toast("保存に失敗しました（ブラウザのストレージ上限の可能性があります）", true); }
  }
};

/* ---------- 価格計算ロジック（新試算表シートの数式を再現） ---------- */
function calcPriceCandidates(costPerKg, settings, recommendedIndex){
  const s = settings;
  const gBase = ((Number(costPerKg)||0) + s.manufacturingCostPerKg) * s.baseContainerKg + s.canFeeBase;
  const hBase = gBase * (1 + s.sgaRate);
  let indices = s.indices.slice();
  if(recommendedIndex != null && !indices.some(i=>Math.abs(i-recommendedIndex)<1e-9)){
    indices = [...indices, recommendedIndex].sort((a,b)=>a-b);
  }
  const isRecommended = idx => recommendedIndex != null && Math.abs(idx-recommendedIndex) < 1e-9;
  const baseCandidates = indices.map(idx => ({ index: idx, price: idx > 0 ? roundUp10(hBase/idx) : 0, recommended: isRecommended(idx) }));
  const smallCandidates = baseCandidates.map(c => ({
    index: c.index,
    price: roundUp10( (c.price / s.baseContainerKg) * (s.smallContainerKg + s.smallAddKg) + s.smallAddFee ),
    recommended: c.recommended
  }));
  const bigCandidates = baseCandidates.map(c => ({
    index: c.index,
    price: roundUp10( (c.price / s.baseContainerKg) * s.bigContainerKg + s.bigAddFee ),
    recommended: c.recommended
  }));
  return { gBase, hBase, base: baseCandidates, small: smallCandidates, big: bigCandidates };
}
function approvalLevel(index, settings){
  const maxNormal = Math.max(...settings.indices);
  if(index <= maxNormal + 1e-9) return null;
  if(index <= settings.managerApprovalIndex + 1e-9) return "課長判断が必要です";
  return "副部長以上の判断が必要です";
}

/* ---------- ラインコード（新指数・最低価格）マッチング ---------- */
function extractParenCodes(productCode){
  const text = productCode || "";
  const re = /[(（]([^)）]*)[)）]/g;
  const out = [];
  let m;
  while((m = re.exec(text))){
    const inner = m[1].trim();
    if(inner) out.push(inner);
  }
  return out;
}
function normalizeForSearch(s){
  // 検索時に全角/半角の違いを無視するため、NFKCで正規化する
  // （全角英数字→半角、半角カタカナ→全角カタカナに揃う）
  return String(s||"").normalize("NFKC").toLowerCase();
}
function matchLineCode(productCode, lineCodes){
  const code = (productCode||"").trim();
  // 品番本体だけでなく、括弧内に記載されたラインコード（例: SP26-11641（GR33-））も候補にする
  const candidates = [code, ...extractParenCodes(code)];
  let best = null;
  for(const lc of (lineCodes||[])){
    if(!lc.code) continue;
    for(const cand of candidates){
      if(cand.startsWith(lc.code) && (!best || lc.code.length > best.code.length)) best = lc;
    }
  }
  return best;
}
function lineHintHtml(code){
  const lm = matchLineCode(code, Store.data.lineCodes);
  if(!lm) return "";
  return `推奨指数 <strong>${lm.newIndex}</strong>（${escapeHtml(lm.name)}・${escapeHtml(lm.code)}）`;
}
/* 特価/標準価格マスタでは「0」が「未設定」の意味で使われているため、0円は実際の記録された価格とみなさない */
function hasRecordedPrice(v){
  return v!==undefined && v!=="" && Number(v)!==0;
}
function findSpecialPriceEntry(code, client, capacityKg){
  const trimmedCode = (code||"").trim();
  return Store.data.products.find(x=>
    x.code.trim()===trimmedCode &&
    (x.client||"")===(client||"") &&
    Number(x.specialKg)===Number(capacityKg) &&
    hasRecordedPrice(x.specialPrice)
  );
}
/* ---------- 硬化剤（基準容量4KG・小容量1KG）専用ロジック ---------- */
function isHardener(p){
  if(typeof p === "string") return /硬化剤/.test(p);
  return /硬化剤/.test((p && p.name) || "") || /硬化剤/.test((p && p.note) || "");
}
function coreClientName(name){
  const s = (name||"").replace(/【[^】]*】/g, "");
  const tokens = s.split(/[　\s]+/).filter(Boolean);
  const isLegalEntityToken = t => /^(株式会社|有限会社|合同会社|㈱|\(株\)|（株）)$/.test(t);
  const isBranchToken = t => /(営業所|支店|支社|工場|出張所|事業所|センター)$/.test(t);
  return tokens.filter(t => !isLegalEntityToken(t) && !isBranchToken(t)).join("");
}
function isSimilarClientName(a, b){
  const ca = coreClientName(a), cb = coreClientName(b);
  if(!ca || !cb) return false;
  return ca===cb || ca.includes(cb) || cb.includes(ca);
}
/* 指定の品番・容量について、標準価格と、取引先名が似ている取引先（他支店等）の特価を、それぞれ候補として全て返す */
function findSimilarClientPriceCandidates(code, capacityKg, client){
  const trimmedCode = (code||"").trim();
  const results = [];
  const std = Store.data.products.find(x=>
    x.code.trim()===trimmedCode && Number(x.specialKg)===Number(capacityKg) &&
    hasRecordedPrice(x.standardPrice)
  );
  if(std) results.push({ price: Number(std.standardPrice), label: "標準価格" });
  const seen = new Set();
  Store.data.products.forEach(x=>{
    if(x.code.trim()!==trimmedCode || Number(x.specialKg)!==Number(capacityKg)) return;
    if(!hasRecordedPrice(x.specialPrice)) return;
    if((x.client||"")===(client||"")) return;
    if(!isSimilarClientName(x.client, client)) return;
    const key = (x.client||"")+"|"+x.specialPrice;
    if(seen.has(key)) return;
    seen.add(key);
    results.push({ price: Number(x.specialPrice), label: `${x.client||"取引先"}の特価` });
  });
  return results;
}
/* 4KGの硬化剤から1KGの価格候補を探す（標準価格＋取引先名が似ている取引先の特価） */
function findHardener1kgCandidates(p){
  return findSimilarClientPriceCandidates(p.code, 1, p.client);
}
function getMinPrice(product, lineMatch, capacityKg, settings){
  if(capacityKg === settings.smallContainerKg) return settings.minPrice4kg || 0;
  if(!lineMatch || capacityKg !== settings.baseContainerKg) return 0;
  const note = (product && product.note) || "";
  const isMetallic = /メタリック/.test(note);
  const isEnamel = /エナメル/.test(note);
  if(isMetallic && lineMatch.minMetallic16) return lineMatch.minMetallic16;
  if(isEnamel && lineMatch.minEnamel16) return lineMatch.minEnamel16;
  return Math.max(lineMatch.minEnamel16||0, lineMatch.minMetallic16||0);
}

/* ---------- CSV パース / 生成 ---------- */
function parseCsv(text){
  text = text.replace(/^﻿/, "");
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for(let i=0;i<text.length;i++){
    const c = text[i];
    if(inQuotes){
      if(c === '"'){
        if(text[i+1] === '"'){ field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if(c === '"') inQuotes = true;
      else if(c === ","){ row.push(field); field=""; }
      else if(c === "\n"){ row.push(field); rows.push(row); row=[]; field=""; }
      else if(c === "\r"){ /* skip */ }
      else field += c;
    }
  }
  if(field.length || row.length){ row.push(field); rows.push(row); }
  return rows.filter(r => r.some(f => f !== ""));
}
function toCsvField(v){
  v = String(v ?? "");
  if(/[",\n]/.test(v)) return '"' + v.replace(/"/g,'""') + '"';
  return v;
}
function buildProductsCsv(products){
  const header = ["品番","品名","Kg","特価","取引先","原価","標準価格","備考"];
  const lines = [header.map(toCsvField).join(",")];
  for(const p of products){
    lines.push([p.code, p.name, p.specialKg??"", p.specialPrice??"", p.client||"", p.costPerKg, p.standardPrice??"", p.note||""].map(toCsvField).join(","));
  }
  return "﻿" + lines.join("\r\n");
}
function downloadFile(filename, content, mime){
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(()=>{ document.body.removeChild(a); URL.revokeObjectURL(url); }, 500);
}

/* ---------- 共有フォルダ（File System Access API）---------- */
const FS_ACCESS_SUPPORTED = typeof window.showDirectoryPicker === "function";
const DIR_HANDLE_DB_NAME = "mitsumoriApp_dirHandles";
const DIR_HANDLE_STORE = "handles";
const DIR_HANDLE_KEY = "quotesExportFolder";

function openHandleDb(){
  return new Promise((resolve, reject)=>{
    const req = indexedDB.open(DIR_HANDLE_DB_NAME, 1);
    req.onupgradeneeded = ()=> req.result.createObjectStore(DIR_HANDLE_STORE);
    req.onsuccess = ()=> resolve(req.result);
    req.onerror = ()=> reject(req.error);
  });
}
async function saveDirHandle(handle){
  const db = await openHandleDb();
  return new Promise((resolve, reject)=>{
    const tx = db.transaction(DIR_HANDLE_STORE, "readwrite");
    tx.objectStore(DIR_HANDLE_STORE).put(handle, DIR_HANDLE_KEY);
    tx.oncomplete = ()=> resolve();
    tx.onerror = ()=> reject(tx.error);
  });
}
async function loadDirHandle(){
  const db = await openHandleDb();
  return new Promise((resolve, reject)=>{
    const tx = db.transaction(DIR_HANDLE_STORE, "readonly");
    const req = tx.objectStore(DIR_HANDLE_STORE).get(DIR_HANDLE_KEY);
    req.onsuccess = ()=> resolve(req.result || null);
    req.onerror = ()=> reject(req.error);
  });
}
async function clearDirHandle(){
  const db = await openHandleDb();
  return new Promise((resolve, reject)=>{
    const tx = db.transaction(DIR_HANDLE_STORE, "readwrite");
    tx.objectStore(DIR_HANDLE_STORE).delete(DIR_HANDLE_KEY);
    tx.oncomplete = ()=> resolve();
    tx.onerror = ()=> reject(tx.error);
  });
}
async function ensureDirPermission(handle){
  const opts = { mode: "readwrite" };
  if((await handle.queryPermission(opts)) === "granted") return true;
  if((await handle.requestPermission(opts)) === "granted") return true;
  return false;
}

/* ---------- 商品データファイル（特価/原価管理リストの永続化先、File System Access API）---------- */
const PRODUCT_FILE_HANDLE_KEY = "productDataFile";
async function saveProductFileHandle(handle){
  const db = await openHandleDb();
  return new Promise((resolve, reject)=>{
    const tx = db.transaction(DIR_HANDLE_STORE, "readwrite");
    tx.objectStore(DIR_HANDLE_STORE).put(handle, PRODUCT_FILE_HANDLE_KEY);
    tx.oncomplete = ()=> resolve();
    tx.onerror = ()=> reject(tx.error);
  });
}
async function loadProductFileHandle(){
  const db = await openHandleDb();
  return new Promise((resolve, reject)=>{
    const tx = db.transaction(DIR_HANDLE_STORE, "readonly");
    const req = tx.objectStore(DIR_HANDLE_STORE).get(PRODUCT_FILE_HANDLE_KEY);
    req.onsuccess = ()=> resolve(req.result || null);
    req.onerror = ()=> reject(req.error);
  });
}
async function clearProductFileHandle(){
  const db = await openHandleDb();
  return new Promise((resolve, reject)=>{
    const tx = db.transaction(DIR_HANDLE_STORE, "readwrite");
    tx.objectStore(DIR_HANDLE_STORE).delete(PRODUCT_FILE_HANDLE_KEY);
    tx.oncomplete = ()=> resolve();
    tx.onerror = ()=> reject(tx.error);
  });
}
async function ensureFilePermission(handle){
  const opts = { mode: "readwrite" };
  if((await handle.queryPermission(opts)) === "granted") return true;
  if((await handle.requestPermission(opts)) === "granted") return true;
  return false;
}
// requestPermission()にはユーザー操作（クリック等）が必須。ページ読込直後は
// queryPermissionのみで確認し、まだ許可されていなければユーザー操作を待ってから
// ensureFilePermissionで再度確認する（App.armProductFileReconnect参照）。
async function queryFilePermissionSilent(handle){
  try{ return (await handle.queryPermission({ mode: "readwrite" })) === "granted"; }
  catch(e){ return false; }
}
async function readProductsFromFile(handle){
  const file = await handle.getFile();
  const text = await file.text();
  const data = JSON.parse(text);
  if(!Array.isArray(data)) throw new Error("商品データファイルの形式が正しくありません。");
  return data;
}
async function writeProductsToFile(handle, products){
  const writable = await handle.createWritable();
  await writable.write(JSON.stringify(products));
  await writable.close();
}

const QUOTES_EXPORT_TYPE = "mitsumoriApp_quotes_export";
function buildQuotesJson(quotes){
  return JSON.stringify({ type: QUOTES_EXPORT_TYPE, version: 1, exportedAt: new Date().toISOString(), quotes }, null, 2);
}
function parseQuotesJson(text){
  let data;
  try{ data = JSON.parse(text); }catch(e){ throw new Error("JSONファイルとして読み込めませんでした。"); }
  const list = Array.isArray(data) ? data : data.quotes;
  if(!Array.isArray(list)) throw new Error("見積書データの形式が正しくありません。");
  for(const q of list){
    if(!q || typeof q.id !== "string" || !Array.isArray(q.items)){
      throw new Error("見積書データの形式が正しくありません。");
    }
  }
  return list;
}

function normalizeHeaderKey(k){
  return String(k||"").trim().replace(/\s+/g,"").toLowerCase();
}
const HEADER_ALIASES = {
  code: ["品番","製品コード","製品番号","商品コード","code"],
  name: ["品名","製品名","商品名","name"],
  specialKg: ["Kg","kg","特価kg","特価Kg"],
  specialPrice: ["特価","特価(円)","特価円","specialprice"],
  client: ["取引先","顧客","得意先","client"],
  cost: ["原価","k原価","原価(円/kg)","原価円/kg","cost","costperkg"],
  standardPrice: ["標準価格","標準価格(円)","標準価格円","standardprice"],
  note: ["備考","メモ","note","remark"]
};
function mapRowsToProducts(rows){
  if(!rows.length) return [];
  const header = rows[0].map(normalizeHeaderKey);
  const colIndex = {};
  for(const key in HEADER_ALIASES){
    for(const alias of HEADER_ALIASES[key]){
      const idx = header.indexOf(normalizeHeaderKey(alias));
      if(idx !== -1){ colIndex[key] = idx; break; }
    }
  }
  if(colIndex.code === undefined || colIndex.cost === undefined){
    throw new Error("見出し行に「品番」「原価」列が見つかりません。テンプレートをご確認ください。");
  }
  const out = [];
  for(let i=1;i<rows.length;i++){
    const r = rows[i];
    const code = (r[colIndex.code]||"").trim();
    if(!code) continue;
    const specialKgRaw = colIndex.specialKg !== undefined ? String(r[colIndex.specialKg]||"").replace(/[¥,\s]/g,"") : "";
    const specialPriceRaw = colIndex.specialPrice !== undefined ? String(r[colIndex.specialPrice]||"").replace(/[¥,\s]/g,"") : "";
    const standardPriceRaw = colIndex.standardPrice !== undefined ? String(r[colIndex.standardPrice]||"").replace(/[¥,\s]/g,"") : "";
    out.push({
      id: uid(),
      code,
      name: colIndex.name !== undefined ? (r[colIndex.name]||"").trim() : "",
      specialKg: specialKgRaw !== "" ? (Number(specialKgRaw)||0) : "",
      specialPrice: specialPriceRaw !== "" ? (Number(specialPriceRaw)||0) : "",
      client: colIndex.client !== undefined ? (r[colIndex.client]||"").trim() : "",
      costPerKg: Number(String(r[colIndex.cost]||"0").replace(/[¥,\s]/g,"")) || 0,
      standardPrice: standardPriceRaw !== "" ? (Number(standardPriceRaw)||0) : "",
      note: colIndex.note !== undefined ? (r[colIndex.note]||"").trim() : ""
    });
  }
  return out;
}

const LINE_CODE_HEADER_ALIASES = {
  code: ["ラインコード","コード","code"],
  name: ["ライン名","名称","name"],
  newIndex: ["新指数","指数","index"],
  minEnamel16: ["最低価格エナメル16kg","エナメル16kg","最低価格(エナメル16kg)","minenamel16"],
  minMetallic16: ["最低価格メタリック16kg","メタリック16kg","最低価格(メタリック16kg)","minmetallic16"]
};
function mapRowsToLineCodes(rows){
  if(!rows.length) return [];
  const header = rows[0].map(normalizeHeaderKey);
  const colIndex = {};
  for(const key in LINE_CODE_HEADER_ALIASES){
    for(const alias of LINE_CODE_HEADER_ALIASES[key]){
      const idx = header.indexOf(normalizeHeaderKey(alias));
      if(idx !== -1){ colIndex[key] = idx; break; }
    }
  }
  if(colIndex.code === undefined || colIndex.newIndex === undefined){
    throw new Error("見出し行に「ラインコード」「新指数」列が見つかりません。テンプレートをご確認ください。");
  }
  const num = v => { const n = Number(String(v||"").replace(/[¥,\s]/g,"")); return n ? n : null; };
  const out = [];
  for(let i=1;i<rows.length;i++){
    const r = rows[i];
    const code = (r[colIndex.code]||"").trim();
    if(!code) continue;
    out.push({
      id: uid(),
      code,
      name: colIndex.name !== undefined ? (r[colIndex.name]||"").trim() : "",
      newIndex: Number(String(r[colIndex.newIndex]||"0").replace(/[,\s]/g,"")) || 0,
      minEnamel16: colIndex.minEnamel16 !== undefined ? num(r[colIndex.minEnamel16]) : null,
      minMetallic16: colIndex.minMetallic16 !== undefined ? num(r[colIndex.minMetallic16]) : null
    });
  }
  return out;
}
function buildLineCodesCsv(lineCodes){
  const header = ["ラインコード","ライン名","新指数","最低価格エナメル16kg","最低価格メタリック16kg"];
  const lines = [header.map(toCsvField).join(",")];
  for(const lc of lineCodes){
    lines.push([lc.code, lc.name, lc.newIndex, lc.minEnamel16||"", lc.minMetallic16||""].map(toCsvField).join(","));
  }
  return "﻿" + lines.join("\r\n");
}
function buildLineCodesXlsx(lineCodes){
  const rows = [["ラインコード","ライン名","新指数","最低価格エナメル16kg","最低価格メタリック16kg"]];
  for(const lc of lineCodes) rows.push([lc.code, lc.name, lc.newIndex, lc.minEnamel16||"", lc.minMetallic16||""]);
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{wch:16},{wch:24},{wch:8},{wch:16},{wch:16}];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "指数・最低価格");
  XLSX.writeFile(wb, "指数・最低価格リスト.xlsx");
}

/* ---------- MS-OFFCRYPTO（Agile暗号化）復号 ----------
   パスワード保護されたExcelファイル（Office 2010以降の既定「パスワードを使用して暗号化」形式）を
   ブラウザのWeb Crypto APIのみで復号する。SheetJS無料版は復号処理を持たないため自前実装。 */
const KNOWN_XLSX_PASSWORDS = ["marumu"];

function utf16leBytes(str){
  const out = new Uint8Array(str.length*2);
  for(let i=0;i<str.length;i++){
    const code = str.charCodeAt(i);
    out[i*2] = code & 0xFF;
    out[i*2+1] = (code>>8) & 0xFF;
  }
  return out;
}
function b64ToBytes(b64){
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) out[i] = bin.charCodeAt(i);
  return out;
}
function concatBytes(...arrs){
  let len = 0; for(const a of arrs) len += a.length;
  const out = new Uint8Array(len);
  let off = 0; for(const a of arrs){ out.set(a, off); off += a.length; }
  return out;
}
function le32Bytes(n){
  return new Uint8Array([n&0xFF, (n>>>8)&0xFF, (n>>>16)&0xFF, (n>>>24)&0xFF]);
}
const HASH_ALG_MAP = { SHA1:"SHA-1", "SHA-1":"SHA-1", SHA256:"SHA-256", "SHA-256":"SHA-256", SHA384:"SHA-384", "SHA-384":"SHA-384", SHA512:"SHA-512", "SHA-512":"SHA-512" };
async function offcryptoDigest(alg, bytes){
  const name = HASH_ALG_MAP[alg] || "SHA-512";
  return new Uint8Array(await crypto.subtle.digest(name, bytes));
}
function fixKeyLength(bytes, len){
  if(bytes.length === len) return bytes;
  if(bytes.length > len) return bytes.slice(0, len);
  const out = new Uint8Array(len);
  out.set(bytes, 0);
  out.fill(0x36, bytes.length);
  return out;
}
async function importAesCbcKey(keyBytes){
  return crypto.subtle.importKey("raw", keyBytes, { name:"AES-CBC" }, false, ["encrypt","decrypt"]);
}
/* WebCryptoのAES-CBCはPKCS7パディング検証を行うため、実データ末尾に鍵で作った
   「空文字列を暗号化した1ブロック分の正規パディング」を継ぎ足してから復号し、
   末尾の余分な平文を捨てることでパディング無しの生データを復号する。 */
async function aesCbcDecryptRaw(cryptoKey, iv, ciphertext){
  if(ciphertext.length === 0) return new Uint8Array(0);
  const lastBlock = ciphertext.length >= 16 ? ciphertext.slice(ciphertext.length-16) : iv;
  const dummy = new Uint8Array(await crypto.subtle.encrypt({ name:"AES-CBC", iv:lastBlock }, cryptoKey, new Uint8Array(0)));
  const combined = concatBytes(ciphertext, dummy);
  return new Uint8Array(await crypto.subtle.decrypt({ name:"AES-CBC", iv }, cryptoKey, combined));
}

async function decryptAgileXlsx(encryptionInfoBytes, encryptedPackageBytes, password){
  const xmlText = new TextDecoder("utf-8").decode(encryptionInfoBytes.slice(8));
  const xml = new DOMParser().parseFromString(xmlText, "application/xml");
  if(xml.getElementsByTagName("parsererror").length){
    throw new Error("EncryptionInfoの解析に失敗しました");
  }
  const keyDataEl = xml.getElementsByTagName("keyData")[0];
  const keyEncryptors = Array.from(xml.getElementsByTagName("keyEncryptor"));
  const pwEncryptor = keyEncryptors.find(el => (el.getAttribute("uri")||"").indexOf("password") !== -1);
  if(!keyDataEl || !pwEncryptor || !pwEncryptor.firstElementChild){
    throw new Error("この暗号化方式には対応していません（パスワード方式ではない可能性があります）");
  }
  const encKeyEl = pwEncryptor.firstElementChild;

  const hashAlgorithm = encKeyEl.getAttribute("hashAlgorithm") || "SHA512";
  const spinCount = parseInt(encKeyEl.getAttribute("spinCount"), 10) || 100000;
  const pwSalt = b64ToBytes(encKeyEl.getAttribute("saltValue"));
  const pwKeyBytes = (parseInt(encKeyEl.getAttribute("keyBits"), 10) || 256) / 8;
  const iv = pwSalt.slice(0, 16);

  let h = await offcryptoDigest(hashAlgorithm, concatBytes(pwSalt, utf16leBytes(password)));
  for(let i=0; i<spinCount; i++){
    h = await offcryptoDigest(hashAlgorithm, concatBytes(le32Bytes(i), h));
  }

  const BLOCK_VERIFIER_INPUT = new Uint8Array([0xfe,0xa7,0xd2,0x76,0x3b,0x4b,0x9e,0x79]);
  const BLOCK_VERIFIER_VALUE = new Uint8Array([0xd7,0xaa,0x0f,0x6d,0x30,0x61,0x34,0x4e]);
  const BLOCK_KEY_VALUE      = new Uint8Array([0x14,0x6e,0x0b,0xe7,0xab,0xac,0xd0,0xd6]);

  const keyVerifierInput = fixKeyLength(await offcryptoDigest(hashAlgorithm, concatBytes(h, BLOCK_VERIFIER_INPUT)), pwKeyBytes);
  const keyVerifierValue = fixKeyLength(await offcryptoDigest(hashAlgorithm, concatBytes(h, BLOCK_VERIFIER_VALUE)), pwKeyBytes);
  const keyKeyValue      = fixKeyLength(await offcryptoDigest(hashAlgorithm, concatBytes(h, BLOCK_KEY_VALUE)), pwKeyBytes);

  const verifierHashInput = await aesCbcDecryptRaw(await importAesCbcKey(keyVerifierInput), iv, b64ToBytes(encKeyEl.getAttribute("encryptedVerifierHashInput")));
  const verifierHashValue = await aesCbcDecryptRaw(await importAesCbcKey(keyVerifierValue), iv, b64ToBytes(encKeyEl.getAttribute("encryptedVerifierHashValue")));
  const verifierHashInputHash = await offcryptoDigest(hashAlgorithm, verifierHashInput);
  const hashSize = parseInt(encKeyEl.getAttribute("hashSize"), 10) || verifierHashInputHash.length;
  const a = verifierHashInputHash.slice(0, hashSize), b = verifierHashValue.slice(0, hashSize);
  if(a.length !== b.length || !a.every((v,i)=>v===b[i])){
    throw new Error("パスワードが正しくありません");
  }

  const packageKeyBytes = await aesCbcDecryptRaw(await importAesCbcKey(keyKeyValue), iv, b64ToBytes(encKeyEl.getAttribute("encryptedKeyValue")));
  const packageCryptoKey = await importAesCbcKey(packageKeyBytes);

  const totalSize = encryptedPackageBytes[0] | (encryptedPackageBytes[1]<<8) | (encryptedPackageBytes[2]<<16) | (encryptedPackageBytes[3]<<24);
  const cipherData = encryptedPackageBytes.slice(8);
  const keyDataSalt = b64ToBytes(keyDataEl.getAttribute("saltValue"));
  const keyDataHashAlgorithm = keyDataEl.getAttribute("hashAlgorithm") || hashAlgorithm;

  const SEGMENT_LENGTH = 4096;
  const segments = [];
  for(let offset=0, segIdx=0; offset<cipherData.length; offset+=SEGMENT_LENGTH, segIdx++){
    const segCipher = cipherData.slice(offset, Math.min(offset+SEGMENT_LENGTH, cipherData.length));
    const ivHash = await offcryptoDigest(keyDataHashAlgorithm, concatBytes(keyDataSalt, le32Bytes(segIdx)));
    segments.push(await aesCbcDecryptRaw(packageCryptoKey, ivHash.slice(0,16), segCipher));
  }
  return concatBytes(...segments).slice(0, totalSize);
}

async function decryptProtectedXlsx(arrayBuffer){
  const cfb = XLSX.CFB.parse(new Uint8Array(arrayBuffer));
  const encInfoEntry = XLSX.CFB.find(cfb, "EncryptionInfo");
  const encPackageEntry = XLSX.CFB.find(cfb, "EncryptedPackage");
  if(!encInfoEntry || !encPackageEntry){
    throw new Error("File is password-protected");
  }
  const infoBytes = encInfoEntry.content instanceof Uint8Array ? encInfoEntry.content : new Uint8Array(encInfoEntry.content);
  const pkgBytes = encPackageEntry.content instanceof Uint8Array ? encPackageEntry.content : new Uint8Array(encPackageEntry.content);
  const major = infoBytes[0] | (infoBytes[1]<<8);
  const minor = infoBytes[2] | (infoBytes[3]<<8);
  if(!(major===4 && minor===4)){
    throw new Error("対応していない暗号化方式です（Agile暗号化以外は未対応）");
  }
  let lastErr;
  for(const pw of KNOWN_XLSX_PASSWORDS){
    try{
      return await decryptAgileXlsx(infoBytes, pkgBytes, pw);
    }catch(err){ lastErr = err; }
  }
  throw lastErr || new Error("パスワードが正しくありません");
}

/* ---------- Excel(.xlsx) インポート / エクスポート ---------- */
function parseExcelFile(file){
  return new Promise((resolve, reject)=>{
    const reader = new FileReader();
    reader.onload = async e => {
      try{
        let wb;
        try{
          wb = XLSX.read(e.target.result, { type:"array" });
        }catch(err){
          const msg = String((err && err.message) || err);
          if(/password|encrypt/i.test(msg)){
            const decrypted = await decryptProtectedXlsx(e.target.result);
            wb = XLSX.read(decrypted, { type:"array" });
          } else {
            throw err;
          }
        }
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header:1, raw:false, defval:"" });
        resolve(rows);
      }catch(err){ reject(err); }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}
function buildProductsXlsx(products){
  const rows = [["品番","品名","Kg","特価","取引先","原価","標準価格","備考"]];
  for(const p of products) rows.push([p.code, p.name, p.specialKg??"", p.specialPrice??"", p.client||"", p.costPerKg, p.standardPrice??"", p.note||""]);
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{wch:20},{wch:26},{wch:8},{wch:10},{wch:12},{wch:10},{wch:10},{wch:16}];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "原価リスト");
  XLSX.writeFile(wb, "原価リスト.xlsx");
}

/* ==========================================================
   アプリ状態 & ルーター
   ========================================================== */
const App = {
  view: "quotes",
  editingQuoteId: null,

  init(){
    Store.load();
    document.querySelectorAll(".nav-btn").forEach(btn=>{
      btn.addEventListener("click", ()=>{ this.go(btn.dataset.view); });
    });
    this.go("quotes");
    if(FS_ACCESS_SUPPORTED){
      loadDirHandle().then(handle=>{
        ViewQuotes.folderHandle = handle;
        if(this.view === "quotes") this.render();
      }).catch(()=>{});
      // 商品データファイルの自動復元はベストエフォート：復元できなくても「未連携」のまま普通に使える
      loadProductFileHandle().then(async handle=>{
        if(!handle) return;
        // ページ読込直後はユーザー操作が無いためrequestPermissionは使えない。
        // 許可が既に残っていればqueryPermissionだけで即復元できる。
        let restored = false;
        if(await queryFilePermissionSilent(handle)){
          try{ await this.activateProductFile(handle); restored = true; }
          catch(e){ /* 許可はあるがファイル自体が見つからない（移動・削除・共有解除など） */ }
        }
        if(!restored){
          // 許可切れ、またはファイルが見つからない場合は、次にユーザーが画面のどこかを
          // クリックした瞬間（＝ユーザー操作）に自動で再連携を試みる。
          Store.pendingProductFileHandle = handle;
          this.armProductFileReconnect();
          if(this.view === "products") this.render();
        }
      }).catch(()=>{});
    }
  },

  async activateProductFile(handle){
    const products = await readProductsFromFile(handle);
    Store.productFileHandle = handle;
    Store.productFileActive = true;
    Store.pendingProductFileHandle = null;
    Store.data.products = products;
    if(this.view === "products") this.render();
  },

  armProductFileReconnect(){
    if(this._productFileReconnectArmed) return;
    this._productFileReconnectArmed = true;
    const tryReconnect = async ()=>{
      document.removeEventListener("click", tryReconnect, true);
      document.removeEventListener("keydown", tryReconnect, true);
      const handle = Store.pendingProductFileHandle;
      if(!handle) return;
      try{
        if(!(await ensureFilePermission(handle))){
          toast("商品データファイルとの連携を確認できませんでした。「今すぐ再連携」ボタンから再度お試しください", true);
          return;
        }
        await this.activateProductFile(handle);
        toast(`商品データファイル「${handle.name}」と再連携しました（${Store.data.products.length}件）`);
      }catch(e){
        toast("商品データファイルとの再連携に失敗しました：" + e.message, true);
      }
    };
    document.addEventListener("click", tryReconnect, true);
    document.addEventListener("keydown", tryReconnect, true);
  },

  go(view, opts){
    this.view = view;
    if(opts && opts.quoteId !== undefined) this.editingQuoteId = opts.quoteId;
    if(view === "quotes") ViewQuotes.showTrash = false;
    document.querySelectorAll(".nav-btn").forEach(b=> b.classList.toggle("active", b.dataset.view===view));
    this.render();
  },

  render(){
    const root = document.getElementById("view-root");
    if(this.view === "quotes") root.innerHTML = ViewQuotes.render();
    else if(this.view === "editor") root.innerHTML = ViewEditor.render();
    else if(this.view === "products") root.innerHTML = ViewProducts.render();
    else if(this.view === "linecodes") root.innerHTML = ViewLineCodes.render();
    else if(this.view === "settings") root.innerHTML = ViewSettings.render();

    if(this.view === "quotes") ViewQuotes.bind();
    else if(this.view === "editor") ViewEditor.bind();
    else if(this.view === "products") ViewProducts.bind();
    else if(this.view === "linecodes") ViewLineCodes.bind();
    else if(this.view === "settings") ViewSettings.bind();
  }
};

/* ==========================================================
   画面：見積書一覧
   ========================================================== */
const ViewQuotes = {
  showTrash: false,

  selectedIds: new Set(),
  folderHandle: null,

  render(){
    const all = Store.data.quotes;
    const trashCount = all.filter(q=>q.deletedAt).length;
    const quotes = all.filter(q=> this.showTrash ? !!q.deletedAt : !q.deletedAt)
      .slice().sort((a,b)=> (b.updatedAt||"").localeCompare(a.updatedAt||""));

    const visibleIds = new Set(quotes.map(q=>q.id));
    Array.from(this.selectedIds).forEach(id=>{ if(!visibleIds.has(id)) this.selectedIds.delete(id); });
    const selectedCount = this.showTrash ? 0 : this.selectedIds.size;
    const allSelected = !this.showTrash && quotes.length>0 && quotes.every(q=>this.selectedIds.has(q.id));

    const rows = quotes.map(q=>{
      let statusCell;
      if(this.showTrash){
        const remainMs = TRASH_RETENTION_MS - (Date.now() - new Date(q.deletedAt).getTime());
        const remainDays = Math.max(0, Math.ceil(remainMs / (24*60*60*1000)));
        statusCell = `<span class="badge draft">あと${remainDays}日で完全削除</span>`;
      } else {
        const sealedCount = q.seals.filter(Boolean).length;
        statusCell = sealedCount>0
          ? `<span class="badge sealed">検印済み (${sealedCount}/3)</span>`
          : `<span class="badge draft">未検印</span>`;
      }
      const actions = this.showTrash
        ? `<button class="btn small" data-act="restore">復元</button>
           <button class="btn small danger" data-act="purge">完全に削除</button>`
        : `<button class="btn small" data-act="open">開く</button>
           <button class="btn small ghost" data-act="dup">複製</button>
           <button class="btn small danger" data-act="del">削除</button>`;
      const firstCode = q.items[0] ? q.items[0].code.replace(/\n/g," ").trim() : "";
      const checkboxCell = this.showTrash ? "" : `<td><input type="checkbox" class="q-select" data-id="${q.id}" ${this.selectedIds.has(q.id)?"checked":""}></td>`;
      return `
        <tr data-id="${q.id}">
          ${checkboxCell}
          <td>${escapeHtml(firstCode||"(品番未設定)")}</td>
          <td>${escapeHtml(q.customerCompany||"(宛先未設定)")}${q.customerPerson? "　"+escapeHtml(q.customerPerson)+"様":""}</td>
          <td>${formatDateJp(q.date)}</td>
          <td>${q.items.length}件</td>
          <td>${statusCell}</td>
          <td class="col-actions">${actions}</td>
        </tr>`;
    }).join("");

    const headerCol = this.showTrash ? "残り日数" : "状態";
    const checkboxHeaderCell = this.showTrash ? "" : `<th style="width:34px;"><input type="checkbox" id="q-select-all" ${allSelected?"checked":""}></th>`;

    return `
      <div class="page-header">
        <div>
          <h1>${this.showTrash ? "ゴミ箱" : "見積書一覧"}</h1>
          <div class="sub">
            ${this.showTrash
              ? `削除した見積書です。削除から${TRASH_RETENTION_DAYS}日が経過すると自動的に完全削除されます（アプリを開いたときに判定されます）。`
              : `作成した見積書はこのブラウザ内に保存されます（全 ${quotes.length} 件）`}
          </div>
          ${(!this.showTrash && FS_ACCESS_SUPPORTED) ? `
          <div class="sub" style="margin-top:2px;">
            保存フォルダ：${this.folderHandle ? `<strong>${escapeHtml(this.folderHandle.name)}</strong>` : "未設定（エクスポート/インポートのたびに保存先を選びます）"}
          </div>` : ""}
        </div>
        <div class="btn-row">
          ${this.showTrash
            ? `<button class="btn ghost" id="btn-back-to-list">← 見積書一覧に戻る</button>`
            : `${trashCount>0?`<button class="btn ghost" id="btn-show-trash">🗑 ゴミ箱を表示（${trashCount}件）</button>`:""}
               ${selectedCount>0?`<button class="btn danger" id="btn-delete-selected">選択した${selectedCount}件を削除</button>`:""}
               ${FS_ACCESS_SUPPORTED?`<button class="btn ghost" id="btn-set-folder">${this.folderHandle?"保存フォルダを変更":"共有フォルダを設定"}</button>`:""}
               <button class="btn" id="btn-export-quotes">見積書をエクスポート</button>
               <button class="btn" id="btn-import-quotes">見積書をインポート</button>
               <button class="btn primary" id="btn-new-quote">＋ 新規見積書を作成</button>`}
        </div>
      </div>
      <div class="card">
        ${quotes.length ? `
        <table class="grid">
          <thead><tr>${checkboxHeaderCell}<th>品番</th><th>宛先</th><th>日付</th><th>品目数</th><th>${headerCol}</th><th style="width:190px;">操作</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>` : `
        <div class="empty-state">
          <div class="big">${this.showTrash?"🗑":"📄"}</div>
          ${this.showTrash ? "ゴミ箱は空です。" : "見積書がまだありません。「新規見積書を作成」から始めましょう。"}
        </div>`}
      </div>
      <input type="file" id="quotes-file-import" accept=".json" style="display:none;">`;
  },

  bind(){
    const newBtn = document.getElementById("btn-new-quote");
    if(newBtn) newBtn.addEventListener("click", ()=>{
      const q = {
        id: uid(), number: "", date: toDateInputValue(new Date()),
        customerCompany: "", customerPerson: "", officeIndex: 0, theme: "",
        deliveryDate: "従来通り", deliveryPlace: "従来通り", tradeTerms: "従来通り", validPeriod: "発行後6カ月間",
        items: [], remarks: DEFAULT_REMARKS, toning: DEFAULT_TONING, toningEnabled: true, trialSheetNote: "", freightNotes: DEFAULT_FREIGHT.slice(),
        seals: [null,null,null], deletedAt: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
      };
      Store.data.quotes.push(q);
      Store.save();
      App.go("editor", { quoteId: q.id });
    });

    const trashBtn = document.getElementById("btn-show-trash");
    if(trashBtn) trashBtn.addEventListener("click", ()=>{ this.showTrash = true; this.selectedIds.clear(); App.render(); });
    const backBtn = document.getElementById("btn-back-to-list");
    if(backBtn) backBtn.addEventListener("click", ()=>{ this.showTrash = false; this.selectedIds.clear(); App.render(); });

    const selectAllBox = document.getElementById("q-select-all");
    if(selectAllBox) selectAllBox.addEventListener("change", ()=>{
      const ids = Array.from(document.querySelectorAll("#view-root tbody tr[data-id]")).map(tr=>tr.dataset.id);
      if(selectAllBox.checked) ids.forEach(id=>this.selectedIds.add(id));
      else ids.forEach(id=>this.selectedIds.delete(id));
      App.render();
    });

    document.querySelectorAll(".q-select").forEach(box=>{
      box.addEventListener("change", ()=>{
        if(box.checked) this.selectedIds.add(box.dataset.id);
        else this.selectedIds.delete(box.dataset.id);
        App.render();
      });
    });

    const deleteSelectedBtn = document.getElementById("btn-delete-selected");
    if(deleteSelectedBtn) deleteSelectedBtn.addEventListener("click", ()=>{
      const targets = Store.data.quotes.filter(q=>this.selectedIds.has(q.id) && !q.deletedAt);
      if(!targets.length) return;
      if(!confirm(`選択した見積書 ${targets.length}件をゴミ箱に移動しますか？（${TRASH_RETENTION_DAYS}日以内なら復元できます）`)) return;
      const now = new Date().toISOString();
      targets.forEach(q=>{ q.deletedAt = now; });
      this.selectedIds.clear();
      Store.save();
      App.render();
      toast(`${targets.length}件をゴミ箱に移動しました`);
    });

    const setFolderBtn = document.getElementById("btn-set-folder");
    if(setFolderBtn) setFolderBtn.addEventListener("click", async ()=>{
      try{
        const handle = await window.showDirectoryPicker({ mode: "readwrite" });
        await saveDirHandle(handle);
        this.folderHandle = handle;
        App.render();
        toast(`保存フォルダを「${handle.name}」に設定しました`);
      }catch(err){
        if(err && err.name === "AbortError") return;
        console.error(err);
        toast("フォルダの設定に失敗しました: " + err.message, true);
      }
    });

    const exportBtn = document.getElementById("btn-export-quotes");
    if(exportBtn) exportBtn.addEventListener("click", async ()=>{
      const targets = Store.data.quotes.filter(q=>!q.deletedAt);
      if(!targets.length){ toast("エクスポートする見積書がありません", true); return; }
      const json = buildQuotesJson(targets);
      const filename = `見積書エクスポート_${toDateInputValue(new Date()).replace(/-/g,"")}.json`;

      if(this.folderHandle){
        try{
          if(await ensureDirPermission(this.folderHandle)){
            const fileHandle = await this.folderHandle.getFileHandle(filename, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(json);
            await writable.close();
            toast(`${targets.length}件を「${this.folderHandle.name}」フォルダに保存しました`);
            return;
          }
        }catch(err){
          console.error(err);
        }
      }
      downloadFile(filename, json, "application/json;charset=utf-8");
      toast(`${targets.length}件をエクスポートしました`);
    });

    const importFileInput = document.getElementById("quotes-file-import");
    const importBtn = document.getElementById("btn-import-quotes");
    const runImport = async (text)=>{
      try{
        const imported = parseQuotesJson(text);
        if(!imported.length){ toast("取込めるデータが見つかりませんでした", true); return; }
        this.showImportModal(imported);
      }catch(err){
        console.error(err);
        toast("取込に失敗しました: " + err.message, true);
      }
    };
    if(importBtn) importBtn.addEventListener("click", async ()=>{
      if(this.folderHandle){
        try{
          const [fileHandle] = await window.showOpenFilePicker({
            startIn: this.folderHandle,
            types: [{ description: "見積書エクスポート", accept: { "application/json": [".json"] } }]
          });
          const file = await fileHandle.getFile();
          runImport(await file.text());
          return;
        }catch(err){
          if(err && err.name === "AbortError") return;
          console.error(err);
        }
      }
      importFileInput.click();
    });
    if(importFileInput) importFileInput.addEventListener("change", async ()=>{
      const file = importFileInput.files[0];
      if(!file) return;
      await runImport(await file.text());
      importFileInput.value = "";
    });

    document.querySelectorAll("#view-root tbody tr[data-id]").forEach(tr=>{
      const id = tr.dataset.id;
      const openBtn = tr.querySelector('[data-act="open"]');
      if(openBtn) openBtn.addEventListener("click", ()=> App.go("editor", { quoteId:id }));

      const dupBtn = tr.querySelector('[data-act="dup"]');
      if(dupBtn) dupBtn.addEventListener("click", ()=>{
        const src = Store.data.quotes.find(q=>q.id===id);
        const copy = JSON.parse(JSON.stringify(src));
        copy.id = uid(); copy.seals=[null,null,null]; copy.deletedAt = null;
        copy.createdAt = copy.updatedAt = new Date().toISOString();
        Store.data.quotes.push(copy); Store.save();
        toast("見積書を複製しました");
        App.render();
      });

      const delBtn = tr.querySelector('[data-act="del"]');
      if(delBtn) delBtn.addEventListener("click", ()=>{
        if(!confirm(`この見積書を削除します。ゴミ箱に移動し、${TRASH_RETENTION_DAYS}日後に自動的に完全削除されます。よろしいですか？`)) return;
        const q = Store.data.quotes.find(x=>x.id===id);
        q.deletedAt = new Date().toISOString();
        Store.save();
        toast("ゴミ箱に移動しました");
        App.render();
      });

      const restoreBtn = tr.querySelector('[data-act="restore"]');
      if(restoreBtn) restoreBtn.addEventListener("click", ()=>{
        const q = Store.data.quotes.find(x=>x.id===id);
        q.deletedAt = null;
        Store.save();
        toast("見積書を復元しました");
        App.render();
      });

      const purgeBtn = tr.querySelector('[data-act="purge"]');
      if(purgeBtn) purgeBtn.addEventListener("click", ()=>{
        if(!confirm("この見積書を完全に削除します。この操作は取り消せません。よろしいですか？")) return;
        Store.data.quotes = Store.data.quotes.filter(x=>x.id!==id);
        Store.save();
        App.render();
      });
    });
  },

  showImportModal(imported){
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-head"><h2>見積書の取込み</h2><button class="modal-close">×</button></div>
        <div class="modal-body">
          <p>${imported.length} 件のデータを読み込みました。取込み方法を選択してください。</p>
          <div class="tag-note">同じ見積書（ID）が既にある場合は上書きされます。無いものは新規追加されます。</div>
        </div>
        <div class="modal-foot">
          <button class="btn" id="qim-cancel">キャンセル</button>
          <button class="btn danger" id="qim-replace">全て置き換える</button>
          <button class="btn primary" id="qim-merge">既存に反映（マージ）</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const close = ()=> overlay.remove();
    overlay.querySelector(".modal-close").addEventListener("click", close);
    overlay.querySelector("#qim-cancel").addEventListener("click", close);
    overlay.querySelector("#qim-replace").addEventListener("click", ()=>{
      Store.data.quotes = imported;
      this.selectedIds.clear();
      Store.save(); close(); App.render();
      toast(`${imported.length} 件で見積書一覧を置き換えました`);
    });
    overlay.querySelector("#qim-merge").addEventListener("click", ()=>{
      let added=0, updated=0;
      for(const item of imported){
        const idx = Store.data.quotes.findIndex(q=>q.id===item.id);
        if(idx !== -1){ Store.data.quotes[idx] = item; updated++; }
        else { Store.data.quotes.push(item); added++; }
      }
      Store.save(); close(); App.render();
      toast(`反映しました（新規 ${added} 件 / 更新 ${updated} 件）`);
    });
  }
};

/* ==========================================================
   画面：原価リスト管理
   ========================================================== */
const ViewProducts = {
  filterCode: "",
  filterClient: "",
  DISPLAY_LIMIT: 200,

  render(){
    const list = Store.data.products.filter(p=>{
      const t1 = normalizeForSearch(this.filterCode);
      const t2 = normalizeForSearch(this.filterClient);
      const match1 = !t1 || normalizeForSearch(p.code+p.name).includes(t1);
      const match2 = !t2 || normalizeForSearch(p.client||"").includes(t2);
      return match1 && match2;
    });
    const truncated = list.length > this.DISPLAY_LIMIT;
    const shown = truncated ? list.slice(0, this.DISPLAY_LIMIT) : list;

    const uniqueClients = Array.from(new Set(Store.data.products.map(p=>(p.client||"").trim()).filter(Boolean))).sort((a,b)=>a.localeCompare(b,"ja"));
    const clientDatalistHtml = uniqueClients.map(c=>`<option value="${escapeHtml(c)}"></option>`).join("");

    const rows = shown.map(p=>`
      <tr data-id="${p.id}">
        <td class="ro-cell">${escapeHtml(p.code)}</td>
        <td class="ro-cell">${escapeHtml(p.name)}</td>
        <td class="ro-cell" style="width:70px;">${escapeHtml(p.specialKg??"")}</td>
        <td class="ro-cell" style="width:110px;">${escapeHtml(String(p.specialPrice??""))}</td>
        <td class="ro-cell" style="width:150px;">${escapeHtml(p.client||"")}</td>
        <td class="ro-cell" style="width:120px;">${escapeHtml(String(p.costPerKg))}</td>
        <td class="ro-cell" style="width:110px;">${escapeHtml(String(p.standardPrice??""))}</td>
        <td class="ro-cell note-cell">${escapeHtml(p.note||"")}</td>
        <td class="col-actions"><button class="btn small primary copy-btn" data-act="copy-to-quote">コピー</button></td>
      </tr>`).join("");

    return `
      <div class="page-header">
        <div>
          <h1>特価/原価管理リスト</h1>
          <div class="sub">製品の原価（円/kg）を管理します。一覧の内容は直接編集できません。更新はCSV / Excel ファイルの取込みで行ってください（全 ${Store.data.products.length} 件）</div>
          ${FS_ACCESS_SUPPORTED ? `
          <div class="sub" style="margin-top:2px;">
            商品データファイル：${
              Store.productFileActive ? `<strong>${escapeHtml(Store.productFileHandle.name)}</strong> と連携中`
              : Store.pendingProductFileHandle ? `<strong style="color:#c0392b;">「${escapeHtml(Store.pendingProductFileHandle.name)}」との連携が切れています。</strong> 画面のどこかをクリックすると自動で再連携します（うまくいかない場合は下の「今すぐ再連携」ボタンを押してください）`
              : "未設定（ブラウザ内に保存されています。件数が多い場合はファイル連携をおすすめします）"
            }
          </div>` : ""}
        </div>
        <div class="btn-row">
          ${FS_ACCESS_SUPPORTED ? `
          ${Store.pendingProductFileHandle ? `<button class="btn primary" id="btn-reconnect-product-file">今すぐ再連携</button>` : ""}
          <button class="btn ghost" id="btn-open-product-file">既存の商品データファイルを開く</button>
          <button class="btn ghost" id="btn-save-product-file">今のデータを新しいファイルに保存</button>
          ${Store.productFileActive ? `<button class="btn ghost" id="btn-unlink-product-file">連携を解除</button>` : ""}
          ` : ""}
          <button class="btn" id="btn-export-csv">CSVで書き出す</button>
          <button class="btn" id="btn-export-xlsx">Excelで書き出す</button>
          <button class="btn primary" id="btn-import">CSV / Excelから取込む</button>
        </div>
      </div>

      <div class="card card-pad" style="margin-bottom:16px;">
        <div class="product-toolbar">
          <input type="text" class="search-input" id="product-search-code" placeholder="品番・品名でワード検索" value="${escapeHtml(this.filterCode)}">
          <input type="text" class="search-input" id="product-search-client" list="product-client-datalist" autocomplete="off" placeholder="取引先（会社名）でワード検索" value="${escapeHtml(this.filterClient)}">
          <datalist id="product-client-datalist">${clientDatalistHtml}</datalist>
        </div>
        <div class="format-help">
          取込用ファイルの列見出し： <code>品番</code>, <code>品名</code>, <code>Kg</code>, <code>特価</code>, <code>取引先</code>, <code>原価</code>, <code>標準価格</code>, <code>備考</code>（順不同・「Kg」「特価」「取引先」「標準価格」「備考」は省略可）。
          「<code>製品コード</code>」は品番、「<code>製品名</code>」は品名として自動的に扱われます。
          既存の品番と一致する行は上書き、新しい品番は追加されます。
        </div>
      </div>

      ${truncated ? `<p class="hint" style="margin:0 0 8px;">検索結果 ${list.length.toLocaleString()} 件中、上位 ${this.DISPLAY_LIMIT} 件を表示しています。絞り込み条件を追加すると対象の行が見つかりやすくなります。</p>` : ""}
      <div class="card">
        <table class="grid item-edit-table" style="font-size:13px;">
          <thead><tr><th style="width:13%;">品番</th><th style="width:17%;">品名</th><th style="width:5%;">Kg</th><th style="width:7%;">特価</th><th style="width:11%;">取引先</th><th style="width:8%;">原価（円/kg）</th><th style="width:8%;">標準価格</th><th>備考</th><th style="width:70px;">操作</th></tr></thead>
          <tbody>${rows || (Store.pendingProductFileHandle
            ? `<tr><td colspan="9" style="text-align:center;color:#c0392b;padding:30px;">商品データファイルとの連携が切れているため表示できません。画面のどこかをクリックするか、上の「今すぐ再連携」ボタンを押してください</td></tr>`
            : `<tr><td colspan="9" style="text-align:center;color:#888;padding:30px;">該当する製品がありません</td></tr>`)}</tbody>
        </table>
      </div>
      <input type="file" id="file-import" accept=".csv,.xlsx,.xls" style="display:none;">
    `;
  },

  bind(){
    const codeInput = document.getElementById("product-search-code");
    const clientInput = document.getElementById("product-search-client");
    let composingCode = false, composingClient = false;

    const scheduleCodeFilter = (value)=>{
      clearTimeout(this._searchTimer);
      this._searchTimer = setTimeout(()=>{
        this.filterCode = value;
        App.render();
        setTimeout(()=>{ const el=document.getElementById("product-search-code"); el.focus(); el.selectionStart=el.selectionEnd=el.value.length; },0);
      }, 250);
    };
    const scheduleClientFilter = (value)=>{
      clearTimeout(this._searchTimer2);
      this._searchTimer2 = setTimeout(()=>{
        this.filterClient = value;
        App.render();
        setTimeout(()=>{ const el=document.getElementById("product-search-client"); el.focus(); el.selectionStart=el.selectionEnd=el.value.length; },0);
      }, 250);
    };

    codeInput.addEventListener("compositionstart", ()=>{ composingCode = true; });
    codeInput.addEventListener("compositionend", (e)=>{ composingCode = false; scheduleCodeFilter(e.target.value); });
    codeInput.addEventListener("input", (e)=>{ if(composingCode) return; scheduleCodeFilter(e.target.value); });
    codeInput.addEventListener("change", (e)=>{ composingCode = false; scheduleCodeFilter(e.target.value); });

    clientInput.addEventListener("compositionstart", ()=>{ composingClient = true; });
    clientInput.addEventListener("compositionend", (e)=>{ composingClient = false; scheduleClientFilter(e.target.value); });
    clientInput.addEventListener("input", (e)=>{ if(composingClient) return; scheduleClientFilter(e.target.value); });
    clientInput.addEventListener("change", (e)=>{ composingClient = false; scheduleClientFilter(e.target.value); });

    const reconnectProductFileBtn = document.getElementById("btn-reconnect-product-file");
    if(reconnectProductFileBtn) reconnectProductFileBtn.addEventListener("click", async ()=>{
      const handle = Store.pendingProductFileHandle;
      if(!handle) return;
      try{
        if(!(await ensureFilePermission(handle))){
          toast("商品データファイルへのアクセスが許可されませんでした", true);
          return;
        }
        await App.activateProductFile(handle);
        toast(`商品データファイル「${handle.name}」と再連携しました（${Store.data.products.length}件）`);
      }catch(e){
        toast("商品データファイルとの再連携に失敗しました：" + e.message, true);
      }
    });

    const openProductFileBtn = document.getElementById("btn-open-product-file");
    if(openProductFileBtn) openProductFileBtn.addEventListener("click", async ()=>{
      try{
        const [handle] = await window.showOpenFilePicker({
          types: [{ description: "商品データファイル", accept: { "application/json": [".json"] } }]
        });
        const products = await readProductsFromFile(handle);
        Store.productFileHandle = handle;
        Store.productFileActive = true;
        Store.pendingProductFileHandle = null;
        Store.data.products = products;
        Store.save();
        saveProductFileHandle(handle).catch(()=>{});
        App.render();
        toast(`商品データファイル「${handle.name}」と連携しました（${products.length}件）`);
      }catch(e){
        if(e.name !== "AbortError") toast("商品データファイルを開けませんでした：" + e.message, true);
      }
    });

    const saveProductFileBtn = document.getElementById("btn-save-product-file");
    if(saveProductFileBtn) saveProductFileBtn.addEventListener("click", async ()=>{
      try{
        const handle = await window.showSaveFilePicker({
          suggestedName: "商品データ.json",
          types: [{ description: "商品データファイル", accept: { "application/json": [".json"] } }]
        });
        await writeProductsToFile(handle, Store.data.products);
        Store.productFileHandle = handle;
        Store.productFileActive = true;
        Store.pendingProductFileHandle = null;
        Store.save();
        saveProductFileHandle(handle).catch(()=>{});
        App.render();
        toast(`「${handle.name}」に保存し、連携しました（${Store.data.products.length}件）`);
      }catch(e){
        if(e.name !== "AbortError") toast("商品データファイルへの保存に失敗しました：" + e.message, true);
      }
    });

    const unlinkProductFileBtn = document.getElementById("btn-unlink-product-file");
    if(unlinkProductFileBtn) unlinkProductFileBtn.addEventListener("click", ()=>{
      Store.productFileHandle = null;
      Store.productFileActive = false;
      Store.save();
      clearProductFileHandle().catch(()=>{});
      App.render();
      toast("商品データファイルとの連携を解除しました（以後はブラウザ内に保存されます）");
    });

    document.getElementById("btn-export-csv").addEventListener("click", ()=>{
      downloadFile("原価リスト.csv", buildProductsCsv(Store.data.products), "text/csv;charset=utf-8");
    });
    document.getElementById("btn-export-xlsx").addEventListener("click", ()=>{
      buildProductsXlsx(Store.data.products);
    });

    const fileInput = document.getElementById("file-import");
    document.getElementById("btn-import").addEventListener("click", ()=> fileInput.click());
    fileInput.addEventListener("change", async ()=>{
      const file = fileInput.files[0];
      if(!file) return;
      try{
        let rows;
        if(/\.csv$/i.test(file.name)) rows = parseCsv(await file.text());
        else rows = await parseExcelFile(file);
        const imported = mapRowsToProducts(rows);
        if(!imported.length){ toast("取込めるデータが見つかりませんでした", true); return; }
        this.showImportModal(imported);
      }catch(err){
        console.error(err);
        toast("取込に失敗しました: " + err.message, true);
      }
      fileInput.value = "";
    });

    document.querySelectorAll("#view-root tbody tr[data-id]").forEach(tr=>{
      const id = tr.dataset.id;
      const p = Store.data.products.find(x=>x.id===id);
      tr.querySelector('[data-act="copy-to-quote"]').addEventListener("click", ()=>{
        const s = Store.data.settings;
        const lineMatch = matchLineCode(p.code, Store.data.lineCodes);
        const recIdx = lineMatch ? lineMatch.newIndex : null;
        const ownSpecial = hasRecordedPrice(p.specialPrice);
        const hasAnySpecial = ownSpecial
          || !!findSpecialPriceEntry(p.code, p.client, s.baseContainerKg)
          || !!findSpecialPriceEntry(p.code, p.client, s.smallContainerKg)
          || !!findSpecialPriceEntry(p.code, p.client, s.bigContainerKg);

        if(isHardener(p)){
          const unit = unitForName(p.name);
          const cap = Number(p.specialKg) || 4;
          const hasOwnPrice = hasRecordedPrice(p.specialPrice);
          const item = { code:p.code, name:p.name, capacity:cap, unit, unitPrice: hasOwnPrice ? p.specialPrice : 0, note: p.note || "(国内缶)" };
          if(!hasOwnPrice) item.priceWarning = true;
          const items = [item];
          if(cap===4){
            const cands = findHardener1kgCandidates(p);
            if(cands.length) items.push({ code:p.code, name:p.name, capacity:1, unit, unitPrice:0, note:p.note||"(国内缶)", calcCandidates:cands });
          } else if(cap===1 && !hasOwnPrice){
            const cands = findHardener1kgCandidates(p);
            if(cands.length) item.calcCandidates = cands;
          }
          const q = {
            id: uid(), number: "", date: toDateInputValue(new Date()),
            customerCompany: "", customerPerson: "", officeIndex: 0, theme: "",
            deliveryDate: "従来通り", deliveryPlace: "従来通り", tradeTerms: "従来通り", validPeriod: "発行後6カ月間",
            items,
            remarks: DEFAULT_REMARKS, toning: DEFAULT_TONING, toningEnabled: true, trialSheetNote: "", freightNotes: DEFAULT_FREIGHT.slice(),
            seals: [null,null,null], deletedAt: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
          };
          Store.data.quotes.push(q);
          Store.save();
          App.go("editor", { quoteId: q.id });
          if(item.priceWarning) toast("特価が未登録のため単価が0円になっています（赤色のセルをご確認ください）", true);
          return;
        }

        let baseItem, smallItem, bigItem = null;
        if(hasAnySpecial){
          const baseMatch = (ownSpecial && Number(p.specialKg)===s.baseContainerKg) ? p : findSpecialPriceEntry(p.code, p.client, s.baseContainerKg);
          const smallMatch = (ownSpecial && Number(p.specialKg)===s.smallContainerKg) ? p : findSpecialPriceEntry(p.code, p.client, s.smallContainerKg);
          const bigMatch = (ownSpecial && Number(p.specialKg)===s.bigContainerKg) ? p : findSpecialPriceEntry(p.code, p.client, s.bigContainerKg);
          const unit = unitForName(p.name);
          baseItem = baseMatch
            ? { code:p.code, name:p.name, capacity:s.baseContainerKg, unit, unitPrice:baseMatch.specialPrice, note:"(国内缶)" }
            : { code:p.code, name:p.name, capacity:s.baseContainerKg, unit, unitPrice:0, note:"(国内缶)", priceWarning:true };
          smallItem = smallMatch
            ? { code:p.code, name:p.name, capacity:s.smallContainerKg, unit, unitPrice:smallMatch.specialPrice, note:"(国内缶)" }
            : { code:p.code, name:p.name, capacity:s.smallContainerKg, unit, unitPrice:0, note:"(国内缶)", priceWarning:true };
          if(!smallMatch && baseMatch){
            smallItem.calcCandidate = roundUp10((baseMatch.specialPrice / s.baseContainerKg) * (s.smallContainerKg + s.smallAddKg) + s.smallAddFee);
            smallItem.calcCandidateLabel = `${s.baseContainerKg}KG特価より算出`;
          }
          if(!baseMatch && smallMatch){
            baseItem.calcCandidate = roundUp10((smallMatch.specialPrice - s.smallAddFee) / (s.smallContainerKg + s.smallAddKg) * s.baseContainerKg);
            baseItem.calcCandidateLabel = `${s.smallContainerKg}KG特価より算出`;
          }
          if(bigMatch){
            bigItem = { code:p.code, name:p.name, capacity:s.bigContainerKg, unit, unitPrice:bigMatch.specialPrice, note:"(国内缶)" };
          }
        } else {
          const unit = unitForName(p.name);
          baseItem = { code:p.code, name:p.name, capacity:s.baseContainerKg, unit, unitPrice:0, note:"(国内缶)", priceWarning:true };
          smallItem = { code:p.code, name:p.name, capacity:s.smallContainerKg, unit, unitPrice:0, note:"(国内缶)", priceWarning:true };
        }

        if(isThinnerProduct(p)){
          [[baseItem,s.baseContainerKg],[smallItem,s.smallContainerKg],[bigItem,s.bigContainerKg]].forEach(([it,cap])=>{
            if(!it) return;
            const cands = findSimilarClientPriceCandidates(p.code, cap, p.client);
            if(cands.length) it.calcCandidates = cands;
          });
        }

        const items = [ baseItem, smallItem ];
        if(bigItem) items.push(bigItem);
        const q = {
          id: uid(), number: "", date: toDateInputValue(new Date()),
          customerCompany: "", customerPerson: "", officeIndex: 0, theme: "",
          deliveryDate: "従来通り", deliveryPlace: "従来通り", tradeTerms: "従来通り", validPeriod: "発行後6カ月間",
          items,
          remarks: DEFAULT_REMARKS, toning: DEFAULT_TONING, toningEnabled: true, trialSheetNote: "", freightNotes: DEFAULT_FREIGHT.slice(),
          seals: [null,null,null], deletedAt: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
        };
        Store.data.quotes.push(q);
        Store.save();
        App.go("editor", { quoteId: q.id });
        if(baseItem.priceWarning || smallItem.priceWarning) toast("特価が未登録の容量があります（赤色のセルをご確認ください）", true);
      });
    });
  },

  showImportModal(imported){
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-head"><h2>原価リストの取込み</h2><button class="modal-close">×</button></div>
        <div class="modal-body">
          <p>${imported.length} 件のデータを読み込みました。取込み方法を選択してください。</p>
          <div class="tag-note">「品番」が一致する製品は原価・品名・備考を上書きします。一致しない品番は新規追加されます。</div>
          <div class="tag-note">「このファイルの内容を削除」は、このファイルと品番・取引先・Kgが一致する製品を原価リストから削除します（過去に取込んだデータを取り消したい場合に使用）。</div>
        </div>
        <div class="modal-foot">
          <button class="btn" id="im-cancel">キャンセル</button>
          <button class="btn danger" id="im-delete">このファイルの内容を削除</button>
          <button class="btn danger" id="im-replace">全て置き換える</button>
          <button class="btn primary" id="im-merge">既存に反映（マージ）</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const close = ()=> overlay.remove();
    overlay.querySelector(".modal-close").addEventListener("click", close);
    overlay.querySelector("#im-cancel").addEventListener("click", close);
    overlay.querySelector("#im-delete").addEventListener("click", ()=>{
      const keyOf = p => p.code.trim() + "|" + (p.client||"") + "|" + (p.specialKg??"");
      const keys = new Set(imported.map(keyOf));
      const before = Store.data.products.length;
      Store.data.products = Store.data.products.filter(p => !keys.has(keyOf(p)));
      const deleted = before - Store.data.products.length;
      Store.save(); close(); App.render();
      toast(`${deleted} 件を原価リストから削除しました`);
    });
    overlay.querySelector("#im-replace").addEventListener("click", ()=>{
      Store.data.products = imported;
      Store.save(); close(); App.render();
      toast(`${imported.length} 件で原価リストを置き換えました`);
    });
    overlay.querySelector("#im-merge").addEventListener("click", ()=>{
      let added=0, updated=0;
      const keyOf = p => p.code.trim() + "|" + (p.client||"") + "|" + (p.specialKg??"");
      const index = new Map();
      Store.data.products.forEach(p => index.set(keyOf(p), p));
      for(const item of imported){
        const existing = index.get(keyOf(item));
        if(existing){
          existing.name=item.name||existing.name;
          existing.specialKg=item.specialKg!==""?item.specialKg:existing.specialKg;
          existing.specialPrice=item.specialPrice!==""?item.specialPrice:existing.specialPrice;
          existing.client=item.client||existing.client;
          existing.costPerKg=item.costPerKg;
          existing.standardPrice=item.standardPrice!==""?item.standardPrice:existing.standardPrice;
          existing.note=item.note||existing.note;
          updated++;
        }
        else {
          Store.data.products.push(item);
          index.set(keyOf(item), item);
          added++;
        }
      }
      Store.save(); close(); App.render();
      toast(`反映しました（新規 ${added} 件 / 更新 ${updated} 件）`);
    });
  }
};

/* ==========================================================
   画面：指数・最低価格リスト（ラインコード別）
   ========================================================== */
const ViewLineCodes = {
  filterText: "",

  render(){
    const list = Store.data.lineCodes.filter(lc=>{
      if(!this.filterText) return true;
      const t = normalizeForSearch(this.filterText);
      return normalizeForSearch(lc.code+lc.name).includes(t);
    });

    const rows = list.map(lc=>`
      <tr data-id="${lc.id}">
        <td style="width:16%;"><input type="text" data-f="code" value="${escapeHtml(lc.code)}"></td>
        <td><input type="text" data-f="name" value="${escapeHtml(lc.name)}"></td>
        <td style="width:90px;"><input type="number" step="0.01" data-f="newIndex" value="${lc.newIndex}"></td>
        <td style="width:140px;"><input type="number" data-f="minEnamel16" value="${lc.minEnamel16||""}" placeholder="―"></td>
        <td style="width:140px;"><input type="number" data-f="minMetallic16" value="${lc.minMetallic16||""}" placeholder="―"></td>
        <td class="col-actions"><button class="btn small danger" data-act="del">削除</button></td>
      </tr>`).join("");

    return `
      <div class="page-header">
        <div>
          <h1>指数・最低価格</h1>
          <div class="sub">ラインコード（品番の先頭部分）ごとの推奨指数（新指数）と最低価格です。単価候補の第一候補選定に使われます（全 ${Store.data.lineCodes.length} 件）</div>
        </div>
        <div class="btn-row">
          <button class="btn" id="btn-export-csv">CSVで書き出す</button>
          <button class="btn" id="btn-export-xlsx">Excelで書き出す</button>
          <button class="btn primary" id="btn-import">CSV / Excelから取込む</button>
        </div>
      </div>

      <div class="card card-pad" style="margin-bottom:16px;">
        <div class="product-toolbar">
          <input type="text" class="search-input" id="lc-search" placeholder="ラインコード・ライン名で検索" value="${escapeHtml(this.filterText)}">
          <button class="btn small" id="btn-add-lc">＋ 1件追加</button>
        </div>
        <div class="format-help">
          取込用ファイルの列見出し： <code>ラインコード</code>, <code>ライン名</code>, <code>新指数</code>, <code>最低価格エナメル16kg</code>, <code>最低価格メタリック16kg</code>（後者2つは省略可）。<br>
          品番の先頭がラインコードと一致する製品について、最も長く一致したラインコードの新指数を単価候補の第一候補（推奨）として提示します。4kgの最低価格は「設定」画面の共通値を使用します。
        </div>
      </div>

      <div class="card">
        <table class="grid item-edit-table" style="font-size:13px;">
          <thead><tr><th>ラインコード</th><th>ライン名</th><th>新指数</th><th>最低価格(エナメル16kg)</th><th>最低価格(メタリック16kg)</th><th style="width:70px;">操作</th></tr></thead>
          <tbody>${rows || `<tr><td colspan="6" style="text-align:center;color:#888;padding:30px;">該当するデータがありません</td></tr>`}</tbody>
        </table>
      </div>
      <input type="file" id="lc-file-import" accept=".csv,.xlsx,.xls" style="display:none;">
    `;
  },

  bind(){
    document.getElementById("lc-search").addEventListener("input", (e)=>{
      this.filterText = e.target.value;
      App.render();
      setTimeout(()=>{ const el=document.getElementById("lc-search"); el.focus(); el.selectionStart=el.selectionEnd=el.value.length; },0);
    });

    document.getElementById("btn-add-lc").addEventListener("click", ()=>{
      Store.data.lineCodes.unshift({ id: uid(), code:"", name:"", newIndex:0.77, minEnamel16:null, minMetallic16:null });
      Store.save();
      App.render();
    });

    document.getElementById("btn-export-csv").addEventListener("click", ()=>{
      downloadFile("指数・最低価格リスト.csv", buildLineCodesCsv(Store.data.lineCodes), "text/csv;charset=utf-8");
    });
    document.getElementById("btn-export-xlsx").addEventListener("click", ()=>{
      buildLineCodesXlsx(Store.data.lineCodes);
    });

    const fileInput = document.getElementById("lc-file-import");
    document.getElementById("btn-import").addEventListener("click", ()=> fileInput.click());
    fileInput.addEventListener("change", async ()=>{
      const file = fileInput.files[0];
      if(!file) return;
      try{
        let rows;
        if(/\.csv$/i.test(file.name)) rows = parseCsv(await file.text());
        else rows = await parseExcelFile(file);
        const imported = mapRowsToLineCodes(rows);
        if(!imported.length){ toast("取込めるデータが見つかりませんでした", true); return; }
        this.showImportModal(imported);
      }catch(err){
        console.error(err);
        toast("取込に失敗しました: " + err.message, true);
      }
      fileInput.value = "";
    });

    document.querySelectorAll("#view-root tbody tr[data-id]").forEach(tr=>{
      const id = tr.dataset.id;
      const lc = Store.data.lineCodes.find(x=>x.id===id);
      tr.querySelectorAll("[data-f]").forEach(inp=>{
        inp.addEventListener("change", ()=>{
          const f = inp.dataset.f;
          if(f==="code" || f==="name") lc[f] = inp.value;
          else lc[f] = inp.value===""?null:Number(inp.value)||0;
          Store.save();
        });
      });
      tr.querySelector('[data-act="del"]').addEventListener("click", ()=>{
        if(!confirm("このラインコードを削除しますか？")) return;
        Store.data.lineCodes = Store.data.lineCodes.filter(x=>x.id!==id);
        Store.save();
        App.render();
      });
    });
  },

  showImportModal(imported){
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-head"><h2>指数・最低価格の取込み</h2><button class="modal-close">×</button></div>
        <div class="modal-body">
          <p>${imported.length} 件のデータを読み込みました。取込み方法を選択してください。</p>
          <div class="tag-note">「ラインコード」が一致する行は新指数・最低価格を上書きします。一致しないラインコードは新規追加されます。</div>
        </div>
        <div class="modal-foot">
          <button class="btn" id="im-cancel">キャンセル</button>
          <button class="btn danger" id="im-replace">全て置き換える</button>
          <button class="btn primary" id="im-merge">既存に反映（マージ）</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const close = ()=> overlay.remove();
    overlay.querySelector(".modal-close").addEventListener("click", close);
    overlay.querySelector("#im-cancel").addEventListener("click", close);
    overlay.querySelector("#im-replace").addEventListener("click", ()=>{
      Store.data.lineCodes = imported;
      Store.save(); close(); App.render();
      toast(`${imported.length} 件で置き換えました`);
    });
    overlay.querySelector("#im-merge").addEventListener("click", ()=>{
      let added=0, updated=0;
      for(const item of imported){
        const existing = Store.data.lineCodes.find(lc=>lc.code.trim()===item.code.trim());
        if(existing){
          existing.name=item.name||existing.name;
          existing.newIndex=item.newIndex;
          existing.minEnamel16=item.minEnamel16;
          existing.minMetallic16=item.minMetallic16;
          updated++;
        } else { Store.data.lineCodes.push(item); added++; }
      }
      Store.save(); close(); App.render();
      toast(`反映しました（新規 ${added} 件 / 更新 ${updated} 件）`);
    });
  }
};

/* ==========================================================
   画面：設定（単価自動計算パラメータ・営業所）
   ========================================================== */
const ViewSettings = {
  render(){
    const s = Store.data.settings;
    const idxInputs = s.indices.map((v,i)=>
      `<input type="number" step="0.01" min="0.1" max="0.99" data-idx="${i}" class="idx-input" value="${v}" style="width:70px;">`
    ).join(" ");
    const officeRows = s.offices.map((o,i)=>`
      <tr data-i="${i}">
        <td><input type="text" data-f="name" value="${escapeHtml(o.name)}"></td>
        <td><textarea rows="2" data-f="address">${escapeHtml(o.address)}</textarea></td>
        <td class="col-actions">${s.offices.length>1?'<button class="btn small danger" data-act="del-office">削除</button>':''}</td>
      </tr>`).join("");
    const sealNames = s.sealNames && s.sealNames.length ? s.sealNames : [""];
    const sealNameRows = sealNames.map((n,i)=>`
      <tr data-i="${i}">
        <td><input type="text" data-f="sealname" maxlength="6" value="${escapeHtml(n)}"></td>
        <td class="col-actions">${sealNames.length>1?'<button class="btn small danger" data-act="del-sealname">削除</button>':''}</td>
      </tr>`).join("");

    return `
      <div class="page-header">
        <div><h1>設定</h1><div class="sub">単価自動計算の各種係数と、見積書に表示する営業所情報を設定します</div></div>
      </div>

      <div class="card card-pad" style="margin-bottom:18px;">
        <div class="panel-section"><h3>単価自動計算の係数</h3></div>
        <p class="hint" style="margin:-4px 0 14px;">原価リストの原価（円/kg）から、以下の式で基準容量の単価候補を算出します：<br>
        売上原価 ＝（原価 ＋ 製造コスト）× 基準容量 ＋ 缶代　／　単価候補 ＝ 売上原価 × (1＋販管費率) ÷ 指数（10円単位で切り上げ）<br>
        小容量の単価候補 ＝ 基準容量の単価候補 ÷ 基準容量 ×（小容量＋換算加算kg）＋ 換算加算額（10円単位で切り上げ）<br>
        大容量の単価候補 ＝ 基準容量の単価候補 ÷ 基準容量 × 大容量 ＋ 換算加算額（10円単位で切り上げ）</p>
        <div class="field-row">
          <div class="field"><label>製造コスト（円/kg）</label><input type="number" id="s-mfg" value="${s.manufacturingCostPerKg}"></div>
          <div class="field"><label>基準容量の缶代（円）</label><input type="number" id="s-can" value="${s.canFeeBase}"></div>
          <div class="field"><label>販管費率（%）</label><input type="number" step="0.1" id="s-sga" value="${s.sgaRate*100}"></div>
        </div>
        <div class="field-row">
          <div class="field"><label>基準容量（kg）</label><input type="number" id="s-base-kg" value="${s.baseContainerKg}"></div>
          <div class="field"><label>小容量（kg）</label><input type="number" id="s-small-kg" value="${s.smallContainerKg}"></div>
          <div class="field"><label>小容量換算：加算kg</label><input type="number" id="s-small-addkg" value="${s.smallAddKg}"></div>
          <div class="field"><label>小容量換算：加算額（円）</label><input type="number" id="s-small-addfee" value="${s.smallAddFee}"></div>
        </div>
        <div class="field-row">
          <div class="field"><label>大容量（kg）</label><input type="number" id="s-big-kg" value="${s.bigContainerKg}"></div>
          <div class="field"><label>大容量換算：加算額（円）</label><input type="number" id="s-big-addfee" value="${s.bigAddFee}"></div>
        </div>
        <div class="field">
          <label>利益率指数（5段階・低いほど高単価＝高利益）</label>
          <div>${idxInputs}</div>
          <div class="hint">既定値: 0.62 / 0.72 / 0.77（標準） / 0.82 / 0.87</div>
        </div>
        <div class="field-row">
          <div class="field" style="max-width:260px;">
            <label>課長判断が必要な指数の上限</label>
            <input type="number" step="0.01" id="s-manager-limit" value="${s.managerApprovalIndex}">
            <div class="hint">プリセット最大値を超え、この値までは課長判断で使用可。これを超える場合は副部長以上の判断が必要、として見積編集画面に警告表示します。</div>
          </div>
          <div class="field" style="max-width:260px;">
            <label>4kgの最低価格（全ライン共通・円）</label>
            <input type="number" id="s-min4kg" value="${s.minPrice4kg}">
            <div class="hint">「指数・最低価格」画面のラインコード別最低価格は16kgのみに適用され、4kgはこの共通値が使われます。</div>
          </div>
        </div>
        <div class="btn-row"><button class="btn primary" id="btn-save-settings">係数を保存</button></div>
      </div>

      <div class="card card-pad">
        <div class="panel-section"><h3>営業所（発行元）</h3></div>
        <p class="hint" style="margin:-4px 0 14px;">見積書の発行元として選択できる営業所と、印字される住所です。</p>
        <table class="grid item-edit-table">
          <thead><tr><th style="width:26%;">営業所名</th><th>住所・連絡先</th><th style="width:70px;"></th></tr></thead>
          <tbody id="office-rows">${officeRows}</tbody>
        </table>
        <div class="btn-row" style="margin-top:12px;">
          <button class="btn small" id="btn-add-office">＋ 営業所を追加</button>
          <button class="btn primary" id="btn-save-offices">営業所情報を保存</button>
        </div>
      </div>

      <div class="card card-pad" style="margin-top:18px;">
        <div class="panel-section"><h3>検印 氏名リスト</h3></div>
        <p class="hint" style="margin:-4px 0 14px;">検印時にプルダウンから選択できる氏名の一覧です。リストにない氏名も自由入力欄で入力できます。部署は「${escapeHtml(FIXED_SEAL_DEPT)}」に固定されています。</p>
        <table class="grid item-edit-table">
          <thead><tr><th>氏名</th><th style="width:70px;"></th></tr></thead>
          <tbody id="sealname-rows">${sealNameRows}</tbody>
        </table>
        <div class="btn-row" style="margin-top:12px;">
          <button class="btn small" id="btn-add-sealname">＋ 氏名を追加</button>
          <button class="btn primary" id="btn-save-sealnames">氏名リストを保存</button>
        </div>
      </div>

      <div class="card card-pad" style="margin-top:18px;">
        <div class="panel-section"><h3>バックアップ（復元ポイント）</h3></div>
        <p class="hint" style="margin:-4px 0 14px;">
          アプリを開いたときに毎日${BACKUP_HOUR}:00以降であれば自動的にバックアップを作成し、直近${BACKUP_RETENTION_DAYS}日分を保持します（それより古いものは自動的に削除されます）。
          ${BACKUP_HOUR}:00より前にしかアプリを開かない日は作成されない点にご注意ください。
        </p>
        <div class="btn-row" style="margin-bottom:12px;">
          <button class="btn small primary" id="btn-backup-now">＋ 今すぐバックアップを作成</button>
        </div>
        ${this.renderBackupList()}
      </div>
    `;
  },

  renderBackupList(){
    const backups = (Store.data.backups||[]).slice().sort((a,b)=> b.createdAt.localeCompare(a.createdAt));
    if(!backups.length) return `<p class="hint">バックアップはまだありません。</p>`;
    const rows = backups.map(b=>`
      <tr data-id="${b.id}">
        <td>${formatDateTimeJp(b.createdAt)}${b.manual?' <span class="badge draft">手動</span>':' <span class="badge sealed">自動</span>'}</td>
        <td>見積書${b.snapshot.quotes.length}件 ／ 原価リスト${b.snapshot.products.length}件</td>
        <td class="col-actions">
          <button class="btn small" data-act="restore-backup">復元</button>
          <button class="btn small danger" data-act="delete-backup">削除</button>
        </td>
      </tr>`).join("");
    return `
      <table class="grid item-edit-table">
        <thead><tr><th style="width:220px;">作成日時</th><th>内容</th><th style="width:150px;"></th></tr></thead>
        <tbody id="backup-rows">${rows}</tbody>
      </table>`;
  },

  bind(){
    document.getElementById("btn-save-settings").addEventListener("click", ()=>{
      const s = Store.data.settings;
      s.manufacturingCostPerKg = Number(document.getElementById("s-mfg").value)||0;
      s.canFeeBase = Number(document.getElementById("s-can").value)||0;
      s.sgaRate = (Number(document.getElementById("s-sga").value)||0)/100;
      s.baseContainerKg = Number(document.getElementById("s-base-kg").value)||16;
      s.smallContainerKg = Number(document.getElementById("s-small-kg").value)||4;
      s.smallAddKg = Number(document.getElementById("s-small-addkg").value)||0;
      s.smallAddFee = Number(document.getElementById("s-small-addfee").value)||0;
      s.bigContainerKg = Number(document.getElementById("s-big-kg").value)||18;
      s.bigAddFee = Number(document.getElementById("s-big-addfee").value)||0;
      s.managerApprovalIndex = Number(document.getElementById("s-manager-limit").value)||0.95;
      s.minPrice4kg = Number(document.getElementById("s-min4kg").value)||0;
      s.indices = Array.from(document.querySelectorAll(".idx-input")).map(i=>Number(i.value)||0.01)
        .sort((a,b)=>a-b);
      Store.save();
      toast("係数を保存しました");
      App.render();
    });

    document.getElementById("btn-add-office").addEventListener("click", ()=>{
      Store.data.settings.offices.push({ name:"", address:"" });
      Store.save(); App.render();
    });

    document.querySelectorAll("#office-rows tr").forEach(tr=>{
      const i = Number(tr.dataset.i);
      tr.querySelectorAll("[data-f]").forEach(inp=>{
        inp.addEventListener("change", ()=>{ Store.data.settings.offices[i][inp.dataset.f] = inp.value; });
      });
      const delBtn = tr.querySelector('[data-act="del-office"]');
      if(delBtn) delBtn.addEventListener("click", ()=>{
        Store.data.settings.offices.splice(i,1);
        Store.save(); App.render();
      });
    });

    document.getElementById("btn-save-offices").addEventListener("click", ()=>{
      Store.save();
      toast("営業所情報を保存しました");
    });

    document.getElementById("btn-add-sealname").addEventListener("click", ()=>{
      Store.data.settings.sealNames.push("");
      Store.save(); App.render();
    });

    document.querySelectorAll("#sealname-rows tr").forEach(tr=>{
      const i = Number(tr.dataset.i);
      tr.querySelector('[data-f="sealname"]').addEventListener("change", (e)=>{
        Store.data.settings.sealNames[i] = e.target.value.trim();
      });
      const delBtn = tr.querySelector('[data-act="del-sealname"]');
      if(delBtn) delBtn.addEventListener("click", ()=>{
        Store.data.settings.sealNames.splice(i,1);
        Store.save(); App.render();
      });
    });

    document.getElementById("btn-save-sealnames").addEventListener("click", ()=>{
      const cleaned = Store.data.settings.sealNames.map(n=>n.trim()).filter(n=>n);
      Store.data.settings.sealNames = cleaned.length ? cleaned : [""];
      Store.save();
      toast("氏名リストを保存しました");
      App.render();
    });

    document.getElementById("btn-backup-now").addEventListener("click", ()=>{
      Store.createManualBackup();
      toast("バックアップを作成しました");
      App.render();
    });

    document.querySelectorAll("#backup-rows tr[data-id]").forEach(tr=>{
      const id = tr.dataset.id;
      const restoreBtn = tr.querySelector('[data-act="restore-backup"]');
      if(restoreBtn) restoreBtn.addEventListener("click", ()=>{
        if(!confirm("このバックアップ時点の状態に復元します。現在の見積書・原価リスト・設定などはすべてこのバックアップの内容で上書きされます。よろしいですか？")) return;
        Store.restoreBackup(id);
        toast("復元しました");
        App.go("quotes");
      });
      const delBtn = tr.querySelector('[data-act="delete-backup"]');
      if(delBtn) delBtn.addEventListener("click", ()=>{
        if(!confirm("このバックアップを削除しますか？")) return;
        Store.data.backups = Store.data.backups.filter(b=>b.id!==id);
        Store.save();
        App.render();
      });
    });
  }
};

/* ==========================================================
   見積書シート描画（原本Excelのレイアウトを再現／画面プレビューと印刷で共通利用）
   ========================================================== */
const LOGO_DATA_URI = "data:image/png;base64,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";

function getOffice(quote, settings){
  return settings.offices[quote.officeIndex] || settings.offices[0] || { name:"", address:"" };
}

function renderQuoteSheetHTML(quote, settings){
  const office = getOffice(quote, settings);
  const hasPerson = !!(quote.customerPerson && quote.customerPerson.trim());
  const customerLine = hasPerson
    ? `${escapeHtml(quote.customerCompany)}`
    : `${escapeHtml(quote.customerCompany)}　御中`;

  const qItems = quote.items;
  const itemRows = qItems.map((it, idx) => {
    const sameAsPrev = idx>0 && qItems[idx-1].code===it.code && qItems[idx-1].name===it.name;
    const capRow = `<td class="col-cap">${escapeHtml(it.capacity)} ${escapeHtml(it.unit||"Kg")}</td>
      <td class="col-price">${yen(it.unitPrice)}</td>
      <td class="col-note">${escapeHtml(it.note||"")}</td>`;
    if(sameAsPrev){
      return `<tr>${capRow}</tr>`;
    }
    let span = 1;
    for(let j=idx+1; j<qItems.length; j++){
      if(qItems[j].code===it.code && qItems[j].name===it.name) span++;
      else break;
    }
    const spanAttr = span>1 ? ` rowspan="${span}"` : "";
    return `<tr>
      <td class="col-code"${spanAttr}>${nl2br(it.code)}</td>
      <td class="col-name"${spanAttr}>${nl2br(it.name)}</td>
      ${capRow}
    </tr>`;
  }).join("");

  const sealBoxes = quote.seals.map(seal=>{
    if(!seal) return `<div class="qs-seal-box"></div>`;
    return `<div class="qs-seal-box">
      <div class="qs-seal-stamp">${sealStampInnerHTML(seal)}</div>
    </div>`;
  }).join("");

  return `
    <div class="quote-sheet">
      <div class="qs-logo-row">
        <img class="qs-logo" src="${LOGO_DATA_URI}" alt="musashi paint">
      </div>
      <div class="qs-no">${escapeHtml(quote.number||"")}</div>
      <div class="qs-title-row">
        <div style="flex:0 0 60px;"></div>
        <div class="qs-title">御　見　積　書</div>
        <div class="qs-date" style="flex:0 0 auto;">${formatDateJp(quote.date)}</div>
      </div>

      <div class="qs-head-row">
        <div class="qs-customer">
          ${customerLine}
          ${hasPerson ? `<div class="person">${escapeHtml(quote.customerPerson)}　様</div>` : ""}
        </div>
        <div class="qs-office">
          <div class="office-name">${escapeHtml(office.name)}</div>
          <div>${nl2br(office.address)}</div>
        </div>
      </div>

      <div class="qs-lead">下記の通り御見積り申し上げます。</div>

      <div class="qs-body-row">
        <div class="qs-meta-col">
          <table class="qs-meta-table">
            <tr><td class="label">テーマ/ユーザー名</td><td>${escapeHtml(quote.theme||"")}</td></tr>
            <tr><td class="label">受渡し期日又は納期</td><td>${escapeHtml(quote.deliveryDate||"")}</td></tr>
            <tr><td class="label">受　渡　し　場　所</td><td>${escapeHtml(quote.deliveryPlace||"")}</td></tr>
            <tr><td class="label">御　取　引　方　法</td><td>${escapeHtml(quote.tradeTerms||"")}</td></tr>
            <tr><td class="label">有　効　期　限</td><td>${escapeHtml(quote.validPeriod||"")}</td></tr>
          </table>
        </div>
        <div class="qs-seal-col">${sealBoxes}</div>
      </div>

      <table class="qs-item-table">
        <thead>
          <tr>
            <th class="col-code">品　番</th>
            <th class="col-name">品　名</th>
            <th class="col-cap">容　量</th>
            <th class="col-price">単　価</th>
            <th class="col-note">備　考</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows || `<tr><td colspan="5" style="text-align:center;color:#888;">品目が登録されていません</td></tr>`}
        </tbody>
      </table>
      <div class="qs-remarks">
        <div><span class="r-title">摘要：</span>${escapeHtml(quote.remarks||"")}</div>
        <div>${quote.toningEnabled===false ? "調色料の請求は御座いません" : escapeHtml(quote.toning||"")}</div>
        <div>～運賃について～</div>
        ${(quote.freightNotes||[]).map(n=>`<div>${escapeHtml(n)}</div>`).join("")}
      </div>
    </div>`;
}

/* ---------- 新試算表シート ---------- */
function buildTrialSheetGroups(quote, settings){
  const s = settings;
  const seen = [];
  const byCode = new Map();
  quote.items.forEach(it=>{
    const code = (it.code||"").trim();
    if(!byCode.has(code)){ byCode.set(code, []); seen.push(code); }
    byCode.get(code).push(it);
  });

  const shapeFor = cap => {
    if(Number(cap)===Number(s.baseContainerKg)) return "base";
    if(Number(cap)===Number(s.smallContainerKg)) return "small";
    if(Number(cap)===Number(s.bigContainerKg)) return "big";
    return null;
  };

  return seen.map(code=>{
    const groupItems = byCode.get(code);
    const first = groupItems[0];
    const product = Store.data.products.find(p=>p.code.trim()===code);
    const manualCostItem = groupItems.find(it=>it.manualCostPerKg!==undefined && it.manualCostPerKg!=="");
    const realCost = product ? (Number(product.costPerKg)||0) : (manualCostItem ? (Number(manualCostItem.manualCostPerKg)||0) : 0);
    // recommendedIndex is intentionally always null here: this sheet lists many
    // products in one shared table, so every row must have the same number of
    // index columns (settings.indices.length), not a per-product injected extra column.
    const candReal = calcPriceCandidates(realCost, s, null);
    const candZero = calcPriceCandidates(0, s, null);

    const presentCaps = [];
    [s.baseContainerKg, s.smallContainerKg, s.bigContainerKg].forEach(c=>{
      if(groupItems.some(it=>Number(it.capacity)===Number(c)) && !presentCaps.includes(Number(c))) presentCaps.push(Number(c));
    });
    groupItems.forEach(it=>{ const c=Number(it.capacity); if(!presentCaps.includes(c)) presentCaps.push(c); });

    const rowFor = (cap, costType, cand) => {
      const shape = shapeFor(cap);
      const matchItem = groupItems.find(it=>Number(it.capacity)===cap);
      return {
        capacity: cap,
        costType,
        costPerKg: costType==="サンプル原価" ? realCost : 0,
        manufacturingCost: s.manufacturingCostPerKg,
        gBase: cand.gBase,
        hBase: cand.hBase,
        candidates: shape ? cand[shape] : null,
        decidedPrice: matchItem ? matchItem.unitPrice : null
      };
    };

    const rows = [
      ...presentCaps.map(c=>rowFor(c, "サンプル原価", candReal)),
      ...presentCaps.map(c=>rowFor(c, "希望原価", candZero))
    ];

    // 備考欄：各品番ごとに実際に選んだ指数（設定指数）と、硬化剤/シンナーで参考にした既存の特価情報を自動で記載する
    // 推奨指数は備考欄には出さず、試算表内の別枠（推奨指数一覧）にまとめる
    const refLines = [];
    const lineMatch = matchLineCode(code, Store.data.lineCodes);
    groupItems.forEach(it=>{
      if(it.appliedIndex!==undefined && it.appliedIndex!==null){
        refLines.push(`設定指数（${it.capacity}${it.unit||"Kg"}）：${Number(it.appliedIndex).toFixed(2)}`);
      }
      if(it.priceRef && (isHardener(it) || isThinnerProduct(it))){
        refLines.push(`参考価格（${it.capacity}${it.unit||"Kg"}）：${it.priceRef.label} ${yen(it.priceRef.price)}`);
      }
    });

    return {
      code, name: first.name,
      note: product ? (product.note||"") : (first.note||""),
      refLines,
      recommendedIndexNote: lineMatch ? `${code}：推奨指数 ${lineMatch.newIndex}（${lineMatch.code}／${lineMatch.name}）` : null,
      capsCountPerType: presentCaps.length,
      rows
    };
  });
}

function renderTrialSheetHTML(quote, settings){
  const s = settings;
  const groups = buildTrialSheetGroups(quote, settings);
  const sgaPct = Math.round(s.sgaRate*100);
  const primarySeal = quote.seals.find(Boolean) || null;

  const idxHeaders = s.indices.map(i=>`<th class="col-idx">${i.toFixed(2)}</th>`).join("");

  const bodyRows = groups.map(g=>{
    const total = g.rows.length;
    return g.rows.map((r, i)=>{
      const cells = [];
      if(i===0){
        cells.push(`<td class="col-code" rowspan="${total}">${nl2br(g.code)}</td>`);
        cells.push(`<td class="col-name" rowspan="${total}">${nl2br(g.name)}</td>`);
      }
      const isFirstOfBlock = (i===0) || (i===g.capsCountPerType);
      cells.push(isFirstOfBlock
        ? `<td class="col-costtype" rowspan="${g.capsCountPerType}">${escapeHtml(r.costType)}</td>`
        : "");
      cells.push(`<td class="col-cost">${yen(r.costPerKg)}</td>`);
      cells.push(`<td class="col-mfgcost">${yen(r.manufacturingCost)}</td>`);
      cells.push(`<td class="col-cap">${escapeHtml(String(r.capacity))}kg</td>`);
      cells.push(`<td class="col-gbase">${yen(r.gBase)}</td>`);
      cells.push(`<td class="col-hbase">${yen(r.hBase)}</td>`);
      cells.push(r.candidates
        ? r.candidates.map(c=>`<td class="col-idx">${yen(c.price)}</td>`).join("")
        : s.indices.map(()=>`<td class="col-idx">—</td>`).join(""));
      cells.push(`<td class="col-decided">${r.decidedPrice!=null ? yen(r.decidedPrice) : ""}</td>`);
      if(i===0){
        const noteHtml = [g.note, ...g.refLines].filter(Boolean).map(escapeHtml).join("<br>");
        cells.push(`<td class="col-note" rowspan="${total}">${noteHtml}</td>`);
      }
      return `<tr>${cells.filter(c=>c!=="").join("")}</tr>`;
    }).join("");
  }).join("");

  return `
    <div class="trial-sheet">
      <div class="ts-title">販売価格試算表</div>
      <div class="ts-meta-row">
        <div class="placeholder">[販売店]　[担当者宛名]</div>
        <div>試算日　${formatDateJp(quote.date)}</div>
      </div>
      <div class="ts-customer-row">
        ${escapeHtml(quote.customerCompany||"")}${quote.customerPerson?"　"+escapeHtml(quote.customerPerson)+"　様":""}
        ${quote.theme ? `　／　ユーザー：${escapeHtml(quote.theme)}` : ""}
      </div>
      <table class="ts-table">
        <thead>
          <tr>
            <th class="col-code">品番</th><th class="col-name">品名</th><th class="col-costtype">原価の種類</th>
            <th class="col-cost">k原価</th><th class="col-mfgcost">製造コスト</th><th class="col-cap">入目</th>
            <th class="col-gbase">売上原価</th><th class="col-hbase">×販管費${sgaPct}%</th>
            ${idxHeaders}
            <th class="col-decided">決定価格</th><th class="col-note">備考</th>
          </tr>
        </thead>
        <tbody>${bodyRows}</tbody>
      </table>
      ${(()=>{
        const idxNotes = groups.map(g=>g.recommendedIndexNote).filter(Boolean);
        if(!idxNotes.length) return "";
        return `
      <div class="ts-recidx-box">
        <div class="ts-recidx-title">推奨指数</div>
        <div class="ts-recidx-list">${idxNotes.map(t=>`<div class="ts-recidx-item">${escapeHtml(t)}</div>`).join("")}</div>
      </div>`;
      })()}
      ${quote.trialSheetNote ? `
      <div class="ts-note-box">
        <div class="ts-note-title">備考</div>
        <div class="ts-note-body">${escapeHtml(quote.trialSheetNote).replace(/\n/g,"<br>")}</div>
      </div>` : ""}
      <div class="ts-footer-row">
        <div class="ts-footer-box"></div>
        <div class="ts-footer-box"></div>
        <div class="ts-footer-box">${primarySeal ? `<div class="qs-seal-stamp">${sealStampInnerHTML(primarySeal)}</div>` : ""}</div>
      </div>
    </div>`;
}

/* ==========================================================
   画面：見積書エディタ
   ========================================================== */
const ViewEditor = {
  candidateModalCtx: null,
  previewMode: "quote",

  getQuote(){ return Store.data.quotes.find(q=>q.id===App.editingQuoteId); },
  previewHtml(q, s){
    return this.previewMode === "trial"
      ? renderQuoteSheetHTML(q, s) + renderTrialSheetHTML(q, s)
      : renderQuoteSheetHTML(q, s);
  },
  isLocked(q){ return q.seals.some(Boolean); },

  render(){
    const q = this.getQuote();
    if(!q){ App.view="quotes"; return ViewQuotes.render(); }
    const locked = this.isLocked(q);
    const s = Store.data.settings;

    const officeOptions = s.offices.map((o,i)=>
      `<option value="${i}" ${q.officeIndex===i?"selected":""}>${escapeHtml(o.name)}</option>`).join("");

    const itemRows = q.items.map((it,i)=>{
      const hasBigAlready = q.items.some(x=> x.code===it.code && Number(x.capacity)===s.bigContainerKg);
      const showBigMark = !locked && Number(it.capacity)===s.baseContainerKg && Number(it.unitPrice)>0 && !hasBigAlready;
      return `
      <tr data-i="${i}">
        <td>
          <textarea rows="2" data-f="code" ${locked?"disabled":""}>${escapeHtml(it.code)}</textarea>
          <div class="hint line-hint" id="line-hint-${i}" style="margin:2px 0 0;">${lineHintHtml(it.code)}</div>
        </td>
        <td><textarea rows="2" data-f="name" ${locked?"disabled":""}>${escapeHtml(it.name)}</textarea></td>
        <td style="width:70px;"><input type="number" data-f="capacity" value="${it.capacity}" ${locked?"disabled":""}></td>
        <td style="width:64px;">
          <select data-f="unit" ${locked?"disabled":""}>
            <option value="Kg" ${it.unit==="Kg"?"selected":""}>Kg</option>
            <option value="L" ${it.unit==="L"?"selected":""}>L</option>
          </select>
        </td>
        <td style="width:120px;" class="${it.priceWarning?"cell-price-warn":""}">
          <input type="number" data-f="unitPrice" value="${it.unitPrice}" placeholder="${it.priceWarning?"特価未登録":""}" ${locked?"disabled":""}>
          ${it.priceWarning?`<div class="hint" style="color:var(--color-danger);margin:2px 0 0;">${it.capacity}KG特価無し</div>`:""}
          ${it.calcCandidate?`<div class="hint" style="margin:2px 0 0;">${escapeHtml(it.calcCandidateLabel)}：${yen(it.calcCandidate)}${locked?"":` <button type="button" class="price-suggest-btn" data-act="apply-calc-candidate" style="width:auto;display:inline;padding:1px 6px;margin:0;">適用</button>`}</div>`:""}
          ${(it.calcCandidates||[]).map((c,ci)=>`<div class="hint" style="margin:2px 0 0;">${escapeHtml(c.label)}：${yen(c.price)}${locked?"":` <button type="button" class="price-suggest-btn" data-act="apply-calc-candidate-multi" data-idx="${ci}" style="width:auto;display:inline;padding:1px 6px;margin:0;">適用</button>`}</div>`).join("")}
          ${showBigMark?`<div class="hint" style="margin:2px 0 0;"><button type="button" class="price-suggest-btn" data-act="calc-big" style="width:auto;display:inline;padding:1px 6px;margin:0;">${s.bigContainerKg}kgも算出</button></div>`:""}
          <label class="roundup-check">
            <input type="checkbox" data-act="roundup10" ${it.roundUp?"checked":""} ${locked?"disabled":""}> 10円単位切上げ
          </label>
          ${locked?"":`<button type="button" class="price-suggest-btn" data-act="suggest">単価候補を見る</button>`}
        </td>
        <td style="width:110px;"><input type="text" data-f="note" value="${escapeHtml(it.note||"")}" ${locked?"disabled":""}></td>
        <td class="col-actions">
          ${locked?"":`
          <button type="button" data-act="up" title="上へ">▲</button>
          <button type="button" data-act="down" title="下へ">▼</button>
          <button type="button" data-act="del" title="削除">✕</button>`}
        </td>
      </tr>`;}).join("");

    return `
      <div class="page-header">
        <div>
          <h1>見積書編集</h1>
          <div class="sub">${escapeHtml(q.number||"(見積番号未設定)")} ／ 更新日時 ${q.updatedAt ? formatDateTimeJp(q.updatedAt):""}</div>
        </div>
        <div class="btn-row">
          <button class="btn ghost" id="btn-back">← 一覧に戻る</button>
          <button class="btn primary" id="btn-print-quote">🖨 ①見積書を印刷/PDF保存</button>
          <button class="btn primary" id="btn-print-quote-trial">🖨 ②見積書＋新試算表を印刷/PDF保存</button>
        </div>
      </div>

      ${locked ? `
      <div class="locked-banner">
        <span><strong>検印済みのため内容は編集できません。</strong> 印刷・PDF保存はそのまま行えます。</span>
        <button class="btn small danger" id="btn-unlock">検印を解除して編集する</button>
      </div>` : ""}

      <div class="editor-layout">
        <div class="editor-panel">
          <div class="card card-pad panel-section">
            <h3>基本情報</h3>
            <div class="field-row">
              <div class="field"><label>見積番号</label><input type="text" id="f-number" value="${escapeHtml(q.number)}" ${locked?"disabled":""}></div>
              <div class="field"><label>日付</label><input type="date" id="f-date" value="${q.date}" ${locked?"disabled":""}></div>
            </div>
            <div class="field-row">
              <div class="field">
                <label>宛先会社名（入力すると得意先名を検索できます）</label>
                <input type="text" id="f-company" list="dealer-datalist" autocomplete="off" placeholder="会社名を入力または検索" value="${escapeHtml(q.customerCompany)}" ${locked?"disabled":""}>
                <datalist id="dealer-datalist">${DEALER_DATALIST_OPTIONS_HTML}</datalist>
              </div>
              <div class="field"><label>ご担当者名（空欄なら会社名に「御中」）</label><input type="text" id="f-person" value="${escapeHtml(q.customerPerson)}" ${locked?"disabled":""}></div>
            </div>
            <div class="field">
              <label>発行元営業所</label>
              <select id="f-office" ${locked?"disabled":""}>${officeOptions}</select>
            </div>
            <div class="field"><label>テーマ / ユーザー名</label><input type="text" id="f-theme" value="${escapeHtml(q.theme)}" ${locked?"disabled":""}></div>
            <div class="field-row">
              <div class="field"><label>受渡し期日又は納期</label><input type="text" id="f-deliveryDate" value="${escapeHtml(q.deliveryDate)}" ${locked?"disabled":""}></div>
              <div class="field"><label>受渡し場所</label><input type="text" id="f-deliveryPlace" value="${escapeHtml(q.deliveryPlace)}" ${locked?"disabled":""}></div>
            </div>
            <div class="field-row">
              <div class="field"><label>御取引方法</label><input type="text" id="f-tradeTerms" value="${escapeHtml(q.tradeTerms)}" ${locked?"disabled":""}></div>
              <div class="field"><label>有効期限</label><input type="text" id="f-validPeriod" value="${escapeHtml(q.validPeriod)}" ${locked?"disabled":""}></div>
            </div>
          </div>

          <div class="card card-pad panel-section">
            <h3>摘要・注記</h3>
            <div class="field"><label>摘要</label><textarea id="f-remarks" ${locked?"disabled":""}>${escapeHtml(q.remarks)}</textarea></div>
            <div class="field">
              <label>調色料に関する注記</label>
              <div class="toning-switch" style="margin-bottom:6px;">
                <label style="margin-right:14px;"><input type="radio" name="toning-mode" id="f-toning-on" ${q.toningEnabled!==false?"checked":""} ${locked?"disabled":""}> オン（調色料請求）</label>
                <label><input type="radio" name="toning-mode" id="f-toning-off" ${q.toningEnabled===false?"checked":""} ${locked?"disabled":""}> オフ（調色料請求無し）</label>
              </div>
              <textarea id="f-toning" ${locked||q.toningEnabled===false?"disabled":""}>${escapeHtml(q.toning)}</textarea>
            </div>
            <div class="field"><label>運賃について（1行につき1項目）</label><textarea id="f-freight" rows="4" ${locked?"disabled":""}>${escapeHtml((q.freightNotes||[]).join("\n"))}</textarea></div>
          </div>

          <div class="card card-pad panel-section">
            <h3>検印</h3>
            <div class="seal-box-row">
              ${[0,1,2].map(i=>{
                const seal = q.seals[i];
                if(seal){
                  return `<div class="seal-box filled" data-i="${i}" data-act="seal-info">
                    <div class="seal-stamp">${sealStampInnerHTML(seal)}</div>
                  </div>`;
                }
                return `<div class="seal-box" data-i="${i}" data-act="seal-empty">クリックして検印</div>`;
              }).join("")}
            </div>
          </div>
        </div>

        <div class="editor-panel">
          <div class="card card-pad panel-section">
            <h3>品目</h3>
            <div class="item-toolbar">
              <button class="btn small item-tab-btn" id="btn-add-from-master" ${locked?"disabled":""}>＋ 既存製品より選択（基準容量・小容量を自動追加）</button>
              <button class="btn small ghost item-tab-btn" id="btn-add-blank" ${locked?"disabled":""}>＋ 新規作成（手入力）</button>
            </div>
            <div style="overflow-x:auto;">
              <table class="item-edit-table">
                <thead><tr><th>品番</th><th>品名</th><th>容量</th><th>単位</th><th>単価</th><th>備考</th><th>操作</th></tr></thead>
                <tbody id="item-rows">${itemRows || `<tr><td colspan="7" style="text-align:center;color:#888;padding:20px;">品目がありません</td></tr>`}</tbody>
              </table>
            </div>
          </div>

          <div class="card card-pad panel-section">
            <h3>試算表の備考</h3>
            <div class="field"><label>（試算表のみに反映）</label><textarea id="f-trial-note" ${locked?"disabled":""}>${escapeHtml(q.trialSheetNote||"")}</textarea></div>
          </div>

          <div class="panel-section">
            <h3>プレビュー（この見た目のまま印刷・PDF化されます）</h3>
            <div class="preview-tabs">
              <button type="button" class="preview-tab-btn ${this.previewMode==="quote"?"active":""}" id="tab-preview-quote">見積書</button>
              <button type="button" class="preview-tab-btn ${this.previewMode==="trial"?"active":""}" id="tab-preview-trial">見積書＋新試算表</button>
            </div>
            <div class="preview-wrap" id="preview-wrap"><div id="preview-inner">${this.previewHtml(q, s)}</div></div>
          </div>
        </div>
      </div>
    `;
  },

  updatePreview(){
    const q = this.getQuote();
    const s = Store.data.settings;
    document.getElementById("preview-inner").innerHTML = this.previewHtml(q, s);
  },

  touch(q){ q.updatedAt = new Date().toISOString(); Store.save(); },

  bind(){
    const q = this.getQuote();
    if(!q) return;
    const locked = this.isLocked(q);

    document.getElementById("btn-back").addEventListener("click", ()=> App.go("quotes"));
    document.getElementById("btn-print-quote").addEventListener("click", ()=> this.printQuote(q, {includeTrial:false}));
    document.getElementById("btn-print-quote-trial").addEventListener("click", ()=> this.printQuote(q, {includeTrial:true}));
    document.getElementById("tab-preview-quote").addEventListener("click", ()=>{ this.previewMode="quote"; this.updatePreview(); });
    document.getElementById("tab-preview-trial").addEventListener("click", ()=>{ this.previewMode="trial"; this.updatePreview(); });

    if(locked){
      document.getElementById("btn-unlock").addEventListener("click", ()=>{
        if(!confirm("検印をすべて解除し、内容を編集できるようにします。よろしいですか？")) return;
        q.seals = [null,null,null];
        this.touch(q);
        App.render();
      });
    }

    // 検印ボックス
    document.querySelectorAll(".seal-box").forEach(box=>{
      const i = Number(box.dataset.i);
      if(box.dataset.act === "seal-empty"){
        box.addEventListener("click", ()=> this.openSealModal(q, i));
      } else {
        box.addEventListener("click", ()=>{
          if(!confirm("この検印を取り消しますか？")) return;
          q.seals[i] = null;
          this.touch(q);
          App.render();
        });
      }
    });

    if(locked) return; // これ以降は編集系のバインドなので、ロック中は不要

    // 基本情報フィールド
    const bindField = (id, key, transform)=>{
      const el = document.getElementById(id);
      el.addEventListener("input", ()=>{
        q[key] = transform ? transform(el.value) : el.value;
        this.touch(q);
        this.updatePreview();
      });
    };
    bindField("f-number","number");
    bindField("f-date","date");
    bindField("f-company","customerCompany");
    bindField("f-person","customerPerson");
    bindField("f-theme","theme");
    bindField("f-deliveryDate","deliveryDate");
    bindField("f-deliveryPlace","deliveryPlace");
    bindField("f-tradeTerms","tradeTerms");
    bindField("f-validPeriod","validPeriod");
    bindField("f-remarks","remarks");
    bindField("f-trial-note","trialSheetNote");
    bindField("f-toning","toning");
    const toningOnRadio = document.getElementById("f-toning-on");
    const toningOffRadio = document.getElementById("f-toning-off");
    const toningTextarea = document.getElementById("f-toning");
    const applyToningEnabled = (enabled)=>{
      q.toningEnabled = enabled;
      toningTextarea.disabled = !enabled || locked;
      this.touch(q);
      this.updatePreview();
    };
    if(toningOnRadio) toningOnRadio.addEventListener("change", ()=>{ if(toningOnRadio.checked) applyToningEnabled(true); });
    if(toningOffRadio) toningOffRadio.addEventListener("change", ()=>{ if(toningOffRadio.checked) applyToningEnabled(false); });
    document.getElementById("f-freight").addEventListener("input", (e)=>{
      q.freightNotes = e.target.value.split("\n");
      this.touch(q); this.updatePreview();
    });
    document.getElementById("f-office").addEventListener("change", (e)=>{
      q.officeIndex = Number(e.target.value);
      this.touch(q); this.updatePreview();
    });

    // 品目テーブル
    document.querySelectorAll("#item-rows tr[data-i]").forEach(tr=>{
      const i = Number(tr.dataset.i);
      tr.querySelectorAll("[data-f]").forEach(inp=>{
        const ev = (inp.tagName==="SELECT") ? "change" : "input";
        inp.addEventListener(ev, ()=>{
          const f = inp.dataset.f;
          q.items[i][f] = (f==="capacity"||f==="unitPrice") ? Number(inp.value)||0 : inp.value;
          if(f==="unitPrice"){ q.items[i].appliedIndex = undefined; q.items[i].priceRef = undefined; }
          if(f==="name" && unitForName(inp.value)==="L" && q.items[i].unit!=="L"){
            q.items[i].unit = "L";
            const unitSelect = tr.querySelector('select[data-f="unit"]');
            if(unitSelect) unitSelect.value = "L";
          }
          this.touch(q);
          this.updatePreview();
          if(f==="code"){
            const hintEl = document.getElementById(`line-hint-${i}`);
            if(hintEl) hintEl.innerHTML = lineHintHtml(inp.value);
          }
        });
      });
      const priceInput = tr.querySelector('input[data-f="unitPrice"]');
      if(priceInput) priceInput.addEventListener("blur", ()=>{
        let changed = false;
        if(q.items[i].roundUp){
          const rounded = roundUp100(q.items[i].unitPrice);
          if(rounded !== q.items[i].unitPrice){
            q.items[i].priceBeforeRoundUp = q.items[i].unitPrice;
            q.items[i].unitPrice = rounded;
            priceInput.value = rounded;
            changed = true;
          }
        }
        if(this.autoAddSmallItem(q, i)){
          this.touch(q);
          App.render();
          return;
        }
        if(changed){
          this.touch(q);
          this.updatePreview();
        }
      });
      const roundBox = tr.querySelector('[data-act="roundup10"]');
      if(roundBox) roundBox.addEventListener("change", ()=>{
        if(roundBox.checked){
          q.items[i].priceBeforeRoundUp = q.items[i].unitPrice;
          q.items[i].unitPrice = roundUp100(q.items[i].unitPrice);
        } else if(q.items[i].priceBeforeRoundUp !== undefined && q.items[i].priceBeforeRoundUp !== null){
          q.items[i].unitPrice = q.items[i].priceBeforeRoundUp;
        }
        q.items[i].roundUp = roundBox.checked;
        this.touch(q);
        App.render();
      });
      const suggestBtn = tr.querySelector('[data-act="suggest"]');
      if(suggestBtn) suggestBtn.addEventListener("click", ()=> this.openCandidateModal(q, i));
      const applyCalcBtn = tr.querySelector('[data-act="apply-calc-candidate"]');
      if(applyCalcBtn) applyCalcBtn.addEventListener("click", ()=>{
        q.items[i].unitPrice = q.items[i].calcCandidate;
        q.items[i].priceWarning = false;
        q.items[i].priceRef = { label: q.items[i].calcCandidateLabel, price: q.items[i].calcCandidate };
        q.items[i].appliedIndex = undefined;
        q.items[i].calcCandidate = undefined;
        this.autoAddSmallItem(q, i);
        this.touch(q);
        App.render();
      });
      tr.querySelectorAll('[data-act="apply-calc-candidate-multi"]').forEach(applyMultiBtn=>{
        applyMultiBtn.addEventListener("click", ()=>{
          const idx = Number(applyMultiBtn.dataset.idx);
          const chosen = q.items[i].calcCandidates[idx];
          q.items[i].unitPrice = chosen.price;
          q.items[i].priceWarning = false;
          q.items[i].priceRef = { label: chosen.label, price: chosen.price };
          q.items[i].appliedIndex = undefined;
          q.items[i].calcCandidates = undefined;
          this.touch(q);
          App.render();
        });
      });
      const calcBigBtn = tr.querySelector('[data-act="calc-big"]');
      if(calcBigBtn) calcBigBtn.addEventListener("click", ()=>{
        const s = Store.data.settings;
        const src = q.items[i];
        const bigPrice = roundUp10((src.unitPrice / s.baseContainerKg) * s.bigContainerKg + s.bigAddFee);
        q.items.splice(i+1, 0, { code:src.code, name:src.name, capacity:s.bigContainerKg, unit:src.unit||"Kg", unitPrice:bigPrice, note:src.note||"(国内缶)" });
        this.touch(q);
        App.render();
        toast(`${s.bigContainerKg}kgの単価（${yen(bigPrice)}）を算出して追加しました`);
      });
      const upBtn = tr.querySelector('[data-act="up"]');
      if(upBtn) upBtn.addEventListener("click", ()=>{
        if(i===0) return;
        [q.items[i-1], q.items[i]] = [q.items[i], q.items[i-1]];
        this.touch(q); App.render();
      });
      const downBtn = tr.querySelector('[data-act="down"]');
      if(downBtn) downBtn.addEventListener("click", ()=>{
        if(i===q.items.length-1) return;
        [q.items[i+1], q.items[i]] = [q.items[i], q.items[i+1]];
        this.touch(q); App.render();
      });
      const delBtn = tr.querySelector('[data-act="del"]');
      if(delBtn) delBtn.addEventListener("click", ()=>{
        q.items.splice(i,1);
        this.touch(q); App.render();
      });
    });

    document.getElementById("btn-add-blank").addEventListener("click", ()=>{
      q.items.push({ code:"", name:"", capacity: Store.data.settings.baseContainerKg, unit:"Kg", unitPrice:0, note:"(国内缶)" });
      this.touch(q); App.render();
    });

    document.getElementById("btn-add-from-master").addEventListener("click", ()=> this.openProductPicker(q));
  },

  // 16KGの単価が確定した際、対応する4KGの行が無ければ換算式で自動追加する
  autoAddSmallItem(q, itemIndex){
    const s = Store.data.settings;
    const src = q.items[itemIndex];
    if(!src || Number(src.capacity)!==s.baseContainerKg || !(Number(src.unitPrice)>0)) return false;
    const hasSmallAlready = q.items.some(x=> x.code===src.code && Number(x.capacity)===s.smallContainerKg);
    if(hasSmallAlready) return false;
    const smallPrice = roundUp10((src.unitPrice / s.baseContainerKg) * (s.smallContainerKg + s.smallAddKg) + s.smallAddFee);
    q.items.splice(itemIndex+1, 0, { code:src.code, name:src.name, capacity:s.smallContainerKg, unit:src.unit||"Kg", unitPrice:smallPrice, note:src.note||"(国内缶)" });
    toast(`${s.smallContainerKg}kgの単価（${yen(smallPrice)}）を自動算出して追加しました`);
    return true;
  },

  openProductPicker(q){
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    const products = Store.data.products;
    overlay.innerHTML = `
      <div class="modal wide">
        <div class="modal-head"><h2>製品一覧から追加</h2><button class="modal-close">×</button></div>
        <div class="modal-body">
          <div style="display:flex; gap:8px; margin-bottom:12px;">
            <input type="text" class="search-input" id="pp-search-code" style="flex:1;" placeholder="品番・品名でワード検索">
            <input type="text" class="search-input" id="pp-search-client" style="flex:1;" placeholder="取引先（会社名）でワード検索">
          </div>
          <table class="grid" id="pp-table">
            <thead><tr><th>品番</th><th>品名</th><th>特価</th><th>取引先</th><th>原価(円/kg)</th><th>推奨指数</th><th></th></tr></thead>
            <tbody>
              ${products.map(p=>{
                const lm = matchLineCode(p.code, Store.data.lineCodes);
                return `
                <tr data-id="${p.id}" data-search-codename="${escapeHtml(normalizeForSearch(p.code+" "+p.name))}" data-search-client="${escapeHtml(normalizeForSearch(p.client||""))}">
                  <td style="white-space:pre-line;">${escapeHtml(p.code)}</td>
                  <td style="white-space:pre-line;">${escapeHtml(p.name)}</td>
                  <td>${hasRecordedPrice(p.specialPrice) ? yen(p.specialPrice) + (p.specialKg!==undefined && p.specialKg!==""? `（${escapeHtml(String(p.specialKg))}kg）`:"") : "-"}</td>
                  <td>${p.client ? escapeHtml(p.client) : ""}</td>
                  <td>${yen(p.costPerKg)}</td>
                  <td>${lm ? `${lm.newIndex}<div class="hint" style="margin:0;">${escapeHtml(lm.name)}</div>` : "-"}</td>
                  <td><button class="btn small primary" data-act="pick">追加</button></td>
                </tr>`;}).join("")}
            </tbody>
          </table>
          ${!products.length? `<p class="hint">原価リストが空です。先に「特価/原価管理リスト」で製品を登録してください。</p>`:""}
        </div>
        <div class="modal-foot"><button class="btn" id="pp-cancel">閉じる</button></div>
      </div>`;
    document.body.appendChild(overlay);
    const close = ()=> overlay.remove();
    overlay.querySelector(".modal-close").addEventListener("click", close);
    overlay.querySelector("#pp-cancel").addEventListener("click", close);
    let ppSearchTimer = null;
    const applyPpFilter = ()=>{
      const t1 = normalizeForSearch(document.getElementById("pp-search-code").value.trim());
      const t2 = normalizeForSearch(document.getElementById("pp-search-client").value.trim());
      overlay.querySelectorAll("#pp-table tbody tr").forEach(tr=>{
        const match1 = !t1 || tr.dataset.searchCodename.includes(t1);
        const match2 = !t2 || tr.dataset.searchClient.includes(t2);
        tr.style.display = (match1 && match2) ? "" : "none";
      });
    };
    const scheduleFilter = ()=>{ clearTimeout(ppSearchTimer); ppSearchTimer = setTimeout(applyPpFilter, 200); };
    overlay.querySelector("#pp-search-code").addEventListener("input", scheduleFilter);
    overlay.querySelector("#pp-search-client").addEventListener("input", scheduleFilter);
    overlay.querySelectorAll('[data-act="pick"]').forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const tr = btn.closest("tr");
        const p = products.find(x=>x.id===tr.dataset.id);
        const s = Store.data.settings;
        const lineMatch = matchLineCode(p.code, Store.data.lineCodes);
        const recIdx = lineMatch ? lineMatch.newIndex : null;
        const ownSpecial = hasRecordedPrice(p.specialPrice);
        const hasAnySpecial = ownSpecial
          || !!findSpecialPriceEntry(p.code, p.client, s.baseContainerKg)
          || !!findSpecialPriceEntry(p.code, p.client, s.smallContainerKg)
          || !!findSpecialPriceEntry(p.code, p.client, s.bigContainerKg);

        const unit = unitForName(p.name);
        if(isHardener(p)){
          const cap = Number(p.specialKg) || 4;
          const hasOwnPrice = hasRecordedPrice(p.specialPrice);
          const item = { code:p.code, name:p.name, capacity:cap, unit, unitPrice: hasOwnPrice ? p.specialPrice : 0, note: p.note || "(国内缶)" };
          if(!hasOwnPrice) item.priceWarning = true;
          const items = [item];
          if(cap===4){
            const already1kg = q.items.some(x=>x.code===p.code && Number(x.capacity)===1);
            if(!already1kg){
              const cands = findHardener1kgCandidates(p);
              if(cands.length) items.push({ code:p.code, name:p.name, capacity:1, unit, unitPrice:0, note:p.note||"(国内缶)", calcCandidates:cands });
            }
          } else if(cap===1 && !hasOwnPrice){
            const cands = findHardener1kgCandidates(p);
            if(cands.length) item.calcCandidates = cands;
          }
          q.items.push(...items);
          this.touch(q);
          close();
          App.render();
          if(item.priceWarning) toast("特価が未登録のため単価が0円になっています（赤色のセルをご確認ください）", true);
          else toast(`「${p.code}」を追加しました`);
          return;
        }
        if(hasAnySpecial){
          const baseMatch = (ownSpecial && Number(p.specialKg)===s.baseContainerKg) ? p : findSpecialPriceEntry(p.code, p.client, s.baseContainerKg);
          const smallMatch = (ownSpecial && Number(p.specialKg)===s.smallContainerKg) ? p : findSpecialPriceEntry(p.code, p.client, s.smallContainerKg);
          const bigMatch = (ownSpecial && Number(p.specialKg)===s.bigContainerKg) ? p : findSpecialPriceEntry(p.code, p.client, s.bigContainerKg);
          const baseItem = baseMatch
            ? { code:p.code, name:p.name, capacity:s.baseContainerKg, unit, unitPrice:baseMatch.specialPrice, note:"(国内缶)" }
            : { code:p.code, name:p.name, capacity:s.baseContainerKg, unit, unitPrice:0, note:"(国内缶)", priceWarning:true };
          const smallItem = smallMatch
            ? { code:p.code, name:p.name, capacity:s.smallContainerKg, unit, unitPrice:smallMatch.specialPrice, note:"(国内缶)" }
            : { code:p.code, name:p.name, capacity:s.smallContainerKg, unit, unitPrice:0, note:"(国内缶)", priceWarning:true };
          if(!smallMatch && baseMatch){
            smallItem.calcCandidate = roundUp10((baseMatch.specialPrice / s.baseContainerKg) * (s.smallContainerKg + s.smallAddKg) + s.smallAddFee);
            smallItem.calcCandidateLabel = `${s.baseContainerKg}KG特価より算出`;
          }
          if(!baseMatch && smallMatch){
            baseItem.calcCandidate = roundUp10((smallMatch.specialPrice - s.smallAddFee) / (s.smallContainerKg + s.smallAddKg) * s.baseContainerKg);
            baseItem.calcCandidateLabel = `${s.smallContainerKg}KG特価より算出`;
          }
          const bigItem = bigMatch
            ? { code:p.code, name:p.name, capacity:s.bigContainerKg, unit, unitPrice:bigMatch.specialPrice, note:"(国内缶)" }
            : null;
          if(isThinnerProduct(p)){
            [[baseItem,s.baseContainerKg],[smallItem,s.smallContainerKg],[bigItem,s.bigContainerKg]].forEach(([it,cap])=>{
              if(!it) return;
              const cands = findSimilarClientPriceCandidates(p.code, cap, p.client);
              if(cands.length) it.calcCandidates = cands;
            });
          }
          if(ownSpecial && Number(p.specialKg)!==s.baseContainerKg && Number(p.specialKg)!==s.smallContainerKg && Number(p.specialKg)!==s.bigContainerKg){
            q.items.push({ code:p.code, name:p.name, capacity:p.specialKg, unit, unitPrice:p.specialPrice, note:"(国内缶)" });
          }
          q.items.push(baseItem, smallItem);
          if(bigItem) q.items.push(bigItem);
          this.touch(q);
          close();
          App.render();
          if(baseItem.priceWarning || smallItem.priceWarning) toast("特価が未登録の容量があります（赤色のセルをご確認ください）", true);
          else toast(`「${p.code}」の特価を反映しました`);
        } else {
          const costBaseItem = { code:p.code, name:p.name, capacity:s.baseContainerKg, unit, unitPrice:0, note:"(国内缶)", priceWarning:true };
          const costSmallItem = { code:p.code, name:p.name, capacity:s.smallContainerKg, unit, unitPrice:0, note:"(国内缶)", priceWarning:true };
          if(isThinnerProduct(p)){
            [[costBaseItem,s.baseContainerKg],[costSmallItem,s.smallContainerKg]].forEach(([it,cap])=>{
              const cands = findSimilarClientPriceCandidates(p.code, cap, p.client);
              if(cands.length) it.calcCandidates = cands;
            });
          }
          q.items.push(costBaseItem);
          q.items.push(costSmallItem);
          this.touch(q);
          close();
          App.render();
          toast("特価が未登録のため単価が0円になっています（赤色のセルをご確認ください）", true);
        }
      });
    });
  },

  openCandidateModal(q, itemIndex){
    const item = q.items[itemIndex];
    const s = Store.data.settings;
    const product = Store.data.products.find(p=>p.code.trim()===item.code.trim());
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";

    const lineMatch = matchLineCode(product ? product.code : item.code, Store.data.lineCodes);
    const recIdx = lineMatch ? lineMatch.newIndex : null;
    const minPrice = getMinPrice(product, lineMatch, item.capacity, s);
    const isStdCapacity = item.capacity === s.baseContainerKg || item.capacity === s.smallContainerKg || item.capacity === s.bigContainerKg;

    let bodyHtml;
    if(!product){
      const lineInfo = lineMatch
        ? `ラインコード一致：<strong>${escapeHtml(lineMatch.code)}</strong>（${escapeHtml(lineMatch.name)}）／推奨指数 <strong>${lineMatch.newIndex}</strong>${minPrice?` ／ 最低価格：${yen(minPrice)}`:""}`
        : "一致するラインコードも見つかりませんでした。";
      bodyHtml = `<p class="hint">この品番は原価リストに登録されていません。${lineInfo}</p>`;
      if(isStdCapacity){
        bodyHtml += `
          <div class="field" style="margin-top:14px;">
            <label>原価（円/kg）を手入力して単価候補を計算</label>
            <div style="display:flex;gap:8px;align-items:center;">
              <input type="number" step="1" id="manual-cost" style="width:140px;" placeholder="例：850">
              <button class="btn small primary" id="btn-manual-cost-calc">計算</button>
            </div>
            <div id="manual-cost-result" style="margin-top:10px;"></div>
          </div>`;
      } else {
        bodyHtml += `<p class="hint">容量が基準容量（${s.baseContainerKg}kg）・小容量（${s.smallContainerKg}kg）・大容量（${s.bigContainerKg}kg）以外のため、自動計算の対象外です。単価は手入力してください。</p>`;
      }
    } else if(!isStdCapacity){
      bodyHtml = `<p class="hint">容量が基準容量（${s.baseContainerKg}kg）・小容量（${s.smallContainerKg}kg）・大容量（${s.bigContainerKg}kg）以外のため、自動計算の対象外です。単価は手入力してください。</p>`;
    } else {
      const cand = calcPriceCandidates(product.costPerKg, s, recIdx);
      const candList = item.capacity === s.baseContainerKg ? cand.base : (item.capacity === s.bigContainerKg ? cand.big : cand.small);
      const list = candList.slice()
        .sort((a,b)=> (b.recommended - a.recommended) || (a.index - b.index));
      bodyHtml = `
        <p class="hint">品番：${escapeHtml(product.code).replace(/\n/g," ")} ／ 原価：${yen(product.costPerKg)}/kg ／ 容量：${item.capacity}kg
          ${lineMatch?` ／ ラインコード一致：<strong>${escapeHtml(lineMatch.code)}</strong>（${escapeHtml(lineMatch.name)}）`:" ／ ラインコード一致なし（推奨指数なし）"}
          ${minPrice?` ／ 最低価格：${yen(minPrice)}`:""}
        </p>
        <div class="candidate-list">
          ${list.map(c=>{
            const warn = approvalLevel(c.index, s);
            const belowMin = minPrice && c.price < minPrice;
            return `<div class="candidate-item" data-price="${c.price}" data-idx="${c.index}">
              <div>
                <div class="idx">指数 ${c.index.toFixed(2)} ${c.recommended?`<span class="badge sealed" style="margin-left:4px;">推奨（新指数）</span>`:""}</div>
                <div class="price">${yen(c.price)}</div>
                ${warn?`<div class="warn">⚠ ${warn}</div>`:""}
                ${belowMin?`<div class="warn">⚠ 最低価格（${yen(minPrice)}）を下回っています</div>`:""}
              </div>
              <button class="btn small primary" data-act="apply-candidate">この単価にする</button>
            </div>`;
          }).join("")}
        </div>
        <div class="field" style="margin-top:16px;">
          <label>カスタム指数で計算（任意の指数を自由に指定できます）</label>
          <div style="display:flex;gap:8px;align-items:center;">
            <input type="number" step="0.01" min="0.10" max="0.99" id="custom-idx" style="width:100px;">
            <button class="btn small" id="btn-custom-calc">計算</button>
          </div>
          <div id="custom-result" style="margin-top:8px;"></div>
        </div>`;
    }

    const manualHtml = `
      <div class="field" style="margin-top:16px; padding-top:14px; border-top:1px solid var(--color-border);">
        <label>単価を直接入力（任意の金額をそのまま適用）</label>
        <div style="display:flex;gap:8px;align-items:center;">
          <input type="number" step="1" id="manual-price" style="width:140px;" placeholder="例：15000" value="${item.unitPrice||""}">
          <button class="btn small primary" id="btn-manual-apply">この価格にする</button>
        </div>
      </div>`;

    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-head"><h2>単価候補（${escapeHtml(String(item.capacity))}${escapeHtml(item.unit||"Kg")}）</h2><button class="modal-close">×</button></div>
        <div class="modal-body">${bodyHtml}${manualHtml}</div>
        <div class="modal-foot"><button class="btn" id="cm-cancel">閉じる</button></div>
      </div>`;
    document.body.appendChild(overlay);
    const close = ()=> overlay.remove();
    overlay.querySelector(".modal-close").addEventListener("click", close);
    overlay.querySelector("#cm-cancel").addEventListener("click", close);
    overlay.querySelector("#btn-manual-apply").addEventListener("click", ()=>{
      const price = Number(overlay.querySelector("#manual-price").value);
      if(!Number.isFinite(price) || price < 0){ toast("有効な金額を入力してください", true); return; }
      item.unitPrice = price;
      item.appliedIndex = undefined;
      item.priceRef = undefined;
      this.autoAddSmallItem(q, itemIndex);
      this.touch(q);
      close();
      App.render();
    });
    overlay.querySelectorAll('[data-act="apply-candidate"]').forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const el = btn.closest(".candidate-item");
        const price = Number(el.dataset.price);
        item.unitPrice = price;
        item.appliedIndex = el.dataset.idx!==undefined ? Number(el.dataset.idx) : undefined;
        item.priceRef = undefined;
        this.autoAddSmallItem(q, itemIndex);
        this.touch(q);
        close();
        App.render();
      });
    });
    const customBtn = overlay.querySelector("#btn-custom-calc");
    if(customBtn && product){
      customBtn.addEventListener("click", ()=>{
        const idx = Number(document.getElementById("custom-idx").value);
        if(!idx || idx<=0){ toast("有効な指数を入力してください", true); return; }
        const cand = calcPriceCandidates(product.costPerKg, s);
        const gBase = cand.gBase, hBase = cand.hBase;
        let price;
        if(item.capacity === s.baseContainerKg){
          price = roundUp10(hBase/idx);
        } else if(item.capacity === s.bigContainerKg){
          const basePriceAtIdx = roundUp10(hBase/idx);
          price = roundUp10((basePriceAtIdx/s.baseContainerKg)*s.bigContainerKg+s.bigAddFee);
        } else {
          const basePriceAtIdx = roundUp10(hBase/idx);
          price = roundUp10((basePriceAtIdx/s.baseContainerKg)*(s.smallContainerKg+s.smallAddKg)+s.smallAddFee);
        }
        const warn = approvalLevel(idx, s);
        const belowMin = minPrice && price < minPrice;
        const resultEl = document.getElementById("custom-result");
        resultEl.innerHTML = `<div class="candidate-item" data-price="${price}">
          <div><div class="idx">指数 ${idx.toFixed(2)}</div><div class="price">${yen(price)}</div>${warn?`<div class="warn">⚠ ${warn}</div>`:""}${belowMin?`<div class="warn">⚠ 最低価格（${yen(minPrice)}）を下回っています</div>`:""}</div>
          <button class="btn small primary" data-act="apply-candidate">この単価にする</button>
        </div>`;
        resultEl.querySelector('[data-act="apply-candidate"]').addEventListener("click", ()=>{
          item.unitPrice = price;
          item.appliedIndex = idx;
          item.priceRef = undefined;
          this.autoAddSmallItem(q, itemIndex);
          this.touch(q);
          close();
          App.render();
        });
      });
    }
    const manualCostBtn = overlay.querySelector("#btn-manual-cost-calc");
    if(manualCostBtn){
      manualCostBtn.addEventListener("click", ()=>{
        const cost = Number(document.getElementById("manual-cost").value);
        if(!cost || cost<=0){ toast("有効な原価を入力してください", true); return; }
        const cand = calcPriceCandidates(cost, s, recIdx);
        const list = (item.capacity === s.baseContainerKg ? cand.base : cand.small).slice()
          .sort((a,b)=> (b.recommended - a.recommended) || (a.index - b.index));
        const resultEl = document.getElementById("manual-cost-result");
        resultEl.innerHTML = `<div class="candidate-list">${list.map(c=>{
          const warn = approvalLevel(c.index, s);
          const belowMin = minPrice && c.price < minPrice;
          return `<div class="candidate-item" data-price="${c.price}" data-idx="${c.index}">
            <div>
              <div class="idx">指数 ${c.index.toFixed(2)} ${c.recommended?`<span class="badge sealed" style="margin-left:4px;">推奨（新指数）</span>`:""}</div>
              <div class="price">${yen(c.price)}</div>
              ${warn?`<div class="warn">⚠ ${warn}</div>`:""}
              ${belowMin?`<div class="warn">⚠ 最低価格（${yen(minPrice)}）を下回っています</div>`:""}
            </div>
            <button class="btn small primary" data-act="apply-candidate">この単価にする</button>
          </div>`;
        }).join("")}</div>`;
        resultEl.querySelectorAll('[data-act="apply-candidate"]').forEach(btn=>{
          btn.addEventListener("click", ()=>{
            const el = btn.closest(".candidate-item");
            const price = Number(el.dataset.price);
            item.unitPrice = price;
            item.manualCostPerKg = cost;
            item.appliedIndex = el.dataset.idx!==undefined ? Number(el.dataset.idx) : undefined;
            item.priceRef = undefined;
            this.autoAddSmallItem(q, itemIndex);
            this.touch(q);
            close();
            App.render();
          });
        });
      });
    }
  },

  openSealModal(q, index){
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    const settings = Store.data.settings;
    const sealNames = settings.sealNames || [];
    const lastName = Store.data.lastSealName || "";
    const nameOptions = sealNames.map(n=>
      `<option value="${escapeHtml(n)}" ${n===lastName?"selected":""}>${escapeHtml(n)}</option>`
    ).join("");
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-head"><h2>検印</h2><button class="modal-close">×</button></div>
        <div class="modal-body">
          <div style="display:flex; gap:20px; align-items:flex-start;">
            <div style="flex:1;">
              <div class="field"><label>部署</label><input type="text" value="${escapeHtml(FIXED_SEAL_DEPT)}" disabled></div>
              <div class="field">
                <label>氏名（リストから選択）</label>
                <select id="seal-name-picker">
                  <option value="">－ 選択してください －</option>
                  ${nameOptions}
                </select>
              </div>
              <div class="field"><label>氏名（自由入力も可・2〜4文字程度）</label><input type="text" id="seal-name" maxlength="6" placeholder="例：平井" value="${escapeHtml(lastName)}"></div>
              <p class="hint">確定すると、検印した日付とあわせて見積書に記録されます。検印後は内容編集がロックされます。</p>
            </div>
            <div class="seal-stamp" id="seal-preview"></div>
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn" id="seal-cancel">キャンセル</button>
          <button class="btn primary" id="seal-confirm">検印する</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const close = ()=> overlay.remove();
    const pickerEl = overlay.querySelector("#seal-name-picker");
    const nameInput = overlay.querySelector("#seal-name");
    const previewEl = overlay.querySelector("#seal-preview");
    const updatePreview = ()=>{
      previewEl.innerHTML = sealStampInnerHTML({ dept: FIXED_SEAL_DEPT, name: nameInput.value.trim() || "　", sealedAt: new Date().toISOString() });
    };
    pickerEl.addEventListener("change", ()=>{
      if(pickerEl.value) nameInput.value = pickerEl.value;
      updatePreview();
    });
    nameInput.addEventListener("input", ()=>{
      if(pickerEl.value && pickerEl.value !== nameInput.value.trim()) pickerEl.value = "";
      updatePreview();
    });
    overlay.querySelector(".modal-close").addEventListener("click", close);
    overlay.querySelector("#seal-cancel").addEventListener("click", close);
    updatePreview();
    nameInput.focus();
    nameInput.select();
    overlay.querySelector("#seal-confirm").addEventListener("click", ()=>{
      const name = nameInput.value.trim();
      if(!name){ toast("氏名を入力してください", true); return; }
      q.seals[index] = { name, dept: FIXED_SEAL_DEPT, sealedAt: new Date().toISOString() };
      Store.data.lastSealName = name;
      this.touch(q);
      close();
      App.render();
    });
  },

  printQuote(q, opts){
    const includeTrial = !!(opts && opts.includeTrial);
    const s = Store.data.settings;
    const printRoot = document.getElementById("print-root");
    printRoot.innerHTML = includeTrial
      ? renderQuoteSheetHTML(q, s) + renderTrialSheetHTML(q, s)
      : renderQuoteSheetHTML(q, s);

    const dateStr = (q.date || toDateInputValue(new Date())).replace(/-/g, "");
    const clientStr = (q.customerCompany || "").trim();
    const firstCode = (q.items && q.items[0] && q.items[0].code) ? q.items[0].code.trim() : "";
    let fileName = [dateStr, clientStr, firstCode].filter(Boolean).join("_").replace(/[\\/:*?"<>|]/g, "_") || "見積書";
    if(includeTrial) fileName += "_見積書＋新試算表";
    const originalTitle = document.title;
    document.title = fileName;
    const restoreTitle = ()=>{ document.title = originalTitle; window.removeEventListener("afterprint", restoreTitle); };
    window.addEventListener("afterprint", restoreTitle);

    setTimeout(()=> window.print(), 50);
  }
};

/* ==========================================================
   起動
   ========================================================== */
document.addEventListener("DOMContentLoaded", ()=> App.init());
