/**
 * Barrel exports for game components
 * Re-exports all subdirectory modules for cleaner imports
 */
export * from './shared';
export * from './host';
export * from './modals';
export * from './indices';

// Re-export named components from root
export { default as Lobby } from './Lobby';
