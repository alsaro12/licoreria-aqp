const http = require("http");
const fs = require("fs/promises");
const path = require("path");
const os = require("os");
const https = require("https");
const mysql = require("mysql2/promise");

const {
  nowIso,
  trimValue,
  toNumber,
  toInt,
  round2,
  safeStringify
} = require("./custom-functions");
const { createDbObjectServer } = require("./objects/db/server");
const { createProductosObjectServer } = require("./objects/productos/server");
const { createVentasObjectServer } = require("./objects/ventas/server");
const { createKardexObjectServer } = require("./objects/kardex/server");

const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number.parseInt(process.env.PORT || "8787", 10);
const PROJECT_DIR = path.resolve(__dirname, "..");
const ROOT_DIR = path.resolve(__dirname, "../..");
const STATIC_ROOT = PROJECT_DIR;
const LOG_DIR = path.join(ROOT_DIR, "logs");
const LAST_SESSION_LOG_PATH = path.join(LOG_DIR, "last_session.log");
const ENV_FILE_PATH = path.join(PROJECT_DIR, ".env");

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".ico": "image/x-icon",
  ".xml": "application/xml; charset=utf-8"
};

const DB_ENV_KEYS = ["DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD", "DB_CHARSET"];
const DB_STATUS_ENV_KEYS = [
  "DB_STATUS_HOST",
  "DB_STATUS_PORT",
  "DB_STATUS_NAME",
  "DB_STATUS_USER",
  "DB_STATUS_PASSWORD",
  "DB_STATUS_CHARSET"
];
const PAYMENT_TYPES = ["A Ya Per", "Efectivo", "Pedido Ya", "Rappi", "EasyPay"];
const PRODUCT_STATUSES = ["ACTIVO", "INACTIVO"];

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function truncateText(value, maxLength = 255) {
  const text = trimValue(value ?? "");
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength);
}

function normalizeText(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function normalizeIsoDateOnly(value) {
  const text = trimValue(value ?? "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

function extractIsoDateOnly(value) {
  const text = trimValue(value ?? "");
  if (!text) return null;
  const head = text.replace("T", " ").slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(head)) return head;
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function normalizeSaleDateTimeInput(value) {
  const text = trimValue(value ?? "");
  if (!text) return null;
  const normalized = text.replace("T", " ").replace(/\s+/g, " ");
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return `${normalized} 20:00:00`;
  }
  if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}$/.test(normalized)) {
    return `${normalized}:00`;
  }
  if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}$/.test(normalized)) {
    return normalized;
  }
  return null;
}

function defaultSaleDateTime() {
  return `${todayIsoDate()} 20:00:00`;
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function toMysqlDateTime(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 19).replace("T", " ");
  }
  return date.toISOString().slice(0, 19).replace("T", " ");
}

function formatReportDateHeader(dateIso) {
  const text = normalizeIsoDateOnly(dateIso);
  if (!text) return trimValue(dateIso || "");
  const [year, month, day] = text.split("-");
  return `${day}/${month}/${year.slice(-2)}`;
}

function listIsoDatesInRange(fromIso, toIso) {
  const from = normalizeIsoDateOnly(fromIso);
  const to = normalizeIsoDateOnly(toIso);
  if (!from || !to) return [];

  const dates = [];
  let cursor = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);

  while (cursor.getTime() <= end.getTime()) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
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

function csvLine(values) {
  return values.map((value) => csvEscape(value)).join(",");
}

function htmlEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatQtyCsv(value, options = {}) {
  const blankIfZero = Boolean(options.blankIfZero);
  const number = round2(toNumber(value, 0));
  if (blankIfZero && Math.abs(number) < 0.0000001) return "";
  return Number.isInteger(number) ? String(number) : number.toFixed(2).replace(/\.00$/, "");
}

function sanitizeCsvFileName(fileName) {
  const text = trimValue(fileName || "");
  if (!text) return "reporte.csv";
  return text.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function parsePositiveInt(value, label) {
  const parsed = toInt(value, 0);
  if (parsed <= 0) {
    throw createHttpError(400, `${label} debe ser un numero entero positivo.`);
  }
  return parsed;
}

function parseNonNegativeNumber(value, label) {
  const parsed = Number(String(value ?? "").replace(",", ".").trim());
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw createHttpError(400, `${label} debe ser numerico y no negativo.`);
  }
  return round2(parsed);
}

function normalizePaymentType(value) {
  const raw = trimValue(value || "Efectivo");
  if (!raw) return "Efectivo";
  const found = PAYMENT_TYPES.find((item) => item.toLowerCase() === raw.toLowerCase());
  return found || raw;
}

function normalizeKardexType(value) {
  const normalized = normalizeText(value);
  if (normalized === "ingreso") return "INGRESO";
  if (normalized === "salida") return "SALIDA";
  return null;
}

function normalizeProductStatus(value) {
  const normalized = trimValue(value || "").toUpperCase();
  if (!normalized) return null;
  if (PRODUCT_STATUSES.includes(normalized)) return normalized;
  return null;
}

function normalizePage(value, defaultValue = 1) {
  const parsed = toInt(value, defaultValue);
  return parsed > 0 ? parsed : defaultValue;
}

function normalizePageSize(value, defaultValue = 20) {
  const parsed = toInt(value, defaultValue);
  if (parsed <= 0) return defaultValue;
  return Math.min(parsed, 5000);
}

function normalizeSortDir(value, defaultValue = "asc") {
  const normalized = normalizeText(value || defaultValue);
  return normalized === "desc" ? "desc" : "asc";
}

function compareSortValues(left, right, direction = "asc") {
  const dir = direction === "desc" ? -1 : 1;
  const a = left ?? "";
  const b = right ?? "";
  const aNum = Number(a);
  const bNum = Number(b);
  const canCompareAsNumber =
    Number.isFinite(aNum) &&
    Number.isFinite(bNum) &&
    String(a).trim() !== "" &&
    String(b).trim() !== "";

  if (canCompareAsNumber) {
    if (aNum === bNum) return 0;
    return aNum > bNum ? dir : -dir;
  }

  const result = String(a).localeCompare(String(b), "es", {
    sensitivity: "base",
    numeric: true
  });
  if (result === 0) return 0;
  return result > 0 ? dir : -dir;
}

function sortItems(items, options = {}) {
  const source = Array.isArray(items) ? items : [];
  const allowed = options.allowed || {};
  const fallbackKey = options.defaultSortBy || Object.keys(allowed)[0] || "";
  const sortBy = allowed[options.sortBy] ? options.sortBy : fallbackKey;
  const sortDir = normalizeSortDir(options.sortDir, options.defaultSortDir || "asc");
  const getValue = allowed[sortBy];

  if (!getValue) return [...source];

  return source
    .map((item, index) => ({ item, index }))
    .sort((left, right) => {
      const result = compareSortValues(getValue(left.item), getValue(right.item), sortDir);
      if (result !== 0) return result;
      return left.index - right.index;
    })
    .map((entry) => entry.item);
}

function matchDateRange(rawDate, fromDate, toDate) {
  if (!fromDate && !toDate) return true;
  const value = normalizeIsoDateOnly(rawDate);
  if (!value) return false;
  if (fromDate && value < fromDate) return false;
  if (toDate && value > toDate) return false;
  return true;
}

function extractDateOnly(value) {
  return normalizeIsoDateOnly(String(value ?? "").slice(0, 10));
}

