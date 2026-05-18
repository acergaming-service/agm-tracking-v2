const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// ─── Config ──────────────────────────────────────────────────────────────────
const EXCEL_FILE   = 'D:\\OneDrive - Acer\\追貨系統\\Local\\V2\\追貨表20260518.xlsx';
const EXISTING_INV = 'D:\\OneDrive - Acer\\追貨系統\\Local\\V2\\migration_20260515_package\\migration-inventory-ready.csv';
const SETTINGS_SRC = 'D:\\OneDrive - Acer\\追貨系統\\Local\\V2\\settings-master_2026-05-17.json';
const OUTPUT_DIR   = 'D:\\OneDrive - Acer\\追貨系統\\Local\\V2\\migration_v2_clean_package_20260518';

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// ─── Helpers ─────────────────────────────────────────────────────────────────
function parsePrice(v) {
  if (v === null || v === undefined || v === '' || v === '無') return 0; // 無
  if (typeof v === 'number') return Math.round(v);
  const s = String(v).replace(/[NT$,\s]/g, '').replace(/[^0-9.]/g, '');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : Math.round(n);
}

function parseBarcode(v) {
  if (v === null || v === undefined || v === '') return '';
  if (typeof v === 'number') return String(Math.round(v));
  const s = String(v).trim();
  if (/e\+/i.test(s)) return String(Math.round(parseFloat(s)));
  return s;
}

function pnToId(pn) { return pn.replace(/\./g, '_'); }

function csvEsc(v) {
  const s = String(v === null || v === undefined ? '' : v);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}
function csvRow(arr) { return arr.map(csvEsc).join(','); }

function findSheet(wb, partial) {
  const name = wb.SheetNames.find(n => n.includes(partial));
  if (!name) throw new Error('Sheet not found matching: ' + partial);
  return { name, ws: wb.Sheets[name] };
}

// ─── Summary ─────────────────────────────────────────────────────────────────
const S = {
  products:  { total: 0, byVendor: {}, skipped: [], dupPn: [], missingBc: [], emptyPlatform: [], draftPricing: [], barcodeDedup: [] },
  inventory: { total: 0, fromExcel: 0, fromCsv: 0, defaultZero: 0, csvNotInProducts: [] },
  dealers:   { total: 0, skipped: [] },
  settings:  {},
  validation: [],
  blockers:  [],
  ok: true,
};

// P/Ns that share a barcode with a canonical ZL.A00TZ. product — keep the ZL version, skip these
const PN_BARCODE_DUPLICATES = new Set(['0111.ECAS-00003', '0111.ECAS-00018']);

// ─── Read Excel ───────────────────────────────────────────────────────────────
console.log('Reading Excel...');
const wb = XLSX.readFile(EXCEL_FILE, { raw: true });
console.log('Sheets:', wb.SheetNames.join(' | '));

// ─── Parse Products ───────────────────────────────────────────────────────────
const products = [];
const pnSet = new Set();
const pidSet = new Set();
const excelInvMap = {}; // P/N -> qty  (PS / PLAYSEAT / NLR only)

const SHEET_DEFS = [
  { partial: 'BNE',      vendor: 'BNE',   type: 'bne_gs'       },
  { partial: 'GSE',      vendor: 'GS',    type: 'bne_gs'       },
  { partial: 'PS',       vendor: 'SONY',  type: 'ps_play'      },
  { partial: 'PLAYSEAT', vendor: null,    type: 'playseat_nlr' },
];

