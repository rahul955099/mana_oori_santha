import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { DeliveryLocation, LocationSuggestion } from "@/types";
import { getCurrentPosition, GeolocationError } from "@/utils/geolocation";
import { reverseGeocode, GeocodeError } from "@/utils/geocode";

const LOCATION_KEY = "mos_delivery_location";
const PROMPT_DISMISSED_KEY = "mos_location_prompt_dismissed";

interface LocationContextValue {
  location: DeliveryLocation | null;
  setManualLocation: (suggestion: LocationSuggestion) => void;
  setCustomLocation: (location: DeliveryLocation) => void;
  clearLocation: () => void;
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  detecting: boolean;
  detectError: string | null;
  detectCurrentLocation: () => Promise<void>;
  showFirstVisitPrompt: boolean;
  dismissFirstVisitPrompt: () => void;
}

const LocationContext = createContext<LocationContextValue | undefined>(undefined);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<DeliveryLocation | null>(() => {
    try {
      const raw = localStorage.getItem(LOCATION_KEY);
      return raw ? (JSON.parse(raw) as DeliveryLocation) : null;
    } catch {
      return null;
    }
  });
  const [promptDismissed, setPromptDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(PROMPT_DISMISSED_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (location) {
        localStorage.setItem(LOCATION_KEY, JSON.stringify(location));
      } else {
        localStorage.removeItem(LOCATION_KEY);
      }
    } catch {
      // localStorage unavailable (private browsing, quota, etc.) — fail silently.
    }
  }, [location]);

  const openModal = useCallback(() => {
    setDetectError(null);
    setIsModalOpen(true);
  }, []);
  const closeModal = useCallback(() => setIsModalOpen(false), []);

  const setManualLocation = useCallback((suggestion: LocationSuggestion) => {
    setLocation({
      label: [suggestion.city, suggestion.state].filter(Boolean).join(", "),
      city: suggestion.city,
      state: suggestion.state,
      area: suggestion.area,
      pincode: suggestion.pincode,
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
      source: "manual",
    });
    setIsModalOpen(false);
  }, []);

  const setCustomLocation = useCallback((next: DeliveryLocation) => {
    setLocation(next);
    setIsModalOpen(false);
  }, []);

  const clearLocation = useCallback(() => setLocation(null), []);

  const dismissFirstVisitPrompt = useCallback(() => {
    setPromptDismissed(true);
    try {
      localStorage.setItem(PROMPT_DISMISSED_KEY, "1");
    } catch {
      // ignore
    }
  }, []);

  const detectCurrentLocation = useCallback(async () => {
    setDetecting(true);
    setDetectError(null);
    try {
      const position = await getCurrentPosition();
      const { latitude, longitude } = position.coords;
      const geo = await reverseGeocode(latitude, longitude);
      setLocation({
        label: geo.label,
        city: geo.city,
        state: geo.state,
        area: geo.area,
        pincode: geo.pincode,
        latitude,
        longitude,
        source: "current-location",
      });
      setIsModalOpen(false);
      dismissFirstVisitPrompt();
    } catch (err) {
      if (err instanceof GeolocationError || err instanceof GeocodeError) {
        setDetectError(err.message);
      } else {
        setDetectError("Something went wrong while detecting your location.");
      }
    } finally {
      setDetecting(false);
    }
  }, [dismissFirstVisitPrompt]);

  const showFirstVisitPrompt = !location && !promptDismissed;

  return (
    <LocationContext.Provider
      value={{
        location,
        setManualLocation,
        setCustomLocation,
        clearLocation,
        isModalOpen,
        openModal,
        closeModal,
        detecting,
        detectError,
        detectCurrentLocation,
        showFirstVisitPrompt,
        dismissFirstVisitPrompt,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocationContext(): LocationContextValue {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("useLocationContext must be used within LocationProvider");
  return ctx;
}
