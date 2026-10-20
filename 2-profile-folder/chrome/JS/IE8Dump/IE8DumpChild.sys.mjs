export class IE8DumpChild extends JSWindowActorChild {
  receiveMessage(msg) {
    if (msg.name !== "dump") return;
    const d = this.document;
    if (!d || !d.documentElement) return "<!DOCTYPE html>\n";
    const esc = (s) => String(s).replace(/--/g, "- -");
    let probe = "";
    try {
      const rows = [];
      for (const s of ["#searchform .logo", "#searchform .logo > a", "#searchform .logo svg"]) {
        const e = d.querySelector(s); if (!e) { rows.push(s + " => none"); continue; }
        const c = d.defaultView.getComputedStyle(e), b = e.getBoundingClientRect();
        rows.push(`${s} => ${Math.round(b.x)},${Math.round(b.y)} ${Math.round(b.width)}x${Math.round(b.height)} display=${c.display} vis=${c.visibility} op=${c.opacity} bg=${c.backgroundImage.slice(0, 60)}`);
      }
      const box = d.querySelector("#searchform .logo");
      if (box) for (const sh of d.styleSheets) {
        let rules; try { rules = sh.cssRules; } catch (e) { continue; }
        const where = sh.ownerNode && sh.ownerNode.className ? "style." + sh.ownerNode.className : sh.href || "inline";
        const walk = (list) => { for (const r of list) {
          if (r.cssRules && !r.selectorText) { walk(r.cssRules); continue; }
          if (!r.selectorText || !r.style) continue;
          let hit = false; try { hit = box.matches(r.selectorText); } catch (e) {}
          if (hit && r.style.visibility) rows.push(`RULE ${where}: ${r.selectorText.slice(0, 80)} { visibility: ${r.style.visibility} ${r.style.getPropertyPriority("visibility")} }`);
        } };
        walk(rules);
      }
      for (const s of d.querySelectorAll("style.stylus")) rows.push(`stylus style len=${s.textContent.length}`);
      if (rows.length) probe = "<!-- probe\n" + esc(rows.join("\n")) + "\n-->\n";
    } catch (e) { probe = `<!-- probe failed: ${esc(e)} -->\n`; }
    // same-origin frames (soundcloud's v2 layout draws the page inside one): their documents appended as templates
    let frames = "";
    try {
      for (const f of d.querySelectorAll("iframe")) {
        let fd = null; try { fd = f.contentDocument; } catch (e) {}
        if (!fd || !fd.documentElement || fd.documentElement.outerHTML.length < 2000) continue;
        frames += `\n<!-- frame ${esc(f.id || f.className).slice(0, 120)} src=${esc(f.src).slice(0, 200)} -->\n<template class="ie8-frame" data-src="${String(f.src).replace(/"/g, "&quot;").slice(0, 300)}">` + fd.documentElement.outerHTML + "</template>\n";
      }
    } catch (e) { frames = `<!-- frames failed: ${esc(e)} -->`; }
    return "<!DOCTYPE html>\n" + probe + d.documentElement.outerHTML + frames;
  }
}
