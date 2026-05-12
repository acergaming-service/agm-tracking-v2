// ══════════════════════════════════════════════════════════════════════════════
// AGM 遊戲片追貨平台 v2 — Firebase 設定與共用常數
// ══════════════════════════════════════════════════════════════════════════════

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyA-eDT7V7asiQ5ebGca-wBif8P-uW89_iQ",
  authDomain: "agm-tracking.firebaseapp.com",
  databaseURL: "https://agm-tracking-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "agm-tracking",
  storageBucket: "agm-tracking.firebasestorage.app",
  messagingSenderId: "91450833150",
  appId: "1:91450833150:web:79e5b01783be48ebff4daf"
};

// ── Firebase 資料結構說明 ────────────────────────────────────────────────────
//
// products/{vendor}/{pid}
//   id, pn, platform, category, barcode, spec, name
//   srp, priceTax, price, priceSpecial
//   moq, isAllocation, priceTag, giftItem, displayNote
//
// dealers/{dealerId}
//   name, sales, code
//
// orders/{dealerId}/{pid}
//   qty, note, updatedAt
//
// inventory/{pid}
//   initialStock    - 初始庫存（後勤設定）
//   currentStock    - 可用庫存（自動計算）
//   updatedAt
//   note
//
// replenishments/{pid}/{repId}
//   qty             - 補貨量
//   eta             - 預計到貨日
//   receivedQty     - 實際已到貨量
//   status          - pending | incoming | partial_arrived | completed
//   note
//   createdBy       - 'pm'
//   createdAt
//   arrivals[]      - 到貨記錄 [{date, qty, note}]
//
// allocations/{pid}/{dealerId}
//   allocatedQty    - 後勤分配量
//   note
//   updatedAt
//
// window
//   open, week, startTime, endTime
//
// orders_archive/{week}
//   orders, archivedAt, week
//
// ── 角色與密碼 ──────────────────────────────────────────────────────────────
// 後勤：agm2025
// PM：pm2025
// Super Admin：super2025
// 業務：選姓名（無密碼）
// 經銷商：dealer.html?code=XX2025

// ── 角色常數 ────────────────────────────────────────────────────────────────
const ROLES = {
  LOGISTICS: 'logistics',
  PM: 'pm',
  SALES: 'sales',
  DEALER: 'dealer',
  SUPERADMIN: 'superadmin',
};

const PASSWORDS = {
  logistics: 'agm2025',
  pm: 'pm2025',
  superadmin: 'super2025',
};

const SALES_LIST = ['Edward','Wythe','Eric','Hsinhui','AKI','Tom','Mickey','Meg'];

// ── 補貨狀態 ────────────────────────────────────────────────────────────────
const REPLENISHMENT_STATUS = {
  pending:          { l:'待下單',    color:'#6B7280', bg:'#F3F4F6', bd:'#D1D5DB' },
  incoming:         { l:'追加中',    color:'#1D6EF5', bg:'#DBEAFE', bd:'#BFDBFE' },
  partial_arrived:  { l:'部分到貨',  color:'#D97706', bg:'#FEF9C3', bd:'#FDE68A' },
  completed:        { l:'已完成',    color:'#16A34A', bg:'#DCFCE7', bd:'#BBF7D0' },
};

// ── 需求摘要狀態 ─────────────────────────────────────────────────────────────
const DEMAND_STATUS = {
  ok:               { l:'現貨足夠',  color:'#16A34A', bg:'#DCFCE7', bd:'#BBF7D0' },
  shortage_pending: { l:'待補貨',    color:'#DC2626', bg:'#FEE2E2', bd:'#FECACA' },
  replenishing:     { l:'追加中',    color:'#1D6EF5', bg:'#DBEAFE', bd:'#BFDBFE' },
  partial_arrived:  { l:'部分到貨',  color:'#D97706', bg:'#FEF9C3', bd:'#FDE68A' },
  completed:        { l:'已完成',    color:'#16A34A', bg:'#DCFCE7', bd:'#BBF7D0' },
};

