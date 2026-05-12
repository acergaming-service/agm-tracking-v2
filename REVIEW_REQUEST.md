# AGM 遊戲片追貨平台 v2 — 架構梳理與 Review 請求

## 背景

這是一個為遊戲代理商內部使用的追貨平台，用來取代手動 Excel 追貨流程。
核心目標：**需求統計 ＋ 庫存追蹤 ＋ PM 補貨透明化 ＋ 到貨進度同步**

---

## 技術選型

| 項目 | 選擇 | 原因 |
|------|------|------|
| 前端 | 純靜態 HTML（無框架） | 團隊無前端工程師，部署零門檻 |
| 資料庫 | Firebase Realtime Database | 多人即時同步，無需後端伺服器 |
| 部署 | GitHub Pages | 免費、自動部署 |
| 認證 | 密碼硬編碼 + sessionStorage | 第一版簡化，未來考慮 Firebase Auth |

---

## 角色設計

| 角色 | 密碼/入口 | 主要職責 |
|------|----------|---------|
| 後勤 | agm2025 | 庫存初始化、調整、到貨確認、人工分配、結算歸檔 |
| PM | pm2025 | 商品建檔/編輯、補貨記錄建立（qty + ETA） |
| 業務 | 選姓名 | 查看轄區訂單與補貨進度（唯讀） |
| 經銷商 | URL code | 每週填寫訂購數量 |
| Super Admin | super2025 | 初始化資料庫、危險操作 |

---

## Firebase 資料結構

```
/products/{vendor}/{productId}
  id, pn, platform, category, barcode, name
  srp, priceTax, price, priceSpecial
  moq, status, arrival, priceTag, displayNote

/dealers/{dealerId}
  name, sales, code

/orders/{week}/{dealerId}/{productId}
  qty               訂購數量
  srpAtOrder        下單時 SRP（價格快照）
  priceTaxAtOrder   下單時出貨價含稅（價格快照）
  priceAtOrder      下單時出貨價未稅（價格快照）
  note
  updatedAt

/inventory/{productId}
  initialStock      初始庫存（後勤設定）
  updatedAt

/replenishments/{productId}/{repId}
  qty               補貨量
  eta               預計到貨日（YYYY-MM-DD）
  receivedQty       實際已到貨累計
  status            pending | incoming | partial_arrived | completed
  note
  createdBy         'pm'
  createdAt
  arrivals[]        [{date, qty, note, createdAt}]

/allocations/{productId}/{dealerId}
  allocatedQty      後勤手動分配量
  updatedAt

/window
  open              boolean
  week              string（2025-W20）
  startTime
  endTime

/orders_archive/{week}
  orders            訂單快照
  archivedAt
  week
```

---

## 核心計算邏輯

### availableStock（可用庫存）
```
availableStock = initialStock + arrivedQty - totalDemandQty

arrivedQty     = Σ replenishments[pid][*].receivedQty
totalDemandQty = Σ orders[week][*][pid].qty
```
> 可為負數，代表實際缺貨

### realShortageQty（實際缺口）
```
realShortageQty = totalDemandQty - (initialStock + arrivedQty)
```
> 反映當下真實缺貨，需等到貨才能出

### plannedShortageQty（計畫缺口）
```
plannedShortageQty = totalDemandQty - (initialStock + totalReplenishmentQty)

totalReplenishmentQty = Σ replenishments[pid][*].qty
```
> 反映補貨計畫是否足夠；>0 代表即使全部到貨仍不足，需再追加

### demandStatus 狀態邏輯
```
if totalDemandQty === 0             → ''（無需求）
if realShortageQty === 0            → 'ok'（現貨足夠）
if reps.length === 0                → 'shortage_pending'（待補貨）
if reps.every(r => completed)       → 'completed'
if reps.some(r => receivedQty > 0)  → 'partial_arrived'
else                                → 'replenishing'
```

### replenishment.status 更新
```
newReceivedQty = rep.receivedQty + thisArrivalQty

if newReceivedQty >= rep.qty → 'completed'
else                         → 'partial_arrived'
```

---

## 本次版本主要改動（v1 → v2）

