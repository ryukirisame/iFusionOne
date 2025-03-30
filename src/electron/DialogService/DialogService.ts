import { BrowserWindow, dialog } from "electron";

/**
 * Handles opening dialog boxes in electron
 */
class DialogService {
  /**
   * Opens a file selection dialog allowing only a single file selection.
   * @param window The Electron `BrowserWindow` instance - allows the dialog to attach itself to the window, making it modal.
   * @param options Additional dialog options
   * @returns Selected file path or `null` if cancelled
   */
  static async selectFile(
    window: BrowserWindow,
    options?: Electron.OpenDialogOptions
  ): Promise<string | null> {
    const sanitizedOptions: Electron.OpenDialogOptions = {
      ...options,
      title: options?.title || "Select a file",
      properties: ["openFile"],
      filters: options?.filters || [{ name: "All Files", extensions: ["*"] }],
    };

    const result = await dialog.showOpenDialog(window, sanitizedOptions);

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  }

  /**
   * Opens a file selection dialog allowing multiple file selections.
   * @param window - The Electron `BrowserWindow` instance - allows the dialog to attach itself to the window, making it modal.
   * @param options - Additional dialog options.
   * @returns An array of selected file paths or an empty array if canceled.
   */
  static async selectMultipleFiles(
    window: BrowserWindow,
    options?: Electron.OpenDialogOptions
  ): Promise<string[]> {
    const sanitizedOptions: Electron.OpenDialogOptions = {
      ...options,
      title: options?.title || "Select multiple files",
      properties: ["openFile", "multiSelections"], // Enforce multiSelections
      filters: options?.filters || [{ name: "All Files", extensions: ["*"] }],
    };

    const result = await dialog.showOpenDialog(window, sanitizedOptions);

    if (result.canceled) {
      return [];
    }

    return result.filePaths; // Return all selected files
  }

  /**
   * Opens a folder selection dialog allowing only a single folder selection.
   *@param window The Electron `BrowserWindow` instance - allows the dialog to attach itself to the window, making it modal.
   *@param options Additional dialog options.
   *@returns Selected folder path or `null` if cancelled
   */
  static async selectFolder(
    window: BrowserWindow,
    options?: Electron.OpenDialogOptions
  ): Promise<string | null> {
    const sanitizedOptions: Electron.OpenDialogOptions = {
      ...options,
      title: options?.title || "Select a folder",
      properties: ["openDirectory"],
      filters: [{ name: "All Files", extensions: ["*"] }],
    };

    const result = await dialog.showOpenDialog(window, sanitizedOptions);

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  }

  /**
   * Opens a folder selection dialog allowing multiple folder selections.
   * @param window - The Electron `BrowserWindow` instance - allows the dialog to attach itself to the window, making it modal.
   * @param options - Additional dialog options.
   * @returns An array of selected folder paths or an empty array if canceled.
   */
  static async selectMultipleFolders(
    window: BrowserWindow,
    options?: Electron.OpenDialogOptions
  ): Promise<string[]> {
    const sanitizedOptions: Electron.OpenDialogOptions = {
      ...options,
      title: options?.title || "Select multiple folders",
      properties: ["openDirectory", "multiSelections"],
      filters: [{ name: "All Files", extensions: ["*"] }],
    };

    const result = await dialog.showOpenDialog(window, sanitizedOptions);

    if (result.canceled) {
      return [];
    }

    return result.filePaths; // Return selected folder paths
  }

  /**
   * Shows a message box
   * @param options Customizable message box options.
   * @returns The selected button index.
   */
  static async showMessage(
    window: BrowserWindow,
    options: Electron.MessageBoxOptions
  ): Promise<number> {
    const result: Electron.MessageBoxReturnValue = await dialog.showMessageBox(window, options);

    return result.response;
  }
}

export default DialogService;
