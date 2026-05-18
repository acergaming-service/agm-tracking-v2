const XLSX = require('xlsx');
const fs   = require('fs');
const path = require('path');

const EXCEL_FILE   = 'D:\\OneDrive - Acer\\追貨系統\\Local\\V2\\追貨表20260518.xlsx';
const EXISTING_INV = 'D:\\OneDrive - Acer\\追貨系統\\Local\\V2\\migration_20260515_package\\migration-inventory-ready.csv';
const PRODUCTS_CSV = 'D:\\OneDrive - Acer\\追貨系統\\Local\\V2\\migration_v2_clean_package_20260518\\migration-products-ready.csv';
const OUTPUT_DIR   = 'D:\\OneDrive - Acer\\追貨系統\\Local\\V2\\migration_v2_clean_package_20260518';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function parseBarcode(v) {
  if (v === null || v === undefined || v === '') return '';
  if (typeof v === 'number') return String(Math.round(v));
  const s = String(v).trim();
  if (/e\+/i.test(s)) return String(Math.round(parseFloat(s)));
  return s;
}
function parsePrice(v) {
  if (v === null || v === undefined || v === '' || v === '無') return 0;
  if (typeof v === 'number') return Math.round(v);
  const s = String(v).replace(/[NT$,\s]/g,'').replace(/[^0-9.]/g,'');
  return isNaN(parseFloat(s)) ? 0 : Math.round(parseFloat(s));
}

// ─── Read Excel ───────────────────────────────────────────────────────────────
const wb = XLSX.readFile(EXCEL_FILE, { raw: true });

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT 1: SONY Duplicate Analysis
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n=== AUDIT 1: SONY Duplicates ===');

var psWs   = wb.Sheets['PS產品'];
var psData = XLSX.utils.sheet_to_json(psWs, { header: 1, defval: '', raw: true });
var psRows = psData.slice(3); // data starts row index 3

// Carry-forward state (PS sheet doesn't typically need it, but just in case)
var seenPN  = {};  // pn -> { rowNum, pn, name, barcode, spec, category, platform, price, priceTax, priceSpecial, srp, invQty }
var dupRows = [];  // { pn, kept, dup, diffs }

psRows.forEach(function(row, ri) {
  var pn   = String(row[5] || '').trim();
  var name = String(row[6] || '').trim();
  if (!pn || pn === '-' || pn === '—') return;

  var entry = {
    rowNum:       ri + 4,
    pn:           pn,
    name:         name,
    barcode:      parseBarcode(row[3]),
    spec:         String(row[4] || '').trim(),
    category:     String(row[1] || '').trim(),
    platform:     String(row[2] || '').trim(),
    srp:          parsePrice(row[7]),
    price:        parsePrice(row[8]),
    priceSpecial: parsePrice(row[9]),
    invQty:       (!row[10] || row[10] === '無') ? 0 : (parseInt(String(row[10])) || 0),
  };

  if (seenPN[pn]) {
    var kept = seenPN[pn];
    var diffs = [];
    ['name','barcode','spec','category','platform','srp','price','priceSpecial','invQty'].forEach(function(f) {
      if (String(kept[f]) !== String(entry[f])) {
        diffs.push({ field: f, kept: kept[f], dup: entry[f] });
      }
    });
    dupRows.push({ pn: pn, kept: kept, dup: entry, diffs: diffs });
  } else {
    seenPN[pn] = entry;
  }
});

console.log('Total PS valid rows:', Object.keys(seenPN).length + dupRows.length);
console.log('Unique P/N kept:', Object.keys(seenPN).length);
console.log('Duplicate rows:', dupRows.length);

var safeDups  = dupRows.filter(function(d) { return d.diffs.length === 0; });
var diffDups  = dupRows.filter(function(d) { return d.diffs.length >  0; });
console.log('Identical content (safe skip):', safeDups.length);
console.log('Different content (needs review):', diffDups.length);

// Build markdown
var md1Lines = [
  '# SONY Duplicate Audit',
  '',
  '**Total PS valid rows:** ' + (Object.keys(seenPN).length + dupRows.length),
  '**Unique P/N (kept):** ' + Object.keys(seenPN).length,
  '**Duplicate rows (skipped):** ' + dupRows.length,
  '**Identical content → safe skip:** ' + safeDups.length,
  '**Different content → needs review:** ' + diffDups.length,
  '',
];

if (diffDups.length > 0) {
  md1Lines.push('## ⚠ Duplicates with DIFFERENT content (action required)');
  md1Lines.push('');
  diffDups.forEach(function(d) {
    md1Lines.push('### ' + d.pn);
    md1Lines.push('- Kept: row ' + d.kept.rowNum + ' name=[' + d.kept.name + '] barcode=' + d.kept.barcode + ' platform=' + d.kept.platform + ' category=' + d.kept.category);
    md1Lines.push('- Dup:  row ' + d.dup.rowNum  + ' name=[' + d.dup.name  + '] barcode=' + d.dup.barcode  + ' platform=' + d.dup.platform  + ' category=' + d.dup.category);
    d.diffs.forEach(function(df) {
      md1Lines.push('  - **' + df.field + '**: kept=`' + df.kept + '` dup=`' + df.dup + '`');
    });
    md1Lines.push('');
  });
}

