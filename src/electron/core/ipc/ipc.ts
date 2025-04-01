import { ipcMain } from "electron";
import { ipcMainHandle } from "../../utils.js";
import { CommandRegistry } from "../registry/CommandRegistry/CommandRegistry.js";

let channels: string[] = ["extension", "tab", "frame-action"];

export default function setupIPCChannels() {
  for (let channel of channels) {

    ipcMain.handle(channel, async (_, command: string, payload: any) => {
      return CommandRegistry.execute(command, payload);
    });

    ipcMain.on(channel, async (_, command: string, payload: any) => {
       CommandRegistry.execute(command, payload);
    });
  }
}
