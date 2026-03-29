// utils/geocode.js
export async function geocodeAddress(address) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch coordinates');
  const data = await response.json();
  if (data.length === 0) throw new Error('No coordinates found for this address');
  return {
    lat: parseFloat(data[0].lat),
    lon: parseFloat(data[0].lon)
  };
}
