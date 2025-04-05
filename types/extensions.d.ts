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
    isSuccess: boolean;
    message: string;
    error?: BaseError;
    data?: T;
  };

  interface Extension {
    id: string;
    path: string;
    title: string;
    description?: string;
    icon?: string;
  }

  // Event-Payload mapping for extension management
  interface EventPayloadMapping {
    "extension:install": {
      request: null;
      response:
        | Result<ZodFormattedError<ExtensionManifest, string>>
        | Result<ExtensionManifest>
        | Result
        | undefined;
    };

    "extension:uninstall": {
      request: string;
      response: Result;
    };

    "extension:list": {
      request: null;
      response: ExtensionManifest[];
    };

    "extension:update": {
      request: { uniqueId: string; sourcePath: string };
      response: 
        | Result<null>
        | Result<ExtensionManifest>
        | Result<z.ZodFormattedError<ExtensionManifest, string>>
      ;
    };

    "extension:enable": {
      request: string;
      response: Result;
    };

    "extension:disable": {
      request: string;
      response: Result;
    };
  }

  // Exposing extension management APIs to ifusion through extensions object
  interface ifusion {
    extensions: {
      installExtension: () => Promise<
        | Result<ZodFormattedError<ExtensionManifest, string>>
        | Result<ExtensionManifest>
        | Result
        | undefined
      >,

      uninstallExtension: (uniqueId: string) => Promise<Result>,

      listExtensions: ()=> Promise<ExtensionServiceResponse<ExtensionManifest[]>>,

      updateExtension: (uniqueId: string, sourcePath: string)=> Promise<Result<null> | Result<ExtensionManifest> | Result<z.ZodFormattedError<ExtensionManifest, string>>>,

      enableExtension: (uniqueId: string)=> Promise<Result>,

      disableExtension: (uniqueId: string)=> Promise<Result>,

    };
  }
}

export {};