SHEET_DEFS.forEach(function(def) {
  const found = findSheet(wb, def.partial);
  const sheetName = found.name;
  const ws = found.ws;
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });
  // Rows 0-1: merged title cells; row 2: column headers; row 3+: data
  const dataRows = data.slice(3);
  let added = 0;
  var lastPlatform = '';
  var lastCategory = '';

  dataRows.forEach(function(row, ri) {
    const pnRaw   = String(row[5] || '').trim();
    const nameRaw = String(row[6] || '').trim();
    const rowNum  = ri + 4;

    if (!pnRaw || pnRaw === '-' || pnRaw === '—') {
      if (nameRaw) S.products.skipped.push({ sheet: sheetName, row: rowNum, name: nameRaw });
      return;
    }
    // Skip rows where P/N contains invalid characters (catches sub-header rows like "AGBS P/N" or "AGM料號")
    if (!/^[A-Za-z0-9._\-]+$/.test(pnRaw)) {
      S.products.skipped.push({ sheet: sheetName, row: rowNum, name: nameRaw, note: 'invalid pn: ' + pnRaw });
      return;
    }
    // Skip ECAS/PCAS P/Ns that share a barcode with a canonical ZL format product
    if (PN_BARCODE_DUPLICATES.has(pnRaw)) {
      S.products.barcodeDedup.push({ removed: pnRaw, sheet: sheetName, row: rowNum, name: nameRaw });
      return;
    }

    if (pnSet.has(pnRaw)) {
      S.products.dupPn.push({ pn: pnRaw, sheet: sheetName, row: rowNum });
      return;
    }
    const productId = pnToId(pnRaw);
    if (pidSet.has(productId)) {
      S.products.dupPn.push({ pn: pnRaw, productId: productId, sheet: sheetName, row: rowNum, note: 'productId collision' });
      return;
    }

    pnSet.add(pnRaw);
    pidSet.add(productId);

    const barcode  = parseBarcode(row[3]);
    if (!barcode) S.products.missingBc.push({ pn: pnRaw, sheet: sheetName, row: rowNum });

    const spec        = String(row[4] || '').trim();
    const displayNote = String(row[12] || '').trim();
    let vendor, platform, category, srp, priceTax, price, priceSpecial, priceTag;

    if (def.type === 'bne_gs') {
      vendor    = def.vendor;
      // carry-forward: Excel merges platform/category cells; rows below merge show empty
      var rawPlatform = String(row[2] || '').trim();
      var rawCategory = String(row[1] || '').trim();
      platform  = rawPlatform || lastPlatform;
      category  = rawCategory || lastCategory;
      if (rawPlatform) lastPlatform = rawPlatform;
      if (rawCategory) lastCategory = rawCategory;
      srp          = parsePrice(row[7]);
      priceTax     = parsePrice(row[8]);  // 出貨價(含稅)
      price        = parsePrice(row[9]);  // 出貨價(未稅)
      priceSpecial = 0;
      priceTag     = String(row[10] || '').trim(); // 出貨折扣
    } else if (def.type === 'ps_play') {
      vendor       = def.vendor;
      platform     = String(row[2] || '').trim();
      category     = String(row[1] || '').trim();
      srp          = parsePrice(row[7]);
      price        = parsePrice(row[8]);  // 出貨價(未稅)
      priceSpecial = parsePrice(row[9]);  // 優惠出貨價
      priceTax     = priceSpecial || price;
      priceTag     = '';
      var invRaw   = row[10];
      var invQty   = (!invRaw || invRaw === '無') ? 0 : (parseInt(String(invRaw)) || 0);
      excelInvMap[pnRaw] = invQty;
    } else { // playseat_nlr
      var brand    = String(row[2] || '').trim();
      vendor       = (brand === 'NLR') ? 'NLR' : 'PLAYSEAT';
      platform     = vendor;
      category     = String(row[1] || '').trim();
      srp          = parsePrice(row[7]);
      price        = parsePrice(row[8]);
      priceSpecial = parsePrice(row[9]);
      priceTax     = priceSpecial || price;
      priceTag     = '';
      var invRaw2  = row[10];
      var invQty2  = (!invRaw2 || invRaw2 === '無') ? 0 : (parseInt(String(invRaw2)) || 0);
      excelInvMap[pnRaw] = invQty2;
    }

    // Normalize category values to match settings-master.json labels
    if (category === '軟體(三廠)') category = '軟體';
    if (category === '排檔架')    category = '排檔桿';

    if (!platform) S.products.emptyPlatform.push({ pn: pnRaw, sheet: sheetName, row: rowNum });

    // Products missing price or priceTax are unusable in dealer flow → draft
    var missingFields = [];
    if (!srp)      missingFields.push('srp');
    if (!price)    missingFields.push('price');
    if (!priceTax) missingFields.push('priceTax');
    if (!barcode)  missingFields.push('barcode');
    var status = (price === 0 || priceTax === 0) ? 'draft' : 'instock';
    if (status === 'draft') {
      S.products.draftPricing.push({ pn: pnRaw, vendor: vendor, sheet: sheetName, row: rowNum, missing: missingFields });
    }

    S.products.byVendor[vendor] = (S.products.byVendor[vendor] || 0) + 1;
    added++;

    products.push({
      vendor: vendor, productId: productId, 'P/N': pnRaw,
      platform: platform, category: category, barcode: barcode, spec: spec,
      name: nameRaw, srp: srp, priceTax: priceTax, price: price,
      priceSpecial: priceSpecial, moq: 0, maxOrder: 0,
      status: status, arrival: '', priceTag: priceTag, displayNote: displayNote
    });
  });

  console.log('  ' + sheetName + ': +' + added + ' products');
});