// ── 貨物狀態（前台顯示用）────────────────────────────────────────────────────
const PRODUCT_STATUS = {
  '':            { l:'— 未設定',  canOrder: true  },
  instock:       { l:'現貨',      canOrder: true  },
  preorder:      { l:'追加中',    canOrder: true  },
  clearance:     { l:'出清',      canOrder: true  },
  unavailable:   { l:'停止供應',  canOrder: false },
};

// ── 通路清單 ─────────────────────────────────────────────────────────────────
const DEFAULT_DEALERS = {
  wangqi:      { name:'王碁',    sales:'Edward',  code:'WQ' },
  pulei:       { name:'普雷伊',  sales:'Edward',  code:'PL' },
  xingyun:     { name:'馨運',    sales:'Edward',  code:'XY' },
  yishidai:    { name:'壹世代',  sales:'Edward',  code:'YS' },
  moli:        { name:'摩力科',  sales:'Hsinhui', code:'ML' },
  pipi:        { name:'PIPI',   sales:'Hsinhui', code:'PP' },
  xinglong:    { name:'星龍',    sales:'Hsinhui', code:'XL' },
  ge:          { name:'GE',     sales:'Hsinhui', code:'GE' },
  lucky:       { name:'幸運草',  sales:'Hsinhui', code:'LC' },
  yuesheng:    { name:'玥勝',    sales:'Hsinhui', code:'YSH' },
  kaifa:       { name:'凱發',    sales:'Eric',    code:'KF' },
  dinosaur:    { name:'恐龍',    sales:'Eric',    code:'KL' },
  weixin:      { name:'偉昕',    sales:'Eric',    code:'WX' },
  gamer:       { name:'遊戲達人',sales:'Eric',    code:'YX' },
  kb:          { name:'KB',     sales:'Eric',    code:'KB' },
  ksns:        { name:'高雄NS', sales:'Eric',    code:'KNS' },
  chengyi:     { name:'誠翼',    sales:'Mickey',  code:'CY' },
  books:       { name:'Books',  sales:'Mickey',  code:'BK' },
  bahamu:      { name:'巴哈姆特',sales:'Mickey',  code:'BH' },
  samsui:      { name:'三井',    sales:'Mickey',  code:'SW' },
  sunding:     { name:'順發',    sales:'AKI',     code:'SF' },
  ada:         { name:'艾達',    sales:'AKI',     code:'AT' },
  drz:         { name:'DRZ',    sales:'AKI',     code:'DZ' },
  pchome:      { name:'PCHOME', sales:'Wythe',   code:'PC' },
  momo:        { name:'MOMO',   sales:'Wythe',   code:'MM' },
  yahoo:       { name:'YAHOO',  sales:'Wythe',   code:'YH' },
  shennao:     { name:'神腦',    sales:'Tom',     code:'SN' },
  waruji:      { name:'丸紀',    sales:'Tom',     code:'WJ' },
  weilink:     { name:'WEILINK',sales:'Hsinhui', code:'WL' },
  tsandkun:    { name:'燦坤',    sales:'Wythe',   code:'CK' },
  carrefour:   { name:'家樂福',  sales:'Wythe',   code:'CF' },
  fayake:      { name:'法雅客',  sales:'Tom',     code:'FY' },
  quanguo:     { name:'全國',    sales:'Tom',     code:'QG' },
  shengheng:   { name:'昇恆昌',  sales:'AKI',     code:'SH' },
  yuji:        { name:'宇頡',    sales:'Hsinhui', code:'YJ' },
  djiaostone:  { name:'墊腳石',  sales:'Wythe',   code:'DS' },
  ziming:      { name:'梓萌',    sales:'AKI',     code:'ZM' },
  uli:         { name:'U李',    sales:'AKI',     code:'UL' },
  chaowei:     { name:'超威',    sales:'AKI',     code:'CW' },
  pengshi:     { name:'彭氏',    sales:'Hsinhui', code:'PS' },
  fengding:    { name:'峰鼎',    sales:'Hsinhui', code:'FD' },
  xiaowangzi:  { name:'小王子',  sales:'AKI',     code:'XW' },
  agmec:       { name:'AGM EC', sales:'Meg',     code:'AE' },
  qita:        { name:'其他',    sales:'Meg',     code:'QT' },
  zhanbao:     { name:'展碁',    sales:'Tom',     code:'ZB' },
};
