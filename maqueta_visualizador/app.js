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
const FALLBACK_API_BASE_URL = "https://licoreria.escon.pe/";
const PAYMENT_TYPES = ["A Ya Per", "Efectivo", "Pedido Ya", "Rappi", "EasyPay"];
const APP_VERSION = "1.0.2";
const {
  esc,
  money,
  formatQty,
  formatDateTime,
  normalizeText,
  normalizeNumericText,
  normalizeDateValue,
  matchDateRange,
  paginate
} = window.AppCustomFunctions;

window.APP_VERSION = APP_VERSION;

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
  salesSort: { key: "FECHA_OPERATIVA", dir: "desc" },
  kardexSort: { key: "FECHA_HORA", dir: "desc" },
  editingId: null,
  apiConnected: false,
  settingsMessageTimeoutId: null,
  dbStatus: null,
  accessHost: null,
  salePendingConfirm: null,
  saleEditingId: null,
  saleLookupResults: [],
  saleLookupOpen: false,
  saleLookupHighlight: -1,
  ingressProductId: null,
  mobileNavExpanded: false,
  mobileKpiExpanded: false,
  migrationPollTimeoutId: null,
  confirmDialogResolver: null
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
  appVersionLabel: document.getElementById("appVersionLabel"),
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
  confirmDialog: document.getElementById("confirmDialog"),
  confirmDialogTitle: document.getElementById("confirmDialogTitle"),
  confirmDialogMessage: document.getElementById("confirmDialogMessage"),
  confirmDialogCloseBtn: document.getElementById("confirmDialogCloseBtn"),
  confirmDialogCancelBtn: document.getElementById("confirmDialogCancelBtn"),
  confirmDialogConfirmBtn: document.getElementById("confirmDialogConfirmBtn"),
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
  crudEstado: document.getElementById("crudEstado"),
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
  saleProductClearBtn: document.getElementById("saleProductClearBtn"),
  saleProductDropdown: document.getElementById("saleProductDropdown"),
  saleProductId: document.getElementById("saleProductId"),
  saleQtyDownBtn: document.getElementById("saleQtyDownBtn"),
  saleCantidad: document.getElementById("saleCantidad"),
  saleQtyUpBtn: document.getElementById("saleQtyUpBtn"),
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
  kardexDeleteAllBtn: document.getElementById("kardexDeleteAllBtn"),
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

let productsController = null;
let salesController = null;
let kardexController = null;
let settingsController = null;

function initControllers() {
  if (!productsController) {
    productsController = window.ProductsPage.createController({
      state,
      refs,
      apiRequest,
      parseNumberInput,
      formatQty,
      getApiBaseUrl,
      setCrudMessage,
      setIngressMessage,
      openConfirmDialog,
      refreshAll,
      renderSortButtons,
      buildCollectionQuery,
      defaultPagination: () => ({ ...DEFAULT_PAGINATION })
    });
  }

  if (!salesController) {
    salesController = window.SalesPage.createController({
      state,
      refs,
      apiRequest,
      buildCollectionQuery,
      buildApiUrl,
      normalizePaymentType,
      normalizeSaleQuantityValue,
      todayInputValue,
      syncSaleProductIdFromLookup,
      getSaleProductsSource,
      setSaleDialogMode,
      showSaleConfirmBox,
      hideSaleConfirmBox,
      setSaleMessage,
      openConfirmDialog,
      setSaleQuantityValue,
      renderSaleProductOptions,
      updateSaleTotalsPreview,
      closeSaleLookupDropdown,
      formatSaleLookupLabel,
      normalizeDateValue,
      round2,
      money,
      formatQty,
      refreshAll,
      renderSortButtons,
      renderKpis,
      defaultSalesPagination: () => ({ ...DEFAULT_SALES_PAGINATION })
    });
  }

  if (!kardexController) {
    kardexController = window.KardexPage.createController({
      state,
      refs,
      apiRequest,
      buildCollectionQuery,
      setAppMessage,
      openConfirmDialog,
      refreshAll,
      renderSortButtons,
      renderKpis
    });
  }

  if (!settingsController) {
    settingsController = window.SettingsPage.createController({
      state,
      refs,
      apiRequest,
      normalizeApiBaseUrl,
      buildApiUrlWithBase,
      getApiBaseUrl,
      saveApiBaseUrlPreference,
      renderApiSettingsBound: renderApiSettings,
      renderDbStatusBound: renderDbStatus,
      renderAccessHostBound: renderAccessHost,
      setSettingsMessage,
      setAppMessage,
      setCpanelProbeResult,
      tryParseJsonText,
      extractMysqlDeniedHost,
      detectBrowserPublicIpv4,
      copyTextToClipboard,
      getRuntimeOrigin
    });
  }
}

