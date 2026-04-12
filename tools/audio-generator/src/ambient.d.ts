// The shared package re-exports React components whose .tsx files import CSS
// modules. Although this Node-only tool only uses shared's *types*, TypeScript
// still walks the module graph. Declare a permissive shim so those traversals
// resolve without pulling Vite-specific typings.
declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}
