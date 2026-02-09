const DEFAULT_PAGINATION = {
  page: 1,
  pageSize: 10,
  totalItems: 0,
  totalPages: 1,
  hasPrev: false,
  hasNext: false
};
const DEFAULT_SALES_PAGINATION = {
  ...DEFAULT_PAGINATION,
  pageSize: 20
};

const API_BASE_STORAGE_KEY = "licoreria.api_base_url";
const MOBILE_KPI_EXPANDED_STORAGE_KEY = "licoreria.mobile_kpi_expanded";
const FALLBACK_API_BASE_URL = "https://api.escon.pe";
const PAYMENT_TYPES = ["A Ya Per", "Efectivo", "Pedido Ya", "Rappi", "EasyPay"];

const state = {
  activeView: "sales",
  apiBaseUrl: "",
  products: [],
  productCatalog: [],
  filteredProducts: [],
  pagedProducts: [],
  pagination: { ...DEFAULT_PAGINATION },
  sales: [],
  salesAll: [],
  filteredSales: [],
  pagedSales: [],
  salesPagination: { ...DEFAULT_SALES_PAGINATION },
  salesDateFrom: "",
  salesDateTo: "",
  kardex: [],
  kardexAll: [],
  filteredKardex: [],
  crudSearch: "",
  salesSearch: "",
  kardexSearch: "",
  kardexType: "TODOS",
  serverBackedTables: true,
  productSort: { key: "N°", dir: "asc" },
  salesSort: { key: "FECHA", dir: "desc" },
  kardexSort: { key: "FECHA_HORA", dir: "desc" },
  editingId: null,
  apiConnected: false,
  settingsMessageTimeoutId: null,
  dbStatus: null,
  accessHost: null,
  salePendingConfirm: null,
  saleEditingId: null,
  ingressProductId: null,
  mobileNavExpanded: false,
  mobileKpiExpanded: false,
  migrationPollTimeoutId: null
};

const refs = {
  navSales: document.getElementById("navSales"),
  navProducts: document.getElementById("navProducts"),
  navKardex: document.getElementById("navKardex"),
  navSettings: document.getElementById("navSettings"),
  mobileNavToggle: document.getElementById("mobileNavToggle"),
  mainViewNav: document.getElementById("mainViewNav"),
  dbStatusCard: document.getElementById("dbStatusCard"),
  dbStatusDot: document.getElementById("dbStatusDot"),
  dbStatusText: document.getElementById("dbStatusText"),
  dbStatusMeta: document.getElementById("dbStatusMeta"),
  dbStatusLastCheck: document.getElementById("dbStatusLastCheck"),
  dbStatusRefreshBtn: document.getElementById("dbStatusRefreshBtn"),
  kpiToggleBtn: document.getElementById("kpiToggleBtn"),
  kpiCollapsible: document.getElementById("kpiCollapsible"),
  reloadBtn: document.getElementById("reloadBtn"),
  appMessage: document.getElementById("appMessage"),
  kpiProducts: document.getElementById("kpiProducts"),
  kpiSalesRangeAmount: document.getElementById("kpiSalesRangeAmount"),
  kpiSales: document.getElementById("kpiSales"),
  kpiKardex: document.getElementById("kpiKardex"),
  openCreateBtn: document.getElementById("openCreateBtn"),
  productDialog: document.getElementById("productDialog"),
  productDialogTitle: document.getElementById("productDialogTitle"),
  dialogCloseBtn: document.getElementById("dialogCloseBtn"),
  ingressDialog: document.getElementById("ingressDialog"),
  ingressDialogCloseBtn: document.getElementById("ingressDialogCloseBtn"),
  ingressForm: document.getElementById("ingressForm"),
  ingressProductId: document.getElementById("ingressProductId"),
  ingressProductLabel: document.getElementById("ingressProductLabel"),
  ingressCurrentStock: document.getElementById("ingressCurrentStock"),
  ingressCantidad: document.getElementById("ingressCantidad"),
  ingressNota: document.getElementById("ingressNota"),
  ingressMessage: document.getElementById("ingressMessage"),
  ingressSubmitBtn: document.getElementById("ingressSubmitBtn"),
  ingressCancelBtn: document.getElementById("ingressCancelBtn"),
  crudSearch: document.getElementById("crudSearch"),
  crudMessage: document.getElementById("crudMessage"),
  productForm: document.getElementById("productForm"),
  crudEditId: document.getElementById("crudEditId"),
  crudId: document.getElementById("crudId"),
  crudNombre: document.getElementById("crudNombre"),
  crudPrecio: document.getElementById("crudPrecio"),
  crudPedido: document.getElementById("crudPedido"),
  crudStockActual: document.getElementById("crudStockActual"),
  crudStockAjuste: document.getElementById("crudStockAjuste"),
  crudNota: document.getElementById("crudNota"),
  crudSaveBtn: document.getElementById("crudSaveBtn"),
  crudCancelBtn: document.getElementById("crudCancelBtn"),
  crudBody: document.getElementById("crudBody"),
  crudPrevBtn: document.getElementById("crudPrevBtn"),
  crudNextBtn: document.getElementById("crudNextBtn"),
  crudPageSize: document.getElementById("crudPageSize"),
  crudPageInfo: document.getElementById("crudPageInfo"),
  openSaleDialogBtn: document.getElementById("openSaleDialogBtn"),
  exportSalesCsvBtn: document.getElementById("exportSalesCsvBtn"),
  saleDialog: document.getElementById("saleDialog"),
  saleDialogTitle: document.getElementById("saleDialogTitle"),
  saleDialogCloseBtn: document.getElementById("saleDialogCloseBtn"),
  saleCancelBtn: document.getElementById("saleCancelBtn"),
  saleForm: document.getElementById("saleForm"),
  saleProductLookup: document.getElementById("saleProductLookup"),
  saleProductList: document.getElementById("saleProductList"),
  saleProductId: document.getElementById("saleProductId"),
  saleCantidad: document.getElementById("saleCantidad"),
  salePrecioPreview: document.getElementById("salePrecioPreview"),
  saleTotalPreview: document.getElementById("saleTotalPreview"),
  saleFecha: document.getElementById("saleFecha"),
  saleTipoPago: document.getElementById("saleTipoPago"),
  saleNota: document.getElementById("saleNota"),
  saleSubmitBtn: document.getElementById("saleSubmitBtn"),
  saleConfirmBox: document.getElementById("saleConfirmBox"),
  saleConfirmTitle: document.getElementById("saleConfirmTitle"),
  saleConfirmProduct: document.getElementById("saleConfirmProduct"),
  saleConfirmCantidad: document.getElementById("saleConfirmCantidad"),
  saleConfirmFecha: document.getElementById("saleConfirmFecha"),
  saleConfirmTipoPago: document.getElementById("saleConfirmTipoPago"),
  saleConfirmTotal: document.getElementById("saleConfirmTotal"),
  saleConfirmBackBtn: document.getElementById("saleConfirmBackBtn"),
  saleConfirmSubmitBtn: document.getElementById("saleConfirmSubmitBtn"),
  saleMessage: document.getElementById("saleMessage"),
  salesSearch: document.getElementById("salesSearch"),
  salesDateFrom: document.getElementById("salesDateFrom"),
  salesDateTo: document.getElementById("salesDateTo"),
  salesDateTodayBtn: document.getElementById("salesDateTodayBtn"),
  salesBody: document.getElementById("salesBody"),
  salesPrevBtn: document.getElementById("salesPrevBtn"),
  salesNextBtn: document.getElementById("salesNextBtn"),
  salesPageSize: document.getElementById("salesPageSize"),
  salesPageInfo: document.getElementById("salesPageInfo"),
  kardexSearch: document.getElementById("kardexSearch"),
  kardexTypeFilter: document.getElementById("kardexTypeFilter"),
  kardexBody: document.getElementById("kardexBody"),
  sortButtons: Array.from(document.querySelectorAll("[data-sort-table][data-sort-key]")),
  apiSettingsForm: document.getElementById("apiSettingsForm"),
  apiBaseUrlInput: document.getElementById("apiBaseUrlInput"),
  saveApiBaseBtn: document.getElementById("saveApiBaseBtn"),
  useCurrentOriginBtn: document.getElementById("useCurrentOriginBtn"),
  testApiBaseBtn: document.getElementById("testApiBaseBtn"),
  testCpanelDbBtn: document.getElementById("testCpanelDbBtn"),
  apiBaseUrlCurrent: document.getElementById("apiBaseUrlCurrent"),
  accessHostValue: document.getElementById("accessHostValue"),
  copyAccessHostBtn: document.getElementById("copyAccessHostBtn"),
  refreshAccessHostBtn: document.getElementById("refreshAccessHostBtn"),
  accessHostMeta: document.getElementById("accessHostMeta"),
  cpanelProbeBadge: document.getElementById("cpanelProbeBadge"),
  cpanelProbeMeta: document.getElementById("cpanelProbeMeta"),
  cpanelProbeBody: document.getElementById("cpanelProbeBody"),
  settingsMessage: document.getElementById("settingsMessage"),
  viewNavButtons: Array.from(document.querySelectorAll(".view-nav-btn")),
  viewPanels: Array.from(document.querySelectorAll("[data-view-panel]"))
};

function esc(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function money(value) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN"
  }).format(Number(value || 0));
}

function formatQty(value) {
  const number = Number(value || 0);
  return Number.isInteger(number) ? String(number) : number.toFixed(2).replace(/\.00$/, "");
}

