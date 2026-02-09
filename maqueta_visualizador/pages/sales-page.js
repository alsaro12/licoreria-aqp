(function () {
  const salesFunctions = window.SalesFunctions || {};

  window.SalesPage = {
    matchSale: salesFunctions.matchSale,
    applySalesFilter: salesFunctions.applySalesFilter,
    renderSalesTable: salesFunctions.renderSalesTable,
    renderSalesPager: salesFunctions.renderSalesPager,
    refreshLocalSales: salesFunctions.refreshLocalSales,
    createController: salesFunctions.createController
  };
})();
