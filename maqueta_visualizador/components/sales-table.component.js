(function () {
  const { esc, money, formatQty } = window.AppCustomFunctions;

  function renderSalesRows(rows) {
    return rows
      .map(
        (item) => {
          const status = String(item.ESTADO || "ACTIVA").toUpperCase() === "ANULADA" ? "ANULADA" : "ACTIVA";
          const isCancelled = status === "ANULADA";
          return `
      <tr>
        <td>${esc(item.FECHA_VENTA || "-")}</td>
        <td>${esc(item.FECHA_OPERATIVA || "-")}</td>
        <td>${item["N°"]}</td>
        <td>${esc(item.NOMBRE)}</td>
        <td>${formatQty(item.CANTIDAD)}</td>
        <td>${money(item.PRECIO)}</td>
        <td>${money(item.TOTAL)}</td>
        <td>${esc(item.TIPO_PAGO || "Efectivo")}</td>
        <td>${esc(item.ORIGEN || "MANUAL")}</td>
        <td><span class="tag ${isCancelled ? "is-warn" : "is-ok"}">${esc(status)}</span></td>
        <td>
          <button class="action-btn edit" data-action="edit-sale" data-sale-id="${item.ID_VENTA}" type="button" ${
            isCancelled ? "disabled" : ""
          }>Editar</button>
          <button class="action-btn delete" data-action="delete-sale" data-sale-id="${item.ID_VENTA}" type="button" ${
            isCancelled ? "disabled" : ""
          }>
            Anular
          </button>
        </td>
      </tr>
    `;
        }
      )
      .join("");
  }

  window.SalesTableComponent = { renderSalesRows };
})();
