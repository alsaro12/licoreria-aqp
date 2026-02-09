(function () {
  const { normalizeText, matchDateRange, paginate } = window.AppCustomFunctions;
  const { renderSalesRows } = window.SalesTableComponent;

  function matchSale(item, rawTerm) {
    const term = String(rawTerm ?? "").trim();
    if (!term) return true;
    const norm = normalizeText(term);

    return (
      String(item["N°"] ?? "").includes(term) ||
      String(item.FECHA_VENTA ?? "").includes(term) ||
      String(item.FECHA_OPERATIVA ?? "").includes(term) ||
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
        matchDateRange(item.FECHA_VENTA, state.salesDateFrom, state.salesDateTo)
    );

    const paged = paginate(state.filteredSales, state.salesPagination.page, state.salesPagination.pageSize);
    state.pagedSales = paged.items;
    state.salesPagination = paged.pagination;
  }

  function renderSalesTable(refs, state) {
    const rows = state.pagedSales || [];
    refs.salesBody.innerHTML = rows.length
      ? renderSalesRows(rows)
      : '<tr><td class="empty" colspan="10">No hay ventas para este filtro.</td></tr>';
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

  function createController(deps) {
    const {
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
      defaultSalesPagination
    } = deps;

    function resetSaleForm() {
      state.saleEditingId = null;
      hideSaleConfirmBox({ clear: true });
      refs.saleProductLookup.value = "";
      refs.saleProductId.value = "";
      state.saleLookupResults = [];
      state.saleLookupOpen = false;
      state.saleLookupHighlight = -1;
      setSaleQuantityValue(1);
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
        setSaleMessage("No hay conexión con el servidor.", "is-error");
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
      refs.saleFecha.value = normalizeDateValue(sale.FECHA_VENTA) || todayInputValue();
      setSaleQuantityValue(sale.CANTIDAD, { fallback: 1 });
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
      closeSaleLookupDropdown();
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
      state.salesPagination = response?.pagination || defaultSalesPagination();
    }

    async function loadSalesAllForKpi() {
      const items = await apiRequest("/api/ventas/all");
      state.salesAll = Array.isArray(items) ? items : [];
    }

    async function refreshLocalSales() {
      try {
        await loadSales();
        state.apiConnected = true;
        renderSalesTable(refs, state);
        renderSalesPager(refs, state);
        renderKpis();
        renderSortButtons();
      } catch (error) {
        state.apiConnected = false;
        setSaleMessage(error.message, "is-error");
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
        const cantidad = normalizeSaleQuantityValue(refs.saleCantidad.value);
        if (!Number.isInteger(cantidad) || cantidad < 1) {
          throw new Error("La cantidad debe ser un numero entero mayor o igual a 1.");
        }
        const payload = {
          productId: Number.parseInt(refs.saleProductId.value, 10),
          cantidad,
          fecha_venta: refs.saleFecha.value || todayInputValue(),
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
            fecha: payload.fecha_venta,
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
        setSaleMessage("No hay conexión con el servidor.", "is-error");
        return;
      }

      let from = state.salesDateFrom || "";
      let to = state.salesDateTo || "";
      if (!from || !to) {
        const source = state.filteredSales.length ? state.filteredSales : state.sales;
        const dates = source
          .map((item) => normalizeDateValue(item.FECHA_VENTA))
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

    return {
      resetSaleForm,
      openSaleDialog,
      openEditSaleDialog,
      closeSaleDialog,
      loadSales,
      loadSalesAllForKpi,
      refreshLocalSales,
      handleSaleSubmit,
      handleSaleConfirmBack,
      handleSaleConfirmSubmit,
      handleExportSalesCsv
    };
  }

  window.SalesFunctions = {
    matchSale,
    applySalesFilter,
    renderSalesTable,
    renderSalesPager,
    refreshLocalSales,
    createController
  };
})();