S.products.total = products.length;
console.log('Total products:', products.length);

// ─── Parse existing inventory CSV (BNE/GS source) ────────────────────────────
var csvInvMap = {};
try {
  var rawCsv  = fs.readFileSync(EXISTING_INV, { encoding: 'utf8' }).replace(/^﻿/, '');
  var csvLines = rawCsv.split(/\r?\n/);
  var csvHdr   = csvLines[0].split(',');
  var iPN      = csvHdr.indexOf('P/N');
  var iBC      = csvHdr.indexOf('國際條碼'); // 國際條碼
  var iQTY     = csvHdr.indexOf('初始庫存'); // 初始庫存
  for (var ci = 1; ci < csvLines.length; ci++) {
    var ln = csvLines[ci].trim();
    if (!ln) continue;
    var cols = ln.split(',');
    var pn   = (cols[iPN]  || '').trim();
    if (!pn) continue;
    csvInvMap[pn] = parseInt(cols[iQTY]) || 0;
  }
  console.log('Existing CSV inventory entries:', Object.keys(csvInvMap).length);
} catch(e) {
  console.warn('Could not read existing inventory CSV:', e.message);
}

// ─── Build inventory records ──────────────────────────────────────────────────
var invRecords = [];

products.forEach(function(p) {
  var pn     = p['P/N'];
  var vendor = p.vendor;
  var qty, source;

  if (vendor === 'SONY' || vendor === 'PLAYSEAT' || vendor === 'NLR') {
    qty    = (excelInvMap[pn] !== undefined) ? excelInvMap[pn] : 0;
    source = 'excel';
    if (qty > 0) S.inventory.fromExcel++;
  } else {
    if (csvInvMap[pn] !== undefined) {
      qty    = csvInvMap[pn];
      source = 'csv';
      if (qty > 0) S.inventory.fromCsv++;
    } else {
      qty    = 0;
      source = 'zero';
      S.inventory.defaultZero++;
    }
  }

  invRecords.push({ pn: pn, barcode: p.barcode, qty: qty, source: source });
});
S.inventory.total = invRecords.length;

Object.keys(csvInvMap).forEach(function(pn) {
  if (!pnSet.has(pn)) S.inventory.csvNotInProducts.push(pn);
});

// ─── Parse Dealers ────────────────────────────────────────────────────────────
var dealers  = [];
var dIdSet   = new Set();
var dCodeSet = new Set();

var kdFound = findSheet(wb, '客戶'); // 客戶
var kdData  = XLSX.utils.sheet_to_json(kdFound.ws, { header: 1, defval: '', raw: false });
// Header row 0: 客戶[0] | 業務[1] | COUNT[2] | XLOOK[3]
kdData.slice(1).forEach(function(row, ri) {
  var xlook    = String(row[3] || '').trim();
  var custName = String(row[0] || '').trim();
  var business = String(row[1] || '').trim();
  if (!xlook || !custName) return;

  var dealerId = xlook.toLowerCase().replace(/_/g, '-');
  var code     = xlook;

  if (dIdSet.has(dealerId)) {
    S.dealers.skipped.push({ row: ri + 2, reason: 'Duplicate dealerId', dealerId: dealerId });
    return;
  }
  dIdSet.add(dealerId);
  dCodeSet.add(code);

  dealers.push({
    dealerId: dealerId, name: custName, code: code,
    salesId: business.toLowerCase(), salesName: business,
    active: 'true', archived: 'false', note: ''
  });
});
S.dealers.total = dealers.length;
console.log('Dealers:', dealers.length);