function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "short",
    timeStyle: "medium"
  }).format(date);
}

function todayInputValue() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function getRuntimeOrigin() {
  if (window.location.protocol === "http:" || window.location.protocol === "https:") {
    return window.location.origin;
  }
  return "";
}

function normalizeApiBaseUrl(rawUrl) {
  const input = String(rawUrl ?? "").trim();
  if (!input) return "";

  const withProtocol = /^https?:\/\//i.test(input) ? input : `http://${input}`;
  let parsed;
  try {
    parsed = new URL(withProtocol);
  } catch {
    throw new Error("URL inválida. Usa formato: http://127.0.0.1:8788");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Solo se permiten URLs http o https.");
  }

  return parsed.origin;
}

function getDefaultApiBaseUrl() {
  const runtimeOrigin = getRuntimeOrigin();
  if (runtimeOrigin && isLoopbackApiOrigin(runtimeOrigin)) {
    return runtimeOrigin;
  }
  return FALLBACK_API_BASE_URL;
}

function isLoopbackApiOrigin(urlInput) {
  try {
    const normalized = normalizeApiBaseUrl(urlInput);
    if (!normalized) return false;
    const parsed = new URL(normalized);
    const host = String(parsed.hostname || "").toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return false;
  }
}

function loadApiBaseUrlPreference() {
  const fallback = getDefaultApiBaseUrl();
  try {
    const stored = window.localStorage.getItem(API_BASE_STORAGE_KEY);
    const normalized = normalizeApiBaseUrl(stored);
    return normalized || fallback;
  } catch {
    return fallback;
  }
}

function loadMobileKpiExpandedPreference() {
  try {
    const value = window.localStorage.getItem(MOBILE_KPI_EXPANDED_STORAGE_KEY);
    if (value === null) return false;
    return value === "1";
  } catch {
    return false;
  }
}

function saveMobileKpiExpandedPreference(expanded) {
  try {
    window.localStorage.setItem(MOBILE_KPI_EXPANDED_STORAGE_KEY, expanded ? "1" : "0");
  } catch {
    // Ignora errores de storage.
  }
}

function saveApiBaseUrlPreference(url) {
  try {
    window.localStorage.setItem(API_BASE_STORAGE_KEY, url);
  } catch {
    // Ignora errores de storage.
  }
}

function getApiBaseUrl() {
  return state.apiBaseUrl || getDefaultApiBaseUrl();
}

function buildApiUrl(path) {
  return buildApiUrlWithBase(path, getApiBaseUrl());
}

function buildApiUrlWithBase(path, baseUrl) {
  const apiPath = String(path ?? "").trim();
  const normalizedPath = apiPath.startsWith("/") ? apiPath : `/${apiPath}`;
  return new URL(normalizedPath, baseUrl).toString();
}

function sanitizeHostCandidate(value) {
  const text = String(value ?? "").trim().replace(/^https?:\/\//i, "");
  return text.replace(/\/.*$/, "").replace(/:\d+$/, "").trim();
}

function isIpv4(value) {
  const text = String(value ?? "").trim();
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

function hasOwnField(value, fieldName) {
  return Boolean(value && typeof value === "object" && Object.prototype.hasOwnProperty.call(value, fieldName));
}

async function detectBrowserPublicIpv4() {
  const probes = [
    {
      source: "ipify",
      url: "https://api.ipify.org?format=json",
      parse: async (response) => {
        const data = await response.json();
        return sanitizeHostCandidate(data?.ip || "");
      }
    },
    {
      source: "checkip-amazon",
      url: "https://checkip.amazonaws.com",
      parse: async (response) => sanitizeHostCandidate(await response.text())
    },
    {
      source: "icanhazip",
      url: "https://ipv4.icanhazip.com",
      parse: async (response) => sanitizeHostCandidate(await response.text())
    }
  ];

  for (const probe of probes) {
    try {
      const response = await fetch(probe.url, { cache: "no-store" });
      if (!response.ok) continue;
      const ip = await probe.parse(response);
      if (!isIpv4(ip) || isPrivateIpv4(ip)) continue;
      return { ip, source: probe.source };
    } catch {
      // Probar siguiente endpoint.
    }
  }
  return null;
}

function extractMysqlDeniedHost(errorText) {
  const text = String(errorText ?? "").trim();
  if (!text) return "";
  const match = text.match(/@'([^']+)'/);
  return match ? String(match[1]).trim() : "";
}

async function copyTextToClipboard(text) {
  const value = String(text ?? "");
  if (!value) {
    throw new Error("No hay texto para copiar.");
  }

  if (window.navigator?.clipboard?.writeText) {
    await window.navigator.clipboard.writeText(value);
    return;
  }

  const input = document.createElement("textarea");
  input.value = value;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.opacity = "0";
  input.style.pointerEvents = "none";
  document.body.append(input);
  input.focus();
  input.select();
  const copied = document.execCommand("copy");
  input.remove();
  if (!copied) {
    throw new Error("Tu navegador bloqueo la copia automática.");
  }
}

function getSaleProductsSource() {
  return state.productCatalog.length ? state.productCatalog : state.products;
}

function buildCollectionQuery(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    const text = String(value).trim();
    if (!text) return;
    query.set(key, text);
  });
  return query.toString();
}

function getSortStateByTable(tableName) {
  if (tableName === "products") return state.productSort;
  if (tableName === "sales") return state.salesSort;
  if (tableName === "kardex") return state.kardexSort;
  return null;
}

function updateSortState(tableName, key) {
  const target = getSortStateByTable(tableName);
  if (!target) return;
  const sameKey = target.key === key;
  target.key = key;
  target.dir = sameKey ? (target.dir === "asc" ? "desc" : "asc") : "asc";
}

function renderSortButtons() {
  refs.sortButtons.forEach((button) => {
    const tableName = String(button.dataset.sortTable || "");
    const key = String(button.dataset.sortKey || "");
    const current = getSortStateByTable(tableName);
    if (!current || !key) return;
    const isActive = current.key === key;
    const indicator = isActive ? (current.dir === "asc" ? "↑" : "↓") : "↕";
    const indicatorNode = button.querySelector(".sort-indicator");
    if (indicatorNode) indicatorNode.textContent = indicator;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
    const directionLabel = isActive ? (current.dir === "asc" ? "ascendente" : "descendente") : "sin orden";
    button.setAttribute("title", `Orden: ${directionLabel}`);
  });
}

function debounce(fn, delay = 200) {
  let timeoutId = null;
  return (...args) => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => fn(...args), delay);
  };
}

function normalizeText(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function normalizeNumericText(value) {
  return String(value ?? "").replace(",", ".").trim();
}

function normalizePaymentType(value) {
  const input = normalizeText(value);
  const found = PAYMENT_TYPES.find((type) => normalizeText(type) === input);
  return found || "Efectivo";
}

function parseNumberInput(raw, { min = null, max = null, label = "numero" } = {}) {
  const value = Number.parseFloat(String(raw ?? "").replace(",", ".").trim());
  if (!Number.isFinite(value)) {
    throw new Error(`El campo ${label} debe ser numerico.`);
  }
  if (min !== null && value < min) {
    throw new Error(`El campo ${label} debe ser >= ${min}.`);
  }
  if (max !== null && value > max) {
    throw new Error(`El campo ${label} debe ser <= ${max}.`);
  }
  return value;
}

function matchProduct(product, rawTerm) {
  const term = String(rawTerm ?? "").trim();
  if (!term) return true;

  const termNorm = normalizeText(term);
  const termNum = normalizeNumericText(term);

  const idText = String(product["N°"] ?? "");
  const nameText = normalizeText(product.NOMBRE ?? "");
  const categoryText = normalizeText(product.CATEGORIA ?? "");
  const pedidoText = String(product.PEDIDO ?? "");
  const stockText = String(product.STOCK_ACTUAL ?? "");

  const price = Number(product.PRECIO ?? 0);
  const priceRaw = String(product.PRECIO ?? "");
  const priceShort = String(price);
  const priceFixed = Number.isFinite(price) ? price.toFixed(2) : "";
  const priceComma = priceFixed.replace(".", ",");
  const priceCandidates = [priceRaw, priceShort, priceFixed, priceComma, stockText];

  const matchesText =
    idText.includes(term) ||
    pedidoText.includes(term) ||
    stockText.includes(term) ||
    categoryText.includes(termNorm) ||
    nameText.includes(termNorm);

  if (matchesText) return true;

  return priceCandidates.some((candidate) => {
    const candidateText = String(candidate);
    return (
      candidateText.includes(term) ||
      normalizeNumericText(candidateText).includes(termNum)
    );
  });
}

function matchSale(item, rawTerm) {
  const term = String(rawTerm ?? "").trim();
  if (!term) return true;
  const norm = normalizeText(term);

  return (
    String(item["N°"] ?? "").includes(term) ||
    String(item.FECHA ?? "").includes(term) ||
    String(item.CANTIDAD ?? "").includes(term) ||
    normalizeText(item.TIPO_PAGO ?? "").includes(norm) ||
    normalizeText(item.NOMBRE ?? "").includes(norm)
  );
}

function normalizeDateValue(value) {
  const text = String(value ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function matchDateRange(rawDate, fromDate, toDate) {
  const from = normalizeDateValue(fromDate);
  const to = normalizeDateValue(toDate);
  if (!from && !to) return true;

  const dateText = String(rawDate ?? "").trim().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateText)) {
    if (from && dateText < from) return false;
    if (to && dateText > to) return false;
    return true;
  }

  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) return false;

  const normalized = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);

  if (from && normalized < from) return false;
  if (to && normalized > to) return false;
  return true;
}