function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
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
  const source = state.productCatalog.length ? state.productCatalog : state.products;
  return source.filter((item) => {
    const status = String(item?.ESTADO || "ACTIVO").trim().toUpperCase();
    return status === "ACTIVO";
  });
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
  if (!settingsController) {
    return state.accessHost && typeof state.accessHost === "object" ? { ...state.accessHost } : {};
  }
  return settingsController.buildAccessHostRenderState();
}

function renderAccessHost() {
  window.SettingsPage.renderAccessHost(refs, buildAccessHostRenderState(), formatDateTime);
}

async function refreshDbStatus() {
  return settingsController.refreshDbStatus();
}

async function refreshAccessHost() {
  return settingsController.refreshAccessHost();
}

function clearCrudForm() {
  productsController.clearCrudForm();
}

function openDialog() {
  productsController.openDialog();
}

function closeDialog() {
  productsController.closeDialog();
}

function resetIngressForm() {
  productsController.resetIngressForm();
}

function openIngressDialogForProduct(product) {
  productsController.openIngressDialogForProduct(product);
}

function closeIngressDialog() {
  productsController.closeIngressDialog();
}

function resolveConfirmDialog(decision) {
  const resolver = state.confirmDialogResolver;
  state.confirmDialogResolver = null;
  if (typeof resolver === "function") {
    resolver(Boolean(decision));
  }
}

function closeConfirmDialog(decision = false) {
  resolveConfirmDialog(decision);
  if (refs.confirmDialog?.open) {
    refs.confirmDialog.close();
  }
}

function openConfirmDialog(options = {}) {
  const title = String(options.title || "Confirmar accion");
  const message = String(options.message || "Esta accion no se puede deshacer.");
  const cancelText = String(options.cancelText || "Cancelar");
  const confirmText = String(options.confirmText || "Confirmar");

  if (!refs.confirmDialog) {
    return Promise.resolve(false);
  }

  closeConfirmDialog(false);
  refs.confirmDialogTitle.textContent = title;
  refs.confirmDialogMessage.textContent = message;
  refs.confirmDialogCancelBtn.textContent = cancelText;
  refs.confirmDialogConfirmBtn.textContent = confirmText;

  refs.confirmDialog.showModal();
  refs.confirmDialogConfirmBtn.focus();

  return new Promise((resolve) => {
    state.confirmDialogResolver = resolve;
  });
}

function setSaleFormLocked(locked) {
  [
    refs.saleProductLookup,
    refs.saleProductClearBtn,
    refs.saleProductId,
    refs.saleQtyDownBtn,
    refs.saleCantidad,
    refs.saleQtyUpBtn,
    refs.saleFecha,
    refs.saleTipoPago,
    refs.saleNota
  ].forEach((input) => {
    input.disabled = Boolean(locked);
  });
  if (locked) {
    closeSaleLookupDropdown();
  }
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

function normalizeSaleQuantityValue(raw, options = {}) {
  const fallback = options.fallback ?? null;
  const normalized = String(raw ?? "").replace(",", ".").trim();
  if (!normalized) return fallback;
  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.round(parsed));
}