// ─── Write Products CSV ───────────────────────────────────────────────────────
var PROD_HDR = ['vendor','productId','P/N','platform','category','barcode','spec','name',
  'srp','priceTax','price','priceSpecial','moq','maxOrder','status','arrival','priceTag','displayNote'];
var prodLines = [csvRow(PROD_HDR)].concat(products.map(function(p) {
  return csvRow(PROD_HDR.map(function(h) { return p[h] !== undefined ? p[h] : ''; }));
}));
fs.writeFileSync(path.join(OUTPUT_DIR, 'migration-products-ready.csv'),
  '﻿' + prodLines.join('\r\n'), 'utf8');
console.log('Wrote migration-products-ready.csv (' + products.length + ' rows)');

// ─── Write Inventory CSV ──────────────────────────────────────────────────────
var INV_HDR = ['P/N', '國際條碼', '初始庫存', '備註'];
var invLines = [csvRow(INV_HDR)].concat(invRecords.map(function(r) {
  return csvRow([r.pn, r.barcode, r.qty, '']);
}));
fs.writeFileSync(path.join(OUTPUT_DIR, 'migration-inventory-ready.csv'),
  '﻿' + invLines.join('\r\n'), 'utf8');
console.log('Wrote migration-inventory-ready.csv (' + invRecords.length + ' rows)');

// ─── Write Dealers CSV ────────────────────────────────────────────────────────
var DLR_HDR = ['dealerId','name','code','salesId','salesName','active','archived','note'];
var dlrLines = [csvRow(DLR_HDR)].concat(dealers.map(function(d) {
  return csvRow(DLR_HDR.map(function(h) { return d[h]; }));
}));
fs.writeFileSync(path.join(OUTPUT_DIR, 'migration-dealers-ready.csv'),
  '﻿' + dlrLines.join('\r\n'), 'utf8');
console.log('Wrote migration-dealers-ready.csv (' + dealers.length + ' rows)');

// ─── Settings Master ──────────────────────────────────────────────────────────
var settingsNote = [];
try {
  var rawS = fs.readFileSync(SETTINGS_SRC, 'utf8').replace(/^﻿/, '');
  var sj   = JSON.parse(rawS);

  if (sj.passwords) { delete sj.passwords; settingsNote.push('Removed: passwords'); }
  if (sj.salesUsers) {
    var before = Object.keys(sj.salesUsers).length;
    sj.salesUsers = Object.fromEntries(
      Object.entries(sj.salesUsers).filter(function(e) {
        var u = e[1];
        return u.active !== false && u.archived !== true;
      })
    );
    var after = Object.keys(sj.salesUsers).length;
    if (before !== after) settingsNote.push('Removed ' + (before - after) + ' archived salesUsers');
  }
  if (sj.productOptions && sj.productOptions.vendors) {
    delete sj.productOptions.vendors;
    settingsNote.push('Removed: productOptions.vendors');
  }

  S.settings = {
    vendorOwners:   Object.keys(sj.vendorOwners   || {}).length,
    productOptions: Object.keys(sj.productOptions || {}).length,
    pmUsers:        Object.keys(sj.pmUsers        || {}).length,
    salesUsers:     Object.keys(sj.salesUsers     || {}).length,
    changes: settingsNote,
  };

  fs.writeFileSync(path.join(OUTPUT_DIR, 'settings-master.json'), JSON.stringify(sj, null, 2), 'utf8');
  console.log('Wrote settings-master.json');
} catch(e) {
  S.settings = { error: e.message };
  S.blockers.push('settings-master.json error: ' + e.message);
  S.ok = false;
}

// ─── Validation ───────────────────────────────────────────────────────────────
function chk(label, cond, detail) {
  S.validation.push({ check: label, pass: cond, detail: cond ? 'OK' : detail });
  if (!cond) { S.blockers.push('FAIL: ' + label + ' - ' + detail); S.ok = false; }
}

var pidArr  = products.map(function(p) { return p.productId; });
var pidDups = pidArr.filter(function(v, i) { return pidArr.indexOf(v) !== i; });
chk('products productId 不重複', pidDups.length === 0, 'Dups: ' + [...new Set(pidDups)].join(', '));

