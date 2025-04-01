declare global {
  interface ExtensionManifest {
    // id?: string;
    name: string;
    version: string;
    entry: string;
    permissions: string[];
    developer: string;
    category: string;
    description: string;
    uniqueId?: string;
    installedAt?: string;
    updatedAt?: string;
    isEnabled?: number;
  }

  type ExtensionCategory = "Converter" | "Editor" | "Misc";

  const enum ManifestValidationCode {
    MANIFEST_VALIDATED = "MANIFEST_VALIDATED",
    MANIFEST_INVALID = "MANIFEST_INVALID",
    ERROR_VALIDATION_FAILED = "ERROR_VALIDATION_FAILED",
  }

  const enum ExtensionOperationCode {
    ERROR_EXTENSION_ALREADY_INSTALLED = "ERROR_EXTENSION_ALREADY_INSTALLED",
    EXTENSION_INSTALL_SUCCESSFUL = "EXTENSION_INSTALL_SUCCESSFUL",
    ERROR_EXTENSION_INSTALL_FAILED = "ERROR_EXTENSION_INSTALL_FAILED",

    ERROR_EXTENSION_NOT_FOUND = "ERROR_EXTENSION_NOT_FOUND",
    EXTENSION_UNINSTALL_SUCCESSFUL = "EXTENSION_UNINSTALL_SUCCESSFUL",
    ERROR_EXTENSION_UNINSTALL_FAILED = " ERROR_EXTENSION_UNINSTALL_FAILED",

    EXTENSION_ENABLE_SUCCESSFUL = "EXTENSION_ENABLE_SUCCESSFUL",
    EXTENSIONS_RETRIEVED = "EXTENSIONS_RETRIEVED",
    ERROR_EXTENSION_DISABLED = "ERROR_EXTENSION_DISABLED",

    ERROR_ENTRY_FILE_NOT_FOUND = "ERROR_ENTRY_FILE_NOT_FOUND",
    EXTENSION_LOAD_SUCCESSFUL = "EXTENSION_LOAD_SUCCESSFUL",
    ERROR_EXTENSION_LOAD_FAILED = "ERROR_EXTENSION_LOAD_FAILED",

    EXTENSION_ALREADY_LOADED = "EXTENSION_ALREADY_LOADED",

    EXTENSION_COPY_FAILED = "EXTENSION_COPY_FAILED",

    ERROR_INVALID_VIEW = "ERROR_INVALID_VIEW",
  }

  const enum DatabaseCode {
    DATABASE_ERROR = "DATABASE_ERROR",
  }

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

      listExtensions: ()=> Promise<ExtensionManifest[]>,

      updateExtension: (uniqueId: string, sourcePath: string)=> Promise<Result<null> | Result<ExtensionManifest> | Result<z.ZodFormattedError<ExtensionManifest, string>>>,

      enableExtension: (uniqueId: string)=> Promise<Result>,

      disableExtension: (uniqueId: string)=> Promise<Result>,

    };
  }
}

export {};