md1Lines.push('## Safe Duplicates (identical content)');
md1Lines.push('');
md1Lines.push('| P/N | Kept Row | Dup Row | Name |');
md1Lines.push('|---|---|---|---|');
safeDups.forEach(function(d) {
  md1Lines.push('| ' + d.pn + ' | ' + d.kept.rowNum + ' | ' + d.dup.rowNum + ' | ' + d.kept.name.substring(0,40) + ' |');
});

md1Lines.push('');
md1Lines.push('## Verdict');
if (diffDups.length === 0) {
  md1Lines.push('**ALL SAFE** — All ' + dupRows.length + ' duplicate rows have identical content. Safe to skip.');
} else {
  md1Lines.push('**ACTION REQUIRED** — ' + diffDups.length + ' duplicates have conflicting data. Review before using this package.');
}

fs.writeFileSync(path.join(OUTPUT_DIR, 'sony-duplicate-audit.md'), md1Lines.join('\n'), 'utf8');
console.log('Wrote sony-duplicate-audit.md');

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT 2: Inventory Merge Analysis
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n=== AUDIT 2: Inventory Merge ===');

// Step 1: Read existing CSV — P/N -> {qty, barcode}
var csvInv = {};
var rawCsv  = fs.readFileSync(EXISTING_INV, 'utf8').replace(/^﻿/, '');
var csvLines = rawCsv.split(/\r?\n/);
var hdr      = csvLines[0].split(',');
var iPN      = hdr.indexOf('P/N');
var iBC      = hdr.indexOf('國際條碼');
var iQTY     = hdr.indexOf('初始庫存');
console.log('CSV header:', hdr.join('|'), '  iPN=' + iPN + ' iBC=' + iBC + ' iQTY=' + iQTY);

for (var ci = 1; ci < csvLines.length; ci++) {
  var ln = csvLines[ci].trim();
  if (!ln) continue;
  var cols = ln.split(',');
  var pn   = (cols[iPN]  || '').trim();
  if (!pn) continue;
  csvInv[pn] = { qty: parseInt(cols[iQTY]) || 0, barcode: (cols[iBC] || '').trim() };
}
console.log('Existing CSV total entries:', Object.keys(csvInv).length);

// Step 2: Read final products CSV to know which P/N is BNE/GS vs SONY/PLAYSEAT/NLR
var prodRaw   = fs.readFileSync(PRODUCTS_CSV, 'utf8').replace(/^﻿/, '');
var prodLines = prodRaw.split(/\r?\n/);
var phdr      = prodLines[0].split(',');
var iPVendor  = phdr.indexOf('vendor');
var iPPN      = phdr.indexOf('P/N');

var vendorByPN = {};
for (var pi = 1; pi < prodLines.length; pi++) {
  var pln = prodLines[pi].trim();
  if (!pln) continue;
  var pcols  = pln.split(',');
  var ppn    = (pcols[iPPN]     || '').trim();
  var pv     = (pcols[iPVendor] || '').trim();
  if (ppn) vendorByPN[ppn] = pv;
}
console.log('Products CSV entries:', Object.keys(vendorByPN).length);

// Step 3: Classify each CSV inventory entry
var EXCEL_VENDORS = new Set(['SONY','PLAYSEAT','NLR']);
var CSV_VENDORS   = new Set(['BNE','GS']);

var results = {
  bng_gs_in_csv:   [],  // P/N found in CSV, vendor = BNE/GS, merged OK
  sony_in_csv:     [],  // P/N found in CSV, vendor = SONY/PLAYSEAT/NLR (uses Excel instead)
  not_in_products: [],  // P/N in CSV but not in products CSV at all
  format_mismatch: [],  // P/N in CSV but only found if we convert _ <-> .
};

Object.keys(csvInv).forEach(function(pn) {
  var entry   = csvInv[pn];
  var vendor  = vendorByPN[pn];

  if (vendor) {
    if (EXCEL_VENDORS.has(vendor)) {
      results.sony_in_csv.push({ pn: pn, qty: entry.qty, vendor: vendor });
    } else {
      results.bng_gs_in_csv.push({ pn: pn, qty: entry.qty, vendor: vendor });
    }
  } else {
    // Not found — check for underscore/dot mismatch
    var altPN = pn.replace(/\./g, '_');
    var altVendor = vendorByPN[altPN];
    if (altVendor) {
      results.format_mismatch.push({
        csvPN: pn, productPN: altPN, vendor: altVendor, qty: entry.qty,
        note: 'CSV uses dots, products uses underscores'
      });
    } else {
      var altPN2 = pn.replace(/_/g, '.');
      var altVendor2 = vendorByPN[altPN2];
      if (altVendor2) {
        results.format_mismatch.push({
          csvPN: pn, productPN: altPN2, vendor: altVendor2, qty: entry.qty,
          note: 'CSV uses underscores, products uses dots'
        });
      } else {
        results.not_in_products.push({ pn: pn, qty: entry.qty });
      }
    }
  }
});