function setSaleQuantityValue(raw, options = {}) {
  const value = normalizeSaleQuantityValue(raw, { fallback: options.fallback ?? 1 });
  refs.saleCantidad.value = String(value);
  return value;
}

function normalizeSaleQuantityInput() {
  setSaleQuantityValue(refs.saleCantidad.value, { fallback: 1 });
  updateSaleTotalsPreview();
}

function changeSaleQuantity(delta) {
  const step = Number.parseInt(String(delta ?? 0), 10);
  const current = normalizeSaleQuantityValue(refs.saleCantidad.value, { fallback: 1 });
  setSaleQuantityValue(current + step, { fallback: 1 });
  updateSaleTotalsPreview();
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
  const safeQty = normalizeSaleQuantityValue(refs.saleCantidad.value, { fallback: 1 });
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
  salesController.resetSaleForm();
}

function openSaleDialog() {
  salesController.openSaleDialog();
}

function openEditSaleDialog(saleIdInput) {
  salesController.openEditSaleDialog(saleIdInput);
}

function closeSaleDialog() {
  salesController.closeSaleDialog();
}

function openCreateDialog() {
  productsController.openCreateDialog();
}

function openEditDialog(id) {
  productsController.openEditDialog(id);
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
  return productsController.loadProducts();
}

async function loadSales() {
  return salesController.loadSales();
}

async function loadKardex() {
  return kardexController.loadKardex();
}

async function loadProductCatalog() {
  return productsController.loadProductCatalog();
}

async function loadSalesAllForKpi() {
  return salesController.loadSalesAllForKpi();
}

