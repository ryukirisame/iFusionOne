declare global {

  interface Result<T = null> {
    code: string;
    message: string;
    data?: T;
  }

  interface Window {
    ifusion: ifusion;
  }
}

export {};
