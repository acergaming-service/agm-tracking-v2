# Migration Summary - 20260518

## Source Files
- `D:\OneDrive - Acer\追貨系統\Local\V2\追貨表20260518.xlsx`
- `D:\OneDrive - Acer\追貨系統\Local\V2\migration_20260515_package\migration-inventory-ready.csv` (for BNE/GS inventory)

## Products
- **Total:** 328
  - BNE: 111
  - GS: 101
  - SONY: 98
  - PLAYSEAT: 9
  - NLR: 9

### Skipped Rows (No P/N)
- BNE產品 row 78: 中文品名
- GSE產品 row 4: NS 沙石鎮時光 [英文封面] (繁中/簡中/英/日/韓文版) - 亞洲版
- GSE產品 row 13: NS DREDGE - 日版
- GSE產品 row 24: NS F.I.S.T.暗影火炬城 (繁中/簡中/英/日文版) - 亞洲版
- GSE產品 row 27: NS 空洞騎士 (簡中/英/日文版) - 歐版公司貨
- GSE產品 row 28: NS 星露谷物語 (簡中/英/日/韓文版) - 歐版公司貨
- GSE產品 row 29: NS 人類 : 一敗塗地 [夢想集版] (簡中/英/日/韓文版) - 歐版
- GSE產品 row 30: NS 死亡細胞: 重返惡魔城 (繁中/簡中/英文版) - 歐版
- GSE產品 row 31: NS 超級雞馬 [鄰居版] (繁中/簡中/英/日/韓文版) - 歐版
- GSE產品 row 34: NS SeaBed (繁中/簡中/英/日文版) - 亞洲版
- GSE產品 row 35: NS 海平線 無盡旅程 (繁中/簡中/英/日文版) - 亞洲版
- GSE產品 row 36: NS 不祥的預感: 賽博龐克風恐怖故事 (繁中/簡中/英文版) - 亞洲版
- GSE產品 row 37: NS 天使帝國IV [英文封面] (繁中/簡中/英文版) - 亞洲版
- GSE產品 row 38: NS 神奏三國詩 (簡中/英/日文版) - 亞洲版
- GSE產品 row 39: NS 鬼成聖 (繁中/簡中/英文版) - 亞洲版
- GSE產品 row 49: PS4 核心守護者
- GSE產品 row 50: PS4 喵喵大戰死剩種
- GSE產品 row 57: (1跟1特典)PS5 沙石鎮時光 [中文封面] (繁中/簡中/英/日/韓文版) - 亞洲版
- GSE產品 row 81: PS5 人類 : 一敗塗地 [夢想集版] (簡中/英/日/韓文版) - 歐版
- PS產品 row 105: 中文品名

### Duplicate P/N (skipped)
- ZL.A00TZ.1OL (BNE產品 row 113)
- ZL.A00TZ.18G (GSE產品 row 98)
- ZL.A00TZ.0U0 (PS產品 row 84)
- 0111.ECAS-00006 (PS產品 row 107)
- ZL.A00TZ.00H (PS產品 row 108)
- ZL.A00TZ.014 (PS產品 row 109)
- ZL.A00TZ.00Q (PS產品 row 110)
- ZL.A00TZ.00V (PS產品 row 112)
- ZL.A00TZ.078 (PS產品 row 113)
- ZL.A00TZ.01D (PS產品 row 114)
- ZL.A00TZ.01J (PS產品 row 115)
- ZL.A00TZ.04D (PS產品 row 116)
- ZL.A00TZ.03S (PS產品 row 117)
- ZL.A00TZ.077 (PS產品 row 118)
- ZL.A00TZ.0LW (PS產品 row 119)
- ZL.A00TZ.0T2 (PS產品 row 120)
- ZL.A00TZ.0OI (PS產品 row 121)
- ZL.A00TZ.0P6 (PS產品 row 122)
- ZL.A00TZ.0TM (PS產品 row 123)
- ZL.A00TZ.0VZ (PS產品 row 124)
- ZL.A00TZ.17K (PS產品 row 125)
- ZL.A00TZ.11E (PS產品 row 126)
- ZL.A00TZ.19G (PS產品 row 127)
- ZL.A00TZ.19F (PS產品 row 128)
- ZL.A00TZ.1FI (PS產品 row 129)
- ZL.A00TZ.1HE (PS產品 row 130)
- ZL.A00TZ.1UX (PS產品 row 131)
- 0101.PCAS-20001 (PS產品 row 132)
- 0101.PCAS-20014 (PS產品 row 133)
- ZL.A00TZ.01E (PS產品 row 134)
- ZL.A00TZ.04F (PS產品 row 135)
- ZL.A00TZ.07B (PS產品 row 136)
- 0101.PCAS-05081 (PS產品 row 137)
- 0101.PCAS-05091 (PS產品 row 138)