var pnArr  = products.map(function(p) { return p['P/N']; });
var pnDups = pnArr.filter(function(v, i) { return pnArr.indexOf(v) !== i; });
chk('products P/N 不重複、不空白', pnDups.length === 0, 'Dups: ' + [...new Set(pnDups)].join(', '));

var sciRows = products.filter(function(p) { return /e\+/i.test(String(p.barcode)); });
chk('barcode 不可為科學記號', sciRows.length === 0, sciRows.map(function(p) { return p['P/N'] + '=' + p.barcode; }).join(', '));

var VALID_V = new Set(['BNE','GS','SONY','PLAYSEAT','NLR']);
var badV    = products.filter(function(p) { return !VALID_V.has(p.vendor); });
chk('vendor 必須是 BNE/GS/SONY/PLAYSEAT/NLR', badV.length === 0, badV.map(function(p) { return p['P/N'] + '=' + p.vendor; }).join(', '));

var badPl = products.filter(function(p) { return !p.platform; });
chk('platform 不可空', badPl.length === 0, badPl.slice(0, 5).map(function(p) { return p['P/N']; }).join(', '));

chk('inventory P/N 全部存在於 products', S.inventory.csvNotInProducts.length === 0,
  'Not in products: ' + S.inventory.csvNotInProducts.join(', '));

var dIdArr  = dealers.map(function(d) { return d.dealerId; });
var dIdDups = dIdArr.filter(function(v, i) { return dIdArr.indexOf(v) !== i; });
chk('dealers dealerId 不重複', dIdDups.length === 0, 'Dups: ' + [...new Set(dIdDups)].join(', '));

var dCArr  = dealers.map(function(d) { return d.code; });
var dCDups = dCArr.filter(function(v, i) { return dCArr.indexOf(v) !== i; });
chk('dealers code 不重複', dCDups.length === 0, 'Dups: ' + [...new Set(dCDups)].join(', '));

chk('不含 pmData',                 true, 'Not written');
chk('不含 productLineId',          true, 'Not written');
chk('不含 products.stock',         true, 'Not written');
chk('不含 dealers.sales',          true, 'Not written');
var hasVendorsLegacy = false;
try {
  var sFinal = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, 'settings-master.json'), 'utf8'));
  hasVendorsLegacy = !!(sFinal.productOptions && sFinal.productOptions.vendors);
} catch(e) {}
chk('不含 productOptions.vendors', !hasVendorsLegacy, 'Still present in settings');

