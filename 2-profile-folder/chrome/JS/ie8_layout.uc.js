// ==UserScript==
// @name           ie8 for firefox
// @description    caption, address box, search box, favorites bar, command bar, status bar
// @version        1.11.0
// @author         leroy
// ==/UserScript==
(function () {
  if (location.href !== "chrome://browser/content/browser.xhtml") return;
  const PREF = "ie8.layout.applied", VERSION = 1;
  const XHTML = "http://www.w3.org/1999/xhtml", IMG = "chrome://userchrome/content/ie8/img/";
  const $ = (id) => document.getElementById(id);
  const xul = (tag, attrs = {}, kids = []) => { const n = document.createXULElement(tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); kids.forEach((k) => n.appendChild(k)); return n; };
  const html = (tag, attrs = {}) => { const n = document.createElementNS(XHTML, tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); return n; };
  const isPopup = () => /\btoolbar\b/.test(document.documentElement.getAttribute("chromehidden") || "");
  const guard = (fn) => (...a) => { try { return fn(...a); } catch (e) { console.error("ie8_layout", e); } };
  // 2009 icons for known sites
  const SITES = [["google", /(^|\.)google\.[a-z.]+$/i, /\bgoogle\b/i], ["youtube", /(^|\.)(youtube\.com|youtu\.be|youtube-nocookie\.com)$/i, /\byoutube\b/i], ["wikipedia", /(^|\.)wikipedia\.org$/i, /\bwikipedia\b/i],
    ["roblox", /(^|\.)roblox\.com$/i, /\broblox\b/i], ["amazon", /(^|\.)amazon\.[a-z.]+$/i, /\bamazon\b/i], ["bing", /(^|\.)bing\.com$/i, /\bbing\b/i], ["duckduckgo", /(^|\.)duckduckgo\.com$/i, /\bduckduckgo\b/i],
    ["ebay", /(^|\.)ebay\.[a-z.]+$/i, /\bebay\b/i], ["facebook", /(^|\.)facebook\.com$/i, /\bfacebook\b/i], ["github", /(^|\.)github\.com$/i, /\bgithub\b/i], ["reddit", /(^|\.)reddit\.com$/i, /\breddit\b/i],
    ["twitter", /(^|\.)(twitter\.com|x\.com)$/i, /\btwitter\b/i], ["yahoo", /(^|\.)yahoo\.[a-z.]+$/i, /\byahoo\b/i]];
  const siteOfHost = (host) => { for (const [name, re] of SITES) if (re.test(host || "")) return name; return ""; };
  const siteOfText = (text) => { for (const [name, , re] of SITES) if (re.test(text || "")) return name; return ""; };
  const siteOfUrl = (u) => { try { return siteOfHost(new URL(u).hostname); } catch (e) { return ""; } };
  const siteIcon = (site) => IMG + "site-" + site + "-2009.png";
  const tagSite = (el, site) => { if (!el || (el.getAttribute("ie8-site") || "") === site) return; if (site) { el.setAttribute("ie8-site", site); el.style.setProperty("--ie8-site-icon", `url("${siteIcon(site)}")`); } else { el.removeAttribute("ie8-site"); el.style.removeProperty("--ie8-site-icon"); } };

  function placeWidgets() {
    if (Services.prefs.getIntPref(PREF, 0) >= VERSION) return;
    const NAV = CustomizableUI.AREA_NAVBAR, TABS = CustomizableUI.AREA_TABSTRIP;
    for (const id of ["fxa-toolbar-menu-button", "save-to-pocket-button", "firefox-view-button", "alltabs-button", "sidebar-button", "ai-window-toggle", "library-button", "home-button", "bookmarks-menu-button",
                      "customizableui-special-spring1", "customizableui-special-spring2", "vertical-spacer", "new-tab-button", "search-container", "print-button"]) {
      try { CustomizableUI.removeWidgetFromArea(id); } catch (e) {}
    }
    ["back-button", "forward-button", "urlbar-container", "stop-reload-button"].forEach((id, i) => { try { CustomizableUI.addWidgetToArea(id, NAV, i); } catch (e) {} });
    const tabsPos = CustomizableUI.getPlacementOfWidget("tabbrowser-tabs")?.position ?? 0;
    try { CustomizableUI.addWidgetToArea("new-tab-button", TABS, tabsPos + 1); } catch (e) {}
    try { CustomizableUI.setToolbarVisibility("PersonalToolbar", true); } catch (e) {}
    Services.prefs.setIntPref(PREF, VERSION);
  }

  // caption
  function buildCaption() {
    if ($("ie8-titlebar")) return;
    const label = html("span", { id: "ie8-title-text" });
    const bar = xul("hbox", { id: "ie8-titlebar", align: "center" }, [xul("image", { id: "ie8-title-icon" }), label]);
    const toolbox = $("navigator-toolbox"); toolbox.insertBefore(bar, toolbox.firstChild);
    const update = guard(() => {
      const t = gBrowser.selectedBrowser.contentTitle || gBrowser.selectedTab.label || "";
      const popup = isPopup(), text = popup ? t || "Windows Internet Explorer" : (t ? t + " - " : "") + "Windows Internet Explorer";
      label.textContent = text; document.title = text;
      const icon = bar.firstChild;
      if (popup) { let site = ""; try { site = siteOfUrl(gBrowser.selectedBrowser.currentURI.spec); } catch (e) {} const src = site ? siteIcon(site) : gBrowser.selectedTab.getAttribute("image") || IMG + "icon-page.png"; if (icon.getAttribute("src") !== src) icon.setAttribute("src", src); }
      else if (icon.hasAttribute("src")) icon.removeAttribute("src");
    });
    gBrowser.tabContainer.addEventListener("TabSelect", update);
    gBrowser.tabContainer.addEventListener("TabAttrModified", (ev) => { if (ev.target === gBrowser.selectedTab) update(); });
    for (const a of ["data-title-default", "data-title-private", "data-content-title-default", "data-content-title-private"]) document.documentElement.removeAttribute(a);
    const orig = gBrowser.updateTitlebar?.bind(gBrowser); if (orig) gBrowser.updateTitlebar = () => update();
    update();
  }

  // address box
  function buildAddressBox() {
    const urlbar = $("urlbar"), container = urlbar?.querySelector(".urlbar-input-container");
    if (!container || $("ie8-addr-buttons")) return;
    const favicon = html("img", { id: "ie8-favicon" }); container.insertBefore(favicon, container.firstChild);
    const display = html("div", { id: "ie8-url-display" }); gURLBar.inputField.parentNode.appendChild(display);
    const paintURL = guard(() => {
      const value = gURLBar.inputField.value || ""; let start = -1, len = 0;
      try {
        const host = new URL(value).hostname; let base = host;
        try { base = Services.eTLD.getBaseDomainFromHost(host); } catch (e) {}
        const at = value.indexOf(host); if (at >= 0 && base) { start = at + host.length - base.length; len = base.length; }
      } catch (e) {}
      display.textContent = "";
      const add = (text, cls) => { if (!text) return; const s = html("span"); if (cls) s.className = cls; s.textContent = text; display.appendChild(s); };
      if (start < 0) add(value); else { add(value.slice(0, start)); add(value.slice(start, start + len), "ie8-domain"); add(value.slice(start + len)); }
    });
    new MutationObserver(paintURL).observe(urlbar, { attributes: true, attributeFilter: ["pageproxystate", "focused"] });
    window.ie8PaintURL = paintURL;
    gURLBar.inputField.addEventListener("input", paintURL);

    const box = xul("hbox", { id: "ie8-addr-buttons" });
    const defs = [
      ["dropdown", "Show Address bar Autocomplete", () => { gURLBar.focus(); gURLBar.view?.isOpen ? gURLBar.view.close() : gURLBar.startQuery({ allowAutofill: false, event: null, searchString: "" }); }],
      ["compat", "Compatibility View: websites designed for older browsers will often look better", () => { try { AboutReaderParent.toggleReaderMode?.({ target: gBrowser.selectedBrowser }); } catch (e) {} }],
      ["refresh", "Refresh (F5)", () => { if (urlbar.getAttribute("pageproxystate") === "invalid" && gURLBar.focused) gURLBar.handleCommand(); else BrowserCommands.reload(); }],
      ["stop", "Stop (Esc)", () => BrowserCommands.stop()],
    ];
    for (const [name, tip, fn] of defs) {
      const b = xul("toolbarbutton", { id: "ie8-ab-" + name, class: "ie8-ab", tooltiptext: tip });
      b.addEventListener("mousedown", (ev) => ev.stopPropagation());
      b.addEventListener("click", (ev) => { if (ev.button === 0) { ev.stopPropagation(); guard(fn)(ev); } });
      box.appendChild(b);
    }
    container.appendChild(box);
    const update = guard(() => {
      setTimeout(paintURL, 0);
      const site = siteOfUrl(gBrowser.selectedBrowser.currentURI.spec);
      favicon.src = site ? siteIcon(site) : gBrowser.selectedTab.getAttribute("image") || IMG + "icon-page.png";
      urlbar.toggleAttribute("ie8-secure", !!gBrowser.selectedBrowser.currentURI?.schemeIs?.("https"));
    });
    favicon.addEventListener("error", () => { if (!favicon.src.endsWith("icon-page.png")) favicon.src = IMG + "icon-page.png"; });
    gBrowser.tabContainer.addEventListener("TabSelect", update);
    gBrowser.tabContainer.addEventListener("TabAttrModified", (ev) => { if (ev.target === gBrowser.selectedTab) update(); });
    gBrowser.addTabsProgressListener({ onLocationChange(browser) { if (browser === gBrowser.selectedBrowser) update(); } });
    update();
  }

  // recent pages arrow
  function buildRecentPages() {
    const fwd = $("forward-button"); if (!fwd || $("ie8-recent-pages")) return;
    const b = xul("toolbarbutton", { id: "ie8-recent-pages", tooltiptext: "Recent Pages" });
    b.addEventListener("click", (ev) => { if (ev.button === 0) guard(() => $("backForwardMenu").openPopup(b, "after_start", -56, 0, false, false))(); });
    fwd.parentNode.insertBefore(b, fwd.nextSibling);
  }

  // search box
  function buildSearchBox() {
    if ($("ie8-search")) return;
    const icon = html("img", { id: "ie8-search-icon" }), input = html("input", { id: "ie8-search-input", type: "text", spellcheck: "false" });
    const go = xul("toolbarbutton", { id: "ie8-search-go", tooltiptext: "Search" }), drop = xul("toolbarbutton", { id: "ie8-search-drop", tooltiptext: "Search Options" });
    const item = xul("toolbaritem", { id: "ie8-search", align: "center" }, [icon, input, go, drop]);
    $("nav-bar-customization-target").appendChild(item);
    let engine = null, engines = [], svc = null;
    const iconOf = async (e) => { const site = siteOfText(e.name); if (site) return siteIcon(site); let src = null; try { src = await e.getIconURL(16); } catch (err) {} if (!src) { try { src = await e.getIconURL(); } catch (err) {} } return src || IMG + "search-provider.png"; };
    const useEngine = async (e) => { engine = e; input.placeholder = e.name; icon.src = await iconOf(e); };
    const ready = (async () => {
      try { svc = Services.search || ChromeUtils.importESModule("moz-src:///toolkit/components/search/SearchService.sys.mjs").SearchService;
        engines = await svc.getVisibleEngines(); await useEngine(await svc.getDefault()); }
      catch (e) { input.placeholder = "Search"; icon.src = IMG + "search-provider.png"; }
    })();
    const { FormHistory } = ChromeUtils.importESModule("resource://gre/modules/FormHistory.sys.mjs");
    const run = guard((where = "current", text = input.value.trim(), e = engine) => {
      if (!text) return; close();
      FormHistory.update({ op: "bump", fieldname: "searchbar-history", value: text }).catch(() => {});
      const spec = e ? e.getSubmission(text).uri.spec : "https://www.google.com/search?q=" + encodeURIComponent(text);
      openTrustedLinkIn(spec, where);
    });
    const find = guard(() => { const text = input.value.trim(); close(); gLazyFindCommand("onFindCommand").then(() => { if (text && window.gFindBar) { gFindBar._findField.value = text; gFindBar._find(text); } }); });

    // drop-down: suggestions, history, provider strip
    const panel = html("div", { id: "ie8-search-panel", hidden: "true" }), list = html("div", { id: "ie8-search-list" }), strip = html("div", { id: "ie8-search-strip" });
    panel.append(list, strip); item.appendChild(panel);
    let rows = [], sel = -1, typed = "", ticket = 0;
    panel.setAttribute("popover", "manual");
    const close = () => { panel.hidden = true; sel = -1; try { panel.hidePopover(); } catch (e) {} };
    const open = () => { const r = item.getBoundingClientRect(); panel.style.left = r.left + 1 + "px"; panel.style.top = r.bottom - 1 + "px"; panel.style.width = r.width - 4 + "px"; panel.hidden = false; try { if (!panel.matches(":popover-open")) panel.showPopover(); } catch (e) {} };
    const select = (n) => { sel = n; rows.forEach((r, i) => r.toggleAttribute("selected", i === n)); input.value = n < 0 ? typed : rows[n].dataset.value; };
    const section = (title, values) => { if (!values.length) return; const h = html("div", { class: "ie8-sp-head" }); h.textContent = title; list.appendChild(h);
      for (const v of values) { const r = html("div", { class: "ie8-sp-row" }); r.dataset.value = v; r.textContent = v; r.addEventListener("mousedown", (ev) => { ev.preventDefault(); if (ev.button === 0) { input.value = v; run("current", v); } }); list.appendChild(r); rows.push(r); } };
    const paintStrip = async () => { strip.textContent = "";
      const glass = html("img", { id: "ie8-sp-glass", title: "Search providers" }); glass.src = IMG + "search-go.png"; strip.appendChild(glass);
      for (const e of engines) { const b = html("img", { class: "ie8-sp-engine", title: e.name }); b.src = await iconOf(e); b.toggleAttribute("current", e === engine);
        b.addEventListener("mousedown", async (ev) => { ev.preventDefault(); if (ev.button !== 0) return; await useEngine(e); if (input.value.trim()) run("current"); else { paintStrip(); refresh(); } }); strip.appendChild(b); }
      const f = html("span", { id: "ie8-sp-find" }); f.textContent = "Find..."; f.addEventListener("mousedown", (ev) => { ev.preventDefault(); if (ev.button === 0) find(); }); strip.appendChild(f); };
    const refresh = guard(async () => {
      await ready; const mine = ++ticket, text = input.value.trim(); typed = input.value;
      let past = []; try { past = (await FormHistory.search(["value", "lastUsed"], { fieldname: "searchbar-history" })).sort((a, b) => b.lastUsed - a.lastUsed).map((r) => r.value).filter((v) => !text || v.toLowerCase().startsWith(text.toLowerCase())).slice(0, 5); } catch (e) {}
      let sugg = [];
      if (text && engine && Services.prefs.getBoolPref("browser.search.suggest.enabled", true)) { try { const sub = engine.getSubmission(text, "application/x-suggestions+json"); if (sub) { const res = await fetch(sub.uri.spec, { credentials: "omit" }); const data = await res.json(); sugg = (data[1] || []).filter((v) => typeof v === "string" && !past.includes(v)).slice(0, 8); } } catch (e) {} }
      if (mine !== ticket) return;
      list.textContent = ""; rows = []; sel = -1;
      section((engine ? engine.name : "Search") + " Suggestions", sugg); section("History", past);
      await paintStrip(); if (document.activeElement === input) open();
    });
    input.addEventListener("input", refresh);
    input.addEventListener("focus", refresh);
    input.addEventListener("blur", () => setTimeout(close, 120));
    input.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") { run(ev.altKey ? "tab" : "current"); return; }
      if (ev.key === "Escape") { if (!panel.hidden) { ev.preventDefault(); input.value = typed; close(); } return; }
      if ((ev.key === "ArrowDown" || ev.key === "ArrowUp") && rows.length) { ev.preventDefault(); if (panel.hidden) { refresh(); return; } const n = ev.key === "ArrowDown" ? (sel + 2) % (rows.length + 1) - 1 : (sel < 0 ? rows.length - 1 : sel - 1); select(n); }
    });
    go.addEventListener("click", (ev) => { if (ev.button === 0) run(); });

    // arrow: providers menu
    const menu = xul("menupopup", { id: "ie8-search-menu" }); $("mainPopupSet").appendChild(menu);
    menu.addEventListener("popupshowing", guard(() => { menu.textContent = "";
      for (const e of engines) { const m = xul("menuitem", { label: e.name, type: "radio", name: "ie8-engine" }); if (e === engine) m.setAttribute("checked", "true"); m.addEventListener("command", () => useEngine(e)); menu.appendChild(m); }
      menu.appendChild(xul("menuseparator"));
      const add = (label, fn) => { const m = xul("menuitem", { label }); m.addEventListener("command", guard(fn)); menu.appendChild(m); };
      add("Find on this Page...", find);
      add("Find More Providers...", () => openTrustedLinkIn("https://addons.mozilla.org/firefox/search-tools/", "tab"));
      add("Manage Search Providers", () => openPreferences("paneSearch"));
      if (engine && svc) add("Make " + engine.name + " the Default", () => (svc.setDefault ? svc.setDefault(engine, Ci.nsISearchService.CHANGE_REASON_USER) : null));
    }));
    drop.addEventListener("click", (ev) => { if (ev.button === 0) { close(); menu.openPopup(item, "after_end", 0, 0, false, false); } });
  }

  // favorites bar
  function buildFavoritesBar() {
    const bar = $("PersonalToolbar"); if (!bar || $("ie8-favorites")) return;
    const fav = xul("toolbarbutton", { id: "ie8-favorites", class: "ie8-fb", label: "Favorites", tooltiptext: "View favorites, feeds, and history (Alt+C)" });
    fav.addEventListener("command", guard(() => (window.SidebarController || window.SidebarUI).toggle("viewBookmarksSidebar")));
    const add = xul("toolbarbutton", { id: "ie8-addfav", class: "ie8-fb", tooltiptext: "Add to Favorites Bar" });
    add.addEventListener("command", guard(async () => {
      const browser = gBrowser.selectedBrowser, url = browser.currentURI?.spec;
      if (!url || /^about:(blank|newtab|home)$/.test(url)) return;
      await PlacesUtils.bookmarks.insert({ parentGuid: PlacesUtils.bookmarks.toolbarGuid, url, title: browser.contentTitle || gBrowser.selectedTab.label || url });
    }));
    const lead = xul("hbox", { id: "ie8-favbar-lead", align: "center" }, [fav, xul("box", { id: "ie8-favbar-sep" }), add]);
    bar.insertBefore(lead, bar.firstChild);
  }

  // favorite arrows
  function buildFavoriteArrows() {
    const items = $("PlacesToolbarItems"); if (!items || items.dataset.ie8Arrows) return; items.dataset.ie8Arrows = "1";
    const markIconless = guard(async () => {
      for (const b of items.querySelectorAll(":scope > toolbarbutton.bookmark-item:not([container])")) {
        const url = b._placesNode?.uri; if (url) tagSite(b, siteOfUrl(url)); if (!url || b.dataset.ie8IconChecked === url) continue; b.dataset.ie8IconChecked = url;
        let has = false;
        try { const f = await PlacesUtils.favicons.getFaviconForPage(Services.io.newURI(url)); has = !!f; } catch (e) { has = true; }
        b.toggleAttribute("ie8-noicon", !has);
      }
    });
    new MutationObserver(() => setTimeout(markIconless, 300)).observe(items, { childList: true });
    setTimeout(markIconless, 1500);
    const ARROW_ZONE = 15;
    const onArrow = (ev) => { const b = ev.target.closest?.("toolbarbutton.bookmark-item"); if (!b || b.parentNode !== items || b.hasAttribute("container")) return null;
      return ev.clientX >= b.getBoundingClientRect().right - ARROW_ZONE ? b : null; };
    const swallow = (ev) => { if (ev.button === 0 && onArrow(ev)) { ev.preventDefault(); ev.stopPropagation(); } };
    for (const type of ["mousedown", "mouseup", "command", "dragstart"]) items.addEventListener(type, swallow, true);
    items.addEventListener("click", guard((ev) => {
      if (ev.button !== 0) return; const b = onArrow(ev); if (!b) return;
      ev.preventDefault(); ev.stopPropagation();
      const popup = $("placesContext"); if (!popup) return;
      const r = b.getBoundingClientRect();
      const trigger = new MouseEvent("contextmenu", { bubbles: true, cancelable: true, view: window, button: 2, clientX: Math.round(r.left + 4), clientY: Math.round(r.bottom - 2),
        screenX: Math.round(window.mozInnerScreenX + r.left + 4), screenY: Math.round(window.mozInnerScreenY + r.bottom - 2) });
      b.dispatchEvent(trigger);
    }), true);
  }

  // command bar
  function buildCommandBar() {
    const tabsBar = $("TabsToolbar"); if (!tabsBar || $("ie8-commandbar")) return;
    const openMenu = (popupId) => (ev) => { const p = $(popupId); if (p) p.openPopup(ev.currentTarget, "after_start", 0, 0, false, false); };
    const safety = xul("menupopup", { id: "ie8-safety-popup" });
    const mi = (label, fn) => { const m = xul("menuitem", { label }); m.addEventListener("command", guard(fn)); safety.appendChild(m); };
    mi("Delete Browsing History...", () => Sanitizer.showUI(window));
    mi("InPrivate Browsing", () => OpenBrowserWindow({ private: true }));
    safety.appendChild(xul("menuseparator"));
    mi("Security Report", () => $("identity-icon-box")?.click());
    mi("Pop-up Blocker and Privacy Settings", () => openPreferences("panePrivacy"));
    $("mainPopupSet").appendChild(safety);
    const defs = [
      ["home", "", "Home (Alt+M)", true, () => BrowserCommands.home()],
      ["feeds", "", "No feeds detected on this page", true, null],
      ["mail", "", "Read Mail", false, () => { if ($("ie8-cb-mail").hasAttribute("ie8-on")) openTrustedLinkIn("mailto:", "current"); }],
      ["print", "", "Print (Ctrl+P)", true, () => PrintUtils.startPrintWindow(gBrowser.selectedBrowser.browsingContext)],
      ["page", "Page", "Page (Alt+P)", true, openMenu("menu_FilePopup")],
      ["safety", "Safety", "Safety (Alt+S)", true, openMenu("ie8-safety-popup")],
      ["tools", "Tools", "Tools (Alt+O)", true, openMenu("menu_ToolsPopup")],
      ["help", "", "Help", true, openMenu("menu_HelpPopup")],
    ];
    const bar = xul("hbox", { id: "ie8-commandbar", align: "center" });
    for (const [name, label, tip, arrow, fn] of defs) {
      const kids = [];
      if (!label) kids.push(xul("image", { class: "ie8-cb-icon" })); else kids.push(xul("label", { class: "ie8-cb-label", value: label }));
      if (arrow) kids.push(xul("box", { class: "ie8-cb-arrow" }));
      const b = xul("hbox", { id: "ie8-cb-" + name, class: "ie8-cb", align: "center", tooltiptext: tip, role: "button" }, kids);
      if (fn) b.addEventListener("click", (ev) => { if (ev.button === 0) guard(fn)(ev); }); else b.setAttribute("disabled", "true");
      bar.appendChild(b);
    }
    tabsBar.appendChild(bar);
    // feeds: click toggles. mail: right click toggles
    const toggle = (btn, pref, def, tips, apply) => { const set = (on) => { btn.toggleAttribute("ie8-on", on); btn.setAttribute("tooltiptext", tips[on ? 1 : 0]); if (apply) apply(on); }; set(Services.prefs.getBoolPref(pref, def));
      return () => { const on = !btn.hasAttribute("ie8-on"); Services.prefs.setBoolPref(pref, on); set(on); }; };
    const feeds = $("ie8-cb-feeds"), mail = $("ie8-cb-mail");
    feeds.removeAttribute("disabled");
    const flipFeeds = toggle(feeds, "ie8.cmd.feeds.on", false, ["No feeds detected on this page", "View feeds on this page (Alt+J)"]);
    feeds.addEventListener("click", (ev) => { if (ev.button === 0) flipFeeds(); });
    const flipMail = toggle(mail, "ie8.cmd.mail.on", true, ["Read Mail (off, right click to turn on)", "Read Mail"]);
    mail.addEventListener("contextmenu", (ev) => { ev.preventDefault(); ev.stopPropagation(); flipMail(); });
  }

  // status bar
  function buildStatusBar() {
    if ($("ie8-statusbar")) return;
    const text = xul("label", { id: "ie8-status-text", value: "Done", crop: "end", flex: "1" });
    const panes = [];
    const zone = xul("hbox", { id: "ie8-status-zone", align: "center", pack: "center" }, [xul("image", { id: "ie8-status-zone-icon" }), xul("label", { value: "Internet | Protected Mode: On" })]);
    const zoomLabel = xul("label", { id: "ie8-status-zoom", value: "100%" });
    const zoomBtn = xul("box", { id: "ie8-status-right-b", tooltiptext: "Change zoom level" });
    const right = xul("hbox", { id: "ie8-status-right" }, [xul("box", { id: "ie8-status-right-a" }), zoomLabel, zoomBtn]);
    const bar = xul("hbox", { id: "ie8-statusbar", align: "stretch" }, [text, ...panes, zone, right]);
    let baseZoom = 1;
    const readBase = async () => { try { baseZoom = (await ZoomUI.getGlobalValue()) || 1; } catch (e) { baseZoom = 1; } };
const STEPS = [0.5, 0.75, 1, 1.1, 1.25, 1.5, 1.75, 2, 3, 4], NICE = STEPS.map((s) => Math.round(s * 100));
    const shown = () => { const pct = (ZoomManager.zoom / baseZoom) * 100; return NICE.find((v) => Math.abs(pct - v) < 1.6) ?? Math.round(pct); };
    let stepsFor = 0;
    const paintZoom = guard(async () => {
      await readBase();
      if (stepsFor !== baseZoom) { stepsFor = baseZoom; Services.prefs.setStringPref("toolkit.zoomManager.zoomValues", STEPS.map((s) => +(s * baseZoom).toFixed(3)).join(",")); }
      zoomLabel.setAttribute("value", shown() + "%");
    });
    (async () => {
      try {
        const off = Services.prefs.getStringPref("userChromeJS.scriptsDisabled", "").includes("ie8_laptop_zoom.uc.js");
        if (off && Services.prefs.getBoolPref("ie8.laptopZoom.active", false)) {
          const cps = Cc["@mozilla.org/content-pref/service;1"].getService(Ci.nsIContentPrefService2);
          await new Promise((r) => cps.setGlobal("browser.content.full-zoom", 1.25, Cu.createLoadContext(), { handleCompletion: r, handleError: r, handleResult() {} }));
          Services.prefs.setBoolPref("ie8.laptopZoom.active", false);
        }
      } catch (e) { console.error(e); }
      paintZoom();
    })();
    window.addEventListener("IE8BaseZoomChanged", () => setTimeout(paintZoom, 100));
    for (const ev of ["FullZoomChange", "TextZoomChange"]) window.addEventListener(ev, () => setTimeout(paintZoom, 0));
    gBrowser.tabContainer.addEventListener("TabSelect", () => setTimeout(paintZoom, 50));
    gBrowser.addTabsProgressListener({ onLocationChange(browser) { if (browser === gBrowser.selectedBrowser) setTimeout(paintZoom, 80); } });
    const cycle = guard(() => { const now = shown(); const next = now < 125 ? 1.25 : now < 150 ? 1.5 : 1; FullZoom.setZoom(next * baseZoom); setTimeout(paintZoom, 50); });
    for (const n of [zoomLabel, zoomBtn]) n.addEventListener("click", (ev) => { if (ev.button === 0) cycle(); });
    const browser = $("browser"); browser.parentNode.insertBefore(bar, browser.nextSibling);
    const native = $("statuspanel-label");
    const sync = guard(() => { const idle = !$("statuspanel") || $("statuspanel").hasAttribute("inactive"); const v = idle ? "" : (native?.getAttribute("value") || native?.value || ""); text.setAttribute("value", v || (gBrowser.selectedTab.hasAttribute("busy") ? "Waiting for " + (gBrowser.selectedBrowser.currentURI?.host || "") + "..." : "Done")); });
    if (native) new MutationObserver(sync).observe(native, { attributes: true });
    const panel = $("statuspanel"); if (panel) new MutationObserver(sync).observe(panel, { attributes: true });
    gBrowser.tabContainer.addEventListener("TabSelect", sync);
    gBrowser.tabContainer.addEventListener("TabAttrModified", (ev) => { if (ev.target === gBrowser.selectedTab) sync(); });
  }

  function buildAddressDropdown() {
    const results = $("urlbar-results");
    if (!results) { const bar = $("urlbar"); if (!bar || bar.ie8Waiting) return; bar.ie8Waiting = true; const wait = new MutationObserver(() => { if ($("urlbar-results")) { wait.disconnect(); guard(buildAddressDropdown)(); } }); wait.observe(bar, { childList: true, subtree: true }); return; }
    const mark = guard(() => {
      const seen = new Set();
      for (const row of results.children) {
        if (row.getAttribute("dynamicType") === "actions") { for (const btn of row.querySelectorAll(".urlbarView-action-btn")) { tagSite(btn, siteOfText(btn.textContent)); }
          if (row.getAttribute("ie8-group") !== "actions") row.setAttribute("ie8-group", "actions"); row.removeAttribute("ie8-first"); continue; }
        const r = row.result; if (!r) continue; const type = row.getAttribute("type") || "", isSearch = type === "search" || /RecentSearches|SearchSuggestions/.test(r.providerName || "") || !!(r.payload && r.payload.engine && !r.payload.url);
        const typed = (r.payload && (r.payload.query || r.payload.input)) || gURLBar.value || "";
        let group = "History", label = "History";
        if (r.heuristic) { group = "goto"; (row.querySelector(".urlbarView-row-inner") || row).setAttribute("ie8-goto", (isSearch ? "Search for ' " : "Go to ' ") + (isSearch ? typed : (r.payload.url || typed).replace(/^https?:\/\//, "").replace(/\/$/, "")) + " '"); }
        else if (isSearch) { group = "search"; label = /recent|history/i.test(r.providerName || "") || (r.payload && r.payload.isSearchHistory) ? "Recent Searches" : "Search Suggestions"; }
        else if (type === "bookmark") { group = "favorites"; label = "Favorites"; }
        if (row.getAttribute("ie8-group") !== group) row.setAttribute("ie8-group", group);
        const u = (r.payload && r.payload.url) || ""; if (row.ie8FavUrl !== u) { row.ie8FavUrl = u; row.removeAttribute("ie8-fav"); }
        tagSite(row.querySelector(".urlbarView-favicon"), u ? siteOfUrl(u) : "");
        const canFav = !!u && group !== "goto" && group !== "search"; if (canFav !== row.hasAttribute("ie8-canfav")) row.toggleAttribute("ie8-canfav", canFav);
        const first = group !== "goto" && !seen.has(group); seen.add(group);
        if (first) { if (row.getAttribute("ie8-first") !== label) row.setAttribute("ie8-first", label); } else if (row.hasAttribute("ie8-first")) row.removeAttribute("ie8-first");
      }
    });
    const star = (ev) => { const icon = ev.target.closest && ev.target.closest(".urlbarView-type-icon"), row = icon && icon.closest(".urlbarView-row[ie8-canfav]"); return ev.button === 0 && row ? row : null; };
    for (const type of ["mousedown", "mouseup"]) results.addEventListener(type, (ev) => { if (star(ev)) { ev.stopPropagation(); ev.preventDefault(); } }, true);
    results.addEventListener("click", guard(async (ev) => { const row = star(ev); if (!row) return; ev.stopPropagation(); ev.preventDefault();
      const url = row.ie8FavUrl, on = row.hasAttribute("ie8-fav") ? row.getAttribute("ie8-fav") === "true" : row.getAttribute("type") === "bookmark";
      if (on) { const found = []; await PlacesUtils.bookmarks.fetch({ url }, (b) => found.push(b)); for (const b of found) await PlacesUtils.bookmarks.remove(b); }
      else await PlacesUtils.bookmarks.insert({ parentGuid: PlacesUtils.bookmarks.unfiledGuid, url, title: (row.result.payload && row.result.payload.title) || url });
      if (row.ie8FavUrl === url) row.setAttribute("ie8-fav", on ? "false" : "true"); }), true);
    new MutationObserver(mark).observe(results, { childList: true, subtree: true, attributes: true, attributeFilter: ["type", "selected"] });
    mark();
  }

  function buildResultMenu() {
    const menu = $("urlbarView-context-menu"); if (!menu || menu.ie8Done) return; menu.ie8Done = true;
    let row = null, query = "";
    const item = (id, label, run) => { const m = xul("menuitem", { id, label }); m.addEventListener("command", (ev) => { ev.stopPropagation(); guard(run)(); }); return m; };
    const url = () => row && row.result && row.result.payload && row.result.payload.url;
    const open = item("ie8-result-open", "Open", () => { if (url()) { gURLBar.view.close(); openTrustedLinkIn(url(), "current"); } });
    open.setAttribute("default", "true"); menu.insertBefore(open, menu.firstChild);
    menu.appendChild(xul("menuseparator", { id: "ie8-result-sep" }));
    menu.appendChild(item("ie8-result-copy", "Copy Address", () => { if (url()) Cc["@mozilla.org/widget/clipboardhelper;1"].getService(Ci.nsIClipboardHelper).copyString(url()); }));
    const del = item("ie8-result-delete", "Delete", async () => { const r = row && row.result; if (!r) return;
      if (url()) await PlacesUtils.history.remove(url());
      else if (r.payload && r.payload.suggestion) { const { FormHistory } = ChromeUtils.importESModule("resource://gre/modules/FormHistory.sys.mjs"); await FormHistory.update({ op: "remove", fieldname: "searchbar-history", value: r.payload.suggestion }); }
      gURLBar.view.close(); gURLBar.focus(); gURLBar.startQuery({ allowAutofill: false, event: null, searchString: query }); });
    menu.appendChild(del);
    menu.addEventListener("popupshowing", (ev) => { if (ev.target !== menu) return; query = (gURLBar.view.queryContext && gURLBar.view.queryContext.searchString) || ""; row = ev.triggerEvent && ev.triggerEvent.target.closest ? ev.triggerEvent.target.closest(".urlbarView-row") : null;
      const type = row ? row.getAttribute("type") || "" : ""; del.hidden = !row || type === "bookmark" || row.getAttribute("ie8-group") === "goto"; open.hidden = !url(); });
  }

  function buildMenuBar() { const m = $("bookmarksMenu"); if (m) { m.removeAttribute("data-l10n-id"); m.setAttribute("label", "Favorites"); m.setAttribute("accesskey", "a"); } }

  function buildSiteIcons() {
    const tag = guard((tab) => { let spec = ""; try { spec = tab.linkedBrowser.currentURI.spec; } catch (e) {} tagSite(tab, siteOfUrl(spec)); });
    for (const t of gBrowser.tabs) tag(t);
    for (const ev of ["TabOpen", "TabAttrModified", "TabSelect", "SSTabRestored"]) gBrowser.tabContainer.addEventListener(ev, (e) => tag(e.target));
    gBrowser.addTabsProgressListener({ onLocationChange(browser, progress) { if (progress.isTopLevel) { const t = gBrowser.getTabForBrowser(browser); if (t) tag(t); } } });
  }

  function buildPopupFrame() {
    if (!isPopup() || typeof CustomTitlebar === "undefined") return;
    // firefox turns its own titlebar off for single-tab popups, which left the desktop's title bar over ours
    const allowed = CustomTitlebar.allowedBy.bind(CustomTitlebar);
    CustomTitlebar.allowedBy = (condition, allow) => allowed(condition, condition === "non-popup" ? true : allow);
    allowed("non-popup", true);
  }

  function loadPartsSheet() { window.windowUtils.loadSheetUsingURIString("chrome://userchrome/content/ie8/ie8-parts.css", window.windowUtils.AUTHOR_SHEET); }

  function layout() {
    for (const step of [loadPartsSheet, placeWidgets, buildCaption, buildRecentPages, buildAddressBox, buildSearchBox, buildFavoritesBar, buildFavoriteArrows, buildCommandBar, buildStatusBar, buildAddressDropdown, buildMenuBar, buildResultMenu, buildSiteIcons, buildPopupFrame]) guard(step)();
    document.documentElement.setAttribute("ie8", "true");
  }
  if (gBrowserInit.delayedStartupFinished) layout();
  else {
    const obs = (subject) => { if (subject === window) { Services.obs.removeObserver(obs, "browser-delayed-startup-finished"); layout(); } };
    Services.obs.addObserver(obs, "browser-delayed-startup-finished");
  }
})();