### Missing Barcode
- ZL.A00TZ.1CB (BNE產品 row 107)
- ZL.A00TZ.18T (BNE產品 row 114)
- ZL.A00TZ.1BU (BNE產品 row 117)

### Barcode Duplicate Removal (ECAS/PCAS superseded by ZL format)
- 0111.ECAS-00003 (PS產品 row 106) — 漫威蜘蛛人：麥爾斯·摩拉斯
- 0111.ECAS-00018 (PS產品 row 111) — 仁王 收藏輯

### Draft Products (missing required price / priceTax in Excel source)
| Vendor | P/N | Sheet | Row | Missing Fields |
|---|---|---|---|---|
| BNE | ZL.A00TZ.1SP | BNE產品 | 41 | srp, price, priceTax |
| BNE | ZL.A00TZ.1BW | BNE產品 | 106 | price, priceTax |
| BNE | ZL.A00TZ.1CB | BNE產品 | 107 | srp, price, priceTax, barcode |
| BNE | ZL.A00TZ.18T | BNE產品 | 114 | srp, price, priceTax, barcode |
| BNE | ZL.A00TZ.1BP | BNE產品 | 115 | price, priceTax |
| BNE | ZL.A00TZ.1BU | BNE產品 | 117 | srp, price, priceTax, barcode |
| GS | ZL.A00TZ.11X | GSE產品 | 7 | srp, price, priceTax |
| GS | ZL.A00TZ.1DK | GSE產品 | 122 | price, priceTax |
| GS | ZL.A00TZ.1DM | GSE產品 | 123 | price, priceTax |
| GS | ZL.A00TZ.1DJ | GSE產品 | 124 | price, priceTax |

### Empty Platform
- None

## Inventory
- **Total records:** 328 (one per product)
- **With initialStock > 0:** 42
- **Source breakdown:**
  - Excel AGM庫存量 (PS/PLAYSEAT/NLR): 116 records, 41 with qty>0
  - Existing CSV (BNE/GS) with qty>0: 1
  - BNE/GS defaulted to 0 (not in CSV): 211

### Existing CSV entries not in Products
- None

## Dealers
- **Total:** 46
- Skipped: 0

## Settings
- vendorOwners: 5
- productOptions groups: 4
- pmUsers: 2
- salesUsers: 7
- Changes: Removed 2 archived salesUsers; Removed: productOptions.vendors


## Legacy Fields Removed
- passwords (not written)
- archived salesUsers (filtered from settings)
- productOptions.vendors (removed from settings)
- productLineId (not in output schema)
- products.stock (not in output schema)
- dealers.sales (not in output schema)
- pmData references (not written)

## Validation Results
- [PASS] products productId 不重複
- [PASS] products P/N 不重複、不空白
- [PASS] barcode 不可為科學記號
- [PASS] vendor 必須是 BNE/GS/SONY/PLAYSEAT/NLR
- [PASS] platform 不可空
- [PASS] inventory P/N 全部存在於 products
- [PASS] dealers dealerId 不重複
- [PASS] dealers code 不重複
- [PASS] 不含 pmData
- [PASS] 不含 productLineId
- [PASS] 不含 products.stock
- [PASS] 不含 dealers.sales
- [PASS] 不含 productOptions.vendors

## Blockers
- None

## Can Perform Full Reset Rebuild?
**YES** - All validations passed. Package is ready for Full Reset rebuild.