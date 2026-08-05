/// <reference types="vite/client" />

declare global {
  interface ImportMetaEnv {
    readonly DEV: boolean;
    // add other env vars if needed
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

export {};
