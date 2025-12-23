/**
 * Data Layer - React hooks for Heritage database operations
 *
 * Usage:
 *
 * 1. Wrap your app with DatabaseProvider:
 *    <DatabaseProvider>
 *      <App />
 *    </DatabaseProvider>
 *
 * 2. Use hooks in components:
 *    const { createBundle, openBundle, isOpen } = useDatabase();
 *    const { persons, createPerson, getPerson } = usePersons();
 *    const { createUnion, addChild } = useUnions();
 *    const { createEvent, getBirthEvent } = useEvents();
 *    const { importAndCreateMedia, linkMedia } = useMedia();
 *    const { places, createPlace } = usePlaces();
 *    const { sources, createCitation } = useSources();
 */

// Context and Provider
export { DatabaseProvider, useDatabase, generateId } from './DatabaseContext';

// Entity hooks
export { usePersons } from './usePersons';
export { useUnions } from './useUnions';
export { useEvents, EVENT_TYPES } from './useEvents';
export { useMedia, MEDIA_TYPES } from './useMedia';
export { usePlaces, PLACE_TYPES } from './usePlaces';
export { useSources, SOURCE_TYPES, COMMON_SOURCES, CONFIDENCE_LEVELS } from './useSources';