function paginate(items, options = {}) {
  const pageSize = normalizePageSize(options.pageSize, 20);
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const page = Math.min(normalizePage(options.page, 1), totalPages);
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
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

function parseEnvText(text) {
  const result = {};
  const lines = String(text ?? "").split(/\r?\n/);
  for (const line of lines) {
    const raw = line.trim();
    if (!raw || raw.startsWith("#")) continue;
    const separatorIndex = raw.indexOf("=");
    if (separatorIndex <= 0) continue;
    const key = raw.slice(0, separatorIndex).trim();
    let value = raw.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

async function readEnvValuesQuiet() {
  try {
    const raw = await fs.readFile(ENV_FILE_PATH, "utf8");
    return parseEnvText(raw);
  } catch {
    return {};
  }
}

function buildDbConfig(envValues, type = "main") {
  const values = envValues || {};
  const host =
    type === "status"
      ? trimValue(values.DB_STATUS_HOST || values.DB_HOST || process.env.DB_STATUS_HOST || process.env.DB_HOST)
      : trimValue(values.DB_HOST || process.env.DB_HOST);
  const portRaw =
    type === "status"
      ? values.DB_STATUS_PORT || values.DB_PORT || process.env.DB_STATUS_PORT || process.env.DB_PORT
      : values.DB_PORT || process.env.DB_PORT;
  const database =
    type === "status"
      ? trimValue(values.DB_STATUS_NAME || values.DB_NAME || process.env.DB_STATUS_NAME || process.env.DB_NAME)
      : trimValue(values.DB_NAME || process.env.DB_NAME);
  const user =
    type === "status"
      ? trimValue(values.DB_STATUS_USER || values.DB_USER || process.env.DB_STATUS_USER || process.env.DB_USER)
      : trimValue(values.DB_USER || process.env.DB_USER);
  const password =
    type === "status"
      ? String(values.DB_STATUS_PASSWORD || values.DB_PASSWORD || process.env.DB_STATUS_PASSWORD || process.env.DB_PASSWORD || "")
      : String(values.DB_PASSWORD || process.env.DB_PASSWORD || "");
  const charset =
    trimValue(
      type === "status"
        ? values.DB_STATUS_CHARSET || values.DB_CHARSET || process.env.DB_STATUS_CHARSET || process.env.DB_CHARSET
        : values.DB_CHARSET || process.env.DB_CHARSET
    ) || "utf8mb4";

  return {
    host,
    port: Number.parseInt(String(portRaw || "3306"), 10) || 3306,
    database,
    user,
    password,
    charset
  };
}

function buildDbErrorMessage(error) {
  const code = trimValue(error?.code || "");
  const msg = trimValue(error?.sqlMessage || error?.message || "Error de base de datos");
  if (code) return `${msg} [${code}]`;
  return msg;
}

async function openMysqlConnection(config) {
  return mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    charset: config.charset,
    connectTimeout: 5000,
    dateStrings: true
  });
}

async function withMysqlConnection(executor) {
  const envValues = await readEnvValuesQuiet();
  const config = buildDbConfig(envValues, "main");
  const missingKeys = [];
  if (!config.host) missingKeys.push("DB_HOST");
  if (!config.database) missingKeys.push("DB_NAME");
  if (!config.user) missingKeys.push("DB_USER");
  if (!config.password) missingKeys.push("DB_PASSWORD");
  if (missingKeys.length) {
    throw createHttpError(400, `Faltan variables DB en .env: ${missingKeys.join(", ")}`);
  }

  const connection = await openMysqlConnection(config);
  try {
    return await executor(connection, config);
  } finally {
    try {
      await connection.end();
    } catch {
      // noop
    }
  }
}

function sanitizeHostCandidate(value) {
  let host = trimValue(value || "");
  if (!host) return "";
  host = host.replace(/^https?:\/\//i, "");
  const slashIndex = host.indexOf("/");
  if (slashIndex >= 0) {
    host = host.slice(0, slashIndex);
  }
  if (host.startsWith("[") && host.endsWith("]")) {
    host = host.slice(1, -1);
  }
  const colonIndex = host.lastIndexOf(":");
  if (colonIndex > 0 && host.indexOf(":") === colonIndex) {
    const possiblePort = host.slice(colonIndex + 1);
    if (/^\d+$/.test(possiblePort)) {
      host = host.slice(0, colonIndex);
    }
  }
  return trimValue(host);
}

function isIpv4(value) {
  const text = trimValue(value || "");
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(text)) return false;
  return text.split(".").every((part) => {
    const octet = Number.parseInt(part, 10);
    return octet >= 0 && octet <= 255;
  });
}

function isPrivateIpv4(ip) {
  if (!isIpv4(ip)) return false;
  const parts = ip.split(".").map((part) => Number.parseInt(part, 10));
  if (parts[0] === 10) return true;
  if (parts[0] === 127) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 169 && parts[1] === 254) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  return false;
}

function isLikelyHostname(value) {
  const text = trimValue(value || "");
  if (!text) return false;
  if (text.length > 253) return false;
  if (!/^[a-zA-Z0-9.-]+$/.test(text)) return false;
  if (text.startsWith(".") || text.endsWith(".")) return false;
  return text.split(".").every((label) => {
    if (!label) return false;
    if (label.length > 63) return false;
    if (label.startsWith("-") || label.endsWith("-")) return false;
    return true;
  });
}

function requestTextOverHttps(url, timeoutMs = 2600) {
  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      {
        headers: {
          "User-Agent": "licoreria-access-host-check/1.0",
          Accept: "application/json, text/plain"
        }
      },
      (response) => {
        const statusCode = Number(response.statusCode || 0);
        if (statusCode < 200 || statusCode >= 300) {
          response.resume();
          reject(new Error(`HTTP ${statusCode || "ERR"}`));
          return;
        }
        const chunks = [];
        response.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        response.on("end", () => {
          resolve(Buffer.concat(chunks).toString("utf8"));
        });
      }
    );

    request.on("error", reject);
    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error("timeout"));
    });
  });
}

async function detectPublicIpv4() {
  const probes = [
    {
      source: "ipify",
      url: "https://api.ipify.org?format=json",
      parse: (text) => {
        try {
          const data = JSON.parse(text);
          return trimValue(data?.ip || "");
        } catch {
          return "";
        }
      }
    },
    {
      source: "checkip-amazon",
      url: "https://checkip.amazonaws.com",
      parse: (text) => trimValue(text)
    },
    {
      source: "icanhazip",
      url: "https://ipv4.icanhazip.com",
      parse: (text) => trimValue(text)
    }
  ];

  const attempts = probes.map(async (probe) => {
    const raw = await requestTextOverHttps(probe.url);
    const ip = sanitizeHostCandidate(probe.parse(raw));
    if (!isIpv4(ip) || isPrivateIpv4(ip)) {
      throw new Error("invalid-public-ip");
    }
    return { ip, source: probe.source };
  });

  const results = await Promise.allSettled(attempts);
  for (const result of results) {
    if (result.status === "fulfilled") {
      return result.value;
    }
  }
  return null;
}

function detectLocalIpv4() {
  const interfaces = os.networkInterfaces() || {};
  for (const addresses of Object.values(interfaces)) {
    for (const item of addresses || []) {
      const family = String(item?.family || "");
      if (!item || item.internal || family !== "IPv4") continue;
      const address = sanitizeHostCandidate(item.address);
      if (isIpv4(address)) return address;
    }
  }
  return "";
}

async function getDbAccessHostStatus() {
  const checkedAt = nowIso();
  const envValues = await readEnvValuesQuiet();
  const overrideHost = sanitizeHostCandidate(
    envValues.ACCESS_HOST || process.env.ACCESS_HOST || envValues.DB_ACCESS_HOST || process.env.DB_ACCESS_HOST
  );

  if (overrideHost) {
    return {
      checkedAt,
      host: overrideHost,
      source: "env_override",
      sourceLabel: "Configurado en .env (ACCESS_HOST)",
      publicHost: isIpv4(overrideHost) && !isPrivateIpv4(overrideHost) ? overrideHost : null,
      dbDeniedHost: null,
      localHost: null,
      canWhitelist: isIpv4(overrideHost) || isLikelyHostname(overrideHost),
      message: "Host manual detectado. Úsalo en cPanel > Remote MySQL."
    };
  }

  const publicProbeResult = await detectPublicIpv4();
  const publicHost = publicProbeResult?.ip || "";
  const publicSource = publicProbeResult?.source || "";
  const localHost = detectLocalIpv4();

  let host = "";
  let source = "none";
  let sourceLabel = "No detectado";
  if (publicHost) {
    host = publicHost;
    source = "public_ipv4";
    sourceLabel = `IP publica detectada (${publicSource || "probe"})`;
  } else if (localHost) {
    host = localHost;
    source = "local_ipv4";
    sourceLabel = "IP local detectada (puede no servir fuera de tu red)";
  }

  const canWhitelist = Boolean(host && (isIpv4(host) || isLikelyHostname(host)));
  const isPrivate = isIpv4(host) && isPrivateIpv4(host);
  const message = host
    ? isPrivate
      ? "Se detectó IP privada. Para cPanel remoto normalmente necesitas tu IP publica."
      : "Host listo para copiar y autorizar en cPanel > Remote MySQL."
    : "No se pudo detectar el Access Host automaticamente.";

  return {
    checkedAt,
    host: host || null,
    source,
    sourceLabel,
    publicHost: publicHost || null,
    dbDeniedHost: null,
    localHost: localHost || null,
    canWhitelist,
    message
  };
}

async function resetSessionLog() {
  await fs.mkdir(LOG_DIR, { recursive: true });
  await fs.writeFile(
    LAST_SESSION_LOG_PATH,
    `[${nowIso()}] [INFO] Log de sesion iniciado.\n`,
    "utf8"
  );
}

async function appendLog(level, message, meta = null) {
  const details = meta ? ` ${safeStringify(meta)}` : "";
  const line = `[${nowIso()}] [${level}] ${message}${details}\n`;
  await fs.appendFile(LAST_SESSION_LOG_PATH, line, "utf8");
}

function logInfo(message, meta = null) {
  appendLog("INFO", message, meta).catch(() => {});
}

function logWarn(message, meta = null) {
  appendLog("WARN", message, meta).catch(() => {});
}

function logError(message, meta = null) {
  appendLog("ERROR", message, meta).catch(() => {});
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, message) {
  res.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(message);
}

function setApiCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
}

async function parseJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    throw createHttpError(400, "JSON invalido.");
  }
}

function staticPathFromRequestPath(requestPath) {
  const pathname = requestPath === "/" ? "/index.html" : requestPath;
  const safePath = path.normalize(path.join(STATIC_ROOT, pathname));
  if (!safePath.startsWith(STATIC_ROOT)) return null;
  return safePath;
}

