import { WebContentsView } from "electron";
import BaseError from "../../errors/BaseError.js";
import { ServiceRegistry } from "../../registry/ServiceRegistry/ServiceRegistry.js";
import Service from "../Service.js";
import ExtensionManager from "./ExtensionManager.js";

type ExtensionServiceResponse<T> = {
  isSuccess: boolean;
  message: string;
  error?: string[]; // The error message chain
  data?: T;
};

export default class ExtensionService extends Service {
  private extensionManager: ExtensionManager;

  constructor() {
    super();
    this.extensionManager = ExtensionManager.getInstance();
    this.extensionManager.initialize();
  }

  // Overriding stop()
  async stop() {
    // Closing the repository database.
    await this.extensionManager.close();

    super.stop();
  }

  async installExtension(
    sourcePath: string
  ): Promise<ExtensionServiceResponse<{ uniqueId: string }>> {
    let response: ExtensionServiceResponse<{ uniqueId: string }>;

    try {
      let { extensionName, uniqueId } = await this.extensionManager.installExtension(sourcePath);

      response = {
        isSuccess: true,
        message: `${extensionName} installed successfully.`,
        data: { uniqueId },
      };

      console.log(`${extensionName} installed successfully.`, response);
    } catch (error) {
      // Handle errors
      let errorMessageChain: string[] = [];

      if (error instanceof BaseError) {
        errorMessageChain = error.getCauseChainArray();
      } else {
        errorMessageChain = [(error as Error).message || "An unknown error occurred."];

        // Log the unknown error
        console.error(error);
      }

      response = {
        isSuccess: false,
        message: `Failed to install extension.`,
        error: errorMessageChain,
      };

      console.log("Failed to install extension", response);
    }

    return response;
  }

  async uninstallExtension(
    extensionUniqueId: string
  ): Promise<ExtensionServiceResponse<{ uniqueId: string }>> {
    let response: ExtensionServiceResponse<{ uniqueId: string }>;

    try {
      const uniqueId = await this.extensionManager.uninstallExtension(extensionUniqueId);

      response = {
        isSuccess: true,
        message: `Extension uninstalled successfully.`,
        data: { uniqueId },
      };

      console.log(`Extension uninstall successful. UniqueId: ${extensionUniqueId}`);
    } catch (error) {
      // Handle errors
      let errorMessageChain: string[] = [];

      if (error instanceof BaseError) {
        errorMessageChain = error.getCauseChainArray();
      } else {
        errorMessageChain = [(error as Error).message || "An unknown error occurred."];

        // Log the unknown error
        console.error(error);
      }

      response = {
        isSuccess: false,
        message: `Failed to uninstall extension.`,
        error: errorMessageChain,
      };

      console.log("Failed to uninstall extension", response);
    }

    return response;
  }

  async loadExtension(
    extensionUniqueId: string,
    view: WebContentsView
  ): Promise<ExtensionServiceResponse<ExtensionManifest>> {
    let response: ExtensionServiceResponse<ExtensionManifest>;

    try {
      const manifest = await this.extensionManager.loadExtension(extensionUniqueId, view);

      response = {
        isSuccess: true,
        message: `Extension loaded successfully.`,
        data: manifest,
      };

      console.log(`Extension load successful. manifest: ${manifest}`);
    } catch (error) {
      // Handle errors
      let errorMessageChain: string[] = [];

      if (error instanceof BaseError) {
        errorMessageChain = error.getCauseChainArray();
      } else {
        errorMessageChain = [(error as Error).message || "An unknown error occurred."];

        // Log the unknown error
        console.error(error);
      }

      response = {
        isSuccess: false,
        message: `Failed to load extension.`,
        error: errorMessageChain,
      };

      console.log("Failed to load extension", response);
    }

    return response;
  }

  async listExtension(): Promise<ExtensionServiceResponse<ExtensionManifest[]>> {
    let response: ExtensionServiceResponse<ExtensionManifest[]>;

    try {
      const extensionManifests = await this.extensionManager.listExtensions();

      response = {
        isSuccess: true,
        message: `Extensions fetched successfully.`,
        data: extensionManifests,
      };

      console.log(`Extensions fetched successful. manifests: ${extensionManifests}`);
    } catch (error) {

      // Handle errors
      let errorMessageChain: string[] = [];

      if (error instanceof BaseError) {
        errorMessageChain = error.getCauseChainArray();
      } else {
        errorMessageChain = [(error as Error).message || "An unknown error occurred."];

        // Log the unknown error
        console.error(error);
      }

      response = {
        isSuccess: false,
        message: `Failed to fetch extensions.`,
        error: errorMessageChain,
      };

      console.log("Failed to fetch extensions", response);
    }

    return response;
  }

  /**
   * TODO:
   * 
   * // updateExtension() {
  //   console.log("Updating Extension");
  // }

  // enableExtension() {
  //   console.log("Enabling Extension");
  // }

  // disableExtension() {
  //   console.log("Disabling Extension");
  // }
   * 
   */
}

// Registering ExtensionService to ServiceRegistry
// ServiceRegistry.registerService("ExtensionService", ExtensionService);
ServiceRegistry.registerService("ExtensionService", ExtensionService);
