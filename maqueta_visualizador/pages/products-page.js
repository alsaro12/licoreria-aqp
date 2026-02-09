(function () {
  const productsFunctions = window.ProductsFunctions || {};

  window.ProductsPage = {
    matchProduct: productsFunctions.matchProduct,
    applyProductFilterAndPagination: productsFunctions.applyProductFilterAndPagination,
    renderCrudTable: productsFunctions.renderCrudTable,
    renderPager: productsFunctions.renderPager,
    refreshLocalProducts: productsFunctions.refreshLocalProducts,
    createController: productsFunctions.createController
  };
})();
