# AGM 遊戲片追貨平台 v2 — 系統架構規格

## 一、系統定位

**不是 ERP**，而是：

> 需求統計 ＋ 庫存追蹤 ＋ PM 補貨透明化 ＋ 到貨進度同步

**第一版不做：**
- 自動配貨 / Allocation Engine
- FIFO 成本 / 財務庫存
- 多倉管理
- Reserved / Allocated Stock

---

## 二、技術架構

| 項目 | 規格 |
|------|------|
| 前端 | 純靜態 HTML（無框架，無 build step） |
| 資料庫 | Firebase Realtime Database（asia-southeast1） |
| 部署 | GitHub Pages（auto deploy from main branch） |
| 字體 | Noto Sans TC + JetBrains Mono |
| 樣式 | CSS Variables，無 CSS 框架 |

---

## 三、角色與權限

| 角色 | 入口 | 密碼 | 可執行操作 |
|------|------|------|-----------|
| 後勤 | index.html | agm2025 | 庫存初始化/調整、人工分配、到貨確認、結算歸檔、通知 Sales |
| PM | index.html | pm2025 | 商品新增/編輯、補貨記錄建立（qty/ETA）、補貨刪除 |
| 業務 | index.html | 選姓名 | 查看轄區訂單進度、補貨到貨狀況（唯讀） |
| 經銷商 | dealer.html?code=XX2025 | 無 | 填寫每週訂購數量 |
| Super Admin | index.html | super2025 | 初始化產品/通路資料庫、危險操作 |

業務清單：Edward / Wythe / Eric / Hsinhui / AKI / Tom / Mickey / Meg

---

## 四、Firebase 資料結構

```
/products/{vendor}/{productId}
  id            string
  pn            string    AGBS P/N
  platform      string    NS | NS2 | PS5 | PS4 | VR
  category      string    軟體 | 主機 | 周邊 | ...
  barcode       string    國際條碼 EAN
  spec          string    規格/型號
  name          string    中文品名
  srp           number    建議售價（含稅）
  priceTax      number    出貨價（含稅）
  price         number    出貨價（未稅）
  priceSpecial  number    優惠出貨價（SONY用）
  moq           number    最低起訂量
  status        string    instock | preorder | clearance | unavailable
  arrival       string    到貨日（文字）
  priceTag      string    促銷標籤
  displayNote   string    前台備註
  giftItem      string    附贈品說明
  isAllocation  boolean   是否分配出貨

/dealers/{dealerId}
  name          string
  sales         string    對應業務姓名
  code          string    通路代碼（用於 URL）

/orders/{week}/{dealerId}/{productId}
  qty               number   訂購數量
  note              string   備註
  srpAtOrder        number   下單時的 SRP（價格快照）
  priceTaxAtOrder   number   下單時的出貨價含稅（價格快照）
  priceAtOrder      number   下單時的出貨價未稅（價格快照）
  updatedAt         string   ISO timestamp

/inventory/{productId}
  initialStock  number    初始庫存（後勤設定）
  updatedAt     string    ISO timestamp
  note          string

/replenishments/{productId}/{repId}
  qty           number    補貨量
  eta           string    預計到貨日（YYYY-MM-DD）
  receivedQty   number    實際累計到貨量（由後勤確認到貨時累加）
  status        string    pending | incoming | partial_arrived | completed
  note          string
  createdBy     string    'pm'
  createdAt     string    ISO timestamp

/replenishmentArrivals/{repId}/{arrivalId}
  productId     string    對應品項 ID
  qty           number    本次到貨數量
  date          string    到貨日期
  note          string
  createdAt     string    ISO timestamp
  createdBy     string    'logistics'

/allocations/{week}/{productId}/{dealerId}
  allocatedQty  number    後勤分配量
  updatedAt     string

/window
  open          boolean   收單視窗是否開放
  week          string    週次（2025-W20）
  startTime     string    收單開始時間
  endTime       string    收單截止時間

/orders_archive/{week}
  orders        object    歸檔的訂單快照
  archivedAt    string
  week          string
```

---

## 五、核心計算邏輯

### availableStock（可用庫存）
```
availableStock = initialStock + arrivedQty - totalDemandQty
（可為負數，代表實際缺貨）
```

### realShortageQty（實際缺口）
```
realShortageQty = totalDemandQty - (initialStock + arrivedQty)
用途：反映當下真實缺貨狀況，需要等到貨才能出
```

### plannedShortageQty（計畫缺口）
```
plannedShortageQty = totalDemandQty - (initialStock + totalReplenishmentQty)
用途：反映補貨計畫是否足夠，>0 代表即使全數到貨仍不足，需再追加
```

### demandStatus（需求摘要狀態）
```
if totalDemandQty === 0                        → ''（無需求）
if initialStock >= totalDemandQty              → 'ok'（現貨足夠）
if reps.length === 0 && shortageQty > 0        → 'shortage_pending'（待補貨）
if reps.every(r => r.status === 'completed')   → 'completed'（已完成）
if reps.some(r => r.receivedQty > 0)           → 'partial_arrived'（部分到貨）
else                                           → 'replenishing'（追加中）
```

