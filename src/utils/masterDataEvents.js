const EVENT_NAME = "erp:master-data-changed";
const STORAGE_KEY = "erp:master-data-change";

/**
 * Notifies open ERP screens that a master record changed.  The CustomEvent
 * handles this tab; localStorage's storage event handles other open tabs.
 */
export function publishMasterDataChanged(master) {
  if (typeof window === "undefined") return;

  const detail = { master, changedAt: Date.now() };
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail }));
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(detail));
}

export function subscribeToMasterDataChanges(masters, onChange) {
  if (typeof window === "undefined") return () => {};

  const acceptedMasters = new Set(masters);
  const notify = (detail) => {
    if (detail?.master && acceptedMasters.has(detail.master)) {
      onChange(detail.master);
    }
  };

  const handleCustomEvent = (event) => notify(event.detail);
  const handleStorageEvent = (event) => {
    if (event.key !== STORAGE_KEY || !event.newValue) return;
    try {
      notify(JSON.parse(event.newValue));
    } catch {
      // Ignore malformed browser storage written outside this application.
    }
  };

  window.addEventListener(EVENT_NAME, handleCustomEvent);
  window.addEventListener("storage", handleStorageEvent);
  return () => {
    window.removeEventListener(EVENT_NAME, handleCustomEvent);
    window.removeEventListener("storage", handleStorageEvent);
  };
}