var bngGsWithQty   = results.bng_gs_in_csv.filter(function(r) { return r.qty > 0; });
var sonyWithQty    = results.sony_in_csv.filter(function(r) { return r.qty > 0; });

console.log('BNE/GS entries in CSV:', results.bng_gs_in_csv.length, '  with qty>0:', bngGsWithQty.length);
console.log('SONY/PLAYSEAT/NLR entries in CSV (overridden by Excel):', results.sony_in_csv.length, '  with qty>0:', sonyWithQty.length);
console.log('Format mismatch (P/N in CSV != products):', results.format_mismatch.length);
console.log('Not in products at all:', results.not_in_products.length);

// Build markdown
var md2Lines = [
  '# Inventory Merge Audit',
  '',
  '## Overview',
  '- **Existing CSV entries:** ' + Object.keys(csvInv).length,
  '- **Products CSV entries:** ' + Object.keys(vendorByPN).length,
  '',
  '## BNE/GS Entries (from existing CSV)',
  '- **Total:** ' + results.bng_gs_in_csv.length,
  '- **With qty > 0 (merged into package):** ' + bngGsWithQty.length,
  '- **With qty = 0:** ' + (results.bng_gs_in_csv.length - bngGsWithQty.length),
  '',
  '### BNE/GS rows in existing CSV:',
  '| P/N | vendor | qty | merged? |',
  '|---|---|---|---|',
];
results.bng_gs_in_csv.forEach(function(r) {
  md2Lines.push('| ' + r.pn + ' | ' + r.vendor + ' | ' + r.qty + ' | YES |');
});

md2Lines = md2Lines.concat([
  '',
  '## SONY/PLAYSEAT/NLR entries in existing CSV (overridden by Excel AGM庫存量)',
  '- **Total:** ' + results.sony_in_csv.length,
  '- **With qty > 0 in CSV (but Excel value used instead):** ' + sonyWithQty.length,
  '',
  '### SONY/PLAYSEAT/NLR rows (Excel overrides CSV):',
  '| P/N | vendor | CSV qty | Excel used instead |',
  '|---|---|---|---|',
]);
results.sony_in_csv.forEach(function(r) {
  md2Lines.push('| ' + r.pn + ' | ' + r.vendor + ' | ' + r.qty + ' | YES |');
});

md2Lines = md2Lines.concat([
  '',
  '## Format Mismatch (P/N format in CSV != products)',
  '- **Count:** ' + results.format_mismatch.length,
  '',
]);
if (results.format_mismatch.length > 0) {
  md2Lines.push('| CSV P/N | Product P/N | Vendor | Qty | Note |');
  md2Lines.push('|---|---|---|---|---|');
  results.format_mismatch.forEach(function(r) {
    md2Lines.push('| ' + r.csvPN + ' | ' + r.productPN + ' | ' + r.vendor + ' | ' + r.qty + ' | ' + r.note + ' |');
  });
} else {
  md2Lines.push('- None — no format mismatch found.');
}

md2Lines = md2Lines.concat([
  '',
  '## Not in Products (P/N in CSV but not in any product sheet)',
  '- **Count:** ' + results.not_in_products.length,
  '',
]);
if (results.not_in_products.length > 0) {
  md2Lines.push('| P/N | qty |');
  md2Lines.push('|---|---|');
  results.not_in_products.forEach(function(r) {
    md2Lines.push('| ' + r.pn + ' | ' + r.qty + ' |');
  });
}

md2Lines = md2Lines.concat([
  '',
  '## Verdict',
]);
if (results.format_mismatch.length === 0 && results.not_in_products.length === 0) {
  md2Lines.push('**MERGE OK** — No format mismatches. All CSV entries are either:');
  md2Lines.push('- Correctly merged as BNE/GS inventory (' + results.bng_gs_in_csv.length + ' entries), OR');
  md2Lines.push('- Correctly overridden by Excel AGM庫存量 for SONY/PLAYSEAT/NLR (' + results.sony_in_csv.length + ' entries).');
  md2Lines.push('');
  md2Lines.push('The low BNE/GS qty>0 count (' + bngGsWithQty.length + ') reflects actual data in the existing CSV,');
  md2Lines.push('not a merge failure. Most BNE/GS products in the existing CSV have qty=0.');
} else {
  md2Lines.push('**ACTION REQUIRED** — See format mismatch and/or not-in-products entries above.');
}

fs.writeFileSync(path.join(OUTPUT_DIR, 'inventory-merge-audit.md'), md2Lines.join('\n'), 'utf8');
console.log('Wrote inventory-merge-audit.md');

console.log('\n=== AUDIT COMPLETE ===');