async function loadKardexAllForKpi() {
  return kardexController.loadKardexAllForKpi();
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
    String(item?.ESTADO || "ACTIVA").toUpperCase() !== "ANULADA" &&
    matchDateRange(item.FECHA_OPERATIVA || item.FECHA_VENTA, state.salesDateFrom, state.salesDateTo)
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

function findSaleProductById(id) {
  const productId = Number.parseInt(String(id ?? ""), 10);
  if (!productId) return null;
  return getSaleProductsSource().find((item) => Number(item["N°"]) === productId) || null;
}

function rankSaleProductMatch(product, query, parts) {
  const idText = String(product["N°"] ?? "").trim();
  const nameText = String(product.NOMBRE ?? "").trim();
  const idNorm = normalizeText(idText);
  const nameNorm = normalizeText(nameText);
  const haystack = `${idNorm} ${nameNorm}`;

  let score = 0;
  if (idNorm === query) score += 120;
  else if (idNorm.startsWith(query)) score += 90;
  else if (idNorm.includes(query)) score += 72;

  if (nameNorm === query) score += 110;
  else if (nameNorm.startsWith(query)) score += 86;
  else if (nameNorm.includes(query)) score += 62;

  if (parts.length > 1 && parts.every((part) => haystack.includes(part))) {
    score += 46;
  }

  return score;
}

function buildSaleLookupResults(rawLookup) {
  const products = getSaleProductsSource();
  if (!products.length) return [];

  const query = normalizeText(rawLookup);
  if (!query) {
    return products.slice(0, 60);
  }

  const parts = query.split(/\s+/).filter(Boolean);
  return products
    .map((item) => ({
      item,
      score: rankSaleProductMatch(item, query, parts)
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      if (left.score !== right.score) return right.score - left.score;
      return Number(left.item["N°"] || 0) - Number(right.item["N°"] || 0);
    })
    .slice(0, 60)
    .map((entry) => entry.item);
}

function openSaleLookupDropdown() {
  state.saleLookupOpen = true;
  renderSaleLookupDropdown();
}

function closeSaleLookupDropdown() {
  state.saleLookupOpen = false;
  refs.saleProductDropdown.hidden = true;
}

function renderSaleLookupDropdown() {
  const dropdown = refs.saleProductDropdown;
  const results = Array.isArray(state.saleLookupResults) ? state.saleLookupResults : [];

  if (!state.saleLookupOpen) {
    dropdown.hidden = true;
    return;
  }

  if (!results.length) {
    dropdown.innerHTML = '<p class="sale-product-empty">Sin coincidencias.</p>';
    dropdown.hidden = false;
    return;
  }

  dropdown.innerHTML = results
    .map((item, index) => {
      const isActive = index === state.saleLookupHighlight;
      return `
        <button
          class="sale-product-option${isActive ? " is-active" : ""}"
          type="button"
          data-sale-option-index="${index}"
          role="option"
          aria-selected="${isActive ? "true" : "false"}"
        >
          <span class="sale-product-option-main">
            <strong class="sale-product-option-id">#${esc(item["N°"])}</strong>
            <span class="sale-product-option-name">${esc(item.NOMBRE)}</span>
          </span>
          <small class="sale-product-option-meta">Stock: ${esc(formatQty(item.STOCK_ACTUAL))} · ${esc(
            money(item.PRECIO)
          )}</small>
        </button>
      `;
    })
    .join("");

  dropdown.hidden = false;
}

function refreshSaleLookupResults(options = {}) {
  const keepHighlight = Boolean(options.keepHighlight);
  state.saleLookupResults = buildSaleLookupResults(refs.saleProductLookup.value);

  if (!state.saleLookupResults.length) {
    state.saleLookupHighlight = -1;
  } else if (
    !keepHighlight ||
    state.saleLookupHighlight < 0 ||
    state.saleLookupHighlight >= state.saleLookupResults.length
  ) {
    state.saleLookupHighlight = 0;
  }

  if (options.open) {
    openSaleLookupDropdown();
  } else {
    renderSaleLookupDropdown();
  }
}

function applySaleProductSelection(product, options = {}) {
  if (!product) return;
  refs.saleProductLookup.value = formatSaleLookupLabel(product);
  refs.saleProductId.value = String(product["N°"]);
  updateSaleTotalsPreview();

  if (options.keepDropdownOpen) {
    refreshSaleLookupResults({ open: true, keepHighlight: true });
  } else {
    closeSaleLookupDropdown();
  }
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
  const exact =
    products.find((item) => normalizeText(formatSaleLookupLabel(item)) === normalized) ||
    products.find((item) => normalizeText(item.NOMBRE) === normalized) ||
    null;
  if (exact) return exact;

  const matches = buildSaleLookupResults(value);
  return matches.length === 1 ? matches[0] : null;
}

function syncSaleProductIdFromLookup() {
  const selectedById = findSaleProductById(refs.saleProductId.value);
  if (selectedById) {
    const lookupNormalized = normalizeText(refs.saleProductLookup.value);
    const selectedLabel = normalizeText(formatSaleLookupLabel(selectedById));
    if (lookupNormalized === selectedLabel) {
      updateSaleTotalsPreview();
      return selectedById;
    }
  }

  const product = resolveSaleProductByLookup(refs.saleProductLookup.value);
  refs.saleProductId.value = product ? String(product["N°"]) : "";
  updateSaleTotalsPreview();
  return product;
}

function renderSaleProductOptions() {
  const products = getSaleProductsSource();
  const previous = refs.saleProductId.value;

  if (!products.length) {
    refs.saleProductDropdown.innerHTML = "";
    refs.saleProductLookup.value = "";
    refs.saleProductId.value = "";
    refs.saleProductLookup.disabled = true;
    refs.saleProductClearBtn.disabled = true;
    closeSaleLookupDropdown();
    return;
  }

  refs.saleProductLookup.disabled = false;
  refs.saleProductClearBtn.disabled = false;

  if (previous) {
    const selected = products.find((item) => String(item["N°"]) === String(previous));
    if (selected) {
      refs.saleProductLookup.value = formatSaleLookupLabel(selected);
      refs.saleProductId.value = String(selected["N°"]);
      refreshSaleLookupResults({ open: false });
      updateSaleTotalsPreview();
      return;
    }
  }

  const byLookup = syncSaleProductIdFromLookup();
  if (byLookup) {
    refreshSaleLookupResults({ open: false });
    return;
  }

  if (!state.saleEditingId && products.length) {
    const first = products[0];
    refs.saleProductLookup.value = formatSaleLookupLabel(first);
    refs.saleProductId.value = String(first["N°"]);
  } else {
    refs.saleProductId.value = "";
  }
  refreshSaleLookupResults({ open: false });
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
  return productsController.refreshLocalProducts();
}

async function refreshLocalSales() {
  return salesController.refreshLocalSales();
}

async function refreshLocalKardex() {
  return kardexController.refreshLocalKardex();
}

async function handleCrudSubmit(event) {
  return productsController.handleCrudSubmit(event);
}

async function handleDelete(id) {
  return productsController.handleDelete(id);
}

async function handleDeleteKardex(id) {
  return kardexController.handleDeleteKardex(id);
}

async function handleDeleteAllKardex() {
  return kardexController.handleDeleteAllKardex();
}

async function handleStockIngress(id) {
  return productsController.handleStockIngress(id);
}

async function handleIngressSubmit(event) {
  return productsController.handleIngressSubmit(event);
}

async function handleSaleSubmit(event) {
  return salesController.handleSaleSubmit(event);
}

function handleSaleConfirmBack() {
  salesController.handleSaleConfirmBack();
}

async function handleSaleConfirmSubmit() {
  return salesController.handleSaleConfirmSubmit();
}

async function handleDeleteSale(saleId) {
  return salesController.handleDeleteSale(saleId);
}

async function handleApiBaseSave(event) {
  return settingsController.handleApiBaseSave(event, refreshAll);
}

async function handleApiBaseTest() {
  return settingsController.handleApiBaseTest();
}

async function handleCpanelDbStatusTest() {
  return settingsController.handleCpanelDbStatusTest();
}

async function handleExportSalesCsv() {
  return salesController.handleExportSalesCsv();
}

function handleUseCurrentOrigin() {
  settingsController.handleUseCurrentOrigin();
}

async function handleRefreshDbStatusClick() {
  return settingsController.handleRefreshDbStatusClick();
}

async function handleRefreshAccessHostClick() {
  return settingsController.handleRefreshAccessHostClick();
}

async function handleCopyAccessHost() {
  return settingsController.handleCopyAccessHost();
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
    state.salesSort = { key: "FECHA_OPERATIVA", dir: "desc" };
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
    state.saleLookupResults = [];
    state.saleLookupOpen = false;
    state.saleLookupHighlight = -1;
    closeSaleLookupDropdown();
    closeDialog();
    closeSaleDialog();
    closeIngressDialog();
    closeConfirmDialog(false);
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
  refs.confirmDialogCloseBtn.addEventListener("click", () => {
    closeConfirmDialog(false);
  });
  refs.confirmDialogCancelBtn.addEventListener("click", () => {
    closeConfirmDialog(false);
  });
  refs.confirmDialogConfirmBtn.addEventListener("click", () => {
    closeConfirmDialog(true);
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
  refs.confirmDialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeConfirmDialog(false);
  });
  refs.confirmDialog.addEventListener("close", () => {
    resolveConfirmDialog(false);
  });
  refs.apiSettingsForm.addEventListener("submit", handleApiBaseSave);
  refs.testApiBaseBtn.addEventListener("click", handleApiBaseTest);
  refs.testCpanelDbBtn.addEventListener("click", handleCpanelDbStatusTest);
  refs.useCurrentOriginBtn.addEventListener("click", handleUseCurrentOrigin);
  refs.dbStatusRefreshBtn.addEventListener("click", handleRefreshDbStatusClick);
  refs.refreshAccessHostBtn.addEventListener("click", handleRefreshAccessHostClick);
  refs.copyAccessHostBtn.addEventListener("click", handleCopyAccessHost);

  refs.crudSearch.addEventListener("input", (event) => {
    state.crudSearch = event.target.value;
    onSearchProductsDebounced();
  });

  refs.salesSearch.addEventListener("input", (event) => {
    state.salesSearch = event.target.value;
    onSearchSalesDebounced();
  });

  refs.saleProductLookup.addEventListener("input", () => {
    syncSaleProductIdFromLookup();
    refreshSaleLookupResults({ open: true });
  });

  refs.saleProductLookup.addEventListener("focus", () => {
    refreshSaleLookupResults({ open: true });
  });

  refs.saleProductLookup.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeSaleLookupDropdown();
      return;
    }

    if (!state.saleLookupOpen && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      refreshSaleLookupResults({ open: true });
      event.preventDefault();
      return;
    }

    const results = Array.isArray(state.saleLookupResults) ? state.saleLookupResults : [];
    if (!results.length) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      state.saleLookupHighlight = Math.min(state.saleLookupHighlight + 1, results.length - 1);
      renderSaleLookupDropdown();
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      state.saleLookupHighlight = Math.max(state.saleLookupHighlight - 1, 0);
      renderSaleLookupDropdown();
      return;
    }

    if (event.key === "Enter" && state.saleLookupOpen) {
      const candidate = results[state.saleLookupHighlight] || results[0];
      if (candidate) {
        event.preventDefault();
        applySaleProductSelection(candidate);
      }
    }
  });

  refs.saleProductLookup.addEventListener("change", () => {
    const selected = syncSaleProductIdFromLookup();
    if (selected) {
      refs.saleProductLookup.value = formatSaleLookupLabel(selected);
    }
    closeSaleLookupDropdown();
  });

  refs.saleProductLookup.addEventListener("blur", () => {
    window.setTimeout(() => {
      closeSaleLookupDropdown();
    }, 120);
  });

  refs.saleProductClearBtn.addEventListener("click", () => {
    refs.saleProductLookup.value = "";
    refs.saleProductId.value = "";
    updateSaleTotalsPreview();
    refreshSaleLookupResults({ open: true });
    refs.saleProductLookup.focus();
  });

  refs.saleProductDropdown.addEventListener("mousedown", (event) => {
    const option = event.target.closest("[data-sale-option-index]");
    if (!option) return;
    event.preventDefault();
    const index = Number.parseInt(String(option.dataset.saleOptionIndex || ""), 10);
    if (!Number.isInteger(index) || index < 0) return;
    const product = state.saleLookupResults[index];
    if (!product) return;
    applySaleProductSelection(product);
  });

  document.addEventListener("pointerdown", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest(".sale-product-field")) return;
    closeSaleLookupDropdown();
  });

  refs.saleCantidad.addEventListener("input", () => {
    updateSaleTotalsPreview();
  });
  refs.saleCantidad.addEventListener("change", () => {
    normalizeSaleQuantityInput();
  });
  refs.saleQtyDownBtn.addEventListener("click", () => {
    changeSaleQuantity(-1);
  });
  refs.saleQtyUpBtn.addEventListener("click", () => {
    changeSaleQuantity(1);
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

  refs.kardexDeleteAllBtn.addEventListener("click", handleDeleteAllKardex);

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
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const saleId = Number.parseInt(button.dataset.saleId, 10);
    if (!saleId) return;
    if (button.dataset.action === "edit-sale") {
      openEditSaleDialog(saleId);
      return;
    }
    if (button.dataset.action === "delete-sale") {
      handleDeleteSale(saleId);
    }
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

  refs.kardexBody.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action='delete-kardex']");
    if (!button) return;
    const id = Number.parseInt(button.dataset.id, 10);
    if (!id) return;
    handleDeleteKardex(id);
  });
}

async function init() {
  if (refs.appVersionLabel) {
    refs.appVersionLabel.textContent = `Version ${APP_VERSION}`;
  }

  state.apiBaseUrl = loadApiBaseUrlPreference();
  state.mobileKpiExpanded = loadMobileKpiExpandedPreference();
  initControllers();
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
