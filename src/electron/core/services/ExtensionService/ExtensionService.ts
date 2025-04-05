import { WebContentsView } from "electron";
import BaseError from "../../errors/BaseError.js";
import { ServiceRegistry } from "../../registry/ServiceRegistry/ServiceRegistry.js";
import Service from "../Service.js";
import ExtensionManager from "./ExtensionManager.js";
import UnexpectedError from "../../errors/UnexpectedError.js";



/**
 * `ExtensionService` is responsible for managing extensions in the application.
 * It provides methods to install, uninstall, load, and list extensions, as well as handle errors gracefully.
 *
 * This service interacts with the `ExtensionManager` to perform the actual operations.
 */
export default class ExtensionService extends Service {
  private extensionManager: ExtensionManager;

  constructor() {
    super();
    this.extensionManager = ExtensionManager.getInstance();
    this.extensionManager.initialize();
  }

  /**
   * Stops the `ExtensionService` by closing the extension manager's repository database.
   *
   * This method overrides the `stop` method in the base `Service` class.
   *
   * @example
   * await extensionService.stop();
   */
  async stop() {
    // Closing the repository database.
    await this.extensionManager.close();

    super.stop();
  }

  /**
   * Installs an extension from the given source path.
   *
   * @param sourcePath - The file path of the extension to install.
   * @returns A response object containing the installation status, message, and extension details.
   *
   * * @example
   * const response = await extensionService.installExtension("/path/to/extension");
   * if (response.isSuccess) {
   *   console.log("Extension installed:", response.data);
   * } else {
   *   console.error("Failed to install extension:", response.error);
   * }
   */
  async installExtension(
    sourcePath: string
  ): Promise<ExtensionServiceResponse<{ uniqueId: string; extensionName: string }>> {
    let response: ExtensionServiceResponse<{ uniqueId: string; extensionName: string }>;

    try {
      let { extensionName, uniqueId } = await this.extensionManager.installExtension(sourcePath);

      response = {
        isSuccess: true,
        message: `${extensionName} installed successfully.`,
        data: { extensionName, uniqueId },
      };

      console.log(`${extensionName} installed successfully.`, response);
    } catch (error) {

      let err: BaseError;

      if (error instanceof BaseError) {
        err = error;
      } else {
        err = new UnexpectedError("Unexpected error occurred while loading the extension. Please check logs for more information.", error as Error);

        // Log the unknown error
        console.error(error);
      }

      response = {
        isSuccess: false,
        message: `Failed to install extension.`,
        error: err,
      };

      console.log("Failed to install extension", response);
    }

    return response;
  }

  /**
   * Uninstalls an extension by its unique ID.
   * @param extensionUniqueId - The unique ID of the extension to uninstall.
   * @returns A response object containing the uninstallation status, message, and unique ID of the uninstalled extension.
   *
   * @example
   * const response = await extensionService.uninstallExtension("unique-extension-id");
   * if (response.isSuccess) {
   *   console.log("Extension uninstalled:", response.data);
   * } else {
   *   console.error("Failed to uninstall extension:", response.error);
   * }
   */
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

      let err: BaseError;

      if (error instanceof BaseError) {
        err = error;
      } else {
        err = new UnexpectedError("Unknown error occurred while loading the extension. Please check logs for more information.", error as Error);

        // Log the unknown error
        console.error(error);
      }

      response = {
        isSuccess: false,
        message: `Failed to uninstall extension.`,
        error: err,
      };

      console.log("Failed to uninstall extension", response);
    }

    return response;
  }

  /**
   * Loads an extension into the given `WebContentsView`.
   *
   * @param extensionUniqueId - The unique ID of the extension to load.
   * @param view - The `WebContentsView` where the extension will be loaded.
   * @returns A response object containing the loading status, message, and extension manifest.
   *
   * @example
   * const response = await extensionService.loadExtension("unique-extension-id", webContentsView);
   * if (response.isSuccess) {
   *   console.log("Extension loaded:", response.data);
   * } else {
   *   console.error("Failed to load extension:", response.error);
   * }
   */
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
      let err: BaseError;

      if (error instanceof BaseError) {
        err = error;
      } else {
        err = new UnexpectedError("Unknown error occurred while loading the extension. Please check logs for more information.", error as Error);

        // Log the unknown error
        console.error(error);
      }

      response = {
        isSuccess: false,
        message: `Failed to load extension.`,
        error: err,
      };

      console.log("Failed to load extension", response);
    }

    return response;
  }

  /**
   * Lists all installed extensions.
   *
   * @returns A response object containing the list of extension manifests.
   *
   * @example
   * const response = await extensionService.listExtensions();
   * if (response.isSuccess) {
   *   console.log("Extensions:", response.data);
   * } else {
   *   console.error("Failed to fetch extensions:", response.error);
   * }
   */
  async listExtensions(): Promise<ExtensionServiceResponse<ExtensionManifest[]>> {
    let response: ExtensionServiceResponse<ExtensionManifest[]>;

    try {
      const extensionManifests = await this.extensionManager.listExtensions();

      response = {
        isSuccess: true,
        message: `Extensions fetched successfully.`,
        data: extensionManifests,
      };

      console.log(
        `Extensions fetched successful. manifests: ${JSON.stringify(extensionManifests)}`
      );
    } catch (error) {
      // Handle errors
      let err: BaseError;

      if (error instanceof BaseError) {
        err = error;
      } else {
        err = new UnexpectedError("Unknown error occurred while loading the extension. Please check logs for more information.", error as Error);

        // Log the unknown error
        console.error(error);
      }

      response = {
        isSuccess: false,
        message: `Failed to fetch extensions.`,
        error: err,
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
