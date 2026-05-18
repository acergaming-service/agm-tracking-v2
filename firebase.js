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
// orders/{week}/{dealerId}/{productId}
//   qty               - 訂購數量
//   note              - 備註
//   srpAtOrder        - 下單時 SRP（價格快照，只在首次建立時寫入）
//   priceTaxAtOrder   - 下單時出貨價含稅（價格快照）
//   priceAtOrder      - 下單時出貨價未稅（價格快照）
//   submitted         - boolean，經銷商確認送出後為 true
//   submittedAt       - ISO timestamp
//   updatedAt         - ISO timestamp
//
// inventory/{pid}
//   initialStock    - 初始庫存（後勤設定）
//   updatedAt       - ISO timestamp
//   note
//   ※ availableStock 由 client 計算：initialStock + arrivedQty - totalDemandQty
//
// replenishments/{pid}/{repId}
//   qty             - 補貨量
//   eta             - 預計到貨日
//   receivedQty     - 實際累計到貨量（由後勤確認到貨時累加）
//   status          - pending | incoming | partial_arrived | completed
//   note
//   createdBy       - 'pm'
//   createdAt
//
// allocations/{week}/{productId}/{dealerId}
//   allocatedQty    - 後勤分配量
//   note
//   updatedAt
//
// replenishmentArrivals/{repId}/{arrivalId}
//   productId, qty, date, note, createdAt, createdBy
//
// window
//   open, week, startTime, endTime
//
// orders_archive/{week}
//   orders, archivedAt, week
//
// settings/pmUsers/{pmId}
//   name, active, archived, note, createdAt, updatedAt
//
// settings/vendorOwners/{vendorKey}   (vendorKey = BNE / GS / SONY / PLAYSEAT / NLR …)
//   displayName, ownerPmId, displayOrder, color, active, archived, note
//   ownerPmId = FK → settings/pmUsers
//   DB always stores GS (not GSE); UI displays GSE via vendorLabel()
//   allowedPlatforms: { {platformKey}: true }   ← null/absent = fallback all active
//   allowedCategories: { {categoryKey}: true }  ← null/absent = fallback all active
//   allowedPlatforms key = FK → settings/productOptions/platforms
//   allowedCategories key = FK → settings/productOptions/categories
//
// settings/productOptions/{type}/{key}
//   type = platforms | categories | statuses | priceTags   (vendors removed — use vendorOwners)
//   label, displayOrder, active, archived, note, createdAt, updatedAt
//   vendors/statuses → select value = key
//   platforms/categories/priceTags → select value = label (matches product data)
//   priceTags legacy: may exist as plain array (read-only backward-compat)
//
// settings/productLines/{lineId}   ← LEGACY, do not write, do not delete
//   (kept in DB as historical data; not read by any active page)
//
// products/{vendor}/{pid}
//   productLineId (optional) ← LEGACY field, do not write, do not delete
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
  wangqi:      { name:'王碁',    sales:'Edward',  salesId:'edward',  code:'WQ',  active:true, archived:false },
  pulei:       { name:'普雷伊',  sales:'Edward',  salesId:'edward',  code:'PL',  active:true, archived:false },
  xingyun:     { name:'馨運',    sales:'Edward',  salesId:'edward',  code:'XY',  active:true, archived:false },
  yishidai:    { name:'壹世代',  sales:'Edward',  salesId:'edward',  code:'YS',  active:true, archived:false },
  moli:        { name:'摩力科',  sales:'Hsinhui', salesId:'hsinhui', code:'ML',  active:true, archived:false },
  pipi:        { name:'PIPI',   sales:'Hsinhui', salesId:'hsinhui', code:'PP',  active:true, archived:false },
  xinglong:    { name:'星龍',    sales:'Hsinhui', salesId:'hsinhui', code:'XL',  active:true, archived:false },
  ge:          { name:'GE',     sales:'Hsinhui', salesId:'hsinhui', code:'GE',  active:true, archived:false },
  lucky:       { name:'幸運草',  sales:'Hsinhui', salesId:'hsinhui', code:'LC',  active:true, archived:false },
  yuesheng:    { name:'玥勝',    sales:'Hsinhui', salesId:'hsinhui', code:'YSH', active:true, archived:false },
  kaifa:       { name:'凱發',    sales:'Eric',    salesId:'eric',    code:'KF',  active:true, archived:false },
  dinosaur:    { name:'恐龍',    sales:'Eric',    salesId:'eric',    code:'KL',  active:true, archived:false },
  weixin:      { name:'偉昕',    sales:'Eric',    salesId:'eric',    code:'WX',  active:true, archived:false },
  gamer:       { name:'遊戲達人',sales:'Eric',    salesId:'eric',    code:'YX',  active:true, archived:false },
  kb:          { name:'KB',     sales:'Eric',    salesId:'eric',    code:'KB',  active:true, archived:false },
  ksns:        { name:'高雄NS', sales:'Eric',    salesId:'eric',    code:'KNS', active:true, archived:false },
  chengyi:     { name:'誠翼',    sales:'Mickey',  salesId:'mickey',  code:'CY',  active:true, archived:false },
  books:       { name:'Books',  sales:'Mickey',  salesId:'mickey',  code:'BK',  active:true, archived:false },
  bahamu:      { name:'巴哈姆特',sales:'Mickey',  salesId:'mickey',  code:'BH',  active:true, archived:false },
  samsui:      { name:'三井',    sales:'Mickey',  salesId:'mickey',  code:'SW',  active:true, archived:false },
  sunding:     { name:'順發',    sales:'AKI',     salesId:'aki',     code:'SF',  active:true, archived:false },
  ada:         { name:'艾達',    sales:'AKI',     salesId:'aki',     code:'AT',  active:true, archived:false },
  drz:         { name:'DRZ',    sales:'AKI',     salesId:'aki',     code:'DZ',  active:true, archived:false },
  pchome:      { name:'PCHOME', sales:'Wythe',   salesId:'wythe',   code:'PC',  active:true, archived:false },
  momo:        { name:'MOMO',   sales:'Wythe',   salesId:'wythe',   code:'MM',  active:true, archived:false },
  yahoo:       { name:'YAHOO',  sales:'Wythe',   salesId:'wythe',   code:'YH',  active:true, archived:false },
  shennao:     { name:'神腦',    sales:'Tom',     salesId:'tom',     code:'SN',  active:true, archived:false },
  waruji:      { name:'丸紀',    sales:'Tom',     salesId:'tom',     code:'WJ',  active:true, archived:false },
  weilink:     { name:'WEILINK',sales:'Hsinhui', salesId:'hsinhui', code:'WL',  active:true, archived:false },
  tsandkun:    { name:'燦坤',    sales:'Wythe',   salesId:'wythe',   code:'CK',  active:true, archived:false },
  carrefour:   { name:'家樂福',  sales:'Wythe',   salesId:'wythe',   code:'CF',  active:true, archived:false },
  fayake:      { name:'法雅客',  sales:'Tom',     salesId:'tom',     code:'FY',  active:true, archived:false },
  quanguo:     { name:'全國',    sales:'Tom',     salesId:'tom',     code:'QG',  active:true, archived:false },
  shengheng:   { name:'昇恆昌',  sales:'AKI',     salesId:'aki',     code:'SH',  active:true, archived:false },
  yuji:        { name:'宇頡',    sales:'Hsinhui', salesId:'hsinhui', code:'YJ',  active:true, archived:false },
  djiaostone:  { name:'墊腳石',  sales:'Wythe',   salesId:'wythe',   code:'DS',  active:true, archived:false },
  ziming:      { name:'梓萌',    sales:'AKI',     salesId:'aki',     code:'ZM',  active:true, archived:false },
  uli:         { name:'U李',    sales:'AKI',     salesId:'aki',     code:'UL',  active:true, archived:false },
  chaowei:     { name:'超威',    sales:'AKI',     salesId:'aki',     code:'CW',  active:true, archived:false },
  pengshi:     { name:'彭氏',    sales:'Hsinhui', salesId:'hsinhui', code:'PS',  active:true, archived:false },
  fengding:    { name:'峰鼎',    sales:'Hsinhui', salesId:'hsinhui', code:'FD',  active:true, archived:false },
  xiaowangzi:  { name:'小王子',  sales:'AKI',     salesId:'aki',     code:'XW',  active:true, archived:false },
  agmec:       { name:'AGM EC', sales:'Meg',     salesId:'meg',     code:'AE',  active:true, archived:false },
  qita:        { name:'其他',    sales:'Meg',     salesId:'meg',     code:'QT',  active:true, archived:false },
  zhanbao:     { name:'展碁',    sales:'Tom',     salesId:'tom',     code:'ZB',  active:true, archived:false },
};
