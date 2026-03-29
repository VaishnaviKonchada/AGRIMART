import { API_BASE_URL } from "./api";

const getCurrentPosition = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 0,
    });
  });

const dedupeStrings = (items) =>
  Array.from(
    new Set(
      (items || [])
        .map((item) => String(item || "").trim())
        .filter(Boolean)
    )
  );

export async function getCurrentLocationDetails() {
  const position = await getCurrentPosition();
  const lat = position.coords.latitude;
  const lng = position.coords.longitude;

  const fallbackBase = `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`;

  try {
    const response = await fetch(
      `${API_BASE_URL}/locations/reverse-geocode?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`
    );

    const data = await response.json();

    if (!response.ok || !data?.success) {
      return {
        coordinates: { lat, lng },
        country: "",
        state: "",
        district: "",
        mandal: "",
        pincode: "",
        baseLocation: fallbackBase,
        selectedLocation: fallbackBase,
        suggestions: [fallbackBase],
        famousNearby: [],
      };
    }

    const baseLocation = data.locationText || data.fullAddress || fallbackBase;
    const famousNearby = Array.isArray(data.famousNearby) ? data.famousNearby.slice(0, 5) : [];
    const nearestFamous = famousNearby.length > 0 ? String(famousNearby[0]).trim() : "";
    const selectedLocation = nearestFamous
      ? `${baseLocation} (Near ${nearestFamous})`
      : baseLocation;

    const suggestions = dedupeStrings([
      selectedLocation,
      baseLocation,
      data.alternativeLocation,
      ...(Array.isArray(data.nearbySuggestions) ? data.nearbySuggestions : []),
    ]).slice(0, 8);

    return {
      coordinates: { lat, lng },
      country: data.country || "",
      state: data.state || "",
      district: data.district || "",
      mandal: data.mandal || "",
      pincode: data.pincode || "",
      baseLocation,
      selectedLocation,
      suggestions,
      famousNearby,
    };
  } catch (error) {
    return {
      coordinates: { lat, lng },
      country: "",
      state: "",
      district: "",
      mandal: "",
      pincode: "",
      baseLocation: fallbackBase,
      selectedLocation: fallbackBase,
      suggestions: [fallbackBase],
      famousNearby: [],
      error,
    };
  }
}