async function serveStatic(req, res, requestPath) {
  const filePath = staticPathFromRequestPath(requestPath);
  if (!filePath) {
    sendText(res, 403, "Acceso denegado.");
    return;
  }

  try {
    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) {
      sendText(res, 404, "No encontrado.");
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    const contentType = CONTENT_TYPES[extension] || "application/octet-stream";
    const content = await fs.readFile(filePath);
    res.writeHead(200, { "Content-Type": contentType });
    res.end(content);
  } catch {
    sendText(res, 404, "No encontrado.");
  }
}

function productRowToApi(row) {
  const status = normalizeProductStatus(row?.estado) || "ACTIVO";
  return {
    "N°": toInt(row?.id, 0),
    NOMBRE: trimValue(row?.nombre || ""),
    CATEGORIA: trimValue(row?.categoria || "OTROS"),
    PRECIO: round2(row?.precio),
    PEDIDO: Math.max(0, toInt(row?.pedido, 0)),
    STOCK_ACTUAL: round2(Math.max(0, toNumber(row?.stock_actual, 0))),
    ESTADO: status
  };
}

function saleRowToApi(row) {
  const saleDate = extractIsoDateOnly(row?.fecha_venta) || todayIsoDate();
  const operativeDate = extractIsoDateOnly(row?.fecha_operativa) || "";
  return {
    ID_VENTA: toInt(row?.id_venta, 0),
    FECHA_VENTA: saleDate,
    FECHA_OPERATIVA: operativeDate,
    "N°": toInt(row?.producto_id, 0),
    NOMBRE: trimValue(row?.nombre_snapshot || ""),
    CANTIDAD: round2(row?.cantidad),
    PRECIO: round2(row?.precio),
    TOTAL: round2(row?.total),
    TIPO_PAGO: normalizePaymentType(row?.tipo_pago),
    ORIGEN: trimValue(row?.origen || "MANUAL") || "MANUAL"
  };
}

function kardexRowToApi(row) {
  return {
    ID_MOV: toInt(row?.id_mov, 0),
    FECHA_HORA: trimValue(row?.fecha_hora || ""),
    "N°": toInt(row?.producto_id, 0),
    NOMBRE: trimValue(row?.nombre_snapshot || ""),
    TIPO: normalizeKardexType(row?.tipo) || "SALIDA",
    CANTIDAD: round2(row?.cantidad),
    STOCK_ANTES: round2(row?.stock_antes),
    STOCK_DESPUES: round2(row?.stock_despues),
    REFERENCIA: trimValue(row?.referencia || ""),
    NOTA: trimValue(row?.nota || "")
  };
}

async function ensureKardexTable(connection) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS kardex_movimientos (
      id_mov INT NOT NULL AUTO_INCREMENT,
      fecha_hora DATETIME NOT NULL,
      producto_id INT NOT NULL,
      nombre_snapshot VARCHAR(180) NOT NULL,
      tipo ENUM('INGRESO', 'SALIDA') NOT NULL,
      cantidad DECIMAL(12,2) UNSIGNED NOT NULL,
      stock_antes DECIMAL(12,2) UNSIGNED NOT NULL,
      stock_despues DECIMAL(12,2) UNSIGNED NOT NULL,
      referencia VARCHAR(80) NULL,
      nota VARCHAR(255) NULL,
      PRIMARY KEY (id_mov),
      KEY idx_kardex_fecha_hora (fecha_hora),
      KEY idx_kardex_producto (producto_id),
      KEY idx_kardex_tipo (tipo),
      KEY idx_kardex_referencia (referencia)
    ) ENGINE=InnoDB
  `);
}

async function insertKardexMovement(connection, payload) {
  const productId = parsePositiveInt(payload.productId ?? payload["N°"], "producto");
  const name = truncateText(payload.nombre ?? payload.nombre_snapshot ?? payload.NOMBRE, 180);
  if (!name) {
    throw createHttpError(400, "El nombre del producto es obligatorio para el kardex.");
  }

  const type = normalizeKardexType(payload.tipo);
  if (!type) throw createHttpError(400, "TIPO kardex invalido. Usa INGRESO o SALIDA.");

  const quantity = parseNonNegativeNumber(payload.cantidad, "cantidad");
  if (quantity <= 0) throw createHttpError(400, "La cantidad del kardex debe ser mayor a 0.");

  const stockBefore = parseNonNegativeNumber(payload.stockAntes, "STOCK_ANTES");
  const stockAfter = parseNonNegativeNumber(payload.stockDespues, "STOCK_DESPUES");
  const reference = truncateText(payload.referencia || "", 80);
  const note = truncateText(payload.nota || "", 255);
  const fechaHora = toMysqlDateTime(payload.fechaHora || new Date());

  try {
    const [result] = await connection.query(
      `INSERT INTO kardex_movimientos
       (fecha_hora, producto_id, nombre_snapshot, tipo, cantidad, stock_antes, stock_despues, referencia, nota)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [fechaHora, productId, name, type, quantity, stockBefore, stockAfter, reference || null, note || null]
    );

    return {
      ID_MOV: toInt(result?.insertId, 0),
      FECHA_HORA: fechaHora,
      "N°": productId,
      NOMBRE: name,
      TIPO: type,
      CANTIDAD: quantity,
      STOCK_ANTES: stockBefore,
      STOCK_DESPUES: stockAfter,
      REFERENCIA: reference,
      NOTA: note
    };
  } catch (error) {
    if (error?.code !== "ER_NO_SUCH_TABLE") throw error;
    await ensureKardexTable(connection);
    return insertKardexMovement(connection, payload);
  }
}

async function readProductsAll() {
  return withMysqlConnection(async (connection) => {
    const [rows] = await connection.query(
      "SELECT id, nombre, categoria, precio, pedido, stock_actual, estado FROM productos ORDER BY id ASC"
    );
    return (Array.isArray(rows) ? rows : []).map(productRowToApi);
  });
}

async function readSalesAll() {
  return withMysqlConnection(async (connection) => {
    const [rows] = await connection.query(
      `SELECT id_venta, fecha_venta, fecha_operativa, producto_id, nombre_snapshot, cantidad, precio, total, tipo_pago, origen
       FROM ventas_diarias
       ORDER BY fecha_venta DESC, id_venta DESC`
    );
    return (Array.isArray(rows) ? rows : []).map(saleRowToApi);
  });
}

async function readKardexAll() {
  return withMysqlConnection(async (connection) => {
    try {
      const [rows] = await connection.query(
        `SELECT id_mov, fecha_hora, producto_id, nombre_snapshot, tipo, cantidad, stock_antes, stock_despues, referencia, nota
         FROM kardex_movimientos
         ORDER BY fecha_hora DESC, id_mov DESC`
      );
      return (Array.isArray(rows) ? rows : []).map(kardexRowToApi);
    } catch (error) {
      if (error?.code === "ER_NO_SUCH_TABLE") return [];
      throw error;
    }
  });
}

async function deleteKardexMovement(idInput) {
  const movementId = parsePositiveInt(idInput, "ID_MOV");
  return withMysqlConnection(async (connection) => {
    try {
      const [rows] = await connection.query(
        `SELECT id_mov, fecha_hora, producto_id, nombre_snapshot, tipo, cantidad, stock_antes, stock_despues, referencia, nota
         FROM kardex_movimientos
         WHERE id_mov = ?
         LIMIT 1`,
        [movementId]
      );
      const current = Array.isArray(rows) && rows.length ? rows[0] : null;
      if (!current) throw createHttpError(404, `No existe movimiento kardex #${movementId}.`);

      await connection.query("DELETE FROM kardex_movimientos WHERE id_mov = ?", [movementId]);
      return kardexRowToApi(current);
    } catch (error) {
      if (error?.code === "ER_NO_SUCH_TABLE") {
        throw createHttpError(404, `No existe movimiento kardex #${movementId}.`);
      }
      throw error;
    }
  });
}

async function deleteAllKardexMovements() {
  return withMysqlConnection(async (connection) => {
    try {
      const [countRows] = await connection.query("SELECT COUNT(*) AS total FROM kardex_movimientos");
      const total = toInt(countRows?.[0]?.total, 0);
      await connection.query("DELETE FROM kardex_movimientos");

      try {
        await connection.query("ALTER TABLE kardex_movimientos AUTO_INCREMENT = 1");
      } catch {
        // Ignora error de reinicio de autoincrement en motores no compatibles.
      }

      return { deletedCount: total };
    } catch (error) {
      if (error?.code === "ER_NO_SUCH_TABLE") {
        return { deletedCount: 0 };
      }
      throw error;
    }
  });
}

async function getProductStats() {
  const products = await readProductsAll();
  return {
    total: products.length,
    conPedido: products.filter((item) => toNumber(item.PEDIDO, 0) > 0).length,
    stockTotal: round2(products.reduce((acc, item) => acc + toNumber(item.STOCK_ACTUAL, 0), 0))
  };
}

