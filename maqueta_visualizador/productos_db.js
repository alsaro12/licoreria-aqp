const fs = require("fs/promises");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const BASE_CSV_PATH = path.join(ROOT_DIR, "inventario_inicio_grecia.csv");
const DEFAULT_PRODUCTS_CSV_PATH = path.join(ROOT_DIR, "productos.csv");
const VENTAS_CSV_PATH = path.join(ROOT_DIR, "ventas_diarias.csv");
const KARDEX_CSV_PATH = path.join(ROOT_DIR, "kardex.csv");
const SOURCE_CONFIG_PATH = path.join(ROOT_DIR, ".productos_source.json");
const SOURCES_DIR = path.join(ROOT_DIR, "csv_sources");

const PRODUCT_HEADERS = ["N°", "NOMBRE", "PRECIO", "PEDIDO", "STOCK_ACTUAL"];
const VENTAS_HEADERS = [
  "ID_VENTA",
  "FECHA",
  "N°",
  "NOMBRE",
  "CANTIDAD",
  "PRECIO",
  "TOTAL",
  "TIPO_PAGO",
  "ORIGEN"
];
const KARDEX_HEADERS = [
  "ID_MOV",
  "FECHA_HORA",
  "N°",
  "NOMBRE",
  "TIPO",
  "CANTIDAD",
  "STOCK_ANTES",
  "STOCK_DESPUES",
  "REFERENCIA",
  "NOTA"
];

const VALID_MONTHS = new Set(["SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE"]);
const PAYMENT_TYPES = ["A Ya Per", "Efectivo", "Pedido Ya", "Rappi", "EasyPay"];

function buildError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function trimValue(value) {
  return String(value ?? "").trim();
}

