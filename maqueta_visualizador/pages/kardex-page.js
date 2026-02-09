(function () {
  const { normalizeText } = window.AppCustomFunctions;
  const { renderKardexRows } = window.KardexTableComponent;

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

  function applyKardexFilter(state) {
    if (state.serverBackedTables) {
      state.filteredKardex = Array.isArray(state.kardex) ? [...state.kardex] : [];
      return;
    }

    state.filteredKardex = state.kardex.filter((item) =>
      matchKardex(item, state.kardexSearch, state.kardexType)
    );
  }

  function renderKardexTable(refs, state) {
    const rows = state.filteredKardex || [];
    refs.kardexBody.innerHTML = rows.length
      ? renderKardexRows(rows)
      : '<tr><td class="empty" colspan="8">No hay movimientos para este filtro.</td></tr>';
  }

  function refreshLocalKardex(state, refs) {
    applyKardexFilter(state);
    renderKardexTable(refs, state);
  }

  window.KardexPage = {
    matchKardex,
    applyKardexFilter,
    renderKardexTable,
    refreshLocalKardex
  };
})();
