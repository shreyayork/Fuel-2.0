/// <reference types="vite/client" />

declare module "*.svg" {
  const src: string;
  export default src;
}

declare module "*.css" {
  const classes: Record<string, string>;
  export default classes;
}
