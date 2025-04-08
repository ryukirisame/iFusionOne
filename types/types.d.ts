declare global {
  
  /**
   * Represents the response object sent to the renderer process.
   */
  type MainToRendererResponse<T> = {
    isSuccess: boolean;
    message: string;
    error?: string[];
    data?: T;
  };

  interface Window {
    ifusion: ifusion;
  }
}

export {};
