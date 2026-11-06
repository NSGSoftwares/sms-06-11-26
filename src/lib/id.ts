/** Small unique id for React keys and list entries. */
export const uid = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    try {
      return crypto.randomUUID();
    } catch {
      // randomUUID is unavailable on insecure origins - fall through.
    }
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};
