(function () {
  const { esc, money, formatQty } = window.AppCustomFunctions;

  function renderSalesRows(rows) {
    return rows
      .map(
        (item) => `
      <tr>
        <td>${esc(item.FECHA)}</td>
        <td>${item["N°"]}</td>
        <td>${esc(item.NOMBRE)}</td>
        <td>${formatQty(item.CANTIDAD)}</td>
        <td>${money(item.PRECIO)}</td>
        <td>${money(item.TOTAL)}</td>
        <td>${esc(item.TIPO_PAGO || "Efectivo")}</td>
        <td>${esc(item.ORIGEN || "MANUAL")}</td>
        <td>
          <button class="action-btn edit" data-action="edit-sale" data-sale-id="${item.ID_VENTA}" type="button">Editar</button>
        </td>
      </tr>
    `
      )
      .join("");
  }

  window.SalesTableComponent = { renderSalesRows };
})();