function normalizeHeader(value) {
  return trimValue(value)
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeHeaderKey(value) {
  return normalizeHeader(value).replace(/[^A-Z0-9]/g, "");
}

function isIdHeader(value) {
  const normalized = normalizeHeader(value).replace(/\s+/g, "");
  return normalized === "N°" || normalized === "Nº" || normalized === "N";
}

function parseInteger(value) {
  const raw = trimValue(value).replace(",", ".");
  if (!raw) return null;
  const number = Number.parseFloat(raw);
  if (!Number.isFinite(number)) return null;
  return Math.trunc(number);
}

function parseId(value) {
  const number = parseInteger(value);
  if (!Number.isFinite(number) || number <= 0) return null;
  return number;
}

function parseDecimal(value) {
  const raw = trimValue(value).replace(",", ".");
  if (!raw) return null;
  const number = Number.parseFloat(raw);
  if (!Number.isFinite(number)) return null;
  return number;
}

function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function parseIsoDate(value) {
  const raw = trimValue(value);
  if (!raw) return null;

  const matchIso = raw.match(/^(\d{4}-\d{2}-\d{2})(?:[ T].*)?$/);
  if (matchIso) return matchIso[1];

  const matchLatam = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (matchLatam) {
    const [, dd, mm, yyyy] = matchLatam;
    return `${yyyy}-${mm}-${dd}`;
  }

  return null;
}

function isBusinessDate(date) {
  if (!/^(\d{4})-\d{2}-\d{2}$/.test(String(date || ""))) return false;
  const year = Number(String(date).slice(0, 4));
  return year >= 2000 && year <= 2100;
}

function normalizePaymentType(value, options = {}) {
  const fallback = options.defaultValue || "Efectivo";
  const raw = trimValue(value);
  if (!raw) return fallback;

  const normalized = normalizeHeader(raw);
  const found = PAYMENT_TYPES.find((item) => normalizeHeader(item) === normalized);
  return found || fallback;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function nowIsoDateTime() {
  return new Date().toISOString();
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (text.includes('"')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  if (text.includes(",") || text.includes("\n") || text.includes("\r")) {
    return `"${text}"`;
  }
  return text;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      row.push(field);
      field = "";
      continue;
    }

    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }

    if (char === "\r") continue;
    field += char;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  if (rows.length > 0 && rows[0].length > 0) {
    rows[0][0] = rows[0][0].replace(/^\uFEFF/, "");
  }

  return rows;
}

function stringifyCsv(rows) {
  return rows.map((row) => row.map(csvEscape).join(",")).join("\n") + "\n";
}

function normalizeProductRecord(raw) {
  const id = parseId(raw["N°"] ?? raw.id ?? raw.n);
  if (!id) throw buildError(400, "El campo N° es obligatorio y debe ser un numero entero positivo.");

  const name = trimValue(raw.NOMBRE ?? raw.nombre);
  if (!name) throw buildError(400, "El campo NOMBRE es obligatorio.");

  const price = parseDecimal(raw.PRECIO ?? raw.precio);
  if (price === null) throw buildError(400, "El campo PRECIO es obligatorio y debe ser numerico.");
  if (price < 0) throw buildError(400, "El campo PRECIO no puede ser negativo.");

  const pedido = parseInteger(raw.PEDIDO ?? raw.pedido ?? 0);
  if (pedido !== null && pedido < 0) {
    throw buildError(400, "El campo PEDIDO no puede ser negativo.");
  }

  const stockActual = parseDecimal(
    raw.STOCK_ACTUAL ?? raw.stockActual ?? raw.stock_actual ?? raw.stock ?? 0
  );

  if (stockActual === null) {
    throw buildError(400, "El campo STOCK_ACTUAL debe ser numerico.");
  }

  if (stockActual < 0) {
    throw buildError(400, "El campo STOCK_ACTUAL no puede ser negativo.");
  }

  return {
    "N°": id,
    NOMBRE: name,
    PRECIO: round2(price),
    PEDIDO: pedido ?? 0,
    STOCK_ACTUAL: round2(stockActual)
  };
}

function productToRow(product) {
  return [product["N°"], product.NOMBRE, product.PRECIO, product.PEDIDO, product.STOCK_ACTUAL];
}

function saleToRow(sale) {
  return [
    sale.ID_VENTA,
    sale.FECHA,
    sale["N°"],
    sale.NOMBRE,
    sale.CANTIDAD,
    sale.PRECIO,
    sale.TOTAL,
    normalizePaymentType(sale.TIPO_PAGO, { defaultValue: "Efectivo" }),
    sale.ORIGEN || "MANUAL"
  ];
}

function movementToRow(move) {
  return [
    move.ID_MOV,
    move.FECHA_HORA,
    move["N°"],
    move.NOMBRE,
    move.TIPO,
    move.CANTIDAD,
    move.STOCK_ANTES,
    move.STOCK_DESPUES,
    move.REFERENCIA || "",
    move.NOTA || ""
  ];
}

async function existsFile(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function sanitizeFileName(name) {
  const cleaned = trimValue(name).replace(/[^a-zA-Z0-9._-]+/g, "_");
  const base = cleaned || "productos.csv";
  return base.toLowerCase().endsWith(".csv") ? base : `${base}.csv`;
}

async function readSourceConfig() {
  try {
    const raw = await fs.readFile(SOURCE_CONFIG_PATH, "utf8");
    const data = JSON.parse(raw);
    return data && typeof data === "object" ? data : null;
  } catch {
    return null;
  }
}

async function writeSourceConfig(data) {
  await fs.writeFile(SOURCE_CONFIG_PATH, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function resolveConfiguredPath(inputPath) {
  const raw = trimValue(inputPath);
  if (!raw) return DEFAULT_PRODUCTS_CSV_PATH;
  return path.isAbsolute(raw) ? raw : path.resolve(ROOT_DIR, raw);
}

async function getSourceInfo() {
  const config = await readSourceConfig();
  const activeCsvPath = resolveConfiguredPath(config?.activeCsvPath);
  const sourceName = trimValue(config?.sourceName) || path.basename(activeCsvPath);
  const sourceType =
    trimValue(config?.sourceType) || (activeCsvPath === DEFAULT_PRODUCTS_CSV_PATH ? "default" : "custom");

  return {
    activeCsvPath,
    defaultCsvPath: DEFAULT_PRODUCTS_CSV_PATH,
    sourceName,
    sourceType,
    exists: await existsFile(activeCsvPath),
    configPath: SOURCE_CONFIG_PATH
  };
}

async function setActiveSourcePath(inputPath, meta = {}) {
  const resolvedPath = resolveConfiguredPath(inputPath);
  if (!resolvedPath.toLowerCase().endsWith(".csv")) {
    throw buildError(400, "El origen debe ser un archivo .csv");
  }

  const sourceName = trimValue(meta.sourceName) || path.basename(resolvedPath);
  const sourceType =
    trimValue(meta.sourceType) || (resolvedPath === DEFAULT_PRODUCTS_CSV_PATH ? "default" : "custom");

  await writeSourceConfig({
    activeCsvPath: resolvedPath,
    sourceName,
    sourceType,
    updatedAt: nowIsoDateTime()
  });

  return getSourceInfo();
}

async function setDefaultSource() {
  return setActiveSourcePath(DEFAULT_PRODUCTS_CSV_PATH, {
    sourceName: "productos.csv",
    sourceType: "default"
  });
}

async function loadBaseRows() {
  const raw = await fs.readFile(BASE_CSV_PATH, "utf8");
  return parseCsv(raw);
}

function findDateForSaleColumn(dateRow, saleColumnIndex) {
  for (let offset = 0; offset <= 8; offset += 1) {
    const idx = saleColumnIndex - offset;
    if (idx < 0) break;
    const parsedDate = parseIsoDate(dateRow[idx]);
    if (parsedDate) return parsedDate;
  }
  return null;
}

function extractProductsFromBaseRows(rows) {
  const productsById = new Map();
  let pedidoColumnIndex = -1;
  let cierreColumns = [];

  for (const row of rows) {
    if (!row || row.length < 4) continue;

    const month = normalizeHeader(row[0]);
    if (!VALID_MONTHS.has(month)) continue;

    if (isIdHeader(row[1])) {
      pedidoColumnIndex = row.findIndex((cell) => normalizeHeader(cell) === "PEDIDO");
      cierreColumns = row
        .map((cell, index) => ({ key: normalizeHeaderKey(cell), index }))
        .filter((item) => item.key === "CIERRE")
        .map((item) => item.index);
      continue;
    }

    const id = parseId(row[1]);
    if (!id) continue;

    const name = trimValue(row[2]);
    if (!name) continue;

    const price = parseDecimal(row[3]);
    const pedido = pedidoColumnIndex >= 0 ? parseInteger(row[pedidoColumnIndex]) : null;

    let stockCandidate = null;
    for (const col of cierreColumns) {
      const value = parseDecimal(row[col]);
      if (value !== null) stockCandidate = value;
    }

    if (stockCandidate === null) {
      for (let i = row.length - 1; i >= 4; i -= 1) {
        const value = parseDecimal(row[i]);
        if (value !== null) {
          stockCandidate = value;
          break;
        }
      }
    }

    const previous = productsById.get(id);
    productsById.set(id, {
      "N°": id,
      NOMBRE: name || previous?.NOMBRE || "",
      PRECIO: round2(price ?? previous?.PRECIO ?? 0),
      PEDIDO: pedido ?? previous?.PEDIDO ?? 0,
      STOCK_ACTUAL: round2(Math.max(0, stockCandidate ?? previous?.STOCK_ACTUAL ?? 0))
    });
  }

  return [...productsById.values()].sort((a, b) => a["N°"] - b["N°"]);
}

function extractSalesFromBaseRows(rows) {
  if (!rows.length) return [];

  const dateRow = rows[0] || [];
  const salesByKey = new Map();
  let saleColumns = [];

  for (const row of rows) {
    if (!row || row.length < 4) continue;

    const month = normalizeHeader(row[0]);
    if (!VALID_MONTHS.has(month)) continue;

    if (isIdHeader(row[1])) {
      saleColumns = row
        .map((cell, index) => ({ key: normalizeHeaderKey(cell), index }))
        .filter((item) => item.key === "VENTADELDIA")
        .map((item) => ({
          index: item.index,
          date: findDateForSaleColumn(dateRow, item.index)
        }))
        .filter((item) => Boolean(item.date));
      continue;
    }

    const id = parseId(row[1]);
    if (!id) continue;

    const name = trimValue(row[2]);
    if (!name) continue;

    const price = round2(parseDecimal(row[3]) ?? 0);

    for (const saleCol of saleColumns) {
      const qty = parseDecimal(row[saleCol.index]);
      if (qty === null || qty <= 0) continue;

      const key = `${saleCol.date}::${id}`;
      const previous = salesByKey.get(key);
      const nextQty = round2((previous?.CANTIDAD ?? 0) + qty);

      salesByKey.set(key, {
        FECHA: saleCol.date,
        "N°": id,
        NOMBRE: name,
        CANTIDAD: nextQty,
        PRECIO: price,
        TOTAL: round2(nextQty * price),
        TIPO_PAGO: "Efectivo",
        ORIGEN: "MIGRACION_BASE"
      });
    }
  }

  const sales = [...salesByKey.values()];

  sales.sort((a, b) => {
    if (a.FECHA === b.FECHA) return a["N°"] - b["N°"];
    return a.FECHA.localeCompare(b.FECHA);
  });

  return sales.map((item, index) => ({
    ID_VENTA: index + 1,
    ...item
  }));
}

async function writeProductsToPath(products, targetPath) {
  const rows = [PRODUCT_HEADERS, ...products.map(productToRow)];
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, stringifyCsv(rows), "utf8");
}

async function writeSalesToPath(sales, targetPath) {
  const rows = [VENTAS_HEADERS, ...sales.map(saleToRow)];
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, stringifyCsv(rows), "utf8");
}

async function writeKardexToPath(movements, targetPath) {
  const rows = [KARDEX_HEADERS, ...movements.map(movementToRow)];
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, stringifyCsv(rows), "utf8");
}

function parseProductsCsvRows(rows) {
  if (!rows.length) return [];

  const header = rows[0];
  const idIndex = header.findIndex((cell) => isIdHeader(cell));
  const nameIndex = header.findIndex((cell) => normalizeHeaderKey(cell) === "NOMBRE");
  const priceIndex = header.findIndex((cell) => normalizeHeaderKey(cell) === "PRECIO");
  const pedidoIndex = header.findIndex((cell) => normalizeHeaderKey(cell) === "PEDIDO");
  const stockIndex = header.findIndex((cell) => normalizeHeaderKey(cell) === "STOCKACTUAL");

  if (idIndex < 0 || nameIndex < 0 || priceIndex < 0) {
    throw buildError(400, "CSV invalido. Debe incluir columnas N°, NOMBRE y PRECIO.");
  }

  const productsById = new Map();

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    const id = parseId(row[idIndex]);
    if (!id) continue;

    const name = trimValue(row[nameIndex]);
    if (!name) continue;

    const price = round2(parseDecimal(row[priceIndex]) ?? 0);
    const pedido = pedidoIndex >= 0 ? parseInteger(row[pedidoIndex]) ?? 0 : 0;
    const stock = stockIndex >= 0 ? parseDecimal(row[stockIndex]) ?? 0 : 0;

    productsById.set(id, {
      "N°": id,
      NOMBRE: name,
      PRECIO: price,
      PEDIDO: pedido,
      STOCK_ACTUAL: round2(Math.max(0, stock))
    });
  }

  return [...productsById.values()].sort((a, b) => a["N°"] - b["N°"]);
}

