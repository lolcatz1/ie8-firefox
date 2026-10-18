const hooked = new WeakSet();
const step = () => Math.max(10, Services.prefs.getIntPref("ie8.scroll.stepPx", 100));

function scroller(win, node, dx, dy) {
  for (let el = node; el && el.nodeType === 1; el = el.parentElement || el.getRootNode()?.host) {
    const cs = win.getComputedStyle(el);
    if (dy && /(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 1 && (dy > 0 ? el.scrollTop + el.clientHeight < el.scrollHeight - 1 : el.scrollTop > 0)) return el;
    if (dx && /(auto|scroll)/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 1 && (dx > 0 ? el.scrollLeft + el.clientWidth < el.scrollWidth - 1 : el.scrollLeft > 0)) return el;
  }
  return null;
}

export class IE8ScrollChild extends JSWindowActorChild {
  receiveMessage(msg) { if (msg.name === "scrollY") return Math.round(this.contentWindow?.scrollY ?? -1); }
  handleEvent() {
    const win = this.contentWindow; if (!win || hooked.has(win)) return; hooked.add(win);
    let accX = 0, accY = 0, last = 0;
    // a plain non-passive listener makes firefox wait for us instead of scrolling on its own thread
    win.addEventListener("wheel", () => {}, { passive: false });
    win.addEventListener("wheel", (e) => {
      try {
        if (e.deltaMode !== 0 || e.ctrlKey || e.defaultPrevented || !e.cancelable) return;
        e.preventDefault();
        if (e.timeStamp - last > 400) accX = accY = 0;
        last = e.timeStamp; accX += e.deltaX; accY += e.deltaY;
        const s = step(), nx = Math.trunc(accX / s), ny = Math.trunc(accY / s);
        if (!nx && !ny) return;
        accX -= nx * s; accY -= ny * s;
        (scroller(win, e.target, nx, ny) || win).scrollBy({ left: nx * s, top: ny * s, behavior: "instant" });
      } catch (err) { console.error("ie8 scroll", err); }
    }, { passive: false, mozSystemGroup: true });
  }
}
