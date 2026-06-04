/**
 * IPC wrapper — all components import from here, never directly from bindings.ts.
 * This decouples components from the generated file path.
 */
export { commands } from './bindings';
