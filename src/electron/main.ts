import { app, BrowserWindow, dialog, ipcMain, Menu } from "electron";
import path from "path";
import { ipcMainOn, isDev, ipcMainHandle } from "./utils.js";
import { getPreloadFilePath } from "./pathResolver.js";
import fsPromises from "fs/promises";

import { initializeTabManager } from "./core/services/TabService/TabManager.js";
import DialogService from "./DialogService/DialogService.js";
import { pathToFileURL } from "url";
import ExtensionManager, {
  initializeExtensionManager,
} from "./core/services/ExtensionService/ExtensionManager.js";

Menu.setApplicationMenu(null);

let mainWindow: BrowserWindow;

let extensionManager: ExtensionManager;

app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
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

  // Initalizing managers
  initializeTabManager(mainWindow);
  extensionManager = initializeExtensionManager(mainWindow);
});

async function selectFolderAndReadFile() {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    filters: [{ name: "All Files", extensions: ["*"] }],
    properties: ["openDirectory"],
  });

  if (canceled) {
    console.log("Folder selection cancelled");

    return;
  }

  const selectedFolderPath = filePaths[0];

  try {
    const files = await fsPromises.readdir(selectedFolderPath);

    if (files.length === 0) {
      console.log("The folder is empty");
      return;
    }

    const indexHTML = files.find((file) => file === "index.html");

    // if index.html file exists
    if (indexHTML) {
      const fullPath = path.join(selectedFolderPath, "index.html");

      const extensionInfo = extensionManager.installExtension(fullPath);

      return extensionInfo;
      // dialog.showMessageBox({
      //   message: `${fullPath}`,
      //   type: "info",
      // });
    } else {
      dialog.showMessageBox({
        message: "index.html does not exist in the selected directory",
        type: "error",
      });
    }
  } catch (err) {
    console.log("Error reading directory", err);
  }
}

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

app.on("before-quit", () => {
  extensionManager.close();
});