function parseSalesCsvRows(rows) {
  if (!rows.length) return [];

  const header = rows[0];
  const idVentaIndex = header.findIndex((cell) => normalizeHeaderKey(cell) === "IDVENTA");
  const dateIndex = header.findIndex((cell) => normalizeHeaderKey(cell) === "FECHA");
  const productIdIndex = header.findIndex((cell) => isIdHeader(cell));
  const nameIndex = header.findIndex((cell) => normalizeHeaderKey(cell) === "NOMBRE");
  const qtyIndex = header.findIndex((cell) => normalizeHeaderKey(cell) === "CANTIDAD");
  const priceIndex = header.findIndex((cell) => normalizeHeaderKey(cell) === "PRECIO");
  const totalIndex = header.findIndex((cell) => normalizeHeaderKey(cell) === "TOTAL");
  const paymentTypeIndex = header.findIndex((cell) => normalizeHeaderKey(cell) === "TIPOPAGO");
  const sourceIndex = header.findIndex((cell) => normalizeHeaderKey(cell) === "ORIGEN");

  if (dateIndex < 0 || productIdIndex < 0 || nameIndex < 0 || qtyIndex < 0) {
    throw buildError(400, "CSV de ventas invalido.");
  }

  const sales = [];

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    const productId = parseId(row[productIdIndex]);
    if (!productId) continue;

    const date = parseIsoDate(row[dateIndex]);
    if (!date) continue;

    const qty = parseDecimal(row[qtyIndex]);
    if (qty === null || qty <= 0) continue;

    const price = round2(parseDecimal(row[priceIndex]) ?? 0);
    const total = round2(parseDecimal(row[totalIndex]) ?? qty * price);
    const idVenta = idVentaIndex >= 0 ? parseId(row[idVentaIndex]) ?? i : i;

    sales.push({
      ID_VENTA: idVenta,
      FECHA: date,
      "N°": productId,
      NOMBRE: trimValue(row[nameIndex]),
      CANTIDAD: round2(qty),
      PRECIO: price,
      TOTAL: total,
      TIPO_PAGO: normalizePaymentType(row[paymentTypeIndex], { defaultValue: "Efectivo" }),
      ORIGEN: trimValue(row[sourceIndex]) || "MANUAL"
    });
  }

  sales.sort((a, b) => {
    if (a.FECHA === b.FECHA) return b.ID_VENTA - a.ID_VENTA;
    return b.FECHA.localeCompare(a.FECHA);
  });

  return sales;
}

