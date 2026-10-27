// Good enough for local-only data. Switch to UUIDs (expo-crypto) once you add a backend.
export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
