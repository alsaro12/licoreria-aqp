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
    const statusText = normalizeText(product.ESTADO ?? "ACTIVO");
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
      statusText.includes(termNorm) ||
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
      : '<tr><td class="empty" colspan="8">No hay productos para este filtro.</td></tr>';
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

  function createController(deps) {
    const {
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
      defaultPagination
    } = deps;

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
      refs.crudEstado.value = "ACTIVO";
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
      refs.crudEstado.value = String(item.ESTADO || "ACTIVO").toUpperCase() === "INACTIVO" ? "INACTIVO" : "ACTIVO";
      refs.crudNota.value = "";
      refs.crudSaveBtn.textContent = `Actualizar N° ${item["N°"]}`;
      refs.productDialogTitle.textContent = `Editar producto N° ${item["N°"]}`;
      setCrudMessage(`Editando producto N° ${item["N°"]}`, "is-success");
      openDialog();
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
      state.pagination = response?.pagination || defaultPagination();
    }

    async function loadProductCatalog() {
      const items = await apiRequest("/api/productos/all");
      state.productCatalog = Array.isArray(items)
        ? [...items].sort((a, b) => Number(a["N°"] || 0) - Number(b["N°"] || 0))
        : [];
    }

    async function refreshLocalProducts() {
      try {
        await loadProducts();
        state.apiConnected = true;
        renderCrudTable(refs, state);
        renderPager(refs, state);
        renderSortButtons();
      } catch (error) {
        state.apiConnected = false;
        setCrudMessage(error.message, "is-error");
      }
    }

    async function handleCrudSubmit(event) {
      event.preventDefault();

      try {
        const payload = {
          NOMBRE: refs.crudNombre.value.trim(),
          PRECIO: parseNumberInput(refs.crudPrecio.value, { min: 0, label: "PRECIO" }),
          PEDIDO: Number.parseInt(refs.crudPedido.value || "0", 10),
          ESTADO: refs.crudEstado.value
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
      const ok = await openConfirmDialog({
        title: "Eliminar producto",
        message: `Deseas eliminar el producto N° ${id}${item ? ` - ${item.NOMBRE}` : ""}?\nEsta accion no se puede deshacer.`,
        confirmText: "Eliminar producto"
      });
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

    return {
      clearCrudForm,
      openDialog,
      closeDialog,
      resetIngressForm,
      openIngressDialogForProduct,
      closeIngressDialog,
      openCreateDialog,
      openEditDialog,
      loadProducts,
      loadProductCatalog,
      refreshLocalProducts,
      handleCrudSubmit,
      handleDelete,
      handleStockIngress,
      handleIngressSubmit
    };
  }

  window.ProductsFunctions = {
    matchProduct,
    applyProductFilterAndPagination,
    renderCrudTable,
    renderPager,
    refreshLocalProducts,
    createController
  };
})();