### 1. currentStock → availableStock
**原本**：`currentStock = initialStock - totalDemandQty + arrivedQty`
**問題**：命名語意不清，且只有一個缺口無法區分「目前缺」vs「計畫缺」
**改為**：`availableStock = initialStock + arrivedQty - totalDemandQty`（允許負數）
+ 拆出 `realShortageQty` 和 `plannedShortageQty`

### 2. 兩個缺口指標
- `realShortageQty`：當下實際缺多少（扣掉已到貨）
- `plannedShortageQty`：計畫補貨後還缺多少（扣掉已追加量）
- 兩個數字同時顯示，後勤可判斷是否需要再追加

### 3. 訂單價格快照
**問題**：商品主檔價格可能日後調整，舊訂單若直接讀主檔價格會顯示錯誤
**解法**：經銷商填單送出時，在 order 記錄中快照當下價格：
```
srpAtOrder, priceTaxAtOrder, priceAtOrder
```

### 4. orders 路徑加入 week
**原本**：`/orders/{dealerId}/{productId}`
**問題**：不同週期資料混在一起，結算歸檔困難，歷史查閱不清晰
**改為**：`/orders/{week}/{dealerId}/{productId}`
- week 來自 `window.week`（後勤設定，如 `2025-W20`）
- 經銷商填單時讀取 `window.week` 決定寫入路徑
- 結算歸檔時只清除對應週次的 orders

### 5. 庫存管理功能
- 批次匯入：上傳 CSV（格式：AGBS P/N, 初始庫存）
- 可下載範本 CSV（含全部 426 個有 P/N 的品項）
- 庫存表格 inline 直接輸入，Enter 後自動儲存
- 顯示設定日期

### 6. 補貨管理（PM 端）
- 一個品項可建立多筆補貨批次
- 每批次有 qty / ETA / receivedQty / status
- 後勤確認到貨時填入實際到貨量，系統自動更新 status

---

## 已知問題與待改進

| 問題 | 嚴重度 | 說明 |
|------|--------|------|
| 密碼硬編碼在前端 | 中 | sessionStorage 無法防止有心人士，建議未來改 Firebase Auth |
| Firebase Security Rules 為測試模式 | 高 | 任何知道 databaseURL 的人都可讀寫，正式上線前必須鎖定 |
| orders 讀取競態條件 | 中 | 週次切換瞬間可能讀到前一週資料，需加入 debounce 或 transaction |
| availableStock 未即時更新 | 低 | 補貨到貨確認後需手動 rebuildAndRender，目前已有監聽但依賴客戶端計算 |
| 無 reserved stock | 低 | 人工分配後沒有鎖定庫存機制，多人同時操作可能超分配 |
| 歷史庫存無快照 | 低 | 結算歸檔只存訂單，不存庫存狀態，無法查閱過去某週的庫存 |
| 手機版 RWD | 低 | 目前以桌面版為主 |

---

## 第一版刻意不做的功能

- 自動配貨 / Allocation Engine
- FIFO 成本 / 財務庫存
- 多倉管理
- Reserved / Allocated Stock
- Email 自動通知（目前手動複製）
- 歷史庫存快照

---

## Review 問題

希望針對以下幾點提供意見：

1. **資料結構設計是否合理？**
   - `replenishments` 是 flat list，每次到貨累加 `receivedQty`，是否應改為每次到貨都建立一筆獨立記錄？
   - `allocations` 獨立節點是否合適？或應該放在 `orders` 裡？

2. **兩個缺口指標是否清晰？**
   - `realShortageQty` 和 `plannedShortageQty` 的命名和邏輯是否直覺？

3. **orders 加入 week 層是否有更好的設計？**
   - 目前 week 由 `window.week` 決定，如果後勤忘記更新週次，會導致訂單寫錯週期

4. **價格快照的做法是否足夠？**
   - 目前在 client-side 寫入時快照，是否有更安全的方式？

5. **Firebase Realtime Database vs Firestore 的選擇？**
   - 目前用 RTDB，是否建議改 Firestore？各有什麼 trade-off？

6. **純靜態 HTML 的架構在規模化時有什麼風險？**
