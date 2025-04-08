import { BaseError } from "../src/electron/core/errors/index.js";

declare global {
  interface ExtensionManifest {
    // id?: string;
    name: string;
    version: string;
    entry: string;
    permissions: string[];
    developer: string;
    category: ExtensionCategory;
    description: string;
    uniqueId?: string;
    installedAt?: string;
    updatedAt?: string;
    isEnabled?: number;
  }

  type ExtensionCategory = "Converter" | "Editor" | "Misc";

  /**
   * Represents the response object returned by `ExtensionService` methods.
   *
   * @template T - The type of the data returned in the response.
   */
  type ExtensionServiceResponse<T> = {
    /** Indicates whether the operation was successful. */
    isSuccess: boolean;

    /** A message describing the result of the operation. */
    message: string;

    /** The data returned by the operation, if successful. */
    error?: BaseError;

    /** The error encountered during the operation, if any. */
    data?: T;
  };

  interface Extension {
    id: string;
    path: string;
    title: string;
    description?: string;
    icon?: string;
  }

  interface CommandPayloadMapping {
    "extension:install": {
      request: null;
      response:
        | MainToRendererResponse<{ uniqueId: string; extensionName: string }>
        | MainToRendererResponse<void>;
    };

    "extension:uninstall": {
      request: { extensionId: string };
      response: MainToRendererResponse<{ uniqueId: string }>;
    };

    "extension:list": {
      request: null;
      response: MainToRendererResponse<ExtensionManifest[]>;
    };
  }

  // Exposing extension management APIs to ifusion through extensions object
  interface ifusion {
    extensions: {
      installExtension: () => Promise<
        | MainToRendererResponse<{ uniqueId: string; extensionName: string }>
        | MainToRendererResponse<void>
      >;

      uninstallExtension: (
        uniqueId: string
      ) => Promise<MainToRendererResponse<{ uniqueId: string }>>;

      listExtensions: () => Promise<MainToRendererResponse<ExtensionManifest[]>>;
    };
  }
}

export {};
