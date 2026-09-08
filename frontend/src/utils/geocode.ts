// Reverse geocoding: turns { latitude, longitude } into a readable location.
//
// Uses OpenStreetMap's free Nominatim API by default — no API key required,
// nothing secret to leak into frontend code. If the project later adopts a
// paid/rate-limited geocoding provider, set VITE_GEOCODING_API_BASE_URL to a
// backend proxy endpoint (never point it at a provider that needs a secret
// key directly from the browser) and this function keeps working unchanged.
const DEFAULT_BASE_URL = "https://nominatim.openstreetmap.org";

export interface ReverseGeocodeResult {
  label: string;
  city: string;
  state: string;
  area?: string;
  pincode?: string;
}

export class GeocodeError extends Error {}

export async function reverseGeocode(latitude: number, longitude: number): Promise<ReverseGeocodeResult> {
  const baseUrl = (import.meta.env.VITE_GEOCODING_API_BASE_URL as string | undefined) || DEFAULT_BASE_URL;
  const url = `${baseUrl}/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=14&addressdetails=1`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: "application/json" },
    });
  } catch {
    throw new GeocodeError("Couldn't reach the location service. Check your internet connection.");
  }

  if (!response.ok) {
    throw new GeocodeError("Couldn't determine your address from these coordinates.");
  }

  const data = await response.json();
  const address = data?.address ?? {};
  const city: string | undefined =
    address.city || address.town || address.village || address.suburb || address.county;
  const state: string | undefined = address.state;
  const area: string | undefined = address.suburb || address.neighbourhood || address.city_district;
  const pincode: string | undefined = address.postcode;

  if (!city && !state) {
    throw new GeocodeError("Couldn't determine your address from these coordinates.");
  }

  const label = [city, state].filter(Boolean).join(", ") || data?.display_name || "Current location";

  return { label, city: city ?? "", state: state ?? "", area, pincode };
}
