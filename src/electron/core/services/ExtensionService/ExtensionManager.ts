import fs from "fs/promises";
import path from "path";
import { app, BrowserWindow, WebContentsView } from "electron";
import { v5 as uuidv5 } from "uuid";
import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";

import { z } from "zod";

import { ipcMainHandle } from "../../../utils.js";
import DialogService from "../../../DialogService/DialogService.js";

// Define a fixed namespace UUID for deterministic ID generation
const NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

const ManifestSchema = z.object({
  name: z.string().trim().min(1, { message: "name is required" }),
  version: z.string().min(1, { message: "version is required" }),
  entry: z.string().min(1, { message: "entry is required" }),
  permissions: z.array(z.string()),
  developer: z.string().min(1, { message: "developer is required" }),
  category: z
    .enum(["Productivity", "Converter", "Utilities", "Development", "Misc"])
    .default("Misc"),
  description: z.string().min(1, { message: "description is required" }),
});

/**
 * @class ExtensionManager
 * @description A singleton class responsible for managing extensions.
 * Use `ExtensionManager.getInstance()` to get the single instance.
 */

class ExtensionManager {
  private static instance: ExtensionManager;
  private extensionsPath: string; // Path where extensions are stored

  private db: Database | null = null;
  private dbInitPromise: Promise<void> | null = null; // For promise-based locking

  // Private constructor to prevent direct instantiation
  private constructor() {
    // Defines the extensions storage path
    this.extensionsPath = path.join(
      app.getPath("appData").replace("Roaming", "Local"),
      "iFusionOne",
      "Extensions"
    );
  }

  /**
   * Returns the single instance of ExtensionManager
   * @returns The singleton instance.
   */
  static getInstance(): ExtensionManager {
    if (!this.instance) {
      ExtensionManager.instance = new ExtensionManager();
    }

    return ExtensionManager.instance;
  }

  async initialize() {
    await this.ensureRepositoryReady();
  }

  async ensureDirectoryExists(path: string) {
    try {
      // Check if the directory exists
      await fs.access(path);
    } catch (error) {
      // Directory does not exist, so create it
      await fs.mkdir(path, { recursive: true });
    }
  }

  /**
   * Ensures the database is ready
   */
  private async ensureRepositoryReady() {
    if (this.db) return;

    // If initialization is already in progress, wait for it to complete
    if (this.dbInitPromise) {
      await this.dbInitPromise;
      return;
    }

    this.dbInitPromise = (async () => {
      try {
        await this.ensureDirectoryExists(this.extensionsPath);
        const dbPath = path.join(this.extensionsPath, "extensions.db");

        this.db = await open({
          filename: dbPath,
          driver: sqlite3.Database,
        });

        await this.db.exec(`
          PRAGMA journal_mode=WAL;
          CREATE TABLE IF NOT EXISTS extensions (
            uniqueId TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            version TEXT NOT NULL,
            entry TEXT NOT NULL,
            permissions TEXT NOT NULL,
            developer TEXT NOT NULL,
            category TEXT NOT NULL,
            isEnabled INTEGER DEFAULT 1,
            installedAt TEXT DEFAULT CURRENT_TIMESTAMP,
            updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
            description TEXT NOT NULL
          )
          `);
      } catch (err) {
        console.error("Failed to initialize database:", err);
        throw new Error("Database initialization failed");
      } finally {
        this.dbInitPromise = null; // Reset the promise after completion
      }
    })();

    await this.dbInitPromise;
  }

  /**Closes extension repository database */
  async close() {
    if (this.db) {
      try {
        await this.db.close();
        console.log("Database connection closed.");
      } catch (error) {
        console.error("Error closing database:", error);
      } finally {
        this.db = null;
      }
    }
  }

  /**
   * Validate the extension manifest before installation.
   * If the validation succeeds, a `uniqueId` field is inserted in the manifest.
   * @param extPath Path of the manifest
   * @returns Manifest
   */
  async validateManifest(extPath: string) {
    const manifestPath = path.join(extPath, "manifest.json");
    try {
      // Ensure manifest exists
      await fs.access(manifestPath);

      // Read and parse manifest file
      const rawData = await fs.readFile(manifestPath, "utf-8");
      const manifest = JSON.parse(rawData) as ExtensionManifest;

      const validated = ManifestSchema.safeParse(manifest);
      if (!validated.success) {
        let res: Result<z.ZodFormattedError<ExtensionManifest, string>> = {
          code: ManifestValidationCode.MANIFEST_INVALID,
          message: "Invalid manifest format.",
          data: validated.error.format(), // Returns detailed validation errors
        };

        return res;
      }

      manifest.uniqueId = uuidv5(`${manifest.developer}:${manifest.name}`, NAMESPACE);

      let res: Result<ExtensionManifest> = {
        code: ManifestValidationCode.MANIFEST_VALIDATED,
        message: `Extension:${manifest.name} manifest is valid.`,
        data: manifest,
      };
      return res;
    } catch (error) {
      console.error("Manifest validation failed:", error);

      let res: Result = {
        code: ManifestValidationCode.ERROR_VALIDATION_FAILED,
        message: `Validation failed: ${error}`,
      };

      return res;
    }
  }