function parseKardexCsvRows(rows) {
  if (!rows.length) return [];

  const header = rows[0];
  const idIndex = header.findIndex((cell) => normalizeHeaderKey(cell) === "IDMOV");
  const dtIndex = header.findIndex((cell) => normalizeHeaderKey(cell) === "FECHAHORA");
  const productIdIndex = header.findIndex((cell) => isIdHeader(cell));
  const nameIndex = header.findIndex((cell) => normalizeHeaderKey(cell) === "NOMBRE");
  const typeIndex = header.findIndex((cell) => normalizeHeaderKey(cell) === "TIPO");
  const qtyIndex = header.findIndex((cell) => normalizeHeaderKey(cell) === "CANTIDAD");
  const beforeIndex = header.findIndex((cell) => normalizeHeaderKey(cell) === "STOCKANTES");
  const afterIndex = header.findIndex((cell) => normalizeHeaderKey(cell) === "STOCKDESPUES");
  const refIndex = header.findIndex((cell) => normalizeHeaderKey(cell) === "REFERENCIA");
  const noteIndex = header.findIndex((cell) => normalizeHeaderKey(cell) === "NOTA");

  if (dtIndex < 0 || productIdIndex < 0 || typeIndex < 0 || qtyIndex < 0) {
    throw buildError(400, "CSV de kardex invalido.");
  }

  const items = [];

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    const productId = parseId(row[productIdIndex]);
    if (!productId) continue;

    const dtRaw = trimValue(row[dtIndex]);
    if (!dtRaw) continue;

    const qty = parseDecimal(row[qtyIndex]);
    if (qty === null || qty <= 0) continue;

    const id = idIndex >= 0 ? parseId(row[idIndex]) ?? i : i;

    items.push({
      ID_MOV: id,
      FECHA_HORA: dtRaw,
      "N°": productId,
      NOMBRE: trimValue(row[nameIndex]),
      TIPO: normalizeHeader(row[typeIndex]) === "INGRESO" ? "INGRESO" : "SALIDA",
      CANTIDAD: round2(qty),
      STOCK_ANTES: round2(parseDecimal(row[beforeIndex]) ?? 0),
      STOCK_DESPUES: round2(parseDecimal(row[afterIndex]) ?? 0),
      REFERENCIA: trimValue(row[refIndex]),
      NOTA: trimValue(row[noteIndex])
    });
  }

  items.sort((a, b) => {
    if (a.FECHA_HORA === b.FECHA_HORA) return b.ID_MOV - a.ID_MOV;
    return b.FECHA_HORA.localeCompare(a.FECHA_HORA);
  });

  return items;
}

async function rebuildProductsCsvFromBase() {
  const rows = await loadBaseRows();
  const products = extractProductsFromBaseRows(rows);
  await writeProductsToPath(products, DEFAULT_PRODUCTS_CSV_PATH);
  return products;
}

async function setSourceFromUpload(filename, content) {
  const csvText = String(content ?? "");
  if (!csvText.trim()) {
    throw buildError(400, "El archivo CSV esta vacio.");
  }

  const rows = parseCsv(csvText);
  const products = parseProductsCsvRows(rows);
  if (!products.length) {
    throw buildError(400, "No se encontraron productos validos en el CSV.");
  }

  const safeName = sanitizeFileName(filename || "productos_manual.csv");
  const targetPath = path.join(SOURCES_DIR, `${Date.now()}_${safeName}`);
  await writeProductsToPath(products, targetPath);

  await setActiveSourcePath(targetPath, {
    sourceName: safeName,
    sourceType: "uploaded"
  });

  return getSourceInfo();
}

async function ensureProductsCsv(options = {}) {
  const forceRebuild = Boolean(options.forceRebuild);

  if (forceRebuild) {
    const products = await rebuildProductsCsvFromBase();
    if (options.activateDefault !== false) await setDefaultSource();
    return products;
  }

  const source = await getSourceInfo();
  if (await existsFile(source.activeCsvPath)) {
    return null;
  }

  if (source.activeCsvPath !== DEFAULT_PRODUCTS_CSV_PATH) {
    await setDefaultSource();
  }

  if (await existsFile(DEFAULT_PRODUCTS_CSV_PATH)) {
    return null;
  }

  const products = await rebuildProductsCsvFromBase();
  await setDefaultSource();
  return products;
}

