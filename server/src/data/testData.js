export const TEST_DATA = [
  {
    district: "Visakhapatnam",
    code: "VSP",
    coordinates: { lat: 17.6869, lng: 83.2185 },
    mandals: [
      { name: "Test Mandal", coordinates: { lat: 17.6869, lng: 83.2185 } }
    ]
  }
];

export function getAllDistricts() {
  return TEST_DATA.map(d => ({
    district: d.district,
    code: d.code,
    coordinates: d.coordinates,
    mandalCount: d.mandals.length
  }));
}

export default TEST_DATA;
