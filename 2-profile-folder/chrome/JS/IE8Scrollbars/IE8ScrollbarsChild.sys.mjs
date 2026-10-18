// puts the win7 scrollbar sheet into every page as an agent sheet
export class IE8ScrollbarsChild extends JSWindowActorChild {
  handleEvent() {
    const win = this.contentWindow; if (!win || win.ie8Scrollbars) return;
    const uri = Services.cpmm.sharedData.get("ie8-scrollbars-uri"); if (!uri) return;
    try { win.windowUtils.loadSheetUsingURIString(uri, win.windowUtils.AGENT_SHEET); win.ie8Scrollbars = true; } catch (e) {}
  }
  receiveMessage() { this.handleEvent(); }
}