async function ensureProductsSchema() {
  await ensureProductsCsv();
  const source = await getSourceInfo();
  const raw = await fs.readFile(source.activeCsvPath, "utf8");
  const rows = parseCsv(raw);

  if (!rows.length) {
    await writeProductsToPath([], source.activeCsvPath);
    return { migrated: true };
  }

  const hasStockColumn = rows[0].some((cell) => normalizeHeaderKey(cell) === "STOCKACTUAL");
  if (hasStockColumn) return { migrated: false };

  const currentProducts = parseProductsCsvRows(rows);
  let stockById = new Map();

  if (source.activeCsvPath === DEFAULT_PRODUCTS_CSV_PATH && (await existsFile(BASE_CSV_PATH))) {
    try {
      const baseRows = await loadBaseRows();
      const baseProducts = extractProductsFromBaseRows(baseRows);
      stockById = new Map(baseProducts.map((item) => [item["N°"], item.STOCK_ACTUAL]));
    } catch {
      stockById = new Map();
    }
  }

  const migrated = currentProducts.map((item) => ({
    ...item,
    STOCK_ACTUAL: round2(Math.max(0, stockById.get(item["N°"]) ?? 0))
  }));

  await writeProductsToPath(migrated, source.activeCsvPath);
  return { migrated: true };
}

async function ensureVentasCsvFromBase(options = {}) {
  const exists = await existsFile(VENTAS_CSV_PATH);
  const forceRebuild = Boolean(options.forceRebuild);

  if (exists && !forceRebuild) {
    const raw = await fs.readFile(VENTAS_CSV_PATH, "utf8");
    const rows = parseCsv(raw);
    if (rows.length > 1) {
      let hasInvalidDate = false;
      try {
        const parsed = parseSalesCsvRows(rows);
        hasInvalidDate = parsed.some((sale) => !isBusinessDate(sale.FECHA));
      } catch {
        hasInvalidDate = true;
      }

      if (!hasInvalidDate) {
      return { seeded: false, total: rows.length - 1 };
      }
    }
  }

  const baseRows = await loadBaseRows();
  const sales = extractSalesFromBaseRows(baseRows);
  await writeSalesToPath(sales, VENTAS_CSV_PATH);
  return { seeded: true, total: sales.length };
}

async function ensureKardexCsv() {
  const exists = await existsFile(KARDEX_CSV_PATH);

  if (!exists) {
    await writeKardexToPath([], KARDEX_CSV_PATH);
    return { created: true };
  }

  const raw = await fs.readFile(KARDEX_CSV_PATH, "utf8");
  if (trimValue(raw)) return { created: false };

  await writeKardexToPath([], KARDEX_CSV_PATH);
  return { created: true };
}

async function ensureInventoryData(options = {}) {
  await ensureProductsCsv({
    forceRebuild: Boolean(options.forceRebuildProducts),
    activateDefault: options.activateDefault
  });
  await ensureProductsSchema();

  const ventasStatus = await ensureVentasCsvFromBase({
    forceRebuild: Boolean(options.forceRebuildSales)
  });
  const kardexStatus = await ensureKardexCsv();

  return {
    ventasStatus,
    kardexStatus
  };
}

async function readProducts() {
  await ensureProductsCsv();
  await ensureProductsSchema();

  const source = await getSourceInfo();
  const raw = await fs.readFile(source.activeCsvPath, "utf8");
  return parseProductsCsvRows(parseCsv(raw));
}

async function writeProducts(products) {
  const source = await getSourceInfo();
  await writeProductsToPath(products, source.activeCsvPath);
}

async function readSales() {
  await ensureVentasCsvFromBase();
  const raw = await fs.readFile(VENTAS_CSV_PATH, "utf8");
  return parseSalesCsvRows(parseCsv(raw));
}

async function writeSales(sales) {
  await writeSalesToPath(sales, VENTAS_CSV_PATH);
}

async function readKardex() {
  await ensureKardexCsv();
  const raw = await fs.readFile(KARDEX_CSV_PATH, "utf8");
  return parseKardexCsvRows(parseCsv(raw));
}

async function writeKardex(movements) {
  await writeKardexToPath(movements, KARDEX_CSV_PATH);
}

async function readRawActiveCsv() {
  await ensureProductsCsv();
  const source = await getSourceInfo();
  return fs.readFile(source.activeCsvPath, "utf8");
}

function normalizePage(value, defaultValue = 1) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return defaultValue;
  return parsed;
}

function normalizePageSize(value, defaultValue = 20) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return defaultValue;
  return Math.min(parsed, 200);
}

function paginate(items, options = {}) {
  const pageSize = normalizePageSize(options.pageSize, 20);
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const page = Math.min(normalizePage(options.page, 1), totalPages);
  const start = (page - 1) * pageSize;
  const pagedItems = items.slice(start, start + pageSize);

  return {
    items: pagedItems,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages,
      hasPrev: page > 1,
      hasNext: page < totalPages
    }
  };
}

function filterProducts(products, options = {}) {
  const query = trimValue(options.q).toLowerCase();
  const pedidoFilter = trimValue(options.pedido).toLowerCase() || "todos";

  return products.filter((item) => {
    const matchesQuery =
      !query ||
      String(item["N°"]).includes(query) ||
      String(item.NOMBRE ?? "")
        .toLowerCase()
        .includes(query) ||
      String(item.PRECIO ?? "").includes(query) ||
      String(item.STOCK_ACTUAL ?? "").includes(query);

    const pedido = Number(item.PEDIDO) || 0;
    const matchesPedido =
      pedidoFilter === "todos" ||
      (pedidoFilter === "con-pedido" && pedido > 0) ||
      (pedidoFilter === "sin-pedido" && pedido <= 0);

    return matchesQuery && matchesPedido;
  });
}

