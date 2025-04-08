import { BrowserWindow, dialog } from "electron";
import setupIPCChannels from "./ipc/ipc.js";
import { CommandRegistry } from "./registry/CommandRegistry/CommandRegistry.js";
import { ServiceRegistry } from "./registry/ServiceRegistry/ServiceRegistry.js";
import { ExtensionService, TabService } from "./services/services.js";

export default class AppInitializer {

  private static instance: AppInitializer;
  private window: BrowserWindow;

  private constructor(window: BrowserWindow) {
    this.window = window;
  }

  public static getInstance(window: BrowserWindow) {
    if (!AppInitializer.instance) {
      AppInitializer.instance = new AppInitializer(window);
    }
    return this.instance;
  }

  initialize() {
    // Set up IPC channels
    setupIPCChannels();

    // Register services
    this.registerServices();

    // Register Commands
    this.registerTabCommandHandlers(this.window);
    this.registerExtensionCommandHandlers(this.window);
  }

  registerServices() {
    ServiceRegistry.registerService("ExtensionService", ExtensionService);
    ServiceRegistry.registerService("TabService", TabService);
  }

  async registerExtensionCommandHandlers(window: BrowserWindow) {
    
    const extensionService: ExtensionService = await ServiceRegistry.getService("ExtensionService");

    CommandRegistry.register("extension:install", async () => {
      // Showing dialog box to select the directory of the extension
      const result = await dialog.showOpenDialog(window, {
        title: "Select a folder",
        properties: ["openDirectory"],
        filters: [{ name: "All Files", extensions: ["*"] }],
      });

      // If folder selection cancelled
      if (result.canceled || result.filePaths.length === 0) {
        return {
          isSuccess: false,
          message: "Folder selection cancelled.",
          error: ["Folder selection cancelled"],
        };
      }

      // Extract the path
      const path = result.filePaths[0];

      // Install extension from the path
      let res = await extensionService.installExtension(path);

      return prepareResponse(res);
    });

    CommandRegistry.register("extension:uninstall", async ({ extensionId }) => {
      return prepareResponse(await extensionService.uninstallExtension(extensionId));
    });

    CommandRegistry.register("extension:list", async () => {
      return prepareResponse(await extensionService.listExtensions());
    });

    function prepareResponse<T>(res: ExtensionServiceResponse<T>) {
      if (!res.isSuccess) {
        return {
          ...res,
          error: res.error?.getCauseMessageChainArray(), // Return string version of the errors
        };
      }

      return res as MainToRendererResponse<T>;
    }
  }

  async registerTabCommandHandlers(window: BrowserWindow) {
    const tabService: TabService = await ServiceRegistry.getService("TabService", window);

    CommandRegistry.register("tab:create", async function ({ extensionId }) {
      return prepareResponse(await tabService.createTab(extensionId));
    });

    CommandRegistry.register("tab:close", ({ tabId }) => {
      return prepareResponse(tabService.closeTab(tabId));
    });

    CommandRegistry.register("tab:switch", ({ tabId }) => {
      return prepareResponse(tabService.switchToTab(tabId));
    });

    CommandRegistry.register("tab:reorder", (payload) => {
      return prepareResponse(tabService.reorderTab(payload.fromIndex, payload.toIndex));
    });

    CommandRegistry.register("tab:hide-all", () => {
      return prepareResponse(tabService.hideAllTabs());
    });

    CommandRegistry.register("tab:hide", function (payload) {
      return prepareResponse(tabService.hideTab(payload.tabId));
    });
    CommandRegistry.register("tab:show", (payload) => {
      return prepareResponse(tabService.showTab(payload.tabId));
    });

    CommandRegistry.register("tab:close-extension", (payload) => {
      return prepareResponse(tabService.closeExtensionById(payload.extensionId));
    });

    function prepareResponse<T>(res: TabServiceResponse<T>) {
      if (!res.isSuccess) {
        // Return a serialzed version of the errors field
        return {
          ...res,
          error: res.error?.getCauseMessageChainArray(),
        };
      }

      return res as MainToRendererResponse<T>;
    }
  }
}
