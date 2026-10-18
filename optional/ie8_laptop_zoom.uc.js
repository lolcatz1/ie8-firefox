// ==UserScript==
// @name           ie8 for firefox: laptop zoom
// @description    pages render at 70%, status bar still reads 100%. factor: ie8.laptopZoom.factor
// @version        1.11.0
// @author         leroy
// ==/UserScript==
(function () {
  if (location.href !== "chrome://browser/content/browser.xhtml") return;
  const apply = () => {
    try {
      const factor = parseFloat(Services.prefs.getStringPref("ie8.laptopZoom.factor", "0.7")) || 0.7;
      const cps = Cc["@mozilla.org/content-pref/service;1"].getService(Ci.nsIContentPrefService2);
      cps.setGlobal("browser.content.full-zoom", factor, Cu.createLoadContext(), { handleCompletion() { window.dispatchEvent(new CustomEvent("IE8BaseZoomChanged")); }, handleError() {}, handleResult() {} });
      Services.prefs.setBoolPref("ie8.laptopZoom.active", true);
    } catch (e) { console.error("ie8_laptop_zoom", e); }
  };
  if (gBrowserInit.delayedStartupFinished) apply();
  else { const obs = (s) => { if (s === window) { Services.obs.removeObserver(obs, "browser-delayed-startup-finished"); apply(); } }; Services.obs.addObserver(obs, "browser-delayed-startup-finished"); }
})();
