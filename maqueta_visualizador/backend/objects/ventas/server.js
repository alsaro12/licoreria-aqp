function matchesPath(pathname, basePath) {
  return pathname === basePath || pathname === `${basePath}/`;
}

function createVentasObjectServer(deps) {
  const {
    sendText,
    sendJson,
    readSalesAll,
    handleVentasCollection,
    handleVentasById,
    withMysqlConnection,
    buildDailySalesExportCsv,
    buildDailySalesExportStyledSpreadsheet,
    appendLog,
    normalizeText
  } = deps;

  return async function handleVentasObjectRoute(req, res, pathname, query) {
    if (matchesPath(pathname, "/api/ventas/export/csv")) {
      if (req.method !== "GET") {
        sendText(res, 405, "Metodo no permitido.");
        return true;
      }

      const traceId = `sales-export-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const exportFormat = normalizeText(query.get("format") || "csv");
      const wantsStyledExcel =
        exportFormat === "xls" ||
        exportFormat === "excel" ||
        exportFormat === "xml" ||
        exportFormat === "excelxml";

      try {
        const result = await withMysqlConnection(async (connection) =>
          buildDailySalesExportCsv(connection, {
            from: query.get("from"),
            to: query.get("to"),
            q: query.get("q"),
            traceId
          })
        );

        if (wantsStyledExcel) {
          const excelResult = buildDailySalesExportStyledSpreadsheet(result);
          await appendLog("INFO", "Export ventas Excel con formato generado", {
            traceId,
            from: result.from,
            to: result.to,
            rows: result.rows,
            days: result.days,
            fileName: excelResult.fileName,
            bytes: Buffer.byteLength(excelResult.content, "utf8")
          });

          res.writeHead(200, {
            "Content-Type": excelResult.contentType,
            "Content-Disposition": `attachment; filename="${excelResult.fileName}"`
          });
          res.end(excelResult.content);
          return true;
        }

        res.writeHead(200, {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${result.fileName}"`
        });
        res.end(result.csv);
        return true;
      } catch (error) {
        await appendLog("ERROR", "Export ventas CSV fallo", {
          traceId,
          from: query.get("from"),
          to: query.get("to"),
          q: query.get("q"),
          format: exportFormat,
          message: String(error?.message || "Error desconocido")
        });
        throw error;
      }
    }

    if (matchesPath(pathname, "/api/ventas")) {
      await handleVentasCollection(req, res, query);
      return true;
    }

    if (matchesPath(pathname, "/api/ventas/all")) {
      if (req.method !== "GET") {
        sendText(res, 405, "Metodo no permitido.");
        return true;
      }
      const sales = await readSalesAll();
      sendJson(res, 200, sales);
      return true;
    }

    const ventasMatch = pathname.match(/^\/api\/ventas\/(\d+)\/?$/);
    if (ventasMatch) {
      await handleVentasById(req, res, ventasMatch[1]);
      return true;
    }

    return false;
  };
}

module.exports = {
  createVentasObjectServer
};
