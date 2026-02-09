(function () {
  const { esc, money, formatQty } = window.AppCustomFunctions;

  function renderProductRows(rows) {
    return rows
      .map(
        (item) => `
      <tr>
        <td>${item["N°"]}</td>
        <td>${esc(item.NOMBRE)}</td>
        <td>${esc(item.CATEGORIA || "OTROS")}</td>
        <td>${money(item.PRECIO)}</td>
        <td>${formatQty(item.PEDIDO)}</td>
        <td>${formatQty(item.STOCK_ACTUAL)}</td>
        <td><span class="tag ${String(item.ESTADO || "ACTIVO") === "INACTIVO" ? "is-warn" : "is-ok"}">${esc(
          String(item.ESTADO || "ACTIVO")
        )}</span></td>
        <td>
          <button class="action-btn ingreso" data-action="ingreso" data-id="${item["N°"]}" type="button">Ingreso</button>
          <button class="action-btn edit" data-action="edit" data-id="${item["N°"]}" type="button">Editar</button>
          <button class="action-btn delete" data-action="delete" data-id="${item["N°"]}" type="button">Eliminar</button>
        </td>
      </tr>
    `
      )
      .join("");
  }

  window.ProductTableComponent = { renderProductRows };
})();