function matchKardex(item, rawTerm, typeFilter) {
  const typeOk = !typeFilter || typeFilter === "TODOS" || item.TIPO === typeFilter;
  if (!typeOk) return false;

  const term = String(rawTerm ?? "").trim();
  if (!term) return true;

  const norm = normalizeText(term);
  return (
    String(item["N°"] ?? "").includes(term) ||
    String(item.FECHA_HORA ?? "").includes(term) ||
    normalizeText(item.NOMBRE ?? "").includes(norm) ||
    normalizeText(item.REFERENCIA ?? "").includes(norm) ||
    normalizeText(item.NOTA ?? "").includes(norm)
  );
}

function paginate(items, page, pageSize) {
  const safePageSize = Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 10;
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / safePageSize));
  const safePage = Math.min(Math.max(Number(page) || 1, 1), totalPages);
  const start = (safePage - 1) * safePageSize;

  return {
    items: items.slice(start, start + safePageSize),
    pagination: {
      page: safePage,
      pageSize: safePageSize,
      totalItems,
      totalPages,
      hasPrev: safePage > 1,
      hasNext: safePage < totalPages
    }
  };
}

async function apiRequest(path, options = {}) {
  let response;
  const requestUrl = buildApiUrl(path);
  try {
    response = await fetch(requestUrl, {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options
    });
  } catch {
    throw new Error(
      `No se pudo conectar al servidor configurado (${getApiBaseUrl()}). Verifica URL y que esté activo.`
    );
  }

  if (!response.ok) {
    let message = `Error ${response.status}`;
    let rawBody = "";
    try {
      rawBody = await response.text();
      if (rawBody) {
        try {
          const data = JSON.parse(rawBody);
          if (data?.error) {
            message = data.error;
          } else {
            message = rawBody;
          }
        } catch {
          message = rawBody;
        }
      }
    } catch {
      // Ignora errores de lectura del body.
    }
    throw new Error(message);
  }

  const rawBody = await response.text();
  if (!rawBody) return null;

  const type = response.headers.get("content-type") || "";
  if (type.includes("application/json")) {
    try {
      return JSON.parse(rawBody);
    } catch {
      throw new Error("La respuesta del servidor no es JSON valido.");
    }
  }
  return rawBody;
}

function setAppMessage(text, type = "") {
  refs.appMessage.textContent = text;
  refs.appMessage.classList.remove("is-error", "is-success");
  if (type) refs.appMessage.classList.add(type);
}

function setCrudMessage(text, type = "") {
  refs.crudMessage.textContent = text;
  refs.crudMessage.classList.remove("is-error", "is-success");
  if (type) refs.crudMessage.classList.add(type);
}

function setSaleMessage(text, type = "") {
  refs.saleMessage.textContent = text;
  refs.saleMessage.classList.remove("is-error", "is-success");
  if (type) refs.saleMessage.classList.add(type);
}

function setIngressMessage(text, type = "") {
  refs.ingressMessage.textContent = text;
  refs.ingressMessage.classList.remove("is-error", "is-success");
  if (type) refs.ingressMessage.classList.add(type);
}

function setSettingsMessage(text, type = "", { autoClearMs = 0 } = {}) {
  refs.settingsMessage.textContent = text;
  refs.settingsMessage.classList.remove("is-error", "is-success");
  if (type) refs.settingsMessage.classList.add(type);

  if (state.settingsMessageTimeoutId) {
    window.clearTimeout(state.settingsMessageTimeoutId);
    state.settingsMessageTimeoutId = null;
  }

  if (autoClearMs > 0 && text) {
    state.settingsMessageTimeoutId = window.setTimeout(() => {
      refs.settingsMessage.textContent = "";
      refs.settingsMessage.classList.remove("is-error", "is-success");
      state.settingsMessageTimeoutId = null;
    }, autoClearMs);
  }
}

function tryParseJsonText(text) {
  const raw = String(text ?? "").trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function prettyPayload(payload) {
  if (typeof payload === "string") return payload || "-";
  if (payload === null || payload === undefined) return "-";
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return String(payload);
  }
}

function setCpanelProbeResult({ state = "idle", url = "", httpStatus = null, payload = null, error = "" } = {}) {
  const badge = refs.cpanelProbeBadge;
  const meta = refs.cpanelProbeMeta;
  const body = refs.cpanelProbeBody;
  if (!badge || !meta || !body) return;

  badge.classList.remove("is-idle", "is-ok", "is-error", "is-loading");

  const checkedAt = formatDateTime(new Date().toISOString());
  const statusLabel = httpStatus ? `HTTP ${httpStatus}` : "sin HTTP";
  const shortUrl = url || getApiBaseUrl();

  if (state === "loading") {
    badge.classList.add("is-loading");
    badge.textContent = "Probando...";
    meta.textContent = `Consultando ${shortUrl} ...`;
    body.textContent = "-";
    return;
  }

  if (state === "ok") {
    badge.classList.add("is-ok");
    badge.textContent = "OK";
    meta.textContent = `${statusLabel} · ${checkedAt} · ${shortUrl}`;
    body.textContent = prettyPayload(payload);
    return;
  }

  if (state === "error") {
    badge.classList.add("is-error");
    badge.textContent = "Error";
    meta.textContent = `${statusLabel} · ${checkedAt} · ${shortUrl}`;
    body.textContent = error
      ? `${error}\n\n${prettyPayload(payload)}`
      : prettyPayload(payload);
    return;
  }

  badge.classList.add("is-idle");
  badge.textContent = "Sin probar";
  meta.textContent = 'Pulsa "Probar DB cPanel" para ver la respuesta real de /api/db/status.';
  body.textContent = "-";
}

function clearMigrationPolling() {
  if (!state.migrationPollTimeoutId) return;
  window.clearTimeout(state.migrationPollTimeoutId);
  state.migrationPollTimeoutId = null;
}

function renderDbStatus() {
  window.SettingsPage.renderDbStatus(refs, state, formatDateTime);
}

function buildAccessHostRenderState() {
  const fallback = state.accessHost && typeof state.accessHost === "object" ? { ...state.accessHost } : {};
  const deniedHost = extractMysqlDeniedHost(state.dbStatus?.error || "");
  if (!deniedHost) return fallback;

  return {
    ...fallback,
    host: deniedHost,
    source: "mysql_access_denied",
    sourceLabel: "Detectado desde rechazo MySQL (más preciso)",
    checkedAt: state.dbStatus?.checkedAt || fallback.checkedAt || new Date().toISOString(),
    message: "Usa este host para autorizar acceso remoto en cPanel.",
    fallbackHost: fallback.host && fallback.host !== deniedHost ? fallback.host : ""
  };
}

function renderAccessHost() {
  window.SettingsPage.renderAccessHost(refs, buildAccessHostRenderState(), formatDateTime);
}

async function refreshDbStatus() {
  let success = false;
  try {
    const result = await apiRequest("/api/db/status");
    if (!hasOwnField(result, "checked")) {
      throw new Error(`La URL API actual (${getApiBaseUrl()}) no expone /api/db/status.`);
    }
    state.dbStatus = result;
    success = true;
  } catch (error) {
    state.dbStatus = {
      checked: true,
      checkedAt: new Date().toISOString(),
      configured: false,
      connected: false,
      method: "none",
      host: null,
      port: null,
      database: null,
      user: null,
      charset: "utf8mb4",
      missingKeys: [],
      probeMs: 0,
      message: "No se pudo consultar estado de DB.",
      error: String(error?.message || "Error de conexión con API.")
    };
  }
  renderDbStatus();
  renderAccessHost();
  return success;
}

async function refreshAccessHost() {
  let success = false;
  try {
    const result = await apiRequest("/api/db/access-host");
    if (!hasOwnField(result, "host")) {
      throw new Error(`La URL API actual (${getApiBaseUrl()}) no expone /api/db/access-host.`);
    }
    state.accessHost = result;
    success = true;
  } catch (error) {
    const deniedHost = extractMysqlDeniedHost(state.dbStatus?.error || "");
    if (deniedHost) {
      state.accessHost = {
        checkedAt: new Date().toISOString(),
        host: deniedHost,
        source: "mysql_access_denied",
        sourceLabel: "Detectado desde rechazo MySQL",
        publicHost: null,
        dbDeniedHost: deniedHost,
        localHost: null,
        canWhitelist: true,
        message: "Host detectado desde Access denied de MySQL. Úsalo en cPanel > Remote MySQL.",
        error: String(error?.message || "No se pudo usar endpoint backend.")
      };
      success = true;
    } else {
      const browserFallback = await detectBrowserPublicIpv4();
      if (browserFallback?.ip) {
        state.accessHost = {
          checkedAt: new Date().toISOString(),
          host: browserFallback.ip,
          source: "browser_public_ipv4",
          sourceLabel: `IP publica detectada desde navegador (${browserFallback.source})`,
          publicHost: browserFallback.ip,
          dbDeniedHost: null,
          localHost: null,
          canWhitelist: true,
          message:
            "Fallback sin API backend. Usa este host en cPanel si el backend corre en este mismo equipo.",
          error: String(error?.message || "No se pudo usar endpoint backend.")
        };
        success = true;
      } else {
        state.accessHost = {
          checkedAt: new Date().toISOString(),
          host: null,
          source: "error",
          sourceLabel: "No disponible",
          message:
            "No se pudo detectar automaticamente. Verifica la URL API o detecta la IP publica manualmente.",
          error: String(error?.message || "Error de conexión con API.")
        };
      }
    }
  }
  renderAccessHost();
  return success;
}

