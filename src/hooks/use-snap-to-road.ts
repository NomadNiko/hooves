"use client";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export type LatLng = { lat: number; lng: number };

export type SnappedPoint = LatLng & {
  /** Road name reported by Mapbox, if any. */
  roadName: string | null;
  /** How far (metres) the point moved to reach the road. */
  distance: number;
};

/**
 * Maximum distance (metres) we allow a tap to be snapped. Beyond this the
 * user tapped somewhere with no nearby road (open water, deep woods) and we
 * reject the selection rather than silently teleporting their pin.
 *
 * Empirically on Mackinac Island: valid on-island taps snap within ~60m,
 * while points offshore snap 400m+ away.
 */
const MAX_SNAP_DISTANCE_M = 200;

/**
 * Mapbox will happily snap an over-water point onto a ferry route, which is
 * not somewhere a carriage can collect anyone. Reject those by name.
 */
const REJECTED_ROAD_PATTERN = /ferry/i;

// Cache keyed by rounded coordinate so repeated taps in the same spot are free.
const snapCache = new Map<string, SnappedPoint | null>();

function cacheKey(lat: number, lng: number) {
  return `${lat.toFixed(5)},${lng.toFixed(5)}`;
}

/**
 * Snap an arbitrary coordinate to the nearest road a carriage could use.
 *
 * Implemented with the Mapbox Directions API: passing the same coordinate
 * twice makes Mapbox resolve it to the nearest routable location, which it
 * reports back in `waypoints[].location`. Returns null when there is no
 * usable road nearby.
 */
export async function snapToRoad(
  lat: number,
  lng: number,
  signal?: AbortSignal
): Promise<SnappedPoint | null> {
  if (!MAPBOX_TOKEN) return null;

  const key = cacheKey(lat, lng);
  if (snapCache.has(key)) return snapCache.get(key) ?? null;

  const point = `${lng},${lat}`;
  const url =
    `https://api.mapbox.com/directions/v5/mapbox/cycling/${point};${point}` +
    `?access_token=${MAPBOX_TOKEN}`;

  try {
    const res = await fetch(url, { signal });
    const data = await res.json();
    const waypoint = data?.waypoints?.[0];

    if (!waypoint?.location) {
      snapCache.set(key, null);
      return null;
    }

    const roadName: string | null = waypoint.name?.trim() || null;
    const distance: number = waypoint.distance ?? 0;

    // Reject snaps that are too far away or land on a ferry route.
    if (
      distance > MAX_SNAP_DISTANCE_M ||
      (roadName && REJECTED_ROAD_PATTERN.test(roadName))
    ) {
      snapCache.set(key, null);
      return null;
    }

    const [snappedLng, snappedLat] = waypoint.location as [number, number];
    const snapped: SnappedPoint = {
      lat: snappedLat,
      lng: snappedLng,
      roadName,
      distance,
    };
    snapCache.set(key, snapped);
    return snapped;
  } catch (err) {
    if ((err as Error)?.name === "AbortError") throw err;
    return null;
  }
}