async function createProduct(payload) {
  return withMysqlConnection(async (connection) => {
    const hasCustomId = payload["N°"] !== undefined || payload.id !== undefined || payload.n !== undefined;
    const name = trimValue(payload.NOMBRE ?? payload.nombre);
    if (!name) throw createHttpError(400, "El campo NOMBRE es obligatorio.");

    const price = parseNonNegativeNumber(payload.PRECIO ?? payload.precio, "PRECIO");
    const pedido = toInt(payload.PEDIDO ?? payload.pedido ?? 0, 0);
    if (pedido < 0) throw createHttpError(400, "El campo PEDIDO no puede ser negativo.");
    const stock = parseNonNegativeNumber(
      payload.STOCK_ACTUAL ?? payload.stockActual ?? payload.stock_actual ?? payload.stock ?? 0,
      "STOCK_ACTUAL"
    );
    const statusInput = payload.ESTADO ?? payload.estado ?? payload.status;
    const status = statusInput === undefined ? "ACTIVO" : normalizeProductStatus(statusInput);
    if (!status) {
      throw createHttpError(400, "ESTADO invalido. Usa ACTIVO o INACTIVO.");
    }

    let id;
    if (hasCustomId) {
      id = parsePositiveInt(payload["N°"] ?? payload.id ?? payload.n, "N°");
    } else {
      const [maxRows] = await connection.query("SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM productos");
      id = parsePositiveInt(maxRows?.[0]?.next_id ?? 1, "N°");
    }

    const [existing] = await connection.query("SELECT id FROM productos WHERE id = ? LIMIT 1", [id]);
    if (Array.isArray(existing) && existing.length) {
      throw createHttpError(409, `Ya existe producto con N° ${id}.`);
    }

    await connection.beginTransaction();
    try {
      await connection.query(
        "INSERT INTO productos (id, nombre, precio, pedido, stock_actual, estado) VALUES (?, ?, ?, ?, ?, ?)",
        [id, name, price, Math.max(0, pedido), stock, status]
      );

      let movement = null;
      if (stock > 0) {
        movement = await insertKardexMovement(connection, {
          productId: id,
          nombre: name,
          tipo: "INGRESO",
          cantidad: stock,
          stockAntes: 0,
          stockDespues: stock,
          referencia: "CREACION_PRODUCTO",
          nota: "Stock inicial"
        });
      }

      await connection.commit();

      return {
        "N°": id,
        NOMBRE: name,
        CATEGORIA: trimValue(payload.CATEGORIA || "OTROS") || "OTROS",
        PRECIO: price,
        PEDIDO: Math.max(0, pedido),
        STOCK_ACTUAL: stock,
        ESTADO: status,
        MOVIMIENTO: movement
      };
    } catch (error) {
      try {
        await connection.rollback();
      } catch {
        // noop
      }
      throw error;
    }
  });
}

async function updateProduct(idInput, payload) {
  const id = parsePositiveInt(idInput, "N°");
  return withMysqlConnection(async (connection) => {
    await connection.beginTransaction();
    try {
      const [rows] = await connection.query(
        "SELECT id, nombre, categoria, precio, pedido, stock_actual, estado FROM productos WHERE id = ? FOR UPDATE",
        [id]
      );
      const current = Array.isArray(rows) && rows.length ? rows[0] : null;
      if (!current) throw createHttpError(404, `No existe producto con N° ${id}.`);
      if (payload["N°"] !== undefined && parsePositiveInt(payload["N°"], "N°") !== id) {
        throw createHttpError(400, "No puedes cambiar el N° del producto.");
      }

      const name = trimValue(payload.NOMBRE ?? current.nombre);
      if (!name) throw createHttpError(400, "El campo NOMBRE es obligatorio.");

      const price =
        payload.PRECIO !== undefined || payload.precio !== undefined
          ? parseNonNegativeNumber(payload.PRECIO ?? payload.precio, "PRECIO")
          : round2(current.precio);

      const pedidoRaw = payload.PEDIDO ?? payload.pedido ?? current.pedido;
      const pedido = toInt(pedidoRaw, 0);
      if (pedido < 0) throw createHttpError(400, "El campo PEDIDO no puede ser negativo.");
      let status = normalizeProductStatus(current.estado) || "ACTIVO";
      const statusInput = payload.ESTADO ?? payload.estado ?? payload.status;
      if (statusInput !== undefined) {
        const nextStatus = normalizeProductStatus(statusInput);
        if (!nextStatus) {
          throw createHttpError(400, "ESTADO invalido. Usa ACTIVO o INACTIVO.");
        }
        status = nextStatus;
      }

      let stockBase =
        payload.STOCK_ACTUAL !== undefined || payload.stock_actual !== undefined
          ? parseNonNegativeNumber(payload.STOCK_ACTUAL ?? payload.stock_actual, "STOCK_ACTUAL")
          : round2(current.stock_actual);

      let stockDelta = 0;
      const stockAjusteRaw = payload.stockAjuste;
      if (stockAjusteRaw !== undefined && stockAjusteRaw !== null && trimValue(stockAjusteRaw) !== "") {
        stockDelta = Number(String(stockAjusteRaw).replace(",", ".").trim());
        if (!Number.isFinite(stockDelta)) {
          throw createHttpError(400, "El campo AJUSTE STOCK debe ser numerico.");
        }
        stockDelta = round2(stockDelta);
        stockBase = round2(stockBase + stockDelta);
      } else {
        stockDelta = round2(stockBase - round2(current.stock_actual));
      }

      if (stockBase < 0) throw createHttpError(400, "STOCK_ACTUAL no puede ser negativo.");

      await connection.query(
        "UPDATE productos SET nombre = ?, precio = ?, pedido = ?, stock_actual = ?, estado = ? WHERE id = ?",
        [name, price, Math.max(0, pedido), stockBase, status, id]
      );

      let movement = null;
      if (stockDelta !== 0) {
        const type = stockDelta > 0 ? "INGRESO" : "SALIDA";
        movement = await insertKardexMovement(connection, {
          productId: id,
          nombre: name,
          tipo: type,
          cantidad: Math.abs(stockDelta),
          stockAntes: round2(current.stock_actual),
          stockDespues: stockBase,
          referencia: "AJUSTE_PRODUCTO",
          nota: trimValue(payload.nota || payload.NOTA || "Ajuste manual de stock")
        });
      }

      await connection.commit();

      return {
        "N°": id,
        NOMBRE: name,
        CATEGORIA: trimValue(current.categoria || "OTROS") || "OTROS",
        PRECIO: price,
        PEDIDO: Math.max(0, pedido),
        STOCK_ACTUAL: round2(stockBase),
        ESTADO: status,
        MOVIMIENTO: movement
      };
    } catch (error) {
      try {
        await connection.rollback();
      } catch {
        // noop
      }
      throw error;
    }
  });
}

async function deleteProduct(idInput) {
  const id = parsePositiveInt(idInput, "N°");
  return withMysqlConnection(async (connection) => {
    const [rows] = await connection.query(
      "SELECT id, nombre, categoria, precio, pedido, stock_actual, estado FROM productos WHERE id = ? LIMIT 1",
      [id]
    );
    const current = Array.isArray(rows) && rows.length ? rows[0] : null;
    if (!current) throw createHttpError(404, `No existe producto con N° ${id}.`);

    const currentStatus = normalizeProductStatus(current.estado) || "ACTIVO";
    if (currentStatus !== "INACTIVO") {
      await connection.query("UPDATE productos SET estado = ? WHERE id = ?", ["INACTIVO", id]);
    }

    return productRowToApi({
      ...current,
      estado: "INACTIVO"
    });
  });
}

async function registerStockIngress(idInput, payload) {
  const id = parsePositiveInt(idInput, "N°");
  return withMysqlConnection(async (connection) => {
    const quantity = parseNonNegativeNumber(payload.cantidad ?? payload.CANTIDAD, "cantidad");
    if (quantity <= 0) throw createHttpError(400, "La cantidad de ingreso debe ser mayor a 0.");

    const note = trimValue(payload.nota || payload.NOTA || "Ingreso manual");
    const reference = trimValue(payload.referencia || payload.REFERENCIA || "INGRESO_MANUAL");

    await connection.beginTransaction();
    try {
      const [rows] = await connection.query(
        "SELECT id, nombre, categoria, precio, pedido, stock_actual, estado FROM productos WHERE id = ? FOR UPDATE",
        [id]
      );
      const current = Array.isArray(rows) && rows.length ? rows[0] : null;
      if (!current) throw createHttpError(404, `No existe producto con N° ${id}.`);

      const stockBefore = round2(current.stock_actual);
      const stockAfter = round2(stockBefore + quantity);
      await connection.query("UPDATE productos SET stock_actual = ? WHERE id = ?", [stockAfter, id]);

      const movement = await insertKardexMovement(connection, {
        productId: id,
        nombre: current.nombre,
        tipo: "INGRESO",
        cantidad: quantity,
        stockAntes: stockBefore,
        stockDespues: stockAfter,
        referencia: reference,
        nota: note
      });

      await connection.commit();

      return {
        product: {
          ...productRowToApi({ ...current, stock_actual: stockAfter }),
          CATEGORIA: trimValue(current.categoria || "OTROS") || "OTROS"
        },
        movement
      };
    } catch (error) {
      try {
        await connection.rollback();
      } catch {
        // noop
      }
      throw error;
    }
  });
}