function clearCrudForm() {
  state.editingId = null;
  refs.crudEditId.value = "";
  refs.crudId.value = "";
  refs.crudId.disabled = false;
  refs.crudNombre.value = "";
  refs.crudPrecio.value = "";
  refs.crudPedido.value = "0";
  refs.crudStockActual.value = "0";
  refs.crudStockActual.disabled = false;
  refs.crudStockAjuste.value = "0";
  refs.crudStockAjuste.disabled = true;
  refs.crudNota.value = "";
  refs.crudSaveBtn.textContent = "Guardar producto";
  refs.productDialogTitle.textContent = "Crear producto";
}

function openDialog() {
  if (refs.productDialog.open) return;
  refs.productDialog.showModal();
}

function closeDialog() {
  if (!refs.productDialog.open) return;
  refs.productDialog.close();
}

function resetIngressForm() {
  state.ingressProductId = null;
  refs.ingressProductId.value = "";
  refs.ingressProductLabel.value = "";
  refs.ingressCurrentStock.value = "-";
  refs.ingressCantidad.value = "1";
  refs.ingressNota.value = "Ingreso manual desde gestion";
  refs.ingressSubmitBtn.disabled = false;
  setIngressMessage("");
}

function openIngressDialogForProduct(product) {
  if (!product) return;
  resetIngressForm();
  state.ingressProductId = Number(product["N°"]);
  refs.ingressProductId.value = String(product["N°"]);
  refs.ingressProductLabel.value = `${product["N°"]} - ${product.NOMBRE}`;
  refs.ingressCurrentStock.value = formatQty(product.STOCK_ACTUAL);

  if (!refs.ingressDialog.open) {
    refs.ingressDialog.showModal();
  }
  refs.ingressCantidad.focus();
  refs.ingressCantidad.select();
}

function closeIngressDialog() {
  if (!refs.ingressDialog.open) return;
  refs.ingressDialog.close();
}

function setSaleFormLocked(locked) {
  [
    refs.saleProductLookup,
    refs.saleProductId,
    refs.saleCantidad,
    refs.saleFecha,
    refs.saleTipoPago,
    refs.saleNota
  ].forEach((input) => {
    input.disabled = Boolean(locked);
  });
  refs.saleSubmitBtn.disabled = Boolean(locked);
}

function setSaleDialogMode(mode) {
  const isEdit = mode === "edit";
  if (isEdit && state.saleEditingId) {
    refs.saleDialogTitle.textContent = `Editar venta #${state.saleEditingId}`;
  } else {
    refs.saleDialogTitle.textContent = "Registrar venta diaria";
  }
  refs.saleSubmitBtn.textContent = isEdit ? "Confirmar cambios" : "Confirmar venta";
  refs.saleConfirmTitle.textContent = isEdit ? "Confirmar cambios de venta" : "Confirmar venta";
  refs.saleConfirmSubmitBtn.textContent = isEdit ? "Guardar cambios" : "Guardar venta";
}

function updateSaleTotalsPreview() {
  const products = getSaleProductsSource();
  const productId = Number.parseInt(refs.saleProductId.value, 10);
  const product = products.find((item) => Number(item["N°"]) === productId);
  if (!product) {
    refs.salePrecioPreview.value = "-";
    refs.saleTotalPreview.value = "-";
    return;
  }

  const price = Number(product.PRECIO || 0);
  const qtyRaw = String(refs.saleCantidad.value ?? "").replace(",", ".").trim();
  const qty = Number.parseFloat(qtyRaw);
  const safeQty = Number.isFinite(qty) && qty > 0 ? qty : 0;
  const total = round2(price * safeQty);

  refs.salePrecioPreview.value = money(price);
  refs.saleTotalPreview.value = money(total);
}

function showSaleConfirmBox(summary, payload, options = {}) {
  const isEditing = Boolean(options.isEditing);
  const saleId = options.saleId ? Number(options.saleId) : null;
  state.salePendingConfirm = { payload, isEditing, saleId };
  refs.saleConfirmProduct.textContent = summary.product;
  refs.saleConfirmCantidad.textContent = summary.cantidad;
  refs.saleConfirmFecha.textContent = summary.fecha;
  refs.saleConfirmTipoPago.textContent = summary.tipoPago;
  refs.saleConfirmTotal.textContent = summary.total || "-";
  refs.saleConfirmBox.hidden = false;
  setSaleFormLocked(true);
}

function hideSaleConfirmBox({ clear = true } = {}) {
  refs.saleConfirmBox.hidden = true;
  setSaleFormLocked(false);
  if (clear) {
    state.salePendingConfirm = null;
  }
}

function resetSaleForm() {
  state.saleEditingId = null;
  hideSaleConfirmBox({ clear: true });
  refs.saleProductLookup.value = "";
  refs.saleProductId.value = "";
  refs.saleCantidad.value = "1";
  refs.salePrecioPreview.value = "-";
  refs.saleTotalPreview.value = "-";
  refs.saleTipoPago.value = "Efectivo";
  refs.saleNota.value = "";
  refs.saleFecha.value = refs.saleFecha.value || todayInputValue();
  setSaleDialogMode("create");
  renderSaleProductOptions();
  updateSaleTotalsPreview();
}

function openSaleDialog() {
  if (!state.apiConnected) {
    setSaleMessage(
      `No hay conexión con ${getApiBaseUrl()}. Corrige la URL en Settings o inicia ese servidor.`,
      "is-error"
    );
    return;
  }
  if (!getSaleProductsSource().length) {
    setSaleMessage("No hay productos disponibles para registrar ventas.", "is-error");
    return;
  }
  if (refs.saleDialog.open) return;
  resetSaleForm();
  refs.saleDialog.showModal();
  refs.saleProductLookup.focus();
}

function openEditSaleDialog(saleIdInput) {
  const saleId = Number.parseInt(String(saleIdInput ?? ""), 10);
  if (!saleId) return;
  if (!state.apiConnected) {
    setSaleMessage("No hay conexión con el servidor.", "is-error");
    return;
  }
  const sale = state.sales.find((item) => Number(item.ID_VENTA) === saleId);
  if (!sale) {
    setSaleMessage(`No se encontró la venta #${saleId}.`, "is-error");
    return;
  }
  const products = getSaleProductsSource();
  if (!products.length) {
    setSaleMessage("No hay productos disponibles para editar la venta.", "is-error");
    return;
  }

  resetSaleForm();
  state.saleEditingId = saleId;
  setSaleDialogMode("edit");
  refs.saleFecha.value = normalizeDateValue(sale.FECHA) || todayInputValue();
  refs.saleCantidad.value = String(formatQty(sale.CANTIDAD));
  refs.saleTipoPago.value = normalizePaymentType(sale.TIPO_PAGO);
  refs.saleNota.value = "";
  renderSaleProductOptions();

  const saleProductId = Number.parseInt(String(sale["N°"] ?? ""), 10);
  const saleProduct = products.find((item) => Number(item["N°"]) === saleProductId);
  if (saleProduct) {
    refs.saleProductLookup.value = formatSaleLookupLabel(saleProduct);
    refs.saleProductId.value = String(saleProduct["N°"]);
  } else {
    setSaleMessage(
      "El producto original de esta venta ya no existe. Selecciona otro para corregirla.",
      "is-error"
    );
  }

  if (!refs.saleDialog.open) {
    refs.saleDialog.showModal();
  }
  setSaleMessage(`Editando venta #${saleId}.`);
  updateSaleTotalsPreview();
}

function closeSaleDialog() {
  if (!refs.saleDialog.open) return;
  refs.saleDialog.close();
  hideSaleConfirmBox({ clear: true });
}

function openCreateDialog() {
  clearCrudForm();
  refs.productDialogTitle.textContent = "Crear producto";
  openDialog();
}

function openEditDialog(id) {
  const item = state.products.find((row) => Number(row["N°"]) === Number(id));
  if (!item) return;

  state.editingId = Number(item["N°"]);
  refs.crudEditId.value = String(item["N°"]);
  refs.crudId.value = String(item["N°"]);
  refs.crudId.disabled = true;
  refs.crudNombre.value = String(item.NOMBRE || "");
  refs.crudPrecio.value = String(item.PRECIO || 0);
  refs.crudPedido.value = String(item.PEDIDO || 0);
  refs.crudStockActual.value = String(item.STOCK_ACTUAL || 0);
  refs.crudStockActual.disabled = true;
  refs.crudStockAjuste.value = "0";
  refs.crudStockAjuste.disabled = false;
  refs.crudNota.value = "";
  refs.crudSaveBtn.textContent = `Actualizar N° ${item["N°"]}`;
  refs.productDialogTitle.textContent = `Editar producto N° ${item["N°"]}`;
  setCrudMessage(`Editando producto N° ${item["N°"]}`, "is-success");
  openDialog();
}

function applyProductFilterAndPagination() {
  window.ProductsPage.applyProductFilterAndPagination(state);
}

function applySalesFilter() {
  window.SalesPage.applySalesFilter(state);
}

function applyKardexFilter() {
  window.KardexPage.applyKardexFilter(state);
}

