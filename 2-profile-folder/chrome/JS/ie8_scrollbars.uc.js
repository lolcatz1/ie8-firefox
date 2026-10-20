// ==UserScript==
// @name           ie8 for firefox: win7 scrollbars
// @description    aero scrollbars on every page and in the browser ui (agent sheet)
// @version        1.11.0
// @author         leroy
// ==/UserScript==
(function () {
  if (location.href !== "chrome://browser/content/browser.xhtml") return;
  const sss = Cc["@mozilla.org/content/style-sheet-service;1"].getService(Ci.nsIStyleSheetService);
  try {
    ChromeUtils.registerWindowActor("IE8Scrollbars", {
      parent: { esModuleURI: "chrome://userscripts/content/IE8Scrollbars/IE8ScrollbarsParent.sys.mjs" },
      child: { esModuleURI: "chrome://userscripts/content/IE8Scrollbars/IE8ScrollbarsChild.sys.mjs", events: { DOMDocElementInserted: {}, DOMContentLoaded: {}, pageshow: {} } },
      matches: ["https://*/*", "http://*/*", "file:///*", "about:*"], safeForUntrustedWebProcess: true,
    });
  } catch (e) { if (!/already/i.test(String(e))) console.error("ie8_scrollbars", e); }
  // browser ui via the sheet service, pages via the actor; data: uri so content processes need no chrome:// access
  fetch("chrome://userchrome/content/ie8/ie8-scrollbars.css").then((r) => r.text()).then((css) => {
    const spec = "data:text/css;charset=utf-8," + encodeURIComponent(css), uri = Services.io.newURI(spec);
    Services.ppmm.sharedData.set("ie8-scrollbars-uri", spec); Services.ppmm.sharedData.flush();
    if (!sss.sheetRegistered(uri, sss.AGENT_SHEET)) sss.loadAndRegisterSheet(uri, sss.AGENT_SHEET);
    // tabs that loaded before this ran
    for (const b of gBrowser.browsers) { try { b.browsingContext.currentWindowGlobal.getActor("IE8Scrollbars").sendAsyncMessage("apply"); } catch (e) {} }
  }).catch((e) => console.error("ie8_scrollbars", e));
})();
