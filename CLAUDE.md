\# AGM Tracking v2



\## System Goal



This system is NOT ERP.



It is:



\* Demand tracking

\* Inventory visibility

\* PM replenishment transparency

\* ETA synchronization



\## First Version Scope



DO NOT implement:



\* Auto allocation engine

\* FIFO cost

\* Financial inventory

\* Multi warehouse

\* Reserved stock

\* Email notification



\## Core Rules



\### Orders



/orders/{week}/{dealerId}/{productId}



\### Allocations



/allocations/{week}/{productId}/{dealerId}



\### Price Snapshot



Write:



\* srpAtOrder

\* priceTaxAtOrder

\* priceAtOrder



ONLY when order is first created.



Do NOT overwrite price snapshot when qty changes.



\### Inventory Logic



availableStock =

initialStock + arrivedQty - totalDemandQty



\### Shortage



realShortageQty =

totalDemandQty - (initialStock + arrivedQty)



plannedShortageQty =

totalDemandQty - (initialStock + totalReplenishmentQty)



\## Responsibilities



PM:



\* replenishment

\* ETA



Logistics:



\* initial stock

\* arrival confirmation

\* manual allocation



\## UI Terms



realShortageQty => 目前實缺

plannedShortageQty => 追加後仍缺

allocatedQty => 已確認數量



\## Important



Do NOT refactor the whole project at once.

Modify one feature at a time.



Always explain:



1\. files modified

2\. why modified

3\. possible side effects

4\. manual test steps



\## Existing Docs



Always read:



\* ARCHITECTURE.md

\* REVIEW\_REQUEST.md



before making modifications.



\## Current Architecture Notes



This project uses:



\* Static HTML

\* Vanilla JavaScript

\* Firebase Realtime Database

\* GitHub Pages



Avoid adding:



\* React

\* Vue

\* build tools

\* TypeScript

\* heavy frameworks



\## Business Logic Notes



PM replenishment does NOT equal actual arrival.



Only logistics arrival confirmation can increase arrivedQty.



Dealers should NOT see:



\* other dealer orders

\* allocation rules

\* other dealer allocation quantities



Dealers only see:



\* requested qty

\* confirmed qty

\* ETA