async function loadProducts() {
  const query = buildCollectionQuery({
    q: state.crudSearch,
    page: state.pagination.page,
    pageSize: state.pagination.pageSize,
    sortBy: state.productSort.key,
    sortDir: state.productSort.dir
  });
  const response = await apiRequest(`/api/productos?${query}`);
  const items = Array.isArray(response?.items) ? response.items : [];
  state.products = items;
  state.filteredProducts = items;
  state.pagedProducts = items;
  state.pagination = response?.pagination || { ...DEFAULT_PAGINATION };
}

async function loadSales() {
  const query = buildCollectionQuery({
    q: state.salesSearch,
    from: state.salesDateFrom,
    to: state.salesDateTo,
    page: state.salesPagination.page,
    pageSize: state.salesPagination.pageSize,
    sortBy: state.salesSort.key,
    sortDir: state.salesSort.dir
  });
  const response = await apiRequest(`/api/ventas?${query}`);
  const items = Array.isArray(response?.items) ? response.items : [];
  state.sales = items;
  state.filteredSales = items;
  state.pagedSales = items;
  state.salesPagination = response?.pagination || { ...DEFAULT_SALES_PAGINATION };
}

async function loadKardex() {
  const query = buildCollectionQuery({
    q: state.kardexSearch,
    tipo: state.kardexType,
    page: 1,
    pageSize: 5000,
    sortBy: state.kardexSort.key,
    sortDir: state.kardexSort.dir
  });
  const response = await apiRequest(`/api/kardex?${query}`);
  const items = Array.isArray(response?.items) ? response.items : [];
  state.kardex = items;
  state.filteredKardex = items;
}

async function loadProductCatalog() {
  const items = await apiRequest("/api/productos/all");
  state.productCatalog = Array.isArray(items)
    ? [...items].sort((a, b) => Number(a["N°"] || 0) - Number(b["N°"] || 0))
    : [];
}

async function loadSalesAllForKpi() {
  const items = await apiRequest("/api/ventas/all");
  state.salesAll = Array.isArray(items) ? items : [];
}

async function loadKardexAllForKpi() {
  const items = await apiRequest("/api/kardex/all");
  state.kardexAll = Array.isArray(items) ? items : [];
}

function renderApiSettings() {
  window.SettingsPage.renderApiSettings(refs, getApiBaseUrl);
}

