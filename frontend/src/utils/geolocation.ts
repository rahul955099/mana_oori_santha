// Thin promise wrapper around the browser Geolocation API with friendly,
// user-facing error messages for the three failure modes it can report.
export class GeolocationError extends Error {}

export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new GeolocationError("Location services aren't supported on this browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position),
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(new GeolocationError("Location permission was denied. Please allow location access or search manually."));
            break;
          case error.POSITION_UNAVAILABLE:
            reject(new GeolocationError("Your location is currently unavailable. Please try again or search manually."));
            break;
          case error.TIMEOUT:
            reject(new GeolocationError("Location request timed out. Please try again or search manually."));
            break;
          default:
            reject(new GeolocationError("Couldn't detect your location. Please search manually."));
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    );
  });
}