  async installExtension(sourcePath: string) {
    // Make sure the repository database is ready
    await this.ensureRepositoryReady();

    // Validate the extension manifest
    const validationResponse = await this.validateManifest(sourcePath);

    if (validationResponse.code !== ManifestValidationCode.MANIFEST_VALIDATED) {
      return validationResponse;
    }

    const manifest = validationResponse.data as ExtensionManifest;

    const destinationPath = path.join(this.extensionsPath, manifest.uniqueId!);

    // Check if the extension already exists
    try {
      await fs.access(destinationPath);
      let res: Result = {
        code: ExtensionOperationCode.ERROR_EXTENSION_ALREADY_INSTALLED,
        message: "Extension is already installed.",
      };

      return res;
    } catch (error: any) {
      if (error.code !== "ENOENT") {
        console.error("Could not access directory:", error);
      }
    }

    // Create the extension folder
    await fs.mkdir(destinationPath, { recursive: true });

    try {
      // Copy all the data from the source directory
      await fs.cp(sourcePath, destinationPath, { recursive: true });
    } catch (error) {
      await fs.rm(destinationPath, { recursive: true, force: true }); // Rollback
      return {
        code: ExtensionOperationCode.EXTENSION_COPY_FAILED,
        message: `Failed to copy extensions: ${error}`,
      };
    }

    // Add extension manifest in repository
    // Use transaction for atomicity
    await this.db!.run("BEGIN TRANSACTION");
    try {
      const stmt = await this.db!.prepare(
        `INSERT INTO extensions (uniqueId, name, version, entry, permissions, developer, category, description ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      );

      await stmt.run(
        manifest.uniqueId,
        manifest.name,
        manifest.version,
        manifest.entry,
        JSON.stringify(manifest.permissions),
        manifest.developer,
        manifest.category,
        manifest.description
      );

      await stmt.finalize();
      await this.db!.run("COMMIT");
    } catch (error) {
      try {
        await this.db?.run("ROLLBACK");
      } catch (rollbackError) {
        console.error("Rollback failed:", rollbackError);
      }

      console.error("Database transaction failed:", error);
      let res: Result = {
        code: DatabaseCode.DATABASE_ERROR,
        message: "Failed to install extension: " + error,
      };

      return res;
    }

    let res: Result = {
      code: ExtensionOperationCode.EXTENSION_INSTALL_SUCCESSFUL,
      message: `Installed extension: ${manifest.name}`,
    };

    console.log("Extension installed successfuly");
    return res;
  }

  // Uninstalls an extension
  async uninstallExtension(uniqueId: string): Promise<Result> {
    // Making sure the repository database is ready
    await this.ensureRepositoryReady();

    const extPath = path.join(this.extensionsPath, uniqueId);

    // const exists = await this.db!.get("SELECT * FROM extensions WHERE uniqueId = ?", uniqueId);

    // if (!exists) {
    //   return {
    //     code: UninstallExtensionCode.EXTENSION_NOT_FOUND,
    //     message: "Extension does not exist",
    //   };
    // }

    await this.db!.run("BEGIN TRANSACTION");
    try {
      await fs.rm(extPath, { recursive: true, force: true });
      const stmt = await this.db!.prepare("DELETE FROM extensions WHERE uniqueId = ?");
      await stmt.run(uniqueId);
      await stmt.finalize();
      await this.db!.run("COMMIT");

      return {
        code: ExtensionOperationCode.EXTENSION_UNINSTALL_SUCCESSFUL,
        message: `Uninstalled extension: ${uniqueId}`,
      };
    } catch (error) {
      try {
        await this.db!.run("ROLLBACK");
      } catch (rollbackError) {
        console.error("Rollback failed:", rollbackError);
      }

      return {
        code: DatabaseCode.DATABASE_ERROR,
        message: "Failed to uninstall extension",
      };
    }
  }

  async listExtensions(): Promise<Result<ExtensionManifest[]>> {
    await this.ensureRepositoryReady();

    try {
      const rows = await this.db!.all("SELECT * FROM extensions");

      const extensions: ExtensionManifest[] = rows.map((ext) => {
        let permissions: string[] = JSON.parse(ext.permissions); // Converting JSON string back to an array

        return {
          ...ext,
          permissions,
        };
      });

      return {
        code: ExtensionOperationCode.EXTENSIONS_RETRIEVED,
        message: "Extensions fetched successfully",
        data: extensions,
      };
    } catch (error) {
      return {
        code: DatabaseCode.DATABASE_ERROR,
        message: "Failed to retrieve extensions",
      };
    }
  }

  async updateExtension(uniqueId: string, sourcePath: string) {
    await this.uninstallExtension(uniqueId);
    return this.installExtension(sourcePath);
  }

  async enableExtension(uniqueId: string): Promise<Result> {
    await this.ensureRepositoryReady();

    await this.db!.run("BEGIN TRANSACTION");
    try {
      const stmt = await this.db!.prepare(`UPDATE extensions SET isEnabled = 1 WHERE uniqueId = ?`);

      const result = await stmt.run(uniqueId);
      await stmt.finalize();
      if (result.changes === 0) {
        return {
          code: ExtensionOperationCode.ERROR_EXTENSION_NOT_FOUND,
          message: `Extension ${uniqueId} not found.`,
        };
      }

      await this.db!.run("COMMIT");
      return {
        code: ExtensionOperationCode.EXTENSION_ENABLE_SUCCESSFUL,
        message: `Enabled extension: ${uniqueId}`,
      };
    } catch (error) {
      try {
        await this.db!.run("ROLLBACK");
      } catch (rollbackError) {
        console.error("Rollback failed:", rollbackError);
      }
      return {
        code: DatabaseCode.DATABASE_ERROR,
        message: `Failed to enable extension: ${uniqueId}: ${error}`,
      };
    }
  }

  async disableExtension(uniqueId: string): Promise<Result> {
    await this.ensureRepositoryReady();

    await this.db!.run("BEGIN TRANSACTION");

    try {
      const stmt = await this.db!.prepare(`UPDATE extensions SET isEnabled = 0 WHERE uniqueId = ?`);

      await stmt.run(uniqueId);
      await stmt.finalize();
      await this.db!.run("COMMIT");
      return { code: "SUCCESS", message: `Disabled extension: ${uniqueId}` };
    } catch (error) {
      try {
        await this.db!.run("ROLLBACK");
      } catch (rollbackError) {
        console.error(rollbackError);
      }

      return {
        code: DatabaseCode.DATABASE_ERROR,
        message: `Failed to disable extension: ${uniqueId}: ${error}`,
      };
    }
  }

  async loadExtension(
    uniqueId: string,
    view: WebContentsView
  ): Promise<Result | Result<ExtensionManifest>> {
    if (!view || !view.webContents) {
      return {
        code: ExtensionOperationCode.ERROR_INVALID_VIEW,
        message: "Invalid webContentsView provided.",
      };
    }

    await this.ensureRepositoryReady();

    try {
      // Fetch extension details from DB
      const stmt = await this.db!.prepare("SELECT * FROM extensions WHERE uniqueId = ?");

      const result = await stmt.get(uniqueId);

      await stmt.finalize();

      // If extension doesn't exist
      if (!result) {
        return {
          code: ExtensionOperationCode.ERROR_EXTENSION_NOT_FOUND,
          message: `Extension ${uniqueId} not found`,
        };
      }

      const extension: ExtensionManifest = {
        ...result,
        permissions: JSON.parse(result.permissions),
      };

      // Load extension only when its enabled
      if (extension.isEnabled === 0) {
        return {
          code: ExtensionOperationCode.ERROR_EXTENSION_DISABLED,
          message: `Extension ${extension.name} is disabled.`,
        };
      }

      // Resolve and verify extension path
      const extPath = path.resolve(this.extensionsPath, uniqueId);
      const entryFilePath = path.join(extPath, extension.entry);

      // Ensuring entry file exists
      try {
        await fs.access(entryFilePath);
      } catch (error) {
        return {
          code: ExtensionOperationCode.ERROR_ENTRY_FILE_NOT_FOUND,
          message: `Entry point file not found for ${extension.uniqueId}.`,
        };
      }

      view.webContents.loadFile(entryFilePath);
      //  TabManager.getInstance()

      return {
        code: ExtensionOperationCode.EXTENSION_LOAD_SUCCESSFUL,
        message: `Loaded extension: ${extension.name}`,
        data: extension,
      };
    } catch (error) {
      console.error(`Error loading extension ${uniqueId}:`, error);

      return {
        code: ExtensionOperationCode.ERROR_EXTENSION_LOAD_FAILED,
        message: `Failed to load extension: ${error}`,
      };
    }
  }
}

export function initializeExtensionManager(window: BrowserWindow): ExtensionManager {
  const extensionManager: ExtensionManager = ExtensionManager.getInstance();
  extensionManager.initialize(); // Don't wait for initialization for now

  // Registering IPC for Extension
  ipcMainHandle("extension:install", async () => {
    const path = await DialogService.selectFolder(window);

    if (!path) {
      console.log("Folder selection cancelled");
      return;
    }

    try {
      const extensionInfo = await extensionManager.installExtension(path);
      return extensionInfo;
    } catch (error) {
      console.error(error);
    }
  });

  ipcMainHandle("extension:uninstall", async (payload) => {
    return await extensionManager.uninstallExtension(payload);
  });

  ipcMainHandle("extension:list", async (payload) => {
    return await extensionManager.listExtensions();
  });

  ipcMainHandle("extension:update", async (payload) => {
    return extensionManager.updateExtension(payload.uniqueId, payload.sourcePath);
  });

  ipcMainHandle("extension:enable", async (payload) => {
    return await extensionManager.enableExtension(payload);
  });

  ipcMainHandle("extension:disable", async (payload) => {
    return await extensionManager.disableExtension(payload);
  });

  return extensionManager;
}

export default ExtensionManager;
