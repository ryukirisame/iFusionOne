import fs from "fs/promises";
import path from "path";
import { app, BrowserWindow, WebContentsView } from "electron";
import { v5 as uuidv5 } from "uuid";
import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";
import { z } from "zod";
import { ipcMainHandle } from "../../../utils.js";
import DialogService from "../../../DialogService/DialogService.js";
import { CommandRegistry } from "../../registry/CommandRegistry/CommandRegistry.js";
import {
  SchemaValidationError,
  FileSystemError,
  DatabaseError,
  ExtensionError,
  CriticalDatabaseError,
  CriticalFileSystemError,
  RepositoryError,
  UnexpectedError,
  DataParsingError,
  InvalidArgumentError,
} from "../../errors/index.js";
import { Mutex } from "async-mutex";

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
  private extensionsPath: string; // Path where extensions are stored.

  private db: Database | null = null;
  private dbInitPromise: Promise<void> | null = null; // For promise-based locking

  private resourceLocks: Map<string, Mutex> = new Map();
  private dbWriteLock = new Mutex(); // Global mutex for database writes

  /**
   * Private constructor to prevent direct instantiation.
   * Initializes the extensions storage path.
   */
  private constructor() {
    // Defines the extensions storage path
    this.extensionsPath = path.join(
      app.getPath("appData").replace("Roaming", "Local"),
      "iFusionOne",
      "Extensions"
    );
  }

  /**
   * Returns the single instance of ExtensionManager.
   * @returns {ExtensionManager} The singleton instance.
   */
  static getInstance(): ExtensionManager {
    if (!this.instance) {
      ExtensionManager.instance = new ExtensionManager();
    }

    return ExtensionManager.instance;
  }

  /**
   * Initializes the extension manager by ensuring the repository database is ready.
   * @returns {Promise<void>} Resolves when the repository is ready.
   * @throws {RepositoryError} If the initialization fails.
   */
  async initialize() {
    try {
      await this.ensureRepositoryReady();
    } catch (error) {
      throw new RepositoryError(`Repository not ready`, error as Error);
    }
  }

  // Get or create a mutex for a specific extension
  private getResourceLock(uniqueId: string): Mutex {
    if (!this.resourceLocks.has(uniqueId)) {
      this.resourceLocks.set(uniqueId, new Mutex());
    }
    return this.resourceLocks.get(uniqueId)!;
  }

  async performDatabaseWrite<T>(operation: () => Promise<T>): Promise<T> {
    return this.dbWriteLock.runExclusive(operation);
  }

  /**
   * Ensures that a directory exists. If it doesn't, creates it recursively.
   * @param {string} path - The path of the directory to check or create.
   * @returns {Promise<void>} A promise that resolves when the directory exists or is created.
   * @throws {FileSystemError} If the directory creation fails.
   *
   */
  async ensureDirectoryExists(path: string) {
    try {
      // Check if the directory exists
      await fs.access(path);
    } catch (accessError) {
      try {
        // Directory does not exist, so create it
        await fs.mkdir(path, { recursive: true });
      } catch (mkdirError) {
        throw new FileSystemError(
          `Failed to create directory at path: ${path}`,
          mkdirError as Error
        );
      }
    }
  }

  /**
 * Ensures the repository database is ready for use.
 * Initializes the database if it doesn't exist.
 * @returns {Promise<void>} A promise that resolves when the database is ready.
 * @throws {FileSystemError} If the Extensions directory does not exist.
 * @throws {DatabaseError} If the database initialization fails.
 
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
        // Ensure the Extensions directory exists
        await this.ensureDirectoryExists(this.extensionsPath);

        const dbPath = path.join(this.extensionsPath, "extensions.db");

        // Open the database connection
        this.db = await open({
          filename: dbPath,
          driver: sqlite3.Database,
        });

        // Initialize the database schema
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
      } catch (error) {
        if (error instanceof FileSystemError) {
          // Re-throw FileSystemError if it occurs during directory creation
          throw new FileSystemError("Extensions directory does not exist", error as Error);
        }

        throw new DatabaseError(`Database initialization failed`, error as Error);
      } finally {
        this.dbInitPromise = null; // Reset the promise after completion
      }
    })();

    await this.dbInitPromise;
  }

  /**
 * Closes the database connection.
 * @returns {Promise<void>} A promise that resolves when the database connection is closed.
 * @throws {DatabaseError} If the database could not be closed.

 */
  async close() {
    if (this.db) {
      try {
        await this.db.close();
        console.log("Database connection closed.");
      } catch (error) {
        throw new DatabaseError("Failed to close the database connection.", error as Error);
      } finally {
        this.db = null;
      }
    }
  }

  /**
   * Validates the extension manifest before installation.
   * If validation succeeds, a `uniqueId` field is added to the manifest.
   * @param {string} extPath - Path to the manifest directory.
   * @returns {Promise<ExtensionManifest>} The validated manifest.
   * @throws {SchemaValidationError} If the manifest schema validation fails.
   * @throws {FileSystemError} If the manifest file cannot be accessed or read.
   */
  async validateManifestFile(extPath: string): Promise<ExtensionManifest> {
    const manifestPath = path.join(extPath, "manifest.json");
    try {
      // Ensure manifest exists
      await fs.access(manifestPath);

      // Read and parse manifest file
      const rawData = await fs.readFile(manifestPath, "utf-8");
      const manifest = JSON.parse(rawData) as ExtensionManifest;

      // Validate the manifest using zod
      const validated = ManifestSchema.safeParse(manifest);
      if (!validated.success) {
        // Extract defailed validation issues
        const errorMessages = validated.error.issues.map(
          (issue) => `Field "${issue.path.join(".")}" - ${issue.message}`
        );

        // Throw a SchemaValidationError with detailed issues
        throw new SchemaValidationError("Invalid manifest format", errorMessages);
      }

      // Add a uniqueId to the manifest
      manifest.uniqueId = uuidv5(`${manifest.developer}:${manifest.name}`, NAMESPACE);

      return manifest;
    } catch (error) {
      if (error instanceof SchemaValidationError) {
        throw error; // Re-throw SchemaValidationError
      }

      throw new FileSystemError(
        `An error occurred while validating the manifest at path: ${manifestPath}. Please ensure the file exists and is accessible.`,
        error as Error
      );
    }
  }

  /**
   * Installs a new extension.
   * @param {string} sourcePath - Path to the extension source directory.
   * @returns {Promise<{ extensionName: string; uniqueId: string }>} The uniqueId and name of the installed extension.
   * @throws {FileSystemError} If the extension directory cannot be created, accessed, or copied.
   * @throws {ExtensionError} If the extension is already installed.
   * @throws {DatabaseError} If the repository database cannot be initialized or if the extension manifest cannot be inserted into the database.
   * @throws {SchemaValidationError} If the manifest schema validation fails.
   * @throws {CriticalFileSystemError} If the rollback fails after a failed copy operation.
   * @throws {CriticalDatabaseError} If the rollback fails after a failed database transaction.
   *
   * @todo Implement force-install.
   */
  async installExtension(sourcePath: string): Promise<{ extensionName: string; uniqueId: string }> {
    // Validate the extension manifest and get the manifest
    let manifest: ExtensionManifest;
    try {
      manifest = await this.validateManifestFile(sourcePath);
    } catch (error) {
      throw error;
    }

    // Get the lock
    const lock = this.getResourceLock(manifest.uniqueId!);

    return lock.runExclusive(async () => {
      // Ensure the repository database is ready
      try {
        await this.ensureRepositoryReady();
      } catch (error) {
        throw new RepositoryError("Repository not ready", error as Error);
      }

      const destinationPath = path.join(this.extensionsPath, manifest.uniqueId!);

      // Check if the extension already exists
      try {
        await fs.access(destinationPath);

        // If no error, the directory exists, so throw an extension-specific error
        throw new ExtensionError("Extension is already installed.");
      } catch (error: any) {
        if (error instanceof ExtensionError) {
          throw error;
        }

        if (error && typeof error.code === "string" && error.code !== "ENOENT") {
          throw new FileSystemError(
            `Could not access directory at path: ${destinationPath}`,
            error
          );
        }
      }

      // Create the extension folder
      try {
        await fs.mkdir(destinationPath, { recursive: true });
      } catch (error) {
        throw new FileSystemError(
          `Failed to create directory for extension at path: ${destinationPath}`,
          error as Error
        );
      }

      // Copy all the data from the source directory
      try {
        await fs.cp(sourcePath, destinationPath, { recursive: true });
      } catch (error) {
        try {
          await fs.rm(destinationPath, { recursive: true, force: true }); // Rollback
        } catch (rollbackError) {
          // Rollback failed, throw a CriticalFileSystemError
          throw new CriticalFileSystemError(
            `Rollback failed after a failed copy operation during installation of the extension`,
            rollbackError as Error
          );
        }

        throw new FileSystemError(
          `Failed to copy extension from ${sourcePath} to ${destinationPath}`,
          error as Error
        );
      }

      // Add extension manifest to the repository database.
      await this.performDatabaseWrite(async () => {
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
            await this.db!.run("ROLLBACK");
          } catch (rollbackError) {
            throw new CriticalDatabaseError(
              "Rollback failed after a failed extension manifest insertion. Database might be in an inconsistent state.",
              rollbackError as Error
            );
          }

          throw new DatabaseError(
            "Failed to insert extension manifest into database",
            error as Error
          );
        }
      });

      console.log(`Extension installed successfuly. Assigned uniqueid: ${manifest.uniqueId}`);

      return { extensionName: manifest.name, uniqueId: manifest.uniqueId! };
    });
  }

  /**
   * Uninstalls an extension by its unique ID.
   * @param {string} uniqueId - The unique ID of the extension to uninstall.
   * @returns {Promise<string>} Resolves with the unique ID of the uninstalled extension.
   * @throws {RepositoryError} If the repository is not ready.
   * @throws {FileSystemError} If the extension directory cannot be removed.
   * @throws {DatabaseError} If the extension cannot be removed from the repository database.
   * @throws {CriticalDatabaseError} If the rollback fails after a failed database transaction.
   */
  async uninstallExtension(uniqueId: string): Promise<string> {
    // Acquire the lock for the specific extension
    const lock = this.getResourceLock(uniqueId);

    return lock.runExclusive(async () => {
      // Making sure the repository database is ready
      try {
        await this.ensureRepositoryReady();
      } catch (error) {
        throw new RepositoryError("Repository not ready", error as Error);
      }

      const extPath = path.join(this.extensionsPath, uniqueId);

      // Remove the directory and its contents
      try {
        await fs.rm(extPath, { recursive: true, force: true });
      } catch (error) {
        throw new FileSystemError(
          `Failed to remove extension directory at path: ${extPath}`,
          error as Error
        );
      }

      // Remove the extension entry from repository database
      await this.performDatabaseWrite(async () => {
        await this.db!.run("BEGIN TRANSACTION");
        try {
          const stmt = await this.db!.prepare("DELETE FROM extensions WHERE uniqueId = ?");
          await stmt.run(uniqueId);
          await stmt.finalize();
          await this.db!.run("COMMIT");
        } catch (error) {
          try {
            await this.db!.run("ROLLBACK");
          } catch (rollbackError) {
            throw new CriticalDatabaseError(
              `Rollback failed after a failed uninstall operation for extension ${uniqueId}. Database might be in an inconsistent state.`,
              rollbackError as Error
            );
          }

          throw new DatabaseError(
            `Failed to uninstall extension ${uniqueId} from the database.`,
            error as Error
          );
        }
      });

      console.log(`Extension with uniqueId: ${uniqueId} uninstall successful.`);

      return uniqueId;
    });
  }

  /**
   * Lists all installed extensions.
   * @returns {Promise<ExtensionManifest[]>} An array of extension manifests.
   * @throws {RepositoryError} If the repository is not ready.
   * @throws {DatabaseError} If the extensions could not be retrieved from the database.
   * @throws {DataParsingError} If the extension data retrieved from the database could not be parsed or is missing required field.
   *
   *
   * @todo perform zod validation on the extension data retrieved from the database
   */
  async listExtensions(): Promise<ExtensionManifest[]> {
    // Making sure the repository database is ready
    try {
      await this.ensureRepositoryReady();
    } catch (error) {
      throw new RepositoryError("Repository not ready", error as Error);
    }

    // Retrieve extensions from the database
    try {
      const rows = await this.db!.all("SELECT * FROM extensions");

      // Map database rows to ExtensionManifest objects
      const extensions: ExtensionManifest[] = rows.map((ext) => {
        // Validate the required row data
        if (
          !ext.name ||
          !ext.version ||
          !ext.entry ||
          !ext.developer ||
          !ext.description ||
          !ext.permissions
        ) {
          throw new DataParsingError(
            `Invalid data for extension with uniqueId: ${ext.uniqueId}. Missing required fields.`
          );
        }

        // Parse the permissions field
        let permissions: string[];
        try {
          permissions = JSON.parse(ext.permissions); // Convert JSON string back to an array
        } catch (error) {
          throw new DataParsingError(
            `Failed to parse permissions for extension with uniqueId: ${ext.uniqueId}.`,
            error as Error
          );
        }

        return {
          ...ext,
          permissions,
        };
      });

      // Return extensions
      return extensions;
    } catch (error) {
      if (error instanceof DataParsingError) {
        throw error;
      }

      throw new DatabaseError("Failed to retrieve extensions from the database.", error as Error);
    }
  }


  
  // /**
  //  * Updates an existing extension by uninstalling and reinstalling it.
  //  * @param {string} uniqueId - The unique ID of the extension to update.
  //  * @param {string} sourcePath - The path to the new extension source directory.
  //  * @returns {Promise<string>} The unique ID of the updated extension.
  //  *
  //  * @throws {ExtensionError} If the update fails during the uninstall or reinstall phase.
  //  *
  //  * @todo What if update fails during uninstall phase? Implement rollback mechanism.
  //  * @todo implement updateExtension again.
  //  */
  // async updateExtension(uniqueId: string, sourcePath: string): Promise<string> {
  //   // Phase 1: Uninstall
  //   try {
  //     await this.uninstallExtension(uniqueId);
  //   } catch (error) {
  //     throw new ExtensionError(
  //       `Update failed during uninstall phase for extension ${uniqueId}.`,
  //       error as Error
  //     );
  //   }

  //   // Phase 2: Re-Install
  //   try {
  //     return this.installExtension(sourcePath);
  //   } catch (error) {
  //     throw new ExtensionError(
  //       `Update failed during reinstall phase for extension ${uniqueId}.`,
  //       error as Error
  //     );
  //   }
  // }

  

  /**
   * Enables extension.
   * @param {string} uniqueId - The unique ID of the extension to enable.
   * @returns {Promise<void>} Resolves when the extension is successfully enabled.
   * @throws {RepositoryError} If the repository is not ready.
   * @throws {DatabaseError} If the extension cannot be enabled in the repository database.
   * @throws {ExtensionError} If the extension does not exist.
   
   */
  async enableExtension(uniqueId: string) {
    // Acquire the lock for the specific extension
    const lock = this.getResourceLock(uniqueId);

    return lock.runExclusive(async () => {
      // Ensure the repository database is ready
      try {
        await this.ensureRepositoryReady();
      } catch (error) {
        throw new RepositoryError("Repository not ready", error as Error);
      }

      // Perform the database write operation
      await this.performDatabaseWrite(async () => {
        await this.db!.run("BEGIN TRANSACTION");
        try {
          const stmt = await this.db!.prepare(
            `UPDATE extensions SET isEnabled = 1 WHERE uniqueId = ?`
          );

          const result = await stmt.run(uniqueId);
          await stmt.finalize();

          // Check if the extension exists
          if (result.changes === 0) {
            throw new ExtensionError(`Extension with unique ID ${uniqueId} not found.`);
          }

          // Commit the transaction
          await this.db!.run("COMMIT");
        } catch (error) {
          try {
            await this.db!.run("ROLLBACK");
          } catch (rollbackError) {
            throw new CriticalDatabaseError(
              `Rollback failed during enable operation for extension ${uniqueId}. Database might be in an inconsistent state.`,
              rollbackError as Error
            );
          }

          if (error instanceof ExtensionError) {
            throw error; // Re-throw extension-specific errors
          }

          throw new DatabaseError(
            `Failed to enable extension with unique ID ${uniqueId}.`,
            error as Error
          );
        }
      });

      console.log(`Extension with uniqueId: ${uniqueId} has been enabled.`);
    });
  }

  /**
   * Disables extension.
   * @param {string} uniqueId - The unique ID of the extension to disable.
   * @returns {Promise<void>} Resolves when the extension is successfully disabled.
   * @throws {DatabaseError} If the extension cannot be disabled in the  repository database.
   * @throws {ExtensionError} If the extension does not exist.
   * @throws {RepositoryError} If the repository is not ready.
   */
  async disableExtension(uniqueId: string) {
    // Acquire the lock for the specific extension
    const lock = this.getResourceLock(uniqueId);

    return lock.runExclusive(async () => {
      // Ensure the repository database is ready
      try {
        await this.ensureRepositoryReady();
      } catch (error) {
        throw new RepositoryError("Repository not ready", error as Error);
      }

      // Perform the database write operation
      await this.performDatabaseWrite(async () => {
        await this.db!.run("BEGIN TRANSACTION");
        try {
          const stmt = await this.db!.prepare(
            `UPDATE extensions SET isEnabled = 0 WHERE uniqueId = ?`
          );

          const result = await stmt.run(uniqueId);
          await stmt.finalize();

          // Check if the extension exists
          if (result.changes === 0) {
            throw new ExtensionError(`Extension with unique ID ${uniqueId} not found.`);
          }

          // Commit the transaction
          await this.db!.run("COMMIT");
        } catch (error) {
          // Attempt to rollback the transaction
          try {
            await this.db!.run("ROLLBACK");
          } catch (rollbackError) {
            throw new CriticalDatabaseError(
              `Rollback failed during disable operation for extension ${uniqueId}. Database might be in an inconsistent state.`,
              rollbackError as Error
            );
          }

          if (error instanceof ExtensionError) {
            throw error; // Re-throw extension-specific errors
          }

          // Throw a concise error message with context
          throw new DatabaseError(
            `Failed to disable extension with unique ID ${uniqueId}.`,
            error as Error
          );
        }
      });
    });
  }

  /**
   * Loads an extension into a given WebContentsView.
   * @param {string} uniqueId - The unique ID of the extension to load.
   * @param {WebContentsView} view - The WebContentsView to load the extension into.
   * @returns {Promise<ExtensionManifest>} The loaded extension manifest.
   * @throws {RepositoryError} If the repository is not ready.
   * @throws {ExtensionError} If the extension does not exist or is disabled.
   * @throws {FileSystemError} If the entry point file cannot be accessed.
   * @throws {DatabaseError} If the extension details cannot be retrieved from the database.
   * @throws {InvalidArgumentError} If the view passed is not valid.
   */
  async loadExtension(uniqueId: string, view: WebContentsView): Promise<ExtensionManifest> {
    // Validate the WebContentsView
    if (!view || !view.webContents) {
      throw new InvalidArgumentError("Invalid WebContentsView provided");
    }

    // Acquire the lock for the specific extension
    const lock = this.getResourceLock(uniqueId);

    console.log(
      `[${new Date().toISOString()}] [loadExtension] Waiting for lock on extension: ${uniqueId}`
    );

    return lock.runExclusive(async () => {
      console.log(
        `[${new Date().toISOString()}] [loadExtension] Acquired lock for extension: ${uniqueId}`
      );

      // Ensure the repository database is ready
      try {
        await this.ensureRepositoryReady();
      } catch (error) {
        throw new RepositoryError("Repository not ready", error as Error);
      }

      // Fetch extension details from the repository database
      let extension: ExtensionManifest;
      try {
        const stmt = await this.db!.prepare("SELECT * FROM extensions WHERE uniqueId = ?");

        const result = await stmt.get(uniqueId);

        await stmt.finalize();

        // If extension doesn't exist
        if (!result) {
          throw new ExtensionError(`Extension not found.`);
        }

        extension = {
          ...result,
          permissions: JSON.parse(result.permissions),
        };

        // Check if the extension is enabled
        if (extension.isEnabled === 0) {
          throw new ExtensionError(`Extension ${extension.name} is disabled.`);
        }
      } catch (error) {
        if (error instanceof ExtensionError) {
          throw error; // Re-throw extension-specific errors
        }

        throw new DatabaseError(
          `Failed to retrieve extension with unique ID ${uniqueId} from the database.`,
          error as Error
        );
      }

      // Resolve and verify extension path
      const extPath = path.resolve(this.extensionsPath, uniqueId);
      const entryFilePath = path.join(extPath, extension.entry);

      // Ensuring entry file exists
      try {
        await fs.access(entryFilePath, fs.constants.F_OK);
      } catch (error) {
        throw new FileSystemError(
          `Entry point file not found for extension ${uniqueId} at path: ${entryFilePath}`,
          error as Error
        );
      }

      try {
        await view.webContents.loadFile(entryFilePath);
      } catch (error) {
        throw new ExtensionError(
          `Failed to load extension ${extension.name} into the WebContentsView.`,
          error as Error
        );
      }

      return extension;
    });
  }
}

export function initializeExtensionManager(window: BrowserWindow): ExtensionManager {
  const extensionManager: ExtensionManager = ExtensionManager.getInstance();
  extensionManager.initialize(); // Don't wait for initialization for now

  CommandRegistry.register("extension:install", async () => {
    const path = await DialogService.selectFolder(window);
    if (!path) {
      console.log("Folder selection cancelled");
      return;
    }
    try {
      return await extensionManager.installExtension(path);
    } catch (error) {
      console.error(error);
    }
  });

  CommandRegistry.register("extension:uninstall", async (uniqueId: string) => {
    return await extensionManager.uninstallExtension(uniqueId);
  });

  CommandRegistry.register("extension:list", async () => {
    return await extensionManager.listExtensions();
  });

  // CommandRegistry.register("extension:update", async (payload) => {
  //   return extensionManager.updateExtension(payload.uniqueId, payload.sourcePath);
  // });

  // CommandRegistry.register("extension:enable", async (payload) => {
  //   return await extensionManager.enableExtension(payload);
  // });

  // CommandRegistry.register("extension:disable", async (payload) => {
  //   return await extensionManager.disableExtension(payload);
  // });

  return extensionManager;
}

export default ExtensionManager;
