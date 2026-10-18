// ==UserScript==
// @name           ie8 for firefox: save page for theming
// @description    ctrl+alt+d saves the live dom of the current page to ~/Projects/dom-dumps/. a request.txt there with a url prefix saves the matching selected tab once
// @version        1.11.0
// @author         leroy
// ==/UserScript==
(function () {
  if (location.href !== "chrome://browser/content/browser.xhtml") return;
  try {
    ChromeUtils.registerWindowActor("IE8Dump", { child: { esModuleURI: "chrome://userscripts/content/IE8Dump/IE8DumpChild.sys.mjs" }, matches: ["https://*/*", "http://*/*"], safeForUntrustedWebProcess: true });
  } catch (e) { if (!/already/i.test(String(e))) console.error("ie8_dump_page", e); }
  const say = (text) => { const l = document.getElementById("ie8-status-text"); if (l) { l.setAttribute("value", text); setTimeout(() => { if (l.getAttribute("value") === text) l.setAttribute("value", "Done"); }, 4000); } };
  const home = Services.dirsvc.get("Home", Ci.nsIFile).path, dir = PathUtils.join(home, "Projects", "dom-dumps"), request = PathUtils.join(dir, "request.txt");
  const dump = async () => {
    const browser = gBrowser.selectedBrowser, html = await browser.browsingContext.currentWindowGlobal.getActor("IE8Dump").sendQuery("dump");
    await IOUtils.makeDirectory(dir, { ignoreExisting: true, createAncestors: true });
    const stamp = new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15), host = (browser.currentURI.host || "page").replace(/[^\w.-]/g, "_");
    const file = PathUtils.join(dir, `${host}-${stamp}.html`);
    await IOUtils.writeUTF8(file, `<!-- ${browser.currentURI.spec} -->\n` + html); say("Saved page to " + file); return file;
  };
  window.addEventListener("keydown", async (ev) => {
    if (!(ev.ctrlKey && ev.altKey && !ev.shiftKey && ev.code === "KeyD")) return;
    ev.preventDefault(); ev.stopPropagation();
    try { await dump(); } catch (e) { console.error("ie8_dump_page", e); say("Could not save this page"); }
  }, true);
  // request.txt holds a url prefix: the selected tab is saved once, only while its address starts with it
  setInterval(async () => {
    try {
      if (window !== Services.wm.getMostRecentWindow("navigator:browser") || !(await IOUtils.exists(request))) return;
      const prefix = (await IOUtils.readUTF8(request)).trim(), spec = gBrowser.selectedBrowser.currentURI.spec;
      if (!/^https?:\/\/[^/]+\//.test(prefix) || !spec.startsWith(prefix) || gBrowser.selectedTab.hasAttribute("busy")) return;
      await IOUtils.remove(request); await dump();
    } catch (e) { console.error("ie8_dump_page", e); }
  }, 2000);
})();
