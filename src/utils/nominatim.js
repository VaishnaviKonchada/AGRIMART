// utils/nominatim.js
// Simple wrapper for OSM Nominatim API to fetch nearby POIs

export async function fetchNearbyFamousPlaces(lat, lon, radius = 2000, limit = 5) {
  // Nominatim API: https://nominatim.openstreetmap.org/ui/search.html
  // Use the /reverse endpoint to get address, and /search for POIs
  const endpoint = `https://nominatim.openstreetmap.org/search?format=json&extratags=1&namedetails=1&addressdetails=1&limit=${limit}&q=*&lat=${lat}&lon=${lon}&radius=${radius}`;
  const headers = {
    'Accept': 'application/json',
    // 'User-Agent': 'agrimart-client/1.0 (your-email@example.com)' // OSM policy: set a real user agent/email in production
  };
  const response = await fetch(endpoint, { headers });
  if (!response.ok) throw new Error('Failed to fetch POIs from Nominatim');
  const data = await response.json();
  // Filter for POIs with a name and a type that is likely to be a landmark
  return (data || []).filter(
    (item) => item.display_name && (
      item.type === 'attraction' || item.type === 'monument' || item.type === 'public_building' || item.type === 'place_of_worship' || item.type === 'school' || item.type === 'hospital' || item.type === 'marketplace' || item.type === 'park' || item.type === 'mall' || item.type === 'stadium' || item.type === 'theatre' || item.type === 'museum' || item.type === 'university' || item.type === 'college' || item.type === 'bus_station' || item.type === 'railway_station' || item.type === 'townhall' || item.type === 'village' || item.type === 'hamlet' || item.type === 'suburb' || item.type === 'neighbourhood' || item.type === 'locality'
    )
  ).map((item) => item.display_name.split(',')[0].trim());
}
