(function () {
  const { normalizeText, matchDateRange, paginate } = window.AppCustomFunctions;
  const { renderSalesRows } = window.SalesTableComponent;

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

  function applySalesFilter(state) {
    if (state.serverBackedTables) {
      state.filteredSales = Array.isArray(state.sales) ? [...state.sales] : [];
      state.pagedSales = state.filteredSales;
      return;
    }

    state.filteredSales = state.sales.filter(
      (item) =>
        matchSale(item, state.salesSearch) &&
        matchDateRange(item.FECHA, state.salesDateFrom, state.salesDateTo)
    );

    const paged = paginate(state.filteredSales, state.salesPagination.page, state.salesPagination.pageSize);
    state.pagedSales = paged.items;
    state.salesPagination = paged.pagination;
  }

  function renderSalesTable(refs, state) {
    const rows = state.pagedSales || [];
    refs.salesBody.innerHTML = rows.length
      ? renderSalesRows(rows)
      : '<tr><td class="empty" colspan="9">No hay ventas para este filtro.</td></tr>';
  }

  function renderSalesPager(refs, state) {
    const meta = state.salesPagination;
    refs.salesPrevBtn.disabled = !meta.hasPrev;
    refs.salesNextBtn.disabled = !meta.hasNext;
    refs.salesPageSize.value = String(meta.pageSize);
    refs.salesPageInfo.textContent = `Pagina ${meta.page} de ${meta.totalPages} · ${meta.totalItems} resultados`;
  }

  function refreshLocalSales(state, refs, renderKpis) {
    applySalesFilter(state);
    renderSalesTable(refs, state);
    renderKpis();
    renderSalesPager(refs, state);
  }

  window.SalesPage = {
    matchSale,
    applySalesFilter,
    renderSalesTable,
    renderSalesPager,
    refreshLocalSales
  };
})();