function setActiveView(view) {
  const allowedViews = ["sales", "products", "kardex", "settings"];
  const nextView = allowedViews.includes(view) ? view : "sales";
  state.activeView = nextView;

  refs.viewPanels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.viewPanel === nextView);
  });

  refs.viewNavButtons.forEach((button) => {
    const isActive = button.dataset.view === nextView;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  if (isMobileViewport()) {
    setMobileNavExpanded(false);
  } else {
    setMobileNavExpanded(true);
  }
}

function isMobileViewport() {
  return window.matchMedia("(max-width: 700px)").matches;
}

function getActiveViewLabel() {
  const activeButton = refs.viewNavButtons.find(
    (button) => button.dataset.view === state.activeView
  );
  return activeButton?.textContent?.trim() || "Ventas diarias";
}

function setMobileNavExpanded(expanded) {
  const shouldOpen = isMobileViewport() ? Boolean(expanded) : true;
  state.mobileNavExpanded = shouldOpen;
  refs.mainViewNav.classList.toggle("is-open", shouldOpen);

  const activeLabel = getActiveViewLabel();
  refs.mobileNavToggle.setAttribute("aria-expanded", String(shouldOpen));
  refs.mobileNavToggle.textContent = shouldOpen
    ? `Ocultar secciones · ${activeLabel}`
    : `Secciones · ${activeLabel}`;
}

function setMobileKpiExpanded(expanded, { persist = true } = {}) {
  const next = Boolean(expanded);
  state.mobileKpiExpanded = next;
  if (persist) {
    saveMobileKpiExpandedPreference(next);
  }

  const collapsed = isMobileViewport() && !next;
  refs.kpiCollapsible.classList.toggle("is-collapsed", collapsed);
  refs.kpiToggleBtn.setAttribute("aria-expanded", String(next));
  refs.kpiToggleBtn.textContent = next ? "Ocultar resumen rápido" : "Ver resumen rápido";
}

function renderKpis() {
  const salesSource = state.salesAll.length ? state.salesAll : state.sales;
  const kardexSource = state.kardexAll.length ? state.kardexAll : state.kardex;
  const salesInRange = salesSource.filter((item) =>
    matchDateRange(item.FECHA, state.salesDateFrom, state.salesDateTo)
  );
  const kardexInRange = kardexSource.filter((item) =>
    matchDateRange(item.FECHA_HORA, state.salesDateFrom, state.salesDateTo)
  );
  const salesRangeAmount = salesInRange.reduce((acc, item) => {
    return acc + Number(item.TOTAL || 0);
  }, 0);

  refs.kpiProducts.textContent = String(state.productCatalog.length || state.products.length);
  refs.kpiSalesRangeAmount.textContent = money(salesRangeAmount);
  refs.kpiSales.textContent = String(salesInRange.length);
  refs.kpiKardex.textContent = String(kardexInRange.length);
}

function formatSaleLookupLabel(product) {
  return `${product["N°"]} - ${product.NOMBRE}`;
}

function resolveSaleProductByLookup(rawLookup) {
  const products = getSaleProductsSource();
  const value = String(rawLookup ?? "").trim();
  if (!value) return null;

  const idMatch = value.match(/^\s*(\d+)/);
  if (idMatch) {
    const byId = Number.parseInt(idMatch[1], 10);
    if (byId) {
      const productById = products.find((item) => Number(item["N°"]) === byId);
      if (productById) return productById;
    }
  }

  const normalized = normalizeText(value);
  return (
    products.find((item) => normalizeText(formatSaleLookupLabel(item)) === normalized) ||
    products.find((item) => normalizeText(item.NOMBRE) === normalized) ||
    null
  );
}

function syncSaleProductIdFromLookup() {
  const product = resolveSaleProductByLookup(refs.saleProductLookup.value);
  refs.saleProductId.value = product ? String(product["N°"]) : "";
  updateSaleTotalsPreview();
  return product;
}

function renderSaleProductOptions() {
  const products = getSaleProductsSource();
  const previous = refs.saleProductId.value;

  if (!products.length) {
    refs.saleProductList.innerHTML = "";
    refs.saleProductLookup.value = "";
    refs.saleProductId.value = "";
    refs.saleProductLookup.disabled = true;
    return;
  }

  refs.saleProductList.innerHTML = products
    .map((item) => {
      const value = formatSaleLookupLabel(item);
      const label = `Stock: ${formatQty(item.STOCK_ACTUAL)}`;
      return `<option value="${esc(value)}" label="${esc(label)}"></option>`;
    })
    .join("");

  refs.saleProductLookup.disabled = false;

  if (previous) {
    const selected = products.find((item) => String(item["N°"]) === String(previous));
    if (selected) {
      refs.saleProductLookup.value = formatSaleLookupLabel(selected);
      refs.saleProductId.value = String(selected["N°"]);
      return;
    }
  }

  const byLookup = syncSaleProductIdFromLookup();
  if (byLookup) return;

  if (!state.saleEditingId && products.length) {
    const first = products[0];
    refs.saleProductLookup.value = formatSaleLookupLabel(first);
    refs.saleProductId.value = String(first["N°"]);
  } else {
    refs.saleProductId.value = "";
  }
  updateSaleTotalsPreview();
}

function renderCrudTable() {
  window.ProductsPage.renderCrudTable(refs, state);
}

function renderSalesTable() {
  window.SalesPage.renderSalesTable(refs, state);
}

function renderKardexTable() {
  window.KardexPage.renderKardexTable(refs, state);
}

function renderPager() {
  window.ProductsPage.renderPager(refs, state);
}

function renderSalesPager() {
  window.SalesPage.renderSalesPager(refs, state);
}

function renderAll() {
  renderApiSettings();
  renderDbStatus();
  renderAccessHost();
  renderSortButtons();
  renderKpis();
  renderSaleProductOptions();
  renderCrudTable();
  renderSalesTable();
  renderKardexTable();
  renderPager();
  renderSalesPager();
}

async function refreshAll({ keepMessages = false } = {}) {
  try {
    await Promise.all([
      loadProducts(),
      loadSales(),
      loadKardex(),
      loadProductCatalog(),
      loadSalesAllForKpi(),
      loadKardexAllForKpi()
    ]);
    state.apiConnected = true;
    renderAll();
    if (!keepMessages) {
      setCrudMessage("");
      setSaleMessage("");
      setSettingsMessage("");
      setAppMessage("");
    }
  } finally {
    await Promise.allSettled([refreshDbStatus(), refreshAccessHost()]);
  }
}

async function refreshLocalProducts() {
  try {
    await loadProducts();
    state.apiConnected = true;
    renderCrudTable();
    renderPager();
    renderSortButtons();
  } catch (error) {
    state.apiConnected = false;
    setCrudMessage(error.message, "is-error");
  }
}

async function refreshLocalSales() {
  try {
    await loadSales();
    state.apiConnected = true;
    renderSalesTable();
    renderSalesPager();
    renderKpis();
    renderSortButtons();
  } catch (error) {
    state.apiConnected = false;
    setSaleMessage(error.message, "is-error");
  }
}

async function refreshLocalKardex() {
  try {
    await loadKardex();
    state.apiConnected = true;
    renderKardexTable();
    renderSortButtons();
    renderKpis();
  } catch (error) {
    state.apiConnected = false;
    setAppMessage(error.message, "is-error");
  }
}

async function handleCrudSubmit(event) {
  event.preventDefault();

  try {
    const payload = {
      NOMBRE: refs.crudNombre.value.trim(),
      PRECIO: parseNumberInput(refs.crudPrecio.value, { min: 0, label: "PRECIO" }),
      PEDIDO: Number.parseInt(refs.crudPedido.value || "0", 10)
    };

    if (!payload.NOMBRE) {
      throw new Error("El campo NOMBRE es obligatorio.");
    }

    if (!state.editingId && refs.crudId.value.trim()) {
      payload["N°"] = Number.parseInt(refs.crudId.value.trim(), 10);
    }

    if (state.editingId) {
      payload.stockAjuste = parseNumberInput(refs.crudStockAjuste.value || "0", {
        label: "AJUSTE STOCK"
      });
      if (refs.crudNota.value.trim()) {
        payload.nota = refs.crudNota.value.trim();
      }

      await apiRequest(`/api/productos/${state.editingId}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
      setCrudMessage(`Producto N° ${state.editingId} actualizado.`, "is-success");
    } else {
      payload.STOCK_ACTUAL = parseNumberInput(refs.crudStockActual.value || "0", {
        min: 0,
        label: "STOCK ACTUAL"
      });

      const created = await apiRequest("/api/productos", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      setCrudMessage(`Producto N° ${created["N°"]} creado.`, "is-success");
    }

    closeDialog();
    clearCrudForm();
    await refreshAll({ keepMessages: true });
  } catch (error) {
    state.apiConnected = false;
    setCrudMessage(error.message, "is-error");
  }
}

async function handleDelete(id) {
  const item = state.products.find((row) => Number(row["N°"]) === Number(id));
  const ok = window.confirm(`Eliminar producto N° ${id}${item ? ` - ${item.NOMBRE}` : ""}?`);
  if (!ok) return;

  try {
    await apiRequest(`/api/productos/${id}`, { method: "DELETE" });
    if (state.editingId === Number(id)) {
      closeDialog();
      clearCrudForm();
    }
    setCrudMessage(`Producto N° ${id} eliminado.`, "is-success");
    await refreshAll({ keepMessages: true });
  } catch (error) {
    state.apiConnected = false;
    setCrudMessage(error.message, "is-error");
  }
}

async function handleStockIngress(id) {
  if (!state.apiConnected) {
    setCrudMessage(
      `No hay conexión con ${getApiBaseUrl()}. Corrige la URL en Settings o inicia ese servidor.`,
      "is-error"
    );
    return;
  }

  const item = state.products.find((row) => Number(row["N°"]) === Number(id));
  if (!item) {
    setCrudMessage(`No se encontró el producto N° ${id}.`, "is-error");
    return;
  }
  openIngressDialogForProduct(item);
}

async function handleIngressSubmit(event) {
  event.preventDefault();

  const productId =
    state.ingressProductId || Number.parseInt(String(refs.ingressProductId.value || ""), 10);
  if (!productId) {
    setIngressMessage("No se encontró el producto para el ingreso.", "is-error");
    return;
  }

  try {
    const quantity = parseNumberInput(refs.ingressCantidad.value, {
      min: 1,
      label: "cantidad de ingreso"
    });
    const payload = {
      cantidad: quantity,
      nota: refs.ingressNota.value.trim(),
      referencia: "INGRESO_MANUAL_UI"
    };

    refs.ingressSubmitBtn.disabled = true;
    const result = await apiRequest(`/api/productos/${productId}/ingreso`, {
      method: "POST",
      body: JSON.stringify(payload)
    });

    const stockAfter = Number(result?.product?.STOCK_ACTUAL ?? 0);
    closeIngressDialog();
    resetIngressForm();
    setCrudMessage(
      `Ingreso aplicado a N° ${productId}: +${formatQty(quantity)}. Stock actual: ${formatQty(stockAfter)}.`,
      "is-success"
    );
    await refreshAll({ keepMessages: true });
  } catch (error) {
    const rawMessage = String(error?.message || "No se pudo registrar el ingreso.");
    if (/No se pudo conectar al servidor configurado/i.test(rawMessage)) {
      state.apiConnected = false;
    }
    refs.ingressSubmitBtn.disabled = false;
    setIngressMessage(rawMessage, "is-error");
  }
}

async function handleSaleSubmit(event) {
  event.preventDefault();
  if (!state.apiConnected) {
    setSaleMessage("No hay conexión con el servidor.", "is-error");
    return;
  }

  try {
    syncSaleProductIdFromLookup();
    const tipoPago = normalizePaymentType(refs.saleTipoPago.value);
    const payload = {
      productId: Number.parseInt(refs.saleProductId.value, 10),
      cantidad: parseNumberInput(refs.saleCantidad.value, { min: 0.01, label: "cantidad" }),
      fecha: refs.saleFecha.value || todayInputValue(),
      tipoPago,
      nota: refs.saleNota.value.trim()
    };

    if (!payload.productId) {
      throw new Error("Selecciona un producto para la venta.");
    }

    const selectedProduct = getSaleProductsSource().find(
      (item) => Number(item["N°"]) === payload.productId
    );
    const label = selectedProduct
      ? `${selectedProduct["N°"]} - ${selectedProduct.NOMBRE}`
      : `N° ${payload.productId}`;
    const computedTotal = selectedProduct
      ? money(round2(Number(selectedProduct.PRECIO || 0) * payload.cantidad))
      : refs.saleTotalPreview.value;
    const isEditing = Number.isInteger(state.saleEditingId) && state.saleEditingId > 0;
    if (isEditing) {
      setSaleDialogMode("edit");
    } else {
      setSaleDialogMode("create");
    }
    showSaleConfirmBox(
      {
        product: label,
        cantidad: formatQty(payload.cantidad),
        fecha: payload.fecha,
        tipoPago,
        total: computedTotal
      },
      payload,
      {
        isEditing,
        saleId: state.saleEditingId
      }
    );
    setSaleMessage(
      isEditing
        ? "Revisa el resumen y confirma para actualizar la venta."
        : "Revisa el resumen y confirma para guardar la venta."
    );
  } catch (error) {
    const rawMessage = String(error?.message || "");
    if (/No se pudo conectar al servidor configurado/i.test(rawMessage)) {
      state.apiConnected = false;
    }
    setSaleMessage(rawMessage || "No se pudo preparar la venta.", "is-error");
  }
}

function handleSaleConfirmBack() {
  hideSaleConfirmBox({ clear: true });
  setSaleMessage("Ajusta los campos y vuelve a confirmar.");
}

async function handleSaleConfirmSubmit() {
  const pending = state.salePendingConfirm;
  if (!pending?.payload) return;

  try {
    let result;
    if (pending.isEditing && pending.saleId) {
      result = await apiRequest(`/api/ventas/${pending.saleId}`, {
        method: "PUT",
        body: JSON.stringify(pending.payload)
      });
      setSaleMessage(
        `Venta #${result.sale.ID_VENTA} actualizada: N° ${result.sale["N°"]}, cantidad ${formatQty(result.sale.CANTIDAD)}, pago ${result.sale.TIPO_PAGO || "Efectivo"}.`,
        "is-success"
      );
    } else {
      result = await apiRequest("/api/ventas", {
        method: "POST",
        body: JSON.stringify(pending.payload)
      });
      setSaleMessage(
        `Venta registrada: N° ${result.sale["N°"]}, cantidad ${formatQty(result.sale.CANTIDAD)}, pago ${result.sale.TIPO_PAGO || "Efectivo"}.`,
        "is-success"
      );
    }

    resetSaleForm();
    closeSaleDialog();

    await refreshAll({ keepMessages: true });
  } catch (error) {
    const rawMessage = String(error?.message || "");
    if (/No se pudo conectar al servidor configurado/i.test(rawMessage)) {
      state.apiConnected = false;
    }
    const staleServerHint =
      pending.isEditing && /No encontrado\.?|Error 404/i.test(rawMessage)
        ? `${rawMessage} Si acabas de actualizar código, reinicia el servidor para habilitar edición de ventas.`
        : rawMessage;
    setSaleMessage(staleServerHint || "No se pudo guardar la venta.", "is-error");
  }
}

async function tryConnectWithCurrentApiBase() {
  await refreshAll({ keepMessages: true });
}

async function handleApiBaseSave(event) {
  event.preventDefault();

  try {
    const normalized = normalizeApiBaseUrl(refs.apiBaseUrlInput.value);
    if (!normalized) {
      throw new Error("Ingresa una URL de servidor.");
    }

    state.apiBaseUrl = normalized;
    saveApiBaseUrlPreference(normalized);
    renderApiSettings();
    setSettingsMessage(`Servidor guardado: ${normalized}`, "is-success");
    setAppMessage(`Servidor API activo: ${normalized}`, "is-success");

    await tryConnectWithCurrentApiBase();
    setSettingsMessage(`Conexión OK con ${normalized}`, "is-success", { autoClearMs: 2500 });
  } catch (error) {
    state.apiConnected = false;
    setSettingsMessage(error.message, "is-error");
    setAppMessage(error.message, "is-error");
  }
}

async function handleApiBaseTest() {
  try {
    const draft = normalizeApiBaseUrl(refs.apiBaseUrlInput.value);
    if (!draft) {
      throw new Error("Ingresa una URL para probar.");
    }

    const testUrl = buildApiUrlWithBase("/api/db/status", draft);
    let response;
    try {
      response = await fetch(testUrl);
    } catch {
      throw new Error(`No se pudo conectar con ${draft}.`);
    }

    if (!response.ok) {
      throw new Error(`Servidor respondió ${response.status} al probar ${draft}.`);
    }

    const raw = await response.text();
    const data = raw ? JSON.parse(raw) : {};

    if (typeof data?.connected === "boolean") {
      if (!data.connected) {
        throw new Error(`DB sin conexión: ${data.error || "sin detalle"}`);
      }
      setSettingsMessage(`Conexión OK con ${draft} (DB conectada).`, "is-success", { autoClearMs: 3000 });
      return;
    }

    if (typeof data?.checked === "boolean" && typeof data?.connected === "boolean") {
      if (!data.connected) {
        throw new Error(`DB sin conexión: ${data.error || data.message || "sin detalle"}`);
      }
      setSettingsMessage(`Conexión OK con ${draft} (DB conectada).`, "is-success", { autoClearMs: 3000 });
      return;
    }

    setSettingsMessage(`Conexión HTTP OK con ${draft}.`, "is-success", { autoClearMs: 3000 });
  } catch (error) {
    setSettingsMessage(error.message, "is-error");
  }
}

async function handleCpanelDbStatusTest() {
  const previousText = refs.testCpanelDbBtn.textContent;
  refs.testCpanelDbBtn.disabled = true;
  refs.testCpanelDbBtn.textContent = "Probando...";

  try {
    const draft = normalizeApiBaseUrl(refs.apiBaseUrlInput.value);
    if (!draft) {
      throw new Error("Ingresa una URL para probar.");
    }

    const testUrl = buildApiUrlWithBase("/api/db/status", draft);
    setCpanelProbeResult({ state: "loading", url: testUrl });
    let response;
    try {
      response = await fetch(testUrl, { cache: "no-store" });
    } catch {
      throw new Error(`No se pudo conectar con ${draft}.`);
    }

    const rawBody = await response.text();
    const jsonBody = tryParseJsonText(rawBody);
    const payload = jsonBody ?? rawBody;

    if (!response.ok) {
      setCpanelProbeResult({
        state: "error",
        url: testUrl,
        httpStatus: response.status,
        payload,
        error: `Servidor respondió ${response.status} al consultar /api/db/status.`
      });
      throw new Error(`Servidor respondió ${response.status} al consultar /api/db/status.`);
    }

    if (!jsonBody || typeof jsonBody.connected !== "boolean") {
      setCpanelProbeResult({
        state: "error",
        url: testUrl,
        httpStatus: response.status,
        payload,
        error: "El endpoint /api/db/status no devolvió el campo booleano 'connected'."
      });
      throw new Error("El endpoint /api/db/status no devolvió el campo booleano 'connected'.");
    }

    if (jsonBody.connected) {
      setCpanelProbeResult({
        state: "ok",
        url: testUrl,
        httpStatus: response.status,
        payload: jsonBody
      });
      setSettingsMessage(`DB cPanel conectada en ${draft}.`, "is-success", { autoClearMs: 3000 });
    } else {
      setCpanelProbeResult({
        state: "error",
        url: testUrl,
        httpStatus: response.status,
        payload: jsonBody,
        error: `DB cPanel sin conexión: ${jsonBody.error || "sin detalle"}`
      });
      throw new Error(`DB cPanel sin conexión: ${jsonBody.error || "sin detalle"}`);
    }
  } catch (error) {
    const text = String(error?.message || "Error de prueba.");
    if (refs.cpanelProbeBadge?.classList.contains("is-loading")) {
      setCpanelProbeResult({
        state: "error",
        payload: null,
        error: text
      });
    }
    setSettingsMessage(error.message, "is-error");
  } finally {
    refs.testCpanelDbBtn.disabled = false;
    refs.testCpanelDbBtn.textContent = previousText;
  }
}

function extractFilenameFromContentDisposition(headerValue) {
  const header = String(headerValue || "");
  if (!header) return "";

  const utfMatch = header.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
  if (utfMatch?.[1]) {
    try {
      return decodeURIComponent(utfMatch[1]).trim();
    } catch {
      return utfMatch[1].trim();
    }
  }

  const basicMatch = header.match(/filename\s*=\s*\"?([^\";]+)\"?/i);
  return basicMatch?.[1] ? basicMatch[1].trim() : "";
}

async function handleExportSalesCsv() {
  if (!state.apiConnected) {
    setSaleMessage(
      `No hay conexión con ${getApiBaseUrl()}. Corrige la URL en Settings o inicia ese servidor.`,
      "is-error"
    );
    return;
  }

  let from = state.salesDateFrom || "";
  let to = state.salesDateTo || "";
  if (!from || !to) {
    const source = state.filteredSales.length ? state.filteredSales : state.sales;
    const dates = source
      .map((item) => normalizeDateValue(item.FECHA))
      .filter((value) => Boolean(value))
      .sort((a, b) => a.localeCompare(b));
    if (!from) from = dates[0] || todayInputValue();
    if (!to) to = dates[dates.length - 1] || from;
  }
  if (from && to && from > to) {
    setSaleMessage("Rango inválido: la fecha Desde no puede ser mayor que Hasta.", "is-error");
    return;
  }

  const params = new URLSearchParams();
  params.set("from", from);
  params.set("to", to);
  params.set("format", "excelxml");
  const search = String(state.salesSearch || "").trim();
  if (search) params.set("q", search);

  const defaultFileName = `ventas_diarias_resumen_${from}_a_${to}_color.xml`;
  const previousText = refs.exportSalesCsvBtn.textContent;
  refs.exportSalesCsvBtn.disabled = true;
  refs.exportSalesCsvBtn.textContent = "Exportando reporte...";

  try {
    const response = await fetch(buildApiUrl(`/api/ventas/export/csv?${params.toString()}`));
    if (!response.ok) {
      let message = `Error ${response.status}`;
      try {
        const raw = await response.text();
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            message = parsed?.error || raw;
          } catch {
            message = raw;
          }
        }
      } catch {
        // Ignora fallos de lectura.
      }
      throw new Error(message);
    }

    const blob = await response.blob();
    const disposition = response.headers.get("content-disposition");
    const fileName = extractFilenameFromContentDisposition(disposition) || defaultFileName;

    const objectUrl = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 600);

    setSaleMessage(`Reporte exportado (${from} a ${to}).`, "is-success");
  } catch (error) {
    const rawMessage = String(error?.message || "No se pudo exportar reporte.");
    if (/No se pudo conectar|Failed to fetch|NetworkError/i.test(rawMessage)) {
      state.apiConnected = false;
    }
    setSaleMessage(rawMessage, "is-error");
  } finally {
    refs.exportSalesCsvBtn.disabled = false;
    refs.exportSalesCsvBtn.textContent = previousText;
  }
}

