"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Map, {
  Marker,
  MapRef,
  NavigationControl,
  Source,
  Layer,
} from "react-map-gl";
import type { LayerProps } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MACKINAC_CENTER } from "@/services/api/types/ride";
import { useTranslation } from "@/services/i18n/client";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export type LatLng = { lat: number; lng: number };

type Props = {
  driverLocation: LatLng | null;
  pickupCoords?: LatLng | null;
  dropoffCoords?: LatLng | null;
  pickupLabel?: string;
  dropoffLabel?: string;
  /** Array of points to draw a line between (e.g. driver→pickup, pickup→dropoff). */
  routeLine?: LatLng[];
  /**
   * Controls which points auto-fit keeps in frame:
   * - "driverAndPickup" (default): fits driver + pickup (driver approaching)
   * - "driverAndDropoff": fits driver + dropoff (trip in progress)
   * - "pickupAndDropoff": fits pickup + dropoff (route preview)
   */
  fitMode?: "driverAndPickup" | "driverAndDropoff" | "pickupAndDropoff";
  height?: number;
};

function DriverTrackingMap({
  driverLocation,
  pickupCoords,
  dropoffCoords,
  pickupLabel,
  dropoffLabel,
  routeLine,
  fitMode = "driverAndPickup",
  height = 320,
}: Props) {
  const { t } = useTranslation("common");
  const resolvedPickupLabel =
    pickupLabel ?? t("common:driverTrackingMap.pickupLabel");
  const resolvedDropoffLabel =
    dropoffLabel ?? t("common:driverTrackingMap.dropoffLabel");
  const mapRef = useRef<MapRef>(null);

  // Track whether the user has manually panned/zoomed. While true we
  // stop auto-fitting so we don't fight their gesture.
  const [userOverride, setUserOverride] = useState(false);
  const overrideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // After user interaction, pause auto-fit for 10 seconds then resume.
  const handleUserInteraction = useCallback(() => {
    setUserOverride(true);
    if (overrideTimerRef.current) clearTimeout(overrideTimerRef.current);
    overrideTimerRef.current = setTimeout(() => setUserOverride(false), 10000);
  }, []);

  // Fit the relevant points in frame based on fitMode.
  useEffect(() => {
    if (userOverride) return;
    const map = mapRef.current?.getMap();
    if (!map) return;

    let points: LatLng[] = [];
    switch (fitMode) {
      case "driverAndPickup":
        points = [driverLocation, pickupCoords].filter((p): p is LatLng => !!p);
        break;
      case "driverAndDropoff":
        points = [driverLocation, dropoffCoords].filter(
          (p): p is LatLng => !!p
        );
        break;
      case "pickupAndDropoff":
        points = [pickupCoords, dropoffCoords].filter((p): p is LatLng => !!p);
        break;
    }

    if (points.length === 0) return;

    if (points.length === 1) {
      map.easeTo({
        center: [points[0].lng, points[0].lat],
        zoom: 15.5,
        duration: 300,
      });
    } else {
      const lats = points.map((p) => p.lat);
      const lngs = points.map((p) => p.lng);
      map.fitBounds(
        [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        ],
        { padding: 80, duration: 400, maxZoom: 17, minZoom: 12 }
      );
    }
  }, [driverLocation, pickupCoords, dropoffCoords, userOverride, fitMode]);

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

  const initial = pickupCoords ??
    driverLocation ?? { lat: MACKINAC_CENTER.lat, lng: MACKINAC_CENTER.lng };

  return (
    <div
      className="rounded-lg overflow-hidden border relative"
      style={{ height }}
      data-testid="driver-tracking-map"
    >
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{
          latitude: initial.lat,
          longitude: initial.lng,
          zoom: 14,
        }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        style={{ width: "100%", height: "100%" }}
        onDragStart={handleUserInteraction}
        onZoomStart={handleUserInteraction}
        reuseMaps
      >
        <NavigationControl position="top-right" showCompass={false} />

        {/* Route line */}
        {routeLine && routeLine.length >= 2 && (
          <Source
            id="route-line"
            type="geojson"
            data={{
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: routeLine.map((p) => [p.lng, p.lat]),
              },
            }}
          >
            <Layer
              {...({
                id: "route-line-layer",
                type: "line",
                paint: {
                  "line-color": "#f97316",
                  "line-width": 5,
                  "line-opacity": 0.75,
                },
                layout: {
                  "line-cap": "round",
                  "line-join": "round",
                },
              } as LayerProps)}
            />
          </Source>
        )}

        {pickupCoords && (
          <Marker
            longitude={pickupCoords.lng}
            latitude={pickupCoords.lat}
            anchor="bottom"
          >
            <div className="flex flex-col items-center">
              <span className="text-xs font-medium bg-white dark:bg-gray-900 px-1.5 py-0.5 rounded shadow border whitespace-nowrap">
                {resolvedPickupLabel}
              </span>
              <span className="text-lg leading-none">🟢</span>
            </div>
          </Marker>
        )}

        {dropoffCoords && (
          <Marker
            longitude={dropoffCoords.lng}
            latitude={dropoffCoords.lat}
            anchor="bottom"
          >
            <div className="flex flex-col items-center">
              <span className="text-xs font-medium bg-white dark:bg-gray-900 px-1.5 py-0.5 rounded shadow border whitespace-nowrap">
                {resolvedDropoffLabel}
              </span>
              <span className="text-lg leading-none">🏁</span>
            </div>
          </Marker>
        )}

        {driverLocation && (
          <Marker
            longitude={driverLocation.lng}
            latitude={driverLocation.lat}
            anchor="center"
          >
            <div
              className="text-3xl leading-none drop-shadow-lg"
              title={t("common:driverTrackingMap.carriageTitle")}
            >
              🐴
            </div>
          </Marker>
        )}
      </Map>

      {/* Override indicator */}
      {userOverride && (
        <button
          onClick={() => setUserOverride(false)}
          className="absolute bottom-2 left-2 bg-white dark:bg-gray-900 text-xs px-2 py-1 rounded shadow border cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          {t("common:driverTrackingMap.recentre")}
        </button>
      )}
    </div>
  );
}

export default DriverTrackingMap;