async function registerSale(payload) {
  return withMysqlConnection(async (connection) => {
    const productId = parsePositiveInt(payload.productId ?? payload["N°"] ?? payload.productoId, "producto");
    const quantity = parseNonNegativeNumber(payload.cantidad ?? payload.CANTIDAD, "cantidad");
    if (quantity <= 0) throw createHttpError(400, "La cantidad de venta debe ser mayor a 0.");

    const fechaVenta =
      normalizeSaleDateTimeInput(payload.fecha_venta ?? payload.fechaVenta ?? payload.FECHA_VENTA) ||
      defaultSaleDateTime();
    const tipoPago = normalizePaymentType(payload.tipoPago || payload.TIPO_PAGO || "Efectivo");
    const note = trimValue(payload.nota || payload.NOTA || "");

    await connection.beginTransaction();
    try {
      const [productRows] = await connection.query(
        "SELECT id, nombre, categoria, precio, pedido, stock_actual, estado FROM productos WHERE id = ? FOR UPDATE",
        [productId]
      );
      const product = Array.isArray(productRows) && productRows.length ? productRows[0] : null;
      if (!product) throw createHttpError(404, `No existe producto con N° ${productId}.`);
      const productStatus = normalizeProductStatus(product.estado) || "ACTIVO";
      if (productStatus !== "ACTIVO") {
        throw createHttpError(409, `No puedes vender N° ${productId} porque está INACTIVO.`);
      }

      const stockBefore = round2(product.stock_actual);
      if (stockBefore < quantity) {
        throw createHttpError(
          400,
          `Stock insuficiente para N° ${productId}. Disponible: ${stockBefore}, solicitado: ${quantity}.`
        );
      }

      const stockAfter = round2(stockBefore - quantity);
      const price = round2(product.precio);
      const total = round2(price * quantity);

      await connection.query("UPDATE productos SET stock_actual = ? WHERE id = ?", [stockAfter, productId]);

      const [saleResult] = await connection.query(
        `INSERT INTO ventas_diarias
         (fecha_venta, producto_id, nombre_snapshot, cantidad, precio, total, tipo_pago, origen)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [fechaVenta, productId, truncateText(product.nombre, 180), quantity, price, total, tipoPago, "MANUAL"]
      );

      const [savedSaleRows] = await connection.query(
        `SELECT id_venta, fecha_venta, fecha_operativa, producto_id, nombre_snapshot, cantidad, precio, total, tipo_pago, origen
         FROM ventas_diarias
         WHERE id_venta = ?
         LIMIT 1`,
        [toInt(saleResult?.insertId, 0)]
      );
      const savedSale =
        Array.isArray(savedSaleRows) && savedSaleRows.length
          ? savedSaleRows[0]
          : {
              id_venta: toInt(saleResult?.insertId, 0),
              fecha_venta: fechaVenta,
              fecha_operativa: fechaVenta,
              producto_id: productId,
              nombre_snapshot: product.nombre,
              cantidad: quantity,
              precio: price,
              total,
              tipo_pago: tipoPago,
              origen: "MANUAL"
            };

      const movement = await insertKardexMovement(connection, {
        productId,
        nombre: product.nombre,
        tipo: "SALIDA",
        cantidad: quantity,
        stockAntes: stockBefore,
        stockDespues: stockAfter,
        referencia: "VENTA",
        nota: note || `Venta #${saleResult.insertId}`
      });

      await connection.commit();

      return {
        sale: saleRowToApi(savedSale),
        product: {
          ...productRowToApi({ ...product, stock_actual: stockAfter }),
          CATEGORIA: trimValue(product.categoria || "OTROS") || "OTROS"
        },
        movement
      };
    } catch (error) {
      try {
        await connection.rollback();
      } catch {
        // noop
      }
      throw error;
    }
  });
}

async function updateSale(idInput, payload) {
  const saleId = parsePositiveInt(idInput, "ID_VENTA");

  return withMysqlConnection(async (connection) => {
    const productId = parsePositiveInt(payload.productId ?? payload["N°"] ?? payload.productoId, "producto");
    const quantity = parseNonNegativeNumber(payload.cantidad ?? payload.CANTIDAD, "cantidad");
    if (quantity <= 0) throw createHttpError(400, "La cantidad de venta debe ser mayor a 0.");
    const fechaVenta =
      normalizeSaleDateTimeInput(payload.fecha_venta ?? payload.fechaVenta ?? payload.FECHA_VENTA) ||
      defaultSaleDateTime();
    const tipoPago = normalizePaymentType(payload.tipoPago || payload.TIPO_PAGO || "Efectivo");

    await connection.beginTransaction();
    try {
      const [saleRows] = await connection.query(
        `SELECT id_venta, fecha_venta, fecha_operativa, producto_id, nombre_snapshot, cantidad, precio, total, tipo_pago, origen
         FROM ventas_diarias
         WHERE id_venta = ? FOR UPDATE`,
        [saleId]
      );
      const currentSale = Array.isArray(saleRows) && saleRows.length ? saleRows[0] : null;
      if (!currentSale) throw createHttpError(404, `No existe venta #${saleId}.`);

      const currentProductId = toInt(currentSale.producto_id, 0);
      const currentQuantity = round2(currentSale.cantidad);

      const [currentProductRows] = await connection.query(
        "SELECT id, nombre, categoria, precio, pedido, stock_actual, estado FROM productos WHERE id = ? FOR UPDATE",
        [currentProductId]
      );
      const currentProduct = Array.isArray(currentProductRows) && currentProductRows.length ? currentProductRows[0] : null;
      if (!currentProduct) throw createHttpError(404, `No existe producto original N° ${currentProductId}.`);

      const movements = [];

      // Revertir impacto de venta original en producto actual.
      const currentBeforeRevert = round2(currentProduct.stock_actual);
      const currentAfterRevert = round2(currentBeforeRevert + currentQuantity);
      await connection.query("UPDATE productos SET stock_actual = ? WHERE id = ?", [currentAfterRevert, currentProductId]);

      movements.push(
        await insertKardexMovement(connection, {
          productId: currentProductId,
          nombre: currentProduct.nombre,
          tipo: "INGRESO",
          cantidad: currentQuantity,
          stockAntes: currentBeforeRevert,
          stockDespues: currentAfterRevert,
          referencia: "VENTA_EDITADA",
          nota: `Reversion venta #${saleId}`
        })
      );

      let targetProduct = currentProduct;
      if (productId !== currentProductId) {
        const [targetProductRows] = await connection.query(
          "SELECT id, nombre, categoria, precio, pedido, stock_actual, estado FROM productos WHERE id = ? FOR UPDATE",
          [productId]
        );
        targetProduct = Array.isArray(targetProductRows) && targetProductRows.length ? targetProductRows[0] : null;
        if (!targetProduct) throw createHttpError(404, `No existe producto destino N° ${productId}.`);
      }
      const targetStatus = normalizeProductStatus(targetProduct.estado) || "ACTIVO";
      if (targetStatus !== "ACTIVO" && productId !== currentProductId) {
        throw createHttpError(409, `No puedes usar N° ${productId} en ventas porque está INACTIVO.`);
      }

      const targetStockBefore = round2(targetProduct.stock_actual);
      if (targetStockBefore < quantity) {
        throw createHttpError(
          400,
          `Stock insuficiente para N° ${productId}. Disponible: ${targetStockBefore}, solicitado: ${quantity}.`
        );
      }
      const targetStockAfter = round2(targetStockBefore - quantity);
      await connection.query("UPDATE productos SET stock_actual = ? WHERE id = ?", [targetStockAfter, productId]);

      movements.push(
        await insertKardexMovement(connection, {
          productId,
          nombre: targetProduct.nombre,
          tipo: "SALIDA",
          cantidad: quantity,
          stockAntes: targetStockBefore,
          stockDespues: targetStockAfter,
          referencia: "VENTA_EDITADA",
          nota: `Aplicacion venta editada #${saleId}`
        })
      );

      const finalPrice = round2(targetProduct.precio);
      const finalTotal = round2(finalPrice * quantity);

      await connection.query(
        `UPDATE ventas_diarias
         SET fecha_venta = ?, producto_id = ?, nombre_snapshot = ?, cantidad = ?, precio = ?, total = ?, tipo_pago = ?, origen = ?
         WHERE id_venta = ?`,
        [
          fechaVenta,
          productId,
          truncateText(targetProduct.nombre, 180),
          quantity,
          finalPrice,
          finalTotal,
          tipoPago,
          trimValue(currentSale.origen || "MANUAL") || "MANUAL",
          saleId
        ]
      );

      const [updatedSaleRows] = await connection.query(
        `SELECT id_venta, fecha_venta, fecha_operativa, producto_id, nombre_snapshot, cantidad, precio, total, tipo_pago, origen
         FROM ventas_diarias
         WHERE id_venta = ?
         LIMIT 1`,
        [saleId]
      );
      const updatedSale =
        Array.isArray(updatedSaleRows) && updatedSaleRows.length
          ? updatedSaleRows[0]
          : {
              id_venta: saleId,
              fecha_venta: fechaVenta,
              fecha_operativa: fechaVenta,
              producto_id: productId,
              nombre_snapshot: targetProduct.nombre,
              cantidad: quantity,
              precio: finalPrice,
              total: finalTotal,
              tipo_pago: tipoPago,
              origen: trimValue(currentSale.origen || "MANUAL") || "MANUAL"
            };

      await connection.commit();

      return {
        sale: saleRowToApi(updatedSale),
        product: {
          ...productRowToApi({ ...targetProduct, stock_actual: targetStockAfter }),
          CATEGORIA: trimValue(targetProduct.categoria || "OTROS") || "OTROS"
        },
        movements
      };
    } catch (error) {
      try {
        await connection.rollback();
      } catch {
        // noop
      }
      throw error;
    }
  });
}

