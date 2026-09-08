import type { LocationSuggestion } from "@/types";

// Static lookup list used for manual "search city / area / locality" selection
// and as the default suggested-locations shortlist. If a real places/geocoding
// API is connected later (see src/utils/geocode.ts), this can be swapped for a
// live search without changing the LocationSearch/LocationModal components.
export const locationSuggestions: LocationSuggestion[] = [
  { id: "loc-hyderabad", city: "Hyderabad", state: "Telangana", latitude: 17.385, longitude: 78.4867 },
  { id: "loc-secunderabad", city: "Secunderabad", state: "Telangana", latitude: 17.4399, longitude: 78.4983 },
  { id: "loc-warangal", city: "Warangal", state: "Telangana", latitude: 17.9689, longitude: 79.5941 },
  { id: "loc-vijayawada", city: "Vijayawada", state: "Andhra Pradesh", latitude: 16.5062, longitude: 80.648 },
  { id: "loc-visakhapatnam", city: "Visakhapatnam", state: "Andhra Pradesh", latitude: 17.6868, longitude: 83.2185 },
  { id: "loc-guntur", city: "Guntur", state: "Andhra Pradesh", latitude: 16.3067, longitude: 80.4365 },
  { id: "loc-nellore", city: "Nellore", state: "Andhra Pradesh", latitude: 14.4426, longitude: 79.9865 },
  { id: "loc-karimnagar", city: "Karimnagar", state: "Telangana", latitude: 18.4386, longitude: 79.1288 },
  { id: "loc-khammam", city: "Khammam", state: "Telangana", latitude: 17.2473, longitude: 80.1514 },
  { id: "loc-tirupati", city: "Tirupati", state: "Andhra Pradesh", latitude: 13.6288, longitude: 79.4192 },
  { id: "loc-anantapur", city: "Anantapur", state: "Andhra Pradesh", latitude: 14.6819, longitude: 77.6006 },
  { id: "loc-kurnool", city: "Kurnool", state: "Andhra Pradesh", latitude: 15.8281, longitude: 78.0373 },
  { id: "loc-nalgonda", city: "Nalgonda", state: "Telangana", latitude: 17.0575, longitude: 79.268 },
];

// Cities shown by default under "Suggested locations" before the user types anything.
export const defaultSuggestedCities = ["loc-hyderabad", "loc-secunderabad", "loc-warangal", "loc-vijayawada"];

export function searchLocations(query: string): LocationSuggestion[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return locationSuggestions.filter(
    (loc) =>
      loc.city.toLowerCase().includes(q) ||
      loc.state.toLowerCase().includes(q) ||
      loc.area?.toLowerCase().includes(q) ||
      loc.pincode?.includes(q),
  );
}
