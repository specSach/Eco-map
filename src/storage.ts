const memoryFallback = new Map<string, string>()

export const safeStorage = {
  get(key: string) {
    try {
      return window.localStorage.getItem(key) ?? memoryFallback.get(key) ?? null
    } catch {
      return memoryFallback.get(key) ?? null
    }
  },
  set(key: string, value: string) {
    memoryFallback.set(key, value)
    try {
      window.localStorage.setItem(key, value)
    } catch {
      // The in-memory copy keeps the UI usable in restricted/private browsers.
    }
  },
  remove(key: string) {
    memoryFallback.delete(key)
    try {
      window.localStorage.removeItem(key)
    } catch {
      // Storage can be unavailable on some mobile browsers and embedded webviews.
    }
  },
}