async function getDbStatus() {
  const checkedAt = nowIso();
  const envValues = await readEnvValuesQuiet();
  const config = buildDbConfig(envValues, "status");

  const missing = DB_STATUS_ENV_KEYS.filter((key) => {
    const suffix = key.replace("DB_STATUS_", "").toLowerCase();
    if (suffix === "port" || suffix === "charset") return false;
    if (suffix === "host") return !config.host;
    if (suffix === "name") return !config.database;
    if (suffix === "user") return !config.user;
    if (suffix === "password") return !config.password;
    return false;
  });

  if (!config.host || !config.database || !config.user || !config.password) {
    return {
      checked: true,
      checkedAt,
      configured: false,
      connected: false,
      method: "none",
      host: config.host || null,
      port: config.port || null,
      database: config.database || null,
      user: config.user || null,
      charset: config.charset,
      missingKeys: missing,
      probeMs: 0,
      message: "Faltan variables de conexión DB_* en .env.",
      error: null
    };
  }

  const started = Date.now();
  let connection;
  try {
    connection = await openMysqlConnection(config);
    await connection.query("SELECT 1");
    return {
      checked: true,
      checkedAt,
      configured: true,
      connected: true,
      method: "mysql2",
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      charset: config.charset,
      missingKeys: [],
      probeMs: Date.now() - started,
      message: "Conexión exitosa con base de datos.",
      error: null
    };
  } catch (error) {
    return {
      checked: true,
      checkedAt,
      configured: true,
      connected: false,
      method: "mysql2",
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      charset: config.charset,
      missingKeys: [],
      probeMs: Date.now() - started,
      message: "No se pudo validar conexión de base de datos.",
      error: buildDbErrorMessage(error)
    };
  } finally {
    try {
      if (connection) await connection.end();
    } catch {
      // noop
    }
  }
}

async function buildDailySalesExportCsv(connection, options = {}) {
  const traceId = trimValue(options.traceId || "") || `sales-export-${Date.now()}`;
  const requestedFrom = normalizeIsoDateOnly(options.from);
  const requestedTo = normalizeIsoDateOnly(options.to);
  const queryTerm = normalizeText(options.q || "");

  const from = requestedFrom || requestedTo || todayIsoDate();
  const to = requestedTo || requestedFrom || from;
  if (from > to) {
    throw createHttpError(400, "Rango inválido: la fecha Desde no puede ser mayor que Hasta.");
  }

  await appendLog("INFO", "Export ventas CSV iniciado", {
    traceId,
    from,
    to,
    q: trimValue(options.q || "")
  });

  const [productRows] = await connection.query(
    "SELECT id, nombre, categoria, precio, stock_actual FROM productos ORDER BY id ASC"
  );
  let products = (Array.isArray(productRows) ? productRows : []).map((row) => ({
    id: toInt(row.id, 0),
    nombre: trimValue(row.nombre || ""),
    precio: round2(row.precio),
    stockActual: round2(row.stock_actual)
  }));

  if (queryTerm) {
    products = products.filter((item) => {
      return (
        normalizeText(item.nombre).includes(queryTerm) ||
        String(item.id).includes(queryTerm) ||
        String(item.precio).includes(queryTerm)
      );
    });
  }

  const dates = listIsoDatesInRange(from, to);
  const productIds = products.map((item) => item.id).filter((id) => id > 0);

  const salesByProductDay = new Map();
  const netByProductDay = new Map();
  const netAfterEndByProduct = new Map();

  if (productIds.length > 0 && dates.length > 0) {
    const placeholders = productIds.map(() => "?").join(",");

    const [salesRows] = await connection.query(
      `
        SELECT DATE(fecha_venta) AS fecha, producto_id, SUM(cantidad) AS venta_dia
        FROM ventas_diarias
        WHERE DATE(fecha_venta) BETWEEN ? AND ?
          AND producto_id IN (${placeholders})
        GROUP BY DATE(fecha_venta), producto_id
      `,
      [from, to, ...productIds]
    );
    for (const row of Array.isArray(salesRows) ? salesRows : []) {
      const fecha = normalizeIsoDateOnly(row.fecha);
      const productId = toInt(row.producto_id, 0);
      if (!fecha || productId <= 0) continue;
      const key = `${productId}|${fecha}`;
      salesByProductDay.set(key, round2(row.venta_dia));
    }

    try {
      const [kardexRows] = await connection.query(
        `
          SELECT DATE(fecha_hora) AS fecha, producto_id,
                 SUM(CASE WHEN tipo = 'INGRESO' THEN cantidad ELSE -cantidad END) AS neto_dia
          FROM kardex_movimientos
          WHERE DATE(fecha_hora) BETWEEN ? AND ?
            AND producto_id IN (${placeholders})
          GROUP BY DATE(fecha_hora), producto_id
        `,
        [from, to, ...productIds]
      );

      for (const row of Array.isArray(kardexRows) ? kardexRows : []) {
        const fecha = normalizeIsoDateOnly(row.fecha);
        const productId = toInt(row.producto_id, 0);
        if (!fecha || productId <= 0) continue;
        const key = `${productId}|${fecha}`;
        netByProductDay.set(key, round2(row.neto_dia));
      }

      const [kardexAfterRows] = await connection.query(
        `
          SELECT producto_id,
                 SUM(CASE WHEN tipo = 'INGRESO' THEN cantidad ELSE -cantidad END) AS neto_post
          FROM kardex_movimientos
          WHERE DATE(fecha_hora) > ?
            AND producto_id IN (${placeholders})
          GROUP BY producto_id
        `,
        [to, ...productIds]
      );

      for (const row of Array.isArray(kardexAfterRows) ? kardexAfterRows : []) {
        const productId = toInt(row.producto_id, 0);
        if (productId <= 0) continue;
        netAfterEndByProduct.set(productId, round2(row.neto_post));
      }
    } catch (error) {
      if (error?.code !== "ER_NO_SUCH_TABLE") throw error;
      await appendLog("WARN", "Export ventas CSV sin kardex_movimientos, usando fallback ventas", {
        traceId
      });
    }
  }

  const datesDesc = [...dates].reverse();
  const reportRows = products.map((product) => {
    let closingCursor = round2(product.stockActual - toNumber(netAfterEndByProduct.get(product.id), 0));
    const byDay = new Map();

    for (const dateIso of datesDesc) {
      const key = `${product.id}|${dateIso}`;
      const saleQty = round2(toNumber(salesByProductDay.get(key), 0));
      const hasNet = netByProductDay.has(key);
      const netQty = hasNet ? round2(toNumber(netByProductDay.get(key), 0)) : round2(-saleQty);
      const openingQty = round2(closingCursor - netQty);

      byDay.set(dateIso, {
        inicio: openingQty,
        ventaDia: saleQty,
        cierre: closingCursor
      });
      closingCursor = openingQty;
    }

    return {
      id: product.id,
      nombre: product.nombre,
      precio: product.precio,
      byDay
    };
  });

  const csvRows = [];
  const headerDates = ["N°", "NOMBRE", "PRECIO"];
  for (const dateIso of dates) {
    headerDates.push(formatReportDateHeader(dateIso), "", "");
  }
  csvRows.push(csvLine(headerDates));

  const headerTypes = ["", "", ""];
  for (const _dateIso of dates) {
    headerTypes.push("INICIO", "VENTA DEL DIA", "CIERRE");
  }
  csvRows.push(csvLine(headerTypes));

  for (const row of reportRows) {
    const line = [row.id, row.nombre, Number.isFinite(row.precio) ? row.precio.toFixed(2) : "0.00"];
    for (const dateIso of dates) {
      const day = row.byDay.get(dateIso) || { inicio: 0, ventaDia: 0, cierre: 0 };
      line.push(
        formatQtyCsv(day.inicio),
        formatQtyCsv(day.ventaDia, { blankIfZero: true }),
        formatQtyCsv(day.cierre)
      );
    }
    csvRows.push(csvLine(line));
  }

  const csv = `\uFEFF${csvRows.join("\n")}\n`;
  const fileName = sanitizeCsvFileName(`ventas_diarias_resumen_${from}_a_${to}.csv`);

  return {
    csv,
    fileName,
    traceId,
    from,
    to,
    rows: reportRows.length,
    days: dates.length,
    dates,
    reportRows
  };
}