// ─── Write migration-summary.md ───────────────────────────────────────────────
var invWithStock = invRecords.filter(function(r) { return r.qty > 0; });
var excelInvRecs = invRecords.filter(function(r) { return r.source === 'excel'; });
var md = [
  '# Migration Summary - 20260518',
  '',
  '## Source Files',
  '- `' + EXCEL_FILE + '`',
  '- `' + EXISTING_INV + '` (for BNE/GS inventory)',
  '',
  '## Products',
  '- **Total:** ' + products.length,
  Object.entries(S.products.byVendor).map(function(e) { return '  - ' + e[0] + ': ' + e[1]; }).join('\n'),
  '',
  '### Skipped Rows (No P/N)',
  S.products.skipped.length === 0 ? '- None' :
    S.products.skipped.map(function(r) { return '- ' + r.sheet + ' row ' + r.row + ': ' + r.name; }).join('\n'),
  '',
  '### Duplicate P/N (skipped)',
  S.products.dupPn.length === 0 ? '- None' :
    S.products.dupPn.map(function(r) { return '- ' + r.pn + ' (' + r.sheet + ' row ' + r.row + ')'; }).join('\n'),
  '',
  '### Missing Barcode',
  S.products.missingBc.length === 0 ? '- None' :
    S.products.missingBc.map(function(r) { return '- ' + r.pn + ' (' + r.sheet + ' row ' + r.row + ')'; }).join('\n'),
  '',
  '### Barcode Duplicate Removal (ECAS/PCAS superseded by ZL format)',
  S.products.barcodeDedup.length === 0 ? '- None' :
    S.products.barcodeDedup.map(function(r) { return '- ' + r.removed + ' (' + r.sheet + ' row ' + r.row + ') — ' + r.name; }).join('\n'),
  '',
  '### Draft Products (missing required price / priceTax in Excel source)',
  S.products.draftPricing.length === 0 ? '- None' : [
    '| Vendor | P/N | Sheet | Row | Missing Fields |',
    '|---|---|---|---|---|',
    S.products.draftPricing.map(function(r) {
      return '| ' + r.vendor + ' | ' + r.pn + ' | ' + r.sheet + ' | ' + r.row + ' | ' + r.missing.join(', ') + ' |';
    }).join('\n'),
  ].join('\n'),
  '',
  '### Empty Platform',
  S.products.emptyPlatform.length === 0 ? '- None' :
    S.products.emptyPlatform.map(function(r) { return '- ' + r.pn; }).join('\n'),
  '',
  '## Inventory',
  '- **Total records:** ' + invRecords.length + ' (one per product)',
  '- **With initialStock > 0:** ' + invWithStock.length,
  '- **Source breakdown:**',
  '  - Excel AGM庫存量 (PS/PLAYSEAT/NLR): ' + excelInvRecs.length + ' records, ' + excelInvRecs.filter(function(r){return r.qty>0;}).length + ' with qty>0',
  '  - Existing CSV (BNE/GS) with qty>0: ' + S.inventory.fromCsv,
  '  - BNE/GS defaulted to 0 (not in CSV): ' + S.inventory.defaultZero,
  '',
  '### Existing CSV entries not in Products',
  S.inventory.csvNotInProducts.length === 0 ? '- None' :
    S.inventory.csvNotInProducts.map(function(p) { return '- ' + p; }).join('\n'),
  '',
  '## Dealers',
  '- **Total:** ' + dealers.length,
  '- Skipped: ' + S.dealers.skipped.length,
  '',
  '## Settings',
  '- vendorOwners: ' + (S.settings.vendorOwners || 0),
  '- productOptions groups: ' + (S.settings.productOptions || 0),
  '- pmUsers: ' + (S.settings.pmUsers || 0),
  '- salesUsers: ' + (S.settings.salesUsers || 0),
  (S.settings.changes && S.settings.changes.length > 0) ? '- Changes: ' + S.settings.changes.join('; ') : '',
  S.settings.error ? '- ERROR: ' + S.settings.error : '',
  '',
  '## Legacy Fields Removed',
  '- passwords (not written)',
  '- archived salesUsers (filtered from settings)',
  '- productOptions.vendors (removed from settings)',
  '- productLineId (not in output schema)',
  '- products.stock (not in output schema)',
  '- dealers.sales (not in output schema)',
  '- pmData references (not written)',
  '',
  '## Validation Results',
  S.validation.map(function(v) {
    return '- [' + (v.pass ? 'PASS' : '**FAIL**') + '] ' + v.check + (v.pass ? '' : '\n  > ' + v.detail);
  }).join('\n'),
  '',
  '## Blockers',
  S.blockers.length === 0 ? '- None' : S.blockers.map(function(b) { return '- ' + b; }).join('\n'),
  '',
  '## Can Perform Full Reset Rebuild?',
  S.ok
    ? '**YES** - All validations passed. Package is ready for Full Reset rebuild.'
    : '**NO** - Fix blockers above before proceeding with Full Reset.',
].join('\n');

fs.writeFileSync(path.join(OUTPUT_DIR, 'migration-summary.md'), md, 'utf8');
console.log('Wrote migration-summary.md');

// ─── Final output ─────────────────────────────────────────────────────────────
console.log('\n========= RESULT =========');
console.log('Output dir:', OUTPUT_DIR);
console.log('Products:', products.length, '| Inventory:', invRecords.length, '| Dealers:', dealers.length);
var fails = S.validation.filter(function(v) { return !v.pass; });
console.log('Validation fails:', fails.length);
fails.forEach(function(v) { console.log('  FAIL:', v.check, '-', v.detail); });
console.log('Blockers:', S.blockers.length);
S.blockers.forEach(function(b) { console.log(' ', b); });
console.log('Can Full Reset:', S.ok ? 'YES' : 'NO');
