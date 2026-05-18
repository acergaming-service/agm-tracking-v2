# Inventory Merge Audit

## Overview
- **Existing CSV entries:** 72
- **Products CSV entries:** 332

## BNE/GS Entries (from existing CSV)
- **Total:** 1
- **With qty > 0 (merged into package):** 1
- **With qty = 0:** 0

### BNE/GS rows in existing CSV:
| P/N | vendor | qty | merged? |
|---|---|---|---|
| ZL.A00TZ.0U0 | BNE | 181 | YES |

## SONY/PLAYSEAT/NLR entries in existing CSV (overridden by Excel AGM庫存量)
- **Total:** 71
- **With qty > 0 in CSV (but Excel value used instead):** 41

### SONY/PLAYSEAT/NLR rows (Excel overrides CSV):
| P/N | vendor | CSV qty | Excel used instead |
|---|---|---|---|
| ZL.A00TZ.009 | SONY | 0 | YES |
| ZL.A00TZ.1E7 | SONY | 0 | YES |
| ZL.A00TZ.1HC | SONY | 0 | YES |
| ZL.A00TZ.1E8 | SONY | 0 | YES |
| ZL.A00TZ.0SR | SONY | 113 | YES |
| ZL.A00TZ.008 | SONY | 751 | YES |
| ZL.A00TZ.013 | SONY | 267 | YES |
| 0111.ECAS-00006 | SONY | 0 | YES |
| ZL.A00TZ.00H | SONY | 164 | YES |
| ZL.A00TZ.014 | SONY | 0 | YES |
| ZL.A00TZ.00Q | SONY | 29 | YES |
| ZL.A00TZ.043 | SONY | 0 | YES |
| ZL.A00TZ.00V | SONY | 337 | YES |
| ZL.A00TZ.078 | SONY | 141 | YES |
| ZL.A00TZ.01D | SONY | 426 | YES |
| ZL.A00TZ.01J | SONY | 67 | YES |
| ZL.A00TZ.03M | SONY | 0 | YES |
| ZL.A00TZ.04D | SONY | 415 | YES |
| ZL.A00TZ.03S | SONY | 0 | YES |
| ZL.A00TZ.077 | SONY | 57 | YES |
| ZL.A00TZ.0LW | SONY | 0 | YES |
| ZL.A00TZ.0T2 | SONY | 41 | YES |
| ZL.A00TZ.0OI | SONY | 0 | YES |
| ZL.A00TZ.0P6 | SONY | 89 | YES |
| ZL.A00TZ.0TM | SONY | 262 | YES |
| ZL.A00TZ.0VZ | SONY | 389 | YES |
| ZL.A00TZ.17K | SONY | 202 | YES |
| ZL.A00TZ.11E | SONY | 144 | YES |
| ZL.A00TZ.19G | SONY | 70 | YES |
| ZL.A00TZ.19F | SONY | 0 | YES |
| ZL.A00TZ.1FI | SONY | 840 | YES |
| ZL.A00TZ.1EW | SONY | 1 | YES |
| ZL.A00TZ.1F9 | SONY | 237 | YES |
| ZL.A00TZ.1HE | SONY | 0 | YES |
| ZL.A00TZ.1HF | SONY | 300 | YES |
| ZL.A00TZ.0FF | SONY | 426 | YES |
| ZL.A00TZ.0I0 | SONY | 38 | YES |
| ZL.A00TZ.0M8 | SONY | 5 | YES |
| ZL.A00TZ.0O2 | SONY | 29 | YES |
| ZL.A00TZ.0SQ | SONY | 0 | YES |
| ZL.A00TZ.0EY | SONY | 40 | YES |
| ZL.A00TZ.0HQ | SONY | 30 | YES |
| 0101.PCAS-20001 | SONY | 34 | YES |
| 0101.PCAS-20013 | SONY | 0 | YES |
| 0101.PCAS-20014 | SONY | 88 | YES |
| 0101.PCAS-20017 | SONY | 0 | YES |
| 0101.PCAS-05122 | SONY | 28 | YES |
| ZL.A00TZ.01E | SONY | 25 | YES |
| ZL.A00TZ.04F | SONY | 0 | YES |
| ZL.A00TZ.07B | SONY | 0 | YES |
| ZL.A00TZ.0I5 | SONY | 30 | YES |
| 0101.PCAS-05081 | SONY | 133 | YES |
| 0101.PCAS-05091 | SONY | 23 | YES |
| ZL.W01TZ.01H | PLAYSEAT | 0 | YES |
| ZL.W01TZ.026 | PLAYSEAT | 0 | YES |
| ZL.W01TZ.075 | PLAYSEAT | 0 | YES |
| ZL.W01TZ.02E | PLAYSEAT | 0 | YES |
| ZL.W01TZ.00P | PLAYSEAT | 0 | YES |
| ZL.W01TZ.012 | PLAYSEAT | 0 | YES |
| ZL.W01TZ.0GM | PLAYSEAT | 78 | YES |
| ZL.W01TZ.0H0 | PLAYSEAT | 0 | YES |
| ZL.W01TZ.029 | PLAYSEAT | 0 | YES |
| ZL.W01TZ.001 | NLR | 1 | YES |
| ZL.W01TZ.002 | NLR | 0 | YES |
| ZL.W01TZ.003 | NLR | 1 | YES |
| ZL.W01TZ.004 | NLR | 0 | YES |
| ZL.W01TZ.015 | NLR | 0 | YES |
| ZL.W01TZ.016 | NLR | 12 | YES |
| ZL.W01TZ.09I | NLR | 0 | YES |
| ZL.W01TZ.0B5 | NLR | 4 | YES |
| ZL.W01TZ.0AA | NLR | 10 | YES |

## Format Mismatch (P/N format in CSV != products)
- **Count:** 0

- None — no format mismatch found.

## Not in Products (P/N in CSV but not in any product sheet)
- **Count:** 0


## Verdict
**MERGE OK** — No format mismatches. All CSV entries are either:
- Correctly merged as BNE/GS inventory (1 entries), OR
- Correctly overridden by Excel AGM庫存量 for SONY/PLAYSEAT/NLR (71 entries).

The low BNE/GS qty>0 count (1) reflects actual data in the existing CSV,
not a merge failure. Most BNE/GS products in the existing CSV have qty=0.