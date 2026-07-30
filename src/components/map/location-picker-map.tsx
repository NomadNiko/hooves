"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import Map, { Marker, MapRef, NavigationControl } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MACKINAC_CENTER } from "@/services/api/types/ride";
import { useTranslation } from "@/services/i18n/client";
import { snapToRoad } from "@/hooks/use-snap-to-road";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export type LatLng = { lat: number; lng: number };

type Props = {
  /** Current selected location (already snapped to a road). */
  value: LatLng | null;
  /** Called with a road-snapped location when the user picks one. */
  onChange: (location: LatLng) => void;
  /** Where to centre the map on first render. */
  initialCenter?: LatLng | null;
  /**
   * The rider's current GPS position. When provided, shows a "you are here"
   * dot and — once, on arrival — centres the map there. Omit this entirely
   * for pickers where the rider's own position is irrelevant.
   */
  userLocation?: LatLng | null;
  /**
   * When true, automatically drops the initial pin on the road nearest the
   * rider. Appropriate for pickup (they're standing there) but not for
   * dropoff, where the rider's own position is irrelevant.
   */
  autoSelectNearest?: boolean;
  /** Label shown on the marker. */
  markerLabel?: string;
  /** Marker emoji. */
  markerEmoji?: string;
  /** Map height in px. */
  height?: number;
};

export default function LocationPickerMap({
  value,
  onChange,
  initialCenter,
  userLocation,
  autoSelectNearest = false,
  markerLabel,
  markerEmoji = "📍",
  height = 220,
}: Props) {
  const { t } = useTranslation("common");
  const mapRef = useRef<MapRef>(null);

  const [snapping, setSnapping] = useState(false);
  const [roadName, setRoadName] = useState<string | null>(null);
  const [rejected, setRejected] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  // Guards the one-time auto-snap of the rider's own position.
  const autoSnappedRef = useRef(false);
  // Guards the one-time camera move. After this the camera belongs to the
  // user — we never programmatically move it again, so panning and pinch
  // zoom are never fought or reset.
  const didCentreRef = useRef(false);

  /** Snap a raw coordinate then publish it, or flag it as unusable. */
  const snapAndSet = useCallback(
    async (lat: number, lng: number) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setSnapping(true);
      setRejected(false);
      try {
        const snapped = await snapToRoad(lat, lng, controller.signal);
        if (controller.signal.aborted) return;

        if (!snapped) {
          setRejected(true);
          setRoadName(null);
          return;
        }
        setRoadName(snapped.roadName);
        onChange({ lat: snapped.lat, lng: snapped.lng });
      } catch {
        // Aborted by a newer tap — ignore.
        return;
      } finally {
        if (!controller.signal.aborted) setSnapping(false);
      }
    },
    [onChange]
  );

  // Drop an initial pin on the road nearest the rider, once, when we learn
  // their position and they haven't chosen anything yet.
  useEffect(() => {
    if (!autoSelectNearest) return;
    if (autoSnappedRef.current) return;
    if (value) return;
    if (!userLocation) return;
    autoSnappedRef.current = true;
    snapAndSet(userLocation.lat, userLocation.lng);
  }, [autoSelectNearest, userLocation, value, snapAndSet]);

  // Centre on the rider exactly once, when their position first arrives.
  // The map may well have mounted before GPS resolved, which is why this
  // can't be left to initialViewState alone. The ref makes it strictly
  // one-shot so the user keeps full control of the camera afterwards.
  useEffect(() => {
    if (didCentreRef.current) return;
    if (!userLocation) return;
    const map = mapRef.current?.getMap();
    if (!map) return;
    didCentreRef.current = true;
    map.easeTo({
      center: [userLocation.lng, userLocation.lat],
      zoom: 15.5,
      duration: 500,
    });
  }, [userLocation]);

  const handleClick = useCallback(
    (event: { lngLat: { lat: number; lng: number } }) => {
      snapAndSet(event.lngLat.lat, event.lngLat.lng);
    },
    [snapAndSet]
  );

  if (!MAPBOX_TOKEN) {
    return (
      <div
        className="rounded-lg border flex items-center justify-center text-sm text-muted-foreground"
        style={{ height }}
      >
        {t("common:driverTrackingMap.unavailable")}
      </div>
    );
  }

  // Read once on mount; subsequent camera state is owned by the user.
  const mountCentre = value ?? initialCenter ?? userLocation ?? MACKINAC_CENTER;

  return (
    <div className="space-y-1">
      <div
        className="rounded-lg overflow-hidden border relative cursor-crosshair"
        style={{ height }}
      >
        <Map
          ref={mapRef}
          mapboxAccessToken={MAPBOX_TOKEN}
          initialViewState={{
            latitude: mountCentre.lat,
            longitude: mountCentre.lng,
            zoom: 15,
          }}
          mapStyle="mapbox://styles/mapbox/streets-v12"
          style={{ width: "100%", height: "100%" }}
          onClick={handleClick}
          reuseMaps
        >
          <NavigationControl position="top-right" showCompass={false} />

          {/* The rider's actual GPS position, for orientation. */}
          {userLocation && (
            <Marker
              longitude={userLocation.lng}
              latitude={userLocation.lat}
              anchor="center"
            >
              <div
                className="size-3 rounded-full bg-blue-600 border-2 border-white shadow"
                title={t("common:locationPicker.youAreHere")}
              />
            </Marker>
          )}

          {/* The chosen, road-snapped pin. */}
          {value && (
            <Marker
              longitude={value.lng}
              latitude={value.lat}
              anchor="bottom"
              draggable
              onDragEnd={(e) => snapAndSet(e.lngLat.lat, e.lngLat.lng)}
            >
              <div className="flex flex-col items-center">
                <span className="text-xs font-medium bg-white dark:bg-gray-900 px-1.5 py-0.5 rounded shadow border whitespace-nowrap">
                  {roadName ?? markerLabel}
                </span>
                <span className="text-2xl leading-none">{markerEmoji}</span>
              </div>
            </Marker>
          )}

          {snapping && (
            <div className="absolute inset-x-0 top-0 bg-blue-600/90 text-white text-xs py-1 text-center">
              {t("common:locationPicker.snapping")}
            </div>
          )}
        </Map>
      </div>

      {rejected ? (
        <p className="text-xs text-orange-600 dark:text-orange-400">
          ⚠️ {t("common:locationPicker.noRoadNearby")}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          {t("common:locationPicker.hint")}
        </p>
      )}
    </div>
  );
}