function filterSales(sales, options = {}) {
  const query = trimValue(options.q).toLowerCase();
  if (!query) return sales;

  return sales.filter((item) => {
    return (
      String(item["N°"]).includes(query) ||
      String(item.NOMBRE ?? "")
        .toLowerCase()
        .includes(query) ||
      String(item.FECHA ?? "").toLowerCase().includes(query) ||
      String(item.CANTIDAD ?? "").includes(query) ||
      String(item.TIPO_PAGO ?? "").toLowerCase().includes(query) ||
      String(item.TOTAL ?? "").includes(query)
    );
  });
}

function filterKardex(movements, options = {}) {
  const query = trimValue(options.q).toLowerCase();
  const tipo = trimValue(options.tipo).toUpperCase();

  return movements.filter((item) => {
    const matchesTipo = !tipo || tipo === "TODOS" || item.TIPO === tipo;

    const matchesQuery =
      !query ||
      String(item["N°"]).includes(query) ||
      String(item.NOMBRE ?? "")
        .toLowerCase()
        .includes(query) ||
      String(item.FECHA_HORA ?? "").toLowerCase().includes(query) ||
      String(item.REFERENCIA ?? "")
        .toLowerCase()
        .includes(query) ||
      String(item.NOTA ?? "")
        .toLowerCase()
        .includes(query);

    return matchesTipo && matchesQuery;
  });
}

async function listProducts(options = {}) {
  const products = await readProducts();
  const filtered = filterProducts(products, options);
  return paginate(filtered, options);
}

async function listSales(options = {}) {
  const sales = await readSales();
  const filtered = filterSales(sales, options);
  return paginate(filtered, options);
}

async function listKardex(options = {}) {
  const movements = await readKardex();
  const filtered = filterKardex(movements, options);
  return paginate(filtered, options);
}

async function getProductStats() {
  const products = await readProducts();
  return {
    total: products.length,
    conPedido: products.filter((item) => Number(item.PEDIDO) > 0).length,
    stockTotal: round2(products.reduce((acc, item) => acc + (Number(item.STOCK_ACTUAL) || 0), 0))
  };
}

async function appendKardexMovement(payload) {
  const movements = await readKardex();
  const nextId = movements.reduce((max, item) => Math.max(max, item.ID_MOV || 0), 0) + 1;

  const movement = {
    ID_MOV: nextId,
    FECHA_HORA: payload.FECHA_HORA || nowIsoDateTime(),
    "N°": payload["N°"],
    NOMBRE: payload.NOMBRE,
    TIPO: payload.TIPO,
    CANTIDAD: round2(payload.CANTIDAD),
    STOCK_ANTES: round2(payload.STOCK_ANTES),
    STOCK_DESPUES: round2(payload.STOCK_DESPUES),
    REFERENCIA: trimValue(payload.REFERENCIA),
    NOTA: trimValue(payload.NOTA)
  };

  movements.push(movement);
  await writeKardex(movements);
  return movement;
}

async function createProduct(payload) {
  const products = await readProducts();
  const hasCustomId = payload["N°"] !== undefined || payload.id !== undefined || payload.n !== undefined;
  const nextId = products.reduce((max, item) => Math.max(max, item["N°"]), 0) + 1;
  const withId = { ...payload, "N°": hasCustomId ? payload["N°"] ?? payload.id ?? payload.n : nextId };

  const stockInitial =
    payload.STOCK_ACTUAL ?? payload.stockActual ?? payload.stock_actual ?? payload.stockInicial ?? 0;

  const product = normalizeProductRecord({ ...withId, STOCK_ACTUAL: stockInitial });

  if (products.some((item) => item["N°"] === product["N°"])) {
    throw buildError(409, `Ya existe un producto con N° ${product["N°"]}.`);
  }

  products.push(product);
  products.sort((a, b) => a["N°"] - b["N°"]);
  await writeProducts(products);

  if (Number(product.STOCK_ACTUAL) > 0) {
    await appendKardexMovement({
      "N°": product["N°"],
      NOMBRE: product.NOMBRE,
      TIPO: "INGRESO",
      CANTIDAD: Number(product.STOCK_ACTUAL),
      STOCK_ANTES: 0,
      STOCK_DESPUES: Number(product.STOCK_ACTUAL),
      REFERENCIA: "CREACION_PRODUCTO",
      NOTA: "Stock inicial"
    });
  }

  return product;
}

function parseStockDelta(payload) {
  const raw =
    payload.stockAjuste ??
    payload.stock_ajuste ??
    payload.cantidadIngreso ??
    payload.cantidad_ingreso ??
    payload.stockDelta ??
    0;

  if (raw === null || raw === undefined || trimValue(raw) === "") return 0;
  const parsed = parseDecimal(raw);
  if (parsed === null) {
    throw buildError(400, "El ajuste de stock debe ser numerico.");
  }
  return round2(parsed);
}

