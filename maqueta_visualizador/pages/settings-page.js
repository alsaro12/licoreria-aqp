(function () {
  const settingsFunctions = window.SettingsFunctions || {};

  window.SettingsPage = {
    renderApiSettings: settingsFunctions.renderApiSettings,
    renderDbStatus: settingsFunctions.renderDbStatus,
    renderAccessHost: settingsFunctions.renderAccessHost,
    createController: settingsFunctions.createController
  };
})();
