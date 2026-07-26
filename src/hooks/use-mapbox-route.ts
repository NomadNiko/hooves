"use client";

import { useEffect, useState, useRef } from "react";

type LatLng = { lat: number; lng: number };

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

// Simple in-memory cache keyed by "lng1,lat1;lng2,lat2" so repeated
// pairs don't re-fetch during a session.
const routeCache = new Map<string, LatLng[]>();

/**
 * Fetches a walking/cycling route from Mapbox Directions API between
 * two points and returns the decoded geometry as an array of LatLng.
 *
 * Uses "cycling" profile which is the closest match to horse carriage
 * paths (follows roads, not highways). Falls back to a straight line
 * between the two points if the API call fails.
 */
export function useMapboxRoute(
  from: LatLng | null | undefined,
  to: LatLng | null | undefined
): LatLng[] | null {
  const [route, setRoute] = useState<LatLng[] | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!from || !to || !MAPBOX_TOKEN) {
      setRoute(null);
      return;
    }

    const cacheKey = `${from.lng},${from.lat};${to.lng},${to.lat}`;
    const cached = routeCache.get(cacheKey);
    if (cached) {
      setRoute(cached);
      return;
    }

    // Abort any in-flight request when inputs change.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const url = `https://api.mapbox.com/directions/v5/mapbox/cycling/${from.lng},${from.lat};${to.lng},${to.lat}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;

    fetch(url, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (data.routes && data.routes.length > 0) {
          const coords: LatLng[] = data.routes[0].geometry.coordinates.map(
            ([lng, lat]: [number, number]) => ({ lat, lng })
          );
          routeCache.set(cacheKey, coords);
          setRoute(coords);
        } else {
          // Fallback: straight line
          const fallback = [from, to];
          routeCache.set(cacheKey, fallback);
          setRoute(fallback);
        }
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        // Fallback to straight line on error
        const fallback = [from, to];
        routeCache.set(cacheKey, fallback);
        setRoute(fallback);
      });

    return () => controller.abort();
  }, [from, to]);

  return route;
}
