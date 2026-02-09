(function () {
  const kardexFunctions = window.KardexFunctions || {};

  window.KardexPage = {
    matchKardex: kardexFunctions.matchKardex,
    applyKardexFilter: kardexFunctions.applyKardexFilter,
    renderKardexTable: kardexFunctions.renderKardexTable,
    refreshLocalKardex: kardexFunctions.refreshLocalKardex,
    createController: kardexFunctions.createController
  };
})();