async function updateProduct(idInput, payload) {
  const id = parseId(idInput);
  if (!id) throw buildError(400, "El id del producto es invalido.");

  if (payload["N°"] !== undefined && parseId(payload["N°"]) !== id) {
    throw buildError(400, "El campo N° no se puede editar.");
  }

  const products = await readProducts();
  const index = products.findIndex((item) => item["N°"] === id);
  if (index < 0) throw buildError(404, `No existe producto con N° ${id}.`);

  const current = products[index];
  const stockDelta = parseStockDelta(payload);
  const nextStock = round2(Number(current.STOCK_ACTUAL || 0) + stockDelta);

  if (nextStock < 0) {
    throw buildError(400, `Stock insuficiente para N° ${id}. Stock actual: ${current.STOCK_ACTUAL}.`);
  }

  const merged = {
    "N°": current["N°"],
    NOMBRE: payload.NOMBRE ?? current.NOMBRE,
    PRECIO: payload.PRECIO ?? current.PRECIO,
    PEDIDO: payload.PEDIDO ?? current.PEDIDO,
    STOCK_ACTUAL: nextStock
  };

  const updated = normalizeProductRecord(merged);
  products[index] = updated;
  products.sort((a, b) => a["N°"] - b["N°"]);
  await writeProducts(products);

  if (stockDelta !== 0) {
    await appendKardexMovement({
      "N°": updated["N°"],
      NOMBRE: updated.NOMBRE,
      TIPO: stockDelta > 0 ? "INGRESO" : "SALIDA",
      CANTIDAD: Math.abs(stockDelta),
      STOCK_ANTES: Number(current.STOCK_ACTUAL || 0),
      STOCK_DESPUES: Number(updated.STOCK_ACTUAL || 0),
      REFERENCIA: "AJUSTE_EDICION",
      NOTA: trimValue(payload.nota) || "Ajuste manual en edicion"
    });
  }

  return updated;
}

async function deleteProduct(idInput) {
  const id = parseId(idInput);
  if (!id) throw buildError(400, "El id del producto es invalido.");

  const products = await readProducts();
  const index = products.findIndex((item) => item["N°"] === id);
  if (index < 0) throw buildError(404, `No existe producto con N° ${id}.`);

  const [removed] = products.splice(index, 1);
  await writeProducts(products);
  return removed;
}

async function registerSale(payload) {
  const productId = parseId(payload["N°"] ?? payload.id ?? payload.productId ?? payload.productoId);
  if (!productId) throw buildError(400, "Debes indicar un producto valido.");

  const quantity = parseDecimal(payload.cantidad ?? payload.qty ?? payload.CANTIDAD);
  if (quantity === null || quantity <= 0) {
    throw buildError(400, "La cantidad de venta debe ser mayor a 0.");
  }

  const fecha = parseIsoDate(payload.fecha) || todayIso();
  const tipoPago = normalizePaymentType(payload.tipoPago ?? payload.tipo_pago ?? payload.TIPO_PAGO, {
    defaultValue: "Efectivo"
  });
  const nota = trimValue(payload.nota);

  const products = await readProducts();
  const index = products.findIndex((item) => item["N°"] === productId);
  if (index < 0) throw buildError(404, `No existe producto con N° ${productId}.`);

  const product = products[index];
  const stockBefore = Number(product.STOCK_ACTUAL || 0);
  const stockAfter = round2(stockBefore - quantity);

  if (stockAfter < 0) {
    throw buildError(400, `Stock insuficiente para N° ${productId}. Stock actual: ${stockBefore}.`);
  }

  product.STOCK_ACTUAL = stockAfter;
  products[index] = product;
  await writeProducts(products);

  const sales = await readSales();
  const nextSaleId = sales.reduce((max, item) => Math.max(max, item.ID_VENTA || 0), 0) + 1;
  const price = Number(product.PRECIO || 0);

  const sale = {
    ID_VENTA: nextSaleId,
    FECHA: fecha,
    "N°": product["N°"],
    NOMBRE: product.NOMBRE,
    CANTIDAD: round2(quantity),
    PRECIO: round2(price),
    TOTAL: round2(price * quantity),
    TIPO_PAGO: tipoPago,
    ORIGEN: "MANUAL"
  };

  sales.push(sale);
  await writeSales(sales);

  const movement = await appendKardexMovement({
    "N°": product["N°"],
    NOMBRE: product.NOMBRE,
    TIPO: "SALIDA",
    CANTIDAD: round2(quantity),
    STOCK_ANTES: stockBefore,
    STOCK_DESPUES: stockAfter,
    REFERENCIA: `VENTA_DIARIA:${nextSaleId}`,
    NOTA: nota || `Venta registrada (${fecha})`
  });

  return {
    sale,
    product,
    movement
  };
}

