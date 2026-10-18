const SHEET = "data:text/css," + encodeURIComponent("html { visibility: hidden !important; }");
const hosts = () => Services.prefs.getStringPref("ie8.noflash.hosts", "google.,wikipedia.org,reddit.com,youtube.com").split(",").map((h) => h.trim().toLowerCase()).filter(Boolean);
const num = (pref, def) => Math.max(0, Services.prefs.getIntPref(pref, def));

export class IE8NoFlashChild extends JSWindowActorChild {
  handleEvent() {
    const win = this.contentWindow, doc = this.document; if (!win || !doc || win.ie8Gate) return;
    let host = ""; try { host = doc.location.hostname.toLowerCase(); } catch (e) { return; }
    if (!host || !hosts().some((h) => host.includes(h))) return;
    const utils = win.windowUtils; let open = false, timer = 0;
    try { utils.loadSheetUsingURIString(SHEET, utils.AGENT_SHEET); } catch (e) { return; }
    win.ie8Gate = true;
    const release = () => { if (open) return; open = true; try { obs.disconnect(); } catch (e) {} try { utils.removeSheetUsingURIString(SHEET, utils.AGENT_SHEET); } catch (e) {} };
    const styled = () => !!doc.querySelector("style.stylus, style[id^='stylus-']");
    // let go a moment after the style is in, so a script that rebuilds the page gets it back first
    const check = () => { if (open) return; win.clearTimeout(timer); if (styled()) timer = win.setTimeout(() => (styled() ? release() : check()), num("ie8.noflash.settleMs", 60)); };
    const obs = new win.MutationObserver(check);
    try { obs.observe(doc, { childList: true, subtree: true }); } catch (e) {}
    check();
    // no userstyle for this page, or stylus is off
    doc.addEventListener("DOMContentLoaded", () => win.setTimeout(() => { if (!styled()) release(); }, num("ie8.noflash.graceMs", 350)), { once: true });
    win.setTimeout(release, num("ie8.noflash.maxMs", 2500));
  }
}
