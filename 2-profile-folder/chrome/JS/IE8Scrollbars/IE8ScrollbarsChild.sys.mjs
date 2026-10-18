// puts the win7 scrollbar + form-control sheets into every page as agent sheets
export class IE8ScrollbarsChild extends JSWindowActorChild {
  handleEvent() {
    const win = this.contentWindow; if (!win || win.ie8Scrollbars) return;
    for (const key of ["ie8-scrollbars-uri", "ie8-forms-uri"]) {
      const uri = Services.cpmm.sharedData.get(key); if (!uri) continue;
      try { win.windowUtils.loadSheetUsingURIString(uri, win.windowUtils.AGENT_SHEET); } catch (e) {}
    }
    win.ie8Scrollbars = true;
  }
  receiveMessage() { this.handleEvent(); }
}