function handleUseCurrentOrigin() {
  const origin = getRuntimeOrigin();
  if (!origin) {
    setSettingsMessage(
      "Esta pestaña no tiene origen http/https. Abre la app desde un servidor web.",
      "is-error"
    );
    return;
  }
  refs.apiBaseUrlInput.value = origin;
  setSettingsMessage(`URL cargada desde la pestaña: ${origin}`, "is-success", { autoClearMs: 2200 });
}

function bindEvents() {
  const onSearchProductsDebounced = debounce(() => {
    state.pagination.page = 1;
    refreshLocalProducts();
  });

  const onSearchSalesDebounced = debounce(() => {
    state.salesPagination.page = 1;
    refreshLocalSales();
  });

  const onLookupSaleProductDebounced = debounce(() => {
    syncSaleProductIdFromLookup();
  }, 120);

  const onSearchKardexDebounced = debounce(() => {
    refreshLocalKardex();
  });

  refs.reloadBtn.addEventListener("click", async () => {
    clearMigrationPolling();
    const today = todayInputValue();
    state.crudSearch = "";
    state.salesSearch = "";
    state.salesDateFrom = today;
    state.salesDateTo = today;
    state.kardexSearch = "";
    state.kardexType = "TODOS";
    state.productSort = { key: "N°", dir: "asc" };
    state.salesSort = { key: "FECHA", dir: "desc" };
    state.kardexSort = { key: "FECHA_HORA", dir: "desc" };
    state.pagination.page = 1;
    state.salesPagination.page = 1;
    refs.crudSearch.value = "";
    refs.salesSearch.value = "";
    refs.salesDateFrom.value = today;
    refs.salesDateTo.value = today;
    refs.kardexSearch.value = "";
    refs.kardexTypeFilter.value = "TODOS";
    refs.saleProductLookup.value = "";
    refs.saleProductId.value = "";
    closeDialog();
    closeSaleDialog();
    closeIngressDialog();
    resetIngressForm();
    clearCrudForm();
    setSettingsMessage("");
    refs.saleFecha.value = today;
    refs.saleTipoPago.value = "Efectivo";
    renderSortButtons();

    try {
      await refreshAll();
    } catch (error) {
      state.apiConnected = false;
      setAppMessage(`No se pudo recargar: ${error.message}`, "is-error");
    }
  });

  refs.openCreateBtn.addEventListener("click", openCreateDialog);
  refs.openSaleDialogBtn.addEventListener("click", openSaleDialog);
  refs.exportSalesCsvBtn.addEventListener("click", handleExportSalesCsv);
  refs.dialogCloseBtn.addEventListener("click", () => {
    closeDialog();
    clearCrudForm();
  });
  refs.saleDialogCloseBtn.addEventListener("click", () => {
    closeSaleDialog();
    resetSaleForm();
  });
  refs.saleCancelBtn.addEventListener("click", () => {
    closeSaleDialog();
    resetSaleForm();
  });
  refs.saleConfirmBackBtn.addEventListener("click", handleSaleConfirmBack);
  refs.saleConfirmSubmitBtn.addEventListener("click", handleSaleConfirmSubmit);
  refs.ingressDialogCloseBtn.addEventListener("click", () => {
    closeIngressDialog();
    resetIngressForm();
  });
  refs.ingressCancelBtn.addEventListener("click", () => {
    closeIngressDialog();
    resetIngressForm();
  });

  refs.productDialog.addEventListener("cancel", () => {
    clearCrudForm();
  });
  refs.saleDialog.addEventListener("cancel", () => {
    resetSaleForm();
  });
  refs.ingressDialog.addEventListener("cancel", () => {
    resetIngressForm();
  });
  refs.apiSettingsForm.addEventListener("submit", handleApiBaseSave);
  refs.testApiBaseBtn.addEventListener("click", handleApiBaseTest);
  refs.testCpanelDbBtn.addEventListener("click", handleCpanelDbStatusTest);
  refs.useCurrentOriginBtn.addEventListener("click", handleUseCurrentOrigin);
  refs.dbStatusRefreshBtn.addEventListener("click", async () => {
    refs.dbStatusRefreshBtn.disabled = true;
    try {
      const ok = await refreshDbStatus();
      if (ok) {
        setSettingsMessage("Estado de DB actualizado.", "is-success", { autoClearMs: 1800 });
      } else {
        setSettingsMessage("No se pudo verificar la DB con la URL API actual.", "is-error");
      }
    } finally {
      refs.dbStatusRefreshBtn.disabled = false;
    }
  });
  refs.refreshAccessHostBtn.addEventListener("click", async () => {
    refs.refreshAccessHostBtn.disabled = true;
    try {
      await refreshDbStatus();
      const ok = await refreshAccessHost();
      const effectiveHost = String(buildAccessHostRenderState()?.host || "").trim();
      if (ok && effectiveHost) {
        setSettingsMessage("Access Host actualizado.", "is-success", { autoClearMs: 2200 });
      } else if (ok) {
        setSettingsMessage("No se detectó Access Host con la API actual.", "is-error");
      } else {
        setSettingsMessage("No se pudo consultar Access Host con la URL API actual.", "is-error");
      }
    } finally {
      refs.refreshAccessHostBtn.disabled = false;
    }
  });
  refs.copyAccessHostBtn.addEventListener("click", async () => {
    const host = String(refs.accessHostValue.value || "").trim();
    if (!host || host === "-") {
      setSettingsMessage("Primero detecta un Access Host valido.", "is-error", { autoClearMs: 2600 });
      return;
    }
    try {
      await copyTextToClipboard(host);
      setSettingsMessage(`Access Host copiado: ${host}`, "is-success", { autoClearMs: 2400 });
    } catch (error) {
      setSettingsMessage(`No se pudo copiar: ${error.message}`, "is-error");
    }
  });

  refs.crudSearch.addEventListener("input", (event) => {
    state.crudSearch = event.target.value;
    onSearchProductsDebounced();
  });

  refs.salesSearch.addEventListener("input", (event) => {
    state.salesSearch = event.target.value;
    onSearchSalesDebounced();
  });

  refs.saleProductLookup.addEventListener("input", () => {
    onLookupSaleProductDebounced();
  });

  refs.saleProductLookup.addEventListener("change", () => {
    const selected = syncSaleProductIdFromLookup();
    if (selected) {
      refs.saleProductLookup.value = formatSaleLookupLabel(selected);
    }
  });

  refs.saleCantidad.addEventListener("input", () => {
    updateSaleTotalsPreview();
  });

  refs.salesDateFrom.addEventListener("change", (event) => {
    state.salesDateFrom = normalizeDateValue(event.target.value);
    if (state.salesDateTo && state.salesDateFrom && state.salesDateFrom > state.salesDateTo) {
      state.salesDateTo = state.salesDateFrom;
      refs.salesDateTo.value = state.salesDateTo;
    }
    state.salesPagination.page = 1;
    refreshLocalSales();
  });

  refs.salesDateTo.addEventListener("change", (event) => {
    state.salesDateTo = normalizeDateValue(event.target.value);
    if (state.salesDateFrom && state.salesDateTo && state.salesDateTo < state.salesDateFrom) {
      state.salesDateFrom = state.salesDateTo;
      refs.salesDateFrom.value = state.salesDateFrom;
    }
    state.salesPagination.page = 1;
    refreshLocalSales();
  });

  refs.salesDateTodayBtn.addEventListener("click", () => {
    const today = todayInputValue();
    state.salesDateFrom = today;
    state.salesDateTo = today;
    refs.salesDateFrom.value = today;
    refs.salesDateTo.value = today;
    state.salesPagination.page = 1;
    refreshLocalSales();
  });

  refs.mobileNavToggle.addEventListener("click", () => {
    setMobileNavExpanded(!state.mobileNavExpanded);
  });

  refs.kpiToggleBtn.addEventListener("click", () => {
    setMobileKpiExpanded(!state.mobileKpiExpanded);
  });

  refs.viewNavButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setActiveView(button.dataset.view || "sales");
    });
  });

  refs.kardexSearch.addEventListener("input", (event) => {
    state.kardexSearch = event.target.value;
    onSearchKardexDebounced();
  });

  refs.kardexTypeFilter.addEventListener("change", (event) => {
    state.kardexType = event.target.value;
    refreshLocalKardex();
  });

  refs.sortButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const tableName = String(button.dataset.sortTable || "");
      const key = String(button.dataset.sortKey || "");
      if (!tableName || !key) return;

      updateSortState(tableName, key);
      renderSortButtons();

      if (tableName === "products") {
        state.pagination.page = 1;
        refreshLocalProducts();
        return;
      }
      if (tableName === "sales") {
        state.salesPagination.page = 1;
        refreshLocalSales();
        return;
      }
      if (tableName === "kardex") {
        refreshLocalKardex();
      }
    });
  });

  refs.crudPrevBtn.addEventListener("click", () => {
    if (!state.pagination.hasPrev) return;
    state.pagination.page -= 1;
    refreshLocalProducts();
  });

  refs.crudNextBtn.addEventListener("click", () => {
    if (!state.pagination.hasNext) return;
    state.pagination.page += 1;
    refreshLocalProducts();
  });

  refs.crudPageSize.addEventListener("change", (event) => {
    state.pagination.pageSize = Number.parseInt(event.target.value, 10) || 10;
    state.pagination.page = 1;
    refreshLocalProducts();
  });

  refs.salesPrevBtn.addEventListener("click", () => {
    if (!state.salesPagination.hasPrev) return;
    state.salesPagination.page -= 1;
    refreshLocalSales();
  });

  refs.salesNextBtn.addEventListener("click", () => {
    if (!state.salesPagination.hasNext) return;
    state.salesPagination.page += 1;
    refreshLocalSales();
  });

  refs.salesPageSize.addEventListener("change", (event) => {
    state.salesPagination.pageSize = Number.parseInt(event.target.value, 10) || 20;
    state.salesPagination.page = 1;
    refreshLocalSales();
  });

  window.addEventListener(
    "resize",
    debounce(() => {
      if (isMobileViewport()) {
        setMobileNavExpanded(false);
      } else {
        setMobileNavExpanded(true);
      }
      setMobileKpiExpanded(state.mobileKpiExpanded, { persist: false });
    }, 120)
  );
  window.addEventListener("beforeunload", clearMigrationPolling);

  refs.productForm.addEventListener("submit", handleCrudSubmit);
  refs.ingressForm.addEventListener("submit", handleIngressSubmit);
  refs.crudCancelBtn.addEventListener("click", () => {
    closeDialog();
    clearCrudForm();
  });

  refs.saleForm.addEventListener("submit", handleSaleSubmit);

  refs.salesBody.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action='edit-sale']");
    if (!button) return;
    const saleId = Number.parseInt(button.dataset.saleId, 10);
    if (!saleId) return;
    openEditSaleDialog(saleId);
  });

  refs.crudBody.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const id = Number.parseInt(button.dataset.id, 10);
    if (!id) return;
    if (button.dataset.action === "ingreso") {
      handleStockIngress(id);
      return;
    }
    if (button.dataset.action === "edit") {
      openEditDialog(id);
      return;
    }
    if (button.dataset.action === "delete") {
      handleDelete(id);
    }
  });
}

async function init() {
  state.apiBaseUrl = loadApiBaseUrlPreference();
  state.mobileKpiExpanded = loadMobileKpiExpandedPreference();
  bindEvents();
  resetIngressForm();
  const today = todayInputValue();
  refs.saleFecha.value = today;
  refs.saleTipoPago.value = "Efectivo";
  state.salesDateFrom = today;
  state.salesDateTo = today;
  refs.salesDateFrom.value = today;
  refs.salesDateTo.value = today;
  setActiveView("sales");
  setMobileKpiExpanded(state.mobileKpiExpanded, { persist: false });
  renderApiSettings();
  renderAccessHost();
  setCpanelProbeResult();
  renderSortButtons();

  if (window.location.protocol === "file:") {
    state.apiConnected = false;
    setAppMessage(
      `Modo archivo detectado (file://). Abre la app desde ${getApiBaseUrl()} para evitar errores de conexión.`,
      "is-error"
    );
    return;
  }

  try {
    await refreshAll();
  } catch (error) {
    state.apiConnected = false;
    setAppMessage(`No se pudo conectar con la API: ${error.message}`, "is-error");
  }
}

init();
