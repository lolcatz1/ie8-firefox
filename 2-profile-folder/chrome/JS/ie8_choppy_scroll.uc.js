// ==UserScript==
// @name           ie8 for firefox: choppy trackpad scroll
// @description    trackpad scrolling moves in wheel-like steps instead of gliding. step: ie8.scroll.stepPx (default 100)
// @version        1.11.0
// @author         leroy
// ==/UserScript==
(function () {
  if (location.href !== "chrome://browser/content/browser.xhtml") return;
  try {
    ChromeUtils.registerWindowActor("IE8Scroll", {
      child: { esModuleURI: "chrome://userscripts/content/IE8Scroll/IE8ScrollChild.sys.mjs", events: { DOMContentLoaded: {}, pageshow: {} } },
      allFrames: true, safeForUntrustedWebProcess: true,
    });
  } catch (e) { if (!/already/i.test(String(e))) console.error("ie8_choppy_scroll", e); }
})();