function buildDailySalesExportStyledSpreadsheet(exportData) {
  const from = normalizeIsoDateOnly(exportData?.from) || todayIsoDate();
  const to = normalizeIsoDateOnly(exportData?.to) || from;
  const dates = Array.isArray(exportData?.dates) ? exportData.dates : [];
  const reportRows = Array.isArray(exportData?.reportRows) ? exportData.reportRows : [];

  const buildCell = (value, options = {}) => {
    const styleId = options.styleId || "sNormal";
    const type = options.type || "String";
    const mergeAcross = Number(options.mergeAcross || 0);
    const mergeDown = Number(options.mergeDown || 0);
    const attrs = [` ss:StyleID="${styleId}"`];
    if (mergeAcross > 0) attrs.push(` ss:MergeAcross="${mergeAcross}"`);
    if (mergeDown > 0) attrs.push(` ss:MergeDown="${mergeDown}"`);
    const safeValue =
      type === "Number" ? String(toNumber(value, 0)) : htmlEscape(value === null ? "" : value);
    return `<Cell${attrs.join("")}><Data ss:Type="${type}">${safeValue}</Data></Cell>`;
  };

  const rows = [];
  const headerTop = [];
  headerTop.push(buildCell("N°", { styleId: "sHeaderMain", mergeDown: 1 }));
  headerTop.push(buildCell("NOMBRE", { styleId: "sHeaderMain", mergeDown: 1 }));
  headerTop.push(buildCell("PRECIO", { styleId: "sHeaderPrice", mergeDown: 1 }));
  for (const dateIso of dates) {
    headerTop.push(
      buildCell(formatReportDateHeader(dateIso), {
        styleId: "sHeaderDate",
        mergeAcross: 2
      })
    );
  }
  rows.push(`<Row>${headerTop.join("")}</Row>`);

  const headerBottom = [];
  for (const _dateIso of dates) {
    headerBottom.push(buildCell("INICIO", { styleId: "sSubNormal" }));
    headerBottom.push(buildCell("VENTA DEL DIA", { styleId: "sSubVenta" }));
    headerBottom.push(buildCell("CIERRE", { styleId: "sSubNormal" }));
  }
  rows.push(`<Row>${headerBottom.join("")}</Row>`);

  for (const row of reportRows) {
    const cells = [];
    cells.push(buildCell(toInt(row.id, 0), { styleId: "sNormal", type: "Number" }));
    cells.push(buildCell(row.nombre || "", { styleId: "sName" }));
    cells.push(
      buildCell(round2(toNumber(row.precio, 0)), {
        styleId: "sPrice",
        type: "Number"
      })
    );

    for (const dateIso of dates) {
      const day = row.byDay?.get(dateIso) || { inicio: 0, ventaDia: 0, cierre: 0 };
      const inicio = round2(toNumber(day.inicio, 0));
      const venta = round2(toNumber(day.ventaDia, 0));
      const cierre = round2(toNumber(day.cierre, 0));

      cells.push(buildCell(inicio, { styleId: "sNormal", type: "Number" }));
      if (Math.abs(venta) < 0.0000001) {
        cells.push(buildCell("", { styleId: "sVenta", type: "String" }));
      } else {
        cells.push(buildCell(venta, { styleId: "sVenta", type: "Number" }));
      }
      cells.push(buildCell(cierre, { styleId: "sNormal", type: "Number" }));
    }
    rows.push(`<Row>${cells.join("")}</Row>`);
  }

  const xml = `\uFEFF<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
   </Borders>
   <Font ss:FontName="Arial" ss:Size="10" ss:Color="#111111"/>
  </Style>
  <Style ss:ID="sNormal"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>
  <Style ss:ID="sName"><Alignment ss:Horizontal="Left" ss:Vertical="Center"/></Style>
  <Style ss:ID="sHeaderMain"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:FontName="Arial" ss:Bold="1" ss:Color="#111111"/><Interior ss:Color="#9AD14B" ss:Pattern="Solid"/></Style>
  <Style ss:ID="sHeaderPrice"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:FontName="Arial" ss:Bold="1" ss:Color="#0A2B1C"/><Interior ss:Color="#36B37E" ss:Pattern="Solid"/></Style>
  <Style ss:ID="sHeaderDate"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:FontName="Arial" ss:Bold="1" ss:Color="#111111"/><Interior ss:Color="#D4AF37" ss:Pattern="Solid"/></Style>
  <Style ss:ID="sSubNormal"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:FontName="Arial" ss:Bold="1" ss:Color="#111111"/><Interior ss:Color="#F3F4F6" ss:Pattern="Solid"/></Style>
  <Style ss:ID="sSubVenta"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:FontName="Arial" ss:Bold="1" ss:Color="#C1121F"/><Interior ss:Color="#F4B183" ss:Pattern="Solid"/></Style>
  <Style ss:ID="sPrice"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:FontName="Arial" ss:Bold="1" ss:Color="#166534"/><Interior ss:Color="#D8F3DC" ss:Pattern="Solid"/><NumberFormat ss:Format="0.00"/></Style>
  <Style ss:ID="sVenta"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:FontName="Arial" ss:Bold="1" ss:Color="#C1121F"/><Interior ss:Color="#F6C49F" ss:Pattern="Solid"/></Style>
 </Styles>
 <Worksheet ss:Name="Ventas Diarias">
  <Table>
${rows.map((line) => `   ${line}`).join("\n")}
  </Table>
 </Worksheet>
</Workbook>`;

  const fileName = sanitizeCsvFileName(`ventas_diarias_resumen_${from}_a_${to}_color.xml`);
  return {
    content: xml,
    contentType: "application/xml; charset=utf-8",
    fileName
  };
}

async function handleProductsCollection(req, res, query) {
  if (req.method === "GET") {
    const items = await readProductsAll();
    const term = normalizeText(query.get("q"));
    const pedidoFilter = normalizeText(query.get("pedido") || "todos");
    const statusFilter = normalizeText(query.get("estado") || "todos");
    const filtered = items.filter((item) => {
      const matchesTerm =
        !term ||
        normalizeText(item.NOMBRE).includes(term) ||
        normalizeText(item.CATEGORIA).includes(term) ||
        String(item["N°"]).includes(term) ||
        String(item.PRECIO).includes(term) ||
        String(item.PEDIDO).includes(term) ||
        String(item.STOCK_ACTUAL).includes(term) ||
        normalizeText(item.ESTADO).includes(term);
      const pedido = toNumber(item.PEDIDO, 0);
      const matchesPedido =
        pedidoFilter === "todos" ||
        (pedidoFilter === "con-pedido" && pedido > 0) ||
        (pedidoFilter === "sin-pedido" && pedido <= 0);
      const status = normalizeText(item.ESTADO || "ACTIVO");
      const matchesStatus =
        statusFilter === "todos" ||
        (statusFilter === "activo" && status === "activo") ||
        (statusFilter === "inactivo" && status === "inactivo");
      return matchesTerm && matchesPedido && matchesStatus;
    });
    const sorted = sortItems(filtered, {
      sortBy: trimValue(query.get("sortBy") || ""),
      sortDir: query.get("sortDir"),
      defaultSortBy: "N°",
      defaultSortDir: "asc",
      allowed: {
        "N°": (item) => toInt(item["N°"], 0),
        NOMBRE: (item) => trimValue(item.NOMBRE || ""),
        CATEGORIA: (item) => trimValue(item.CATEGORIA || ""),
        PRECIO: (item) => toNumber(item.PRECIO, 0),
        PEDIDO: (item) => toNumber(item.PEDIDO, 0),
        STOCK_ACTUAL: (item) => toNumber(item.STOCK_ACTUAL, 0),
        ESTADO: (item) => trimValue(item.ESTADO || "ACTIVO")
      }
    });
    sendJson(
      res,
      200,
      paginate(sorted, {
        page: query.get("page"),
        pageSize: query.get("pageSize")
      })
    );
    return;
  }

  if (req.method === "POST") {
    const payload = await parseJsonBody(req);
    const item = await createProduct(payload);
    sendJson(res, 201, item);
    return;
  }

  sendText(res, 405, "Metodo no permitido.");
}

async function handleProductsById(req, res, id) {
  if (req.method === "PUT") {
    const payload = await parseJsonBody(req);
    const item = await updateProduct(id, payload);
    sendJson(res, 200, item);
    return;
  }

  if (req.method === "DELETE") {
    const item = await deleteProduct(id);
    sendJson(res, 200, item);
    return;
  }

  sendText(res, 405, "Metodo no permitido.");
}

async function handleProductStockIngress(req, res, id) {
  if (req.method !== "POST") {
    sendText(res, 405, "Metodo no permitido.");
    return;
  }

  const payload = await parseJsonBody(req);
  const result = await registerStockIngress(id, payload);
  sendJson(res, 200, result);
}

