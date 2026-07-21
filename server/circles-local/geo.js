// Privacy-preserving geo helpers for Circles (local) mode.
// We never store or expose exact coordinates — everything is fuzzed + bucketed.

// Snap precision in degrees. ~0.02° ≈ 2.2 km at the equator. Bigger = fuzzier/safer.
const GRID = 0.02;

function fuzzCoord(c) {
  return Math.round(c / GRID) * GRID;
}

function fuzzLatLng(lat, lng) {
  return { lat: fuzzCoord(lat), lng: fuzzCoord(lng) };
}

// Haversine distance in metres between two (already fuzzed) points.
function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

// Coarse, non-precise label shown to users. Never a precise number.
function distanceLabel(meters) {
  if (meters < 1500) return "very close";
  const km = Math.round(meters / 1000);
  return `~${km} km away`;
}

// Bounding box (in degrees) for a radius in metres, for a cheap pre-filter.
function boundingBox(lat, radiusMeters) {
  const degLat = radiusMeters / 111000;
  const cos = Math.cos((lat * Math.PI) / 180);
  const degLng = radiusMeters / (111000 * (Math.abs(cos) < 1e-6 ? 1e-6 : cos));
  return { degLat, degLng: Math.abs(degLng) };
}

module.exports = { GRID, fuzzLatLng, distanceMeters, distanceLabel, boundingBox };
