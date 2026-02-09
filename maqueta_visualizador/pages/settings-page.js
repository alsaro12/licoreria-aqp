(function () {
  function renderApiSettings(refs, getApiBaseUrl) {
    const apiBase = getApiBaseUrl();
    refs.apiBaseUrlCurrent.textContent = apiBase;
    if (document.activeElement !== refs.apiBaseUrlInput) {
      refs.apiBaseUrlInput.value = apiBase;
    }
  }

  function renderDbStatus(refs, state, formatDateTime) {
    const status = state.dbStatus;
    let dotClass = "is-idle";
    let text = "Sin verificar";
    let meta = 'Pulsa "Reintentar" para validar conexión.';

    if (status?.checked) {
      if (!status.configured) {
        dotClass = "is-warn";
        text = "DB no configurada";
        meta = status.message || "Revisa variables DB_* en .env.";
      } else if (status.connected) {
        dotClass = "is-ok";
        text = "DB conectada";
        const methodLabel = status.method === "mysql2" ? "MySQL OK" : "Puerto OK";
        meta = `${status.host}:${status.port}/${status.database} · ${methodLabel}`;
      } else {
        dotClass = "is-error";
        text = "DB sin conexión";
        meta = status.error || status.message || "No se pudo conectar.";
      }
    }

    refs.dbStatusDot.classList.remove("is-idle", "is-ok", "is-warn", "is-error");
    refs.dbStatusDot.classList.add(dotClass);
    refs.dbStatusText.textContent = text;
    refs.dbStatusMeta.textContent = meta;
    refs.dbStatusLastCheck.textContent = `Ultima verificacion: ${
      status?.checkedAt ? formatDateTime(status.checkedAt) : "-"
    }`;
  }

  function renderAccessHost(refs, accessHostState, formatDateTime) {
    const info = accessHostState && typeof accessHostState === "object" ? accessHostState : null;
    let hostValue = "-";
    let meta = 'Pulsa "Detectar host" para obtener el Access Host.';
    let canCopy = false;

    if (info?.host) {
      hostValue = String(info.host);
      canCopy = true;
      const parts = [];
      if (info.sourceLabel) {
        parts.push(String(info.sourceLabel));
      }
      if (info.checkedAt) {
        parts.push(`Ultima verificacion: ${formatDateTime(info.checkedAt)}`);
      }
      if (info.fallbackHost) {
        parts.push(`IP publica detectada: ${info.fallbackHost}`);
      }
      if (info.message) {
        parts.push(String(info.message));
      }
      meta = parts.filter(Boolean).join(" · ") || meta;
    } else if (info?.message) {
      meta = info.error ? `${info.message} ${info.error}` : String(info.message);
    }

    refs.accessHostValue.value = hostValue;
    refs.copyAccessHostBtn.disabled = !canCopy;
    refs.accessHostMeta.textContent = meta;
  }

  window.SettingsPage = {
    renderApiSettings,
    renderDbStatus,
    renderAccessHost
  };
})();
