import { ipcMain } from "electron";
import { CommandRegistry } from "../registry/CommandRegistry/CommandRegistry.js";

let channels: string[] = ["extension", "tab", "frame-action"];

export default function setupIPCChannels<T extends keyof CommandPayloadMapping>() {
  for (let channel of channels) {
    ipcMain.handle(channel, async (_, command: T, payload: CommandPayloadMapping[T]["request"]) => {
      return await CommandRegistry.execute(command, payload);
    });

    ipcMain.on(channel, (_, command: T, payload: CommandPayloadMapping[T]["request"]) => {
      CommandRegistry.execute(command, payload);
    });
  }
}
