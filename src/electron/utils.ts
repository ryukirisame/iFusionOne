import { ipcMain, WebContents } from "electron";

export function isDev(): boolean {
  return process.env.NODE_ENV === "development";
}

export function ipcMainOn<Key extends keyof EventPayloadMapping>(
  channel: Key,
  handler: (payload: EventPayloadMapping[Key]["request"]) => void
) {
  ipcMain.on(channel, (event, payload) => {
    return handler(payload);
  });
}

export function ipcMainHandle<key extends keyof EventPayloadMapping>(
  channel: key,
  handler: (
    payload: EventPayloadMapping[key]["request"]
  ) =>
    | Promise<EventPayloadMapping[key]["response"]>
    | EventPayloadMapping[key]["response"]
    | undefined
) {
  ipcMain.handle(channel, async (_event, payload) => {
    return await handler(payload);
  });
}


// export function ipcMainHandle<key extends keyof EventPayloadMapping>(
//   channel: key
// ) {
//   ipcMain.handle(channel, async (_event, {command, args}) => {
//     return await handler(payload);
//   });
// }

export function ipcWebContentsSend<key extends keyof EventPayloadMapping>(
  key: key,
  webContents: WebContents,
  payload: EventPayloadMapping[key]["request"]
) {
  webContents.send(key, payload);
}
