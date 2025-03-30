export {}; // Ensures it’s treated as a module

declare global {
  interface EventDataMapping {
    "extension:loaded": { extensionId: number };
  }
}
