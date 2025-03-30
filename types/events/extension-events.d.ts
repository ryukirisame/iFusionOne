

declare global {
  interface EventDataMapping {
    "extension:loaded": { extensionId: number };
  }
}


export {}; // Ensures it’s treated as a module