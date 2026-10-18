// ==UserScript==
// @name           ie8 for firefox: no unstyled flash
// @description    pages on ie8.noflash.hosts stay blank until stylus has put its userstyle in, so the modern look never shows
// @version        1.11.0
// @author         leroy
// ==/UserScript==
(function () {
  if (location.href !== "chrome://browser/content/browser.xhtml") return;
  try {
    ChromeUtils.registerWindowActor("IE8NoFlash", {
      child: { esModuleURI: "chrome://userscripts/content/IE8NoFlash/IE8NoFlashChild.sys.mjs", events: { DOMDocElementInserted: {} } },
      matches: ["https://*/*", "http://*/*"], safeForUntrustedWebProcess: true,
    });
  } catch (e) { if (!/already/i.test(String(e))) console.error("ie8_no_flash", e); }
})();
