export class IE8DumpChild extends JSWindowActorChild {
  receiveMessage(msg) { if (msg.name === "dump") { const d = this.document; return "<!DOCTYPE html>\n" + (d && d.documentElement ? d.documentElement.outerHTML : ""); } }
}
