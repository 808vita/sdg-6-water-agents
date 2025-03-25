// lib/utils/map-utils.ts
import L from "leaflet";

const GEOCODE_API_DELAY = 2000; // 2 seconds

let lastGeocodeTime = 0;
let isGeocoding = false;

export const geocodeWithThrottle = async (
  locationName: string
): Promise<any> => {
  // Check for rate limiting
  const now = Date.now();
  const timeSinceLastGeocode = now - lastGeocodeTime;

  if (timeSinceLastGeocode < GEOCODE_API_DELAY && lastGeocodeTime !== 0) {
    const timeout = GEOCODE_API_DELAY - timeSinceLastGeocode;
    console.warn(`Rate limiting geocoding. Retrying in ${timeout}ms`);
    await new Promise((resolve) => setTimeout(resolve, timeout));
  }

  try {
    isGeocoding = true;
    const geocoder = L.Control.Geocoder.nominatim();
    const results = await geocoder.geocode(locationName).catch((err) => {
      console.error("Geocoding error", err);
      return null;
    });
    lastGeocodeTime = Date.now();
    return results;
  } finally {
    isGeocoding = false;
  }
};

export const reverseGeocode = async (
  lat: number,
  lng: number
): Promise<any> => {
  try {
    const geocoder = L.Control.Geocoder.nominatim();
    const results = await geocoder
      .reverse(L.latLng(lat, lng), 14)
      .catch((err) => {
        console.error("Reverse Geocoding error", err);
        return null;
      });
    return results;
  } catch (error) {
    console.error("Geocoder error", error);
    return null;
  }
};
