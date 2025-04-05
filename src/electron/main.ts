import { app, BrowserWindow,  Menu } from "electron";
import path from "path";
import { ipcMainOn, isDev } from "./utils.js";
import { getPreloadFilePath } from "./pathResolver.js";

import { initializeTabManager } from "./core/services/TabService/TabManager.js";

import { initializeExtensionManager } from "./core/services/ExtensionService/ExtensionManager.js";
import setupIPCChannels from "./core/ipc/ipc.js";
import { ExtensionService } from "./core/services/services.js";
import { ServiceRegistry } from "./core/registry/ServiceRegistry/ServiceRegistry.js";
import TabService from "./core/services/TabService/TabService.js";

Menu.setApplicationMenu(null);

let mainWindow: BrowserWindow;

app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    minWidth: 600,
    minHeight: 600,
    webPreferences: {
      preload: getPreloadFilePath(),
    },
    frame: false,
  });

  if (isDev()) {
    mainWindow.loadURL("http://localhost:5123");
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path.join(app.getAppPath(), "/dist-react/index.html"));
  }

  ipcMainOn("sendFrameAction", frameActionHandler);

  // Registering ExtensionService to ServiceRegistry
  ServiceRegistry.registerService("ExtensionService", ExtensionService);
  ServiceRegistry.registerService("TabService", TabService);

  // Initalizing managers
  initializeTabManager(mainWindow);
  initializeExtensionManager(mainWindow);

  setupIPCChannels();
});

// async function selectFolderAndReadFile() {
//   const { canceled, filePaths } = await dialog.showOpenDialog({
//     filters: [{ name: "All Files", extensions: ["*"] }],
//     properties: ["openDirectory"],
//   });

//   if (canceled) {
//     console.log("Folder selection cancelled");

//     return;
//   }

//   const selectedFolderPath = filePaths[0];

//   try {
//     const files = await fsPromises.readdir(selectedFolderPath);

//     if (files.length === 0) {
//       console.log("The folder is empty");
//       return;
//     }

//     const indexHTML = files.find((file) => file === "index.html");

//     // if index.html file exists
//     if (indexHTML) {
//       const fullPath = path.join(selectedFolderPath, "index.html");

//       const extensionInfo = extensionManager.installExtension(fullPath);

//       return extensionInfo;
//       // dialog.showMessageBox({
//       //   message: `${fullPath}`,
//       //   type: "info",
//       // });
//     } else {
//       dialog.showMessageBox({
//         message: "index.html does not exist in the selected directory",
//         type: "error",
//       });
//     }
//   } catch (err) {
//     console.log("Error reading directory", err);
//   }
// }

function frameActionHandler(payload: FrameWindowAction) {
  switch (payload) {
    case "CLOSE":
      mainWindow.close();
      break;
    case "MINIMIZE":
      mainWindow.minimize();
      break;
    case "MAXIMIZE":
      if (mainWindow.isMaximized()) {
        mainWindow.restore();
      } else {
        mainWindow.maximize();
      }
  }
}

app.on("before-quit", async () => {
  // extensionManager.stop();

  await ServiceRegistry.stopAllService();
});
