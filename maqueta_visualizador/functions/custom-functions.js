(function () {
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

  function formatDateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat("es-PE", {
      dateStyle: "short",
      timeStyle: "medium"
    }).format(date);
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

  function normalizeDateValue(value) {
    const text = String(value ?? "").trim();
    const head = text.slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(head) ? head : "";
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

  window.AppCustomFunctions = {
    esc,
    money,
    formatQty,
    formatDateTime,
    normalizeText,
    normalizeNumericText,
    normalizeDateValue,
    matchDateRange,
    paginate
  };
})();