### replenishment.status 更新（到貨確認時）
```
newReceivedQty = rep.receivedQty + thisArrivalQty

if newReceivedQty >= rep.qty  → 'completed'
else                          → 'partial_arrived'
```

---

## 六、各頁面功能規格

### logistics.html（後勤統計）

**Tab 1：需求總覽（Demand Summary Dashboard）**
- 摘要卡片：有需求品項 / 合計需求量 / 待補貨品項數 / 已填單通路
- 主表格欄位：代理 / 平台 / 品名 / 現庫存 / 總需求 / 缺口 / PM追加量 / ETA / 狀態
- 點列展開：供貨明細（初始庫存、已到貨、缺口計算公式）+ 補貨批次列表 + 全部通路訂單明細
- 篩選：代理商 / 需求狀態 / 搜尋品名條碼 / 只顯示有需求品項

**Tab 2：庫存管理**
- 批次匯入：貼上 P/N 或國際條碼 + 數量，預覽後確認匯入
- 表格：每列可直接 inline 輸入初始庫存，修改後自動儲存
- 欄位：代理 / 平台 / 品名 / 初始庫存 / 已登記需求 / 已到貨 / 當前庫存（附計算公式）/ 設定日期 / 備註

**Tab 3：人工分配**
- 只顯示有缺口的品項
- 展示各通路需求量，後勤填入各通路分配量
- 即時儲存，業務和經銷商可看到分配結果

**Tab 4：通路連結**
- 45 個通路的專屬連結（dealer.html?code=XX2025）
- 一鍵複製單一 / 全部連結

**Tab 5：週期設定**
- 週次 / 收單起訖時間 / 開關收單視窗

**其他功能：**
- 通知 Sales：產生需求缺口通知訊息（可按業務篩選）
- 結算歸檔：訂單存入 orders_archive，清空 orders，開啟下週

---

### pm.html（PM 管理）

**Tab 1：商品清單**
- 441 個品項唯讀表格（代理 / 平台 / 類型 / 品名 / MOQ / SRP / 出貨價 / 狀態 / 到貨日 / 促銷 / 備註）
- 新增品項表單（首次建檔用）
- ✏️ 按鈕開 Modal，全欄位可編輯

**Tab 2：補貨管理**
- 顯示有補貨記錄的品項
- 每個品項可有多筆補貨批次（qty / ETA / receivedQty / status）
- PM 建立批次記錄，後勤在統計頁確認到貨
- 狀態：待下單 / 追加中 / 部分到貨 / 已完成
- 可刪除單筆批次

---

### sales.html（業務）

- 摘要：轄區通路數 / 已填單通路 / 有缺口品項數
- 轄區訂單進度：通路 / 品項 / 需求量 / 分配量 / ETA / 狀態
- 補貨到貨進度：有訂單品項的補貨批次時間軸（唯讀）

---

### dealer.html（經銷商）

- URL 帶 code 參數驗證（code = 通路代碼 + 2025）
- 按代理商分 Tab（BNE / GSE / SONY）
- 表格顯示：平台 / 品名 / SRP / 出貨價 / 折扣 / 備註 / 訂購數量
- 跨代理商搜尋（品名 / 國際條碼 / P/N）
- 收單視窗關閉時禁止修改
- 送出後可附加備註

---

### superadmin.html（Super Admin）

- 初始化產品資料庫（441 項：BNE 98 / GSE 242 / SONY 101）
- 初始化通路資料（45 個通路）
- 確認資料狀態（產品 / 通路 / 訂單 / 庫存 / 補貨筆數）
- 危險操作：清除訂單 / 清除補貨記錄 / 清除庫存記錄

---

## 七、產品資料

| 代理商 | 品項數 | 備註 |
|--------|--------|------|
| BNE（萬代南夢宮） | 98 | NS/PS5/PS4/NS2 |
| GSE（Game Source） | 242 | NS/PS5/PS4/VR |
| SONY | 101 | PS5/PS4/VR |
| **合計** | **441** | |

通路：45 個，分屬 8 位業務

---

## 八、已知限制與待辦

| 項目 | 狀態 |
|------|------|
| Email 通知 | 目前無，需串接 SendGrid 或 Firebase Cloud Functions |
| Firebase 安全規則 | 目前測試模式，正式上線前需鎖定 |
| 手機版 RWD | 目前以桌面版為主 |
| 自動配貨 | 第一版不做，後勤手動分配 |
| 歷史庫存查閱 | 目前僅有訂單歸檔，無庫存快照 |
| 多倉管理 | 不在範疇內 |

---

## 九、URL 結構

```
https://acergaming-service.github.io/agm-tracking-v2/

index.html          登入頁
logistics.html      後勤統計
pm.html             PM 管理
sales.html          業務
dealer.html         經銷商（需 ?code=XX2025）
superadmin.html     Super Admin
firebase.js         共用設定與常數
```

---

*AGM Gaming Service — 2026*
