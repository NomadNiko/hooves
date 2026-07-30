export type Ride = {
  id: string;
  riderId: string;
  riderName?: string | null;
  pickup: string;
  dropoff: string;
  pickupLat?: number | null;
  pickupLng?: number | null;
  dropoffLat?: number | null;
  dropoffLng?: number | null;
  status?: string | null;
  fare?: number | null;
  driverId?: string | null;
  driverName?: string | null;
  paid?: boolean;
  createdAt: string;
  updatedAt: string;
};

export enum RideStatus {
  REQUESTED = "requested",
  ACCEPTED = "accepted",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export const STANDS = [
  "Shepler's Dock",
  "Star Line Dock",
  "Main Street",
  "Grand Hotel",
  "Fort Mackinac",
  "Arch Rock",
  "Mission Point",
  "British Landing",
  "Surrey Hills",
  "Mackinac Island Airport",
];

// Approximate coordinates for each named stand on Mackinac Island.
// Used to plot pickup/dropoff on the map. Good enough for the POC —
// refine with surveyed positions before real dispatch use.
export const STAND_COORDS: Record<string, { lat: number; lng: number }> = {
  "Shepler's Dock": { lat: 45.8478, lng: -84.618 },
  "Star Line Dock": { lat: 45.8487, lng: -84.6169 },
  "Main Street": { lat: 45.8503, lng: -84.6186 },
  "Grand Hotel": { lat: 45.8479, lng: -84.6259 },
  "Fort Mackinac": { lat: 45.8517, lng: -84.6178 },
  "Arch Rock": { lat: 45.8557, lng: -84.6086 },
  "Mission Point": { lat: 45.8462, lng: -84.6104 },
  "British Landing": { lat: 45.8687, lng: -84.642 },
  "Surrey Hills": { lat: 45.856, lng: -84.63 },
  "Mackinac Island Airport": { lat: 45.8648, lng: -84.6372 },
};

// Island centre — map fallback when no other reference point exists.
export const MACKINAC_CENTER = { lat: 45.8547, lng: -84.6291 };

// Downtown / Main Street area — where most trips end up, so it makes a
// sensible default view when choosing a destination.
export const DOWNTOWN_CENTER = { lat: 45.8503, lng: -84.6186 };

// Sentinel value for custom (non-preset) locations.
export const CUSTOM_LOCATION = "📍 Custom Location";

/**
 * Resolve the coordinates for a ride's pickup or dropoff.
 * Prefers explicit lat/lng fields, falls back to STAND_COORDS lookup.
 */
export function resolveCoords(
  name: string,
  lat?: number | null,
  lng?: number | null
): { lat: number; lng: number } | null {
  // eslint-disable-next-line eqeqeq -- `!= null` intentionally covers undefined too
  if (lat != null && lng != null) return { lat, lng };
  return STAND_COORDS[name] ?? null;
}
