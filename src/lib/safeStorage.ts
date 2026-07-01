import type { StateStorage } from "zustand/middleware";
import { logError } from "./errors";

/**
 * Defensiv localStorage-wrapper för Zustand `persist`.
 * Kraschar aldrig — om storage är otillgängligt (privat läge, fullt, avstängt)
 * loggas felet och appen fortsätter i minnet.
 */
export const safeStorage: StateStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name);
    } catch (error) {
      logError("storage.getItem", error);
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value);
    } catch (error) {
      logError("storage.setItem", error);
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
    } catch (error) {
      logError("storage.removeItem", error);
    }
  },
};
