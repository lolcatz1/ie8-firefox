// ==UserScript==
// @name           ie8 for firefox: blank new tab address
// @description    a new tab keeps an empty address box even when a new tab extension sends it to a page
// @version        1.11.0
// @author         leroy
// ==/UserScript==
(function () {
  if (location.href !== "chrome://browser/content/browser.xhtml") return;
  const SETTLE_MS = 1500;
  const init = () => {
    let pending = 0;
    // new tab command
    const openTab = BrowserCommands.openTab;
    BrowserCommands.openTab = function (opts = {}) { if (!opts.url) pending = Date.now(); return openTab.apply(this, arguments); };
    gBrowser.tabContainer.addEventListener("TabOpen", (ev) => { if (Date.now() - pending < 1000) { ev.target.ie8Fresh = { url: "", settled: false, timer: 0 }; pending = 0; } });

    // landing page vs. the user's own navigation
    gBrowser.addTabsProgressListener({
      onLocationChange(browser, progress, request, uri, flags) {
        if (!progress.isTopLevel) return;
        const tab = gBrowser.getTabForBrowser(browser), f = tab && tab.ie8Fresh; if (!f) return;
        if (flags & Ci.nsIWebProgressListener.LOCATION_CHANGE_SAME_DOCUMENT) return;
        if (f.settled && uri.spec !== f.url) { delete tab.ie8Fresh; return; }
        f.url = uri.spec;
      },
      onStateChange(browser, progress, request, flags) {
        if (!progress.isTopLevel || !(flags & Ci.nsIWebProgressListener.STATE_STOP) || !(flags & Ci.nsIWebProgressListener.STATE_IS_WINDOW)) return;
        const tab = gBrowser.getTabForBrowser(browser), f = tab && tab.ie8Fresh; if (!f || f.settled || !/^https?:/.test(f.url)) return;
        clearTimeout(f.timer); f.timer = setTimeout(() => { f.settled = true; }, SETTLE_MS);
      },
    });
    const settle = () => { const f = gBrowser.selectedTab.ie8Fresh; if (f) { clearTimeout(f.timer); f.settled = true; } };
    gURLBar.inputField.addEventListener("input", settle);
    gURLBar.inputField.addEventListener("keydown", (ev) => { if (ev.key === "Enter") settle(); });

    // empty address box while the tab is fresh
    const blank = () => {
      try {
        const tab = gBrowser.selectedTab, f = tab.ie8Fresh;
        if (f && f.settled && gBrowser.selectedBrowser.currentURI.spec !== f.url) { delete tab.ie8Fresh; return; }
        if (!f || document.getElementById("urlbar").getAttribute("pageproxystate") !== "valid" || !gURLBar.value) return;
        gURLBar.value = ""; if (window.ie8PaintURL) window.ie8PaintURL();
      } catch (e) { console.error("ie8_blank_newtab", e); }
    };
    const setURI = gURLBar.setURI;
    gURLBar.setURI = function () { const r = setURI.apply(this, arguments); blank(); return r; };
  };
  if (gBrowserInit.delayedStartupFinished) init();
  else {
    const obs = (subject) => { if (subject === window) { Services.obs.removeObserver(obs, "browser-delayed-startup-finished"); init(); } };
    Services.obs.addObserver(obs, "browser-delayed-startup-finished");
  }
})();
