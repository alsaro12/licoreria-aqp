(function () {
  const { normalizeText, normalizeNumericText, paginate } = window.AppCustomFunctions;
  const { renderProductRows } = window.ProductTableComponent;

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
      return candidateText.includes(term) || normalizeNumericText(candidateText).includes(termNum);
    });
  }

  function applyProductFilterAndPagination(state) {
    if (state.serverBackedTables) {
      state.filteredProducts = Array.isArray(state.products) ? [...state.products] : [];
      state.pagedProducts = state.filteredProducts;
      return;
    }

    const term = state.crudSearch;
    state.filteredProducts = state.products.filter((item) => matchProduct(item, term));

    const paged = paginate(state.filteredProducts, state.pagination.page, state.pagination.pageSize);
    state.pagedProducts = paged.items;
    state.pagination = paged.pagination;
  }

  function renderCrudTable(refs, state) {
    const rows = state.pagedProducts || [];
    refs.crudBody.innerHTML = rows.length
      ? renderProductRows(rows)
      : '<tr><td class="empty" colspan="7">No hay productos para este filtro.</td></tr>';
  }

  function renderPager(refs, state) {
    const meta = state.pagination;
    refs.crudPrevBtn.disabled = !meta.hasPrev;
    refs.crudNextBtn.disabled = !meta.hasNext;
    refs.crudPageSize.value = String(meta.pageSize);
    refs.crudPageInfo.textContent = `Pagina ${meta.page} de ${meta.totalPages} · ${meta.totalItems} resultados`;
  }

  function refreshLocalProducts(state, refs) {
    applyProductFilterAndPagination(state);
    renderCrudTable(refs, state);
    renderPager(refs, state);
  }

  window.ProductsPage = {
    matchProduct,
    applyProductFilterAndPagination,
    renderCrudTable,
    renderPager,
    refreshLocalProducts
  };
})();