async function updateSale(idInput, payload) {
  const saleId = parseId(idInput);
  if (!saleId) throw buildError(400, "El id de la venta es invalido.");

  const sales = await readSales();
  const saleIndex = sales.findIndex((item) => Number(item.ID_VENTA) === saleId);
  if (saleIndex < 0) throw buildError(404, `No existe venta con ID ${saleId}.`);

  const currentSale = sales[saleIndex];
  const nextProductId = parseId(
    payload["N°"] ?? payload.id ?? payload.productId ?? payload.productoId ?? currentSale["N°"]
  );
  if (!nextProductId) throw buildError(400, "Debes indicar un producto valido.");

  const rawNextQty = payload.cantidad ?? payload.qty ?? payload.CANTIDAD;
  const parsedNextQty =
    rawNextQty === undefined || rawNextQty === null || trimValue(rawNextQty) === ""
      ? Number(currentSale.CANTIDAD || 0)
      : parseDecimal(rawNextQty);
  if (parsedNextQty === null || parsedNextQty <= 0) {
    throw buildError(400, "La cantidad de venta debe ser mayor a 0.");
  }

  const nextQty = round2(parsedNextQty);
  const nextFecha = parseIsoDate(payload.fecha ?? payload.FECHA) || currentSale.FECHA || todayIso();
  if (!isBusinessDate(nextFecha)) {
    throw buildError(400, "La fecha de la venta es invalida.");
  }

  const nextTipoPago = normalizePaymentType(
    payload.tipoPago ?? payload.tipo_pago ?? payload.TIPO_PAGO ?? currentSale.TIPO_PAGO,
    { defaultValue: "Efectivo" }
  );
  const nota = trimValue(payload.nota) || `Correccion de venta #${saleId}`;

  const products = await readProducts();
  const currentProductId = Number(currentSale["N°"]);
  const currentQty = round2(Number(currentSale.CANTIDAD || 0));

  const currentProductIndex = products.findIndex((item) => item["N°"] === currentProductId);
  if (currentProductIndex < 0) {
    throw buildError(404, `No existe producto N° ${currentProductId} asociado a la venta.`);
  }

  const nextProductIndex = products.findIndex((item) => item["N°"] === nextProductId);
  if (nextProductIndex < 0) {
    throw buildError(404, `No existe producto con N° ${nextProductId}.`);
  }

  const stockMovementsPayload = [];

  if (currentProductId === nextProductId) {
    const product = products[currentProductIndex];
    const stockBefore = Number(product.STOCK_ACTUAL || 0);
    const delta = round2(nextQty - currentQty);
    const stockAfter = round2(stockBefore - delta);

    if (stockAfter < 0) {
      throw buildError(
        400,
        `Stock insuficiente para N° ${nextProductId}. Stock actual: ${stockBefore}.`
      );
    }

    products[currentProductIndex] = { ...product, STOCK_ACTUAL: stockAfter };

    if (delta !== 0) {
      stockMovementsPayload.push({
        "N°": product["N°"],
        NOMBRE: product.NOMBRE,
        TIPO: delta > 0 ? "SALIDA" : "INGRESO",
        CANTIDAD: Math.abs(delta),
        STOCK_ANTES: stockBefore,
        STOCK_DESPUES: stockAfter,
        REFERENCIA: `VENTA_EDITADA:${saleId}`,
        NOTA: nota
      });
    }
  } else {
    const currentProduct = products[currentProductIndex];
    const targetProduct = products[nextProductIndex];

    const currentStockBefore = Number(currentProduct.STOCK_ACTUAL || 0);
    const currentStockAfter = round2(currentStockBefore + currentQty);
    const targetStockBefore = Number(targetProduct.STOCK_ACTUAL || 0);
    const targetStockAfter = round2(targetStockBefore - nextQty);

    if (targetStockAfter < 0) {
      throw buildError(
        400,
        `Stock insuficiente para N° ${nextProductId}. Stock actual: ${targetStockBefore}.`
      );
    }

    products[currentProductIndex] = { ...currentProduct, STOCK_ACTUAL: currentStockAfter };
    products[nextProductIndex] = { ...targetProduct, STOCK_ACTUAL: targetStockAfter };

    stockMovementsPayload.push({
      "N°": currentProduct["N°"],
      NOMBRE: currentProduct.NOMBRE,
      TIPO: "INGRESO",
      CANTIDAD: currentQty,
      STOCK_ANTES: currentStockBefore,
      STOCK_DESPUES: currentStockAfter,
      REFERENCIA: `VENTA_EDITADA:${saleId}`,
      NOTA: `${nota} (reversion producto original)`
    });

    stockMovementsPayload.push({
      "N°": targetProduct["N°"],
      NOMBRE: targetProduct.NOMBRE,
      TIPO: "SALIDA",
      CANTIDAD: nextQty,
      STOCK_ANTES: targetStockBefore,
      STOCK_DESPUES: targetStockAfter,
      REFERENCIA: `VENTA_EDITADA:${saleId}`,
      NOTA: `${nota} (aplicacion producto corregido)`
    });
  }

  await writeProducts(products);

  const finalProduct = products[nextProductIndex];
  const isSameProduct = currentProductId === nextProductId;
  const finalPrice = isSameProduct
    ? round2(Number(currentSale.PRECIO || finalProduct.PRECIO || 0))
    : round2(Number(finalProduct.PRECIO || 0));
  const updatedSale = {
    ...currentSale,
    ID_VENTA: saleId,
    FECHA: nextFecha,
    "N°": finalProduct["N°"],
    NOMBRE: finalProduct.NOMBRE,
    CANTIDAD: nextQty,
    PRECIO: finalPrice,
    TOTAL: round2(finalPrice * nextQty),
    TIPO_PAGO: nextTipoPago,
    ORIGEN: trimValue(currentSale.ORIGEN) || "MANUAL"
  };

  sales[saleIndex] = updatedSale;
  await writeSales(sales);

  const movements = [];
  for (const movementPayload of stockMovementsPayload) {
    const movement = await appendKardexMovement(movementPayload);
    movements.push(movement);
  }

  return {
    sale: updatedSale,
    product: finalProduct,
    movements
  };
}

module.exports = {
  BASE_CSV_PATH,
  DEFAULT_PRODUCTS_CSV_PATH,
  VENTAS_CSV_PATH,
  KARDEX_CSV_PATH,
  SOURCE_CONFIG_PATH,
  ensureProductsCsv,
  ensureInventoryData,
  listProducts,
  listSales,
  listKardex,
  getProductStats,
  getSourceInfo,
  setDefaultSource,
  setSourceFromUpload,
  readRawActiveCsv,
  readProducts,
  readSales,
  readKardex,
  createProduct,
  updateProduct,
  deleteProduct,
  registerSale,
  updateSale,
  rebuildProductsCsvFromBase
};
