import path from "path";
import { app } from "electron";
import { isDev } from "./utils.js";

export function getPreloadFilePath() {
  return path.join(app.getAppPath(), isDev() ? "." : "..", "/dist-electron/preload/preload.cjs");
}