async function handleVentasCollection(req, res, query) {
  if (req.method === "GET") {
    const items = await readSalesAll();
    const term = normalizeText(query.get("q"));
    const from = normalizeIsoDateOnly(query.get("from"));
    const to = normalizeIsoDateOnly(query.get("to"));
    const filtered = items.filter((item) => {
      if (!matchDateRange(item.FECHA_VENTA, from, to)) return false;
      if (!term) return true;
      return (
        normalizeText(item.NOMBRE).includes(term) ||
        String(item["N°"]).includes(term) ||
        String(item.FECHA_VENTA || "").includes(term) ||
        String(item.FECHA_OPERATIVA || "").includes(term) ||
        String(item.CANTIDAD).includes(term) ||
        normalizeText(item.TIPO_PAGO).includes(term)
      );
    });
    const sorted = sortItems(filtered, {
      sortBy: trimValue(query.get("sortBy") || ""),
      sortDir: query.get("sortDir"),
      defaultSortBy: "FECHA_VENTA",
      defaultSortDir: "desc",
      allowed: {
        FECHA_VENTA: (item) => normalizeIsoDateOnly(item.FECHA_VENTA) || "",
        FECHA_OPERATIVA: (item) => normalizeIsoDateOnly(item.FECHA_OPERATIVA) || "",
        "N°": (item) => toInt(item["N°"], 0),
        NOMBRE: (item) => trimValue(item.NOMBRE || ""),
        CANTIDAD: (item) => toNumber(item.CANTIDAD, 0),
        PRECIO: (item) => toNumber(item.PRECIO, 0),
        TOTAL: (item) => toNumber(item.TOTAL, 0),
        TIPO_PAGO: (item) => trimValue(item.TIPO_PAGO || ""),
        ORIGEN: (item) => trimValue(item.ORIGEN || ""),
        ID_VENTA: (item) => toInt(item.ID_VENTA, 0)
      }
    });
    sendJson(
      res,
      200,
      paginate(sorted, {
        page: query.get("page"),
        pageSize: query.get("pageSize")
      })
    );
    return;
  }

  if (req.method === "POST") {
    const payload = await parseJsonBody(req);
    const result = await registerSale(payload);
    logInfo("Venta registrada", {
      productId: result.sale["N°"],
      cantidad: result.sale.CANTIDAD,
      fecha: result.sale.FECHA_VENTA,
      saleId: result.sale.ID_VENTA,
      kardexId: result?.movement?.ID_MOV || null
    });
    sendJson(res, 201, result);
    return;
  }

  sendText(res, 405, "Metodo no permitido.");
}

async function handleVentasById(req, res, id) {
  if (req.method === "PUT") {
    const payload = await parseJsonBody(req);
    const result = await updateSale(id, payload);
    logInfo("Venta actualizada", {
      saleId: result.sale.ID_VENTA,
      productId: result.sale["N°"],
      cantidad: result.sale.CANTIDAD,
      fecha: result.sale.FECHA_VENTA
    });
    sendJson(res, 200, result);
    return;
  }

  sendText(res, 405, "Metodo no permitido.");
}

async function handleKardexCollection(req, res, query) {
  if (req.method === "DELETE") {
    const result = await deleteAllKardexMovements();
    logInfo("Kardex reiniciado (eliminacion masiva)", {
      deletedCount: result.deletedCount
    });
    sendJson(res, 200, {
      ok: true,
      deletedCount: result.deletedCount
    });
    return;
  }

  if (req.method !== "GET") {
    sendText(res, 405, "Metodo no permitido.");
    return;
  }

  const items = await readKardexAll();
  const term = normalizeText(query.get("q"));
  const typeFilter = normalizeKardexType(query.get("tipo")) || normalizeText(query.get("tipo"));
  const from = normalizeIsoDateOnly(query.get("from"));
  const to = normalizeIsoDateOnly(query.get("to"));
  const filtered = items.filter((item) => {
    if (!matchDateRange(extractDateOnly(item.FECHA_HORA), from, to)) return false;
    const matchesType =
      !typeFilter ||
      typeFilter === "todos" ||
      normalizeText(item.TIPO) === normalizeText(typeFilter);
    if (!matchesType) return false;
    if (!term) return true;
    return (
      String(item["N°"]).includes(term) ||
      normalizeText(item.NOMBRE).includes(term) ||
      String(item.FECHA_HORA).includes(term) ||
      normalizeText(item.REFERENCIA).includes(term) ||
      normalizeText(item.NOTA).includes(term)
    );
  });
  const sorted = sortItems(filtered, {
    sortBy: trimValue(query.get("sortBy") || ""),
    sortDir: query.get("sortDir"),
    defaultSortBy: "FECHA_HORA",
    defaultSortDir: "desc",
    allowed: {
      FECHA_HORA: (item) => trimValue(item.FECHA_HORA || ""),
      "N°": (item) => toInt(item["N°"], 0),
      NOMBRE: (item) => trimValue(item.NOMBRE || ""),
      TIPO: (item) => trimValue(item.TIPO || ""),
      CANTIDAD: (item) => toNumber(item.CANTIDAD, 0),
      STOCK_ANTES: (item) => toNumber(item.STOCK_ANTES, 0),
      STOCK_DESPUES: (item) => toNumber(item.STOCK_DESPUES, 0),
      REFERENCIA: (item) => trimValue(item.REFERENCIA || "")
    }
  });
  sendJson(
    res,
    200,
    paginate(sorted, {
      page: query.get("page"),
      pageSize: query.get("pageSize")
    })
  );
}

async function handleKardexById(req, res, id) {
  if (req.method === "DELETE") {
    const item = await deleteKardexMovement(id);
    sendJson(res, 200, item);
    return;
  }

  sendText(res, 405, "Metodo no permitido.");
}

const API_OBJECT_ROUTE_HANDLERS = [
  createVentasObjectServer({
    sendText,
    sendJson,
    readSalesAll,
    handleVentasCollection,
    handleVentasById,
    withMysqlConnection,
    buildDailySalesExportCsv,
    buildDailySalesExportStyledSpreadsheet,
    appendLog,
    normalizeText
  }),
  createDbObjectServer({
    sendText,
    sendJson,
    getDbStatus,
    getDbAccessHostStatus,
    logInfo
  }),
  createProductosObjectServer({
    sendText,
    sendJson,
    readProductsAll,
    getProductStats,
    handleProductsCollection,
    handleProductsById,
    handleProductStockIngress
  }),
  createKardexObjectServer({
    sendText,
    sendJson,
    readKardexAll,
    handleKardexCollection,
    handleKardexById
  })
];

async function handleApi(req, res, pathname, query) {
  for (const handler of API_OBJECT_ROUTE_HANDLERS) {
    if (await handler(req, res, pathname, query)) {
      return true;
    }
  }
  return false;
}

async function createServer() {
  const server = http.createServer(async (req, res) => {
    const startedAt = Date.now();
    res.on("finish", () => {
      const elapsedMs = Date.now() - startedAt;
      const level = res.statusCode >= 500 ? "ERROR" : res.statusCode >= 400 ? "WARN" : "INFO";
      appendLog(level, "HTTP request", {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        elapsedMs
      }).catch(() => {});
    });

    try {
      const requestUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
      const pathname = decodeURIComponent(requestUrl.pathname);

      if (pathname.startsWith("/api/")) {
        setApiCorsHeaders(res);
        if (req.method === "OPTIONS") {
          res.writeHead(204);
          res.end();
          return;
        }

        const handled = await handleApi(req, res, pathname, requestUrl.searchParams);
        if (!handled) {
          sendJson(res, 404, { error: "No encontrado." });
        }
        return;
      }

      await serveStatic(req, res, pathname);
    } catch (error) {
      const statusCode = Number.isInteger(error?.status) ? error.status : 500;
      const message = trimValue(error?.message || "Error interno del servidor.");
      if (statusCode >= 500) {
        logError("Request fallo", {
          method: req.method,
          url: req.url,
          message
        });
      } else {
        logWarn("Request validacion", {
          method: req.method,
          url: req.url,
          message
        });
      }

      if (req.url && String(req.url).startsWith("/api/")) {
        setApiCorsHeaders(res);
        sendJson(res, statusCode, { error: message });
      } else {
        sendText(res, statusCode, message);
      }
    }
  });

  return server;
}

async function start() {
  try {
    await resetSessionLog();
    await appendLog("INFO", "Inicializando servidor", { host: HOST, port: PORT });

    const server = await createServer();
    server.listen(PORT, HOST, async () => {
      await appendLog("INFO", "Servidor listo", {
        url: `http://${HOST}:${PORT}`,
        defaultCsvPath: path.join(ROOT_DIR, "productos.csv"),
        activeCsvPath: path.join(ROOT_DIR, "productos.csv"),
        ventasCsvPath: path.join(ROOT_DIR, "ventas_diarias.csv"),
        kardexCsvPath: path.join(ROOT_DIR, "kardex.csv"),
        logPath: LAST_SESSION_LOG_PATH
      });
      console.log(`Servidor listo en http://${HOST}:${PORT}`);
    });
  } catch (error) {
    const message = trimValue(error?.message || "No se pudo iniciar servidor.");
    try {
      await appendLog("ERROR", "Fallo al iniciar servidor", { message });
    } catch {
      // noop
    }
    console.error(message);
    process.exitCode = 1;
  }
}

start();
