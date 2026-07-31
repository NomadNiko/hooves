"use client";

import { useRef } from "react";
import Map, { Marker, MapRef, NavigationControl } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MACKINAC_CENTER } from "@/services/api/types/ride";
import { DriverProfile } from "@/services/api/types/driver-profile";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

type Props = {
  drivers: DriverProfile[];
  selectedDriverId: string | null;
  onSelectDriver: (id: string) => void;
};

export default function DispatchMap({
  drivers,
  selectedDriverId,
  onSelectDriver,
}: Props) {
  const mapRef = useRef<MapRef>(null);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="rounded-lg border h-[400px] flex items-center justify-center text-sm text-muted-foreground">
        Map unavailable — NEXT_PUBLIC_MAPBOX_TOKEN is not configured.
      </div>
    );
  }

  return (
    <div className="rounded-lg overflow-hidden border" style={{ height: 400 }}>
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{
          latitude: MACKINAC_CENTER.lat,
          longitude: MACKINAC_CENTER.lng,
          zoom: 13.5,
        }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        style={{ width: "100%", height: "100%" }}
        reuseMaps
      >
        <NavigationControl position="top-right" showCompass={false} />

        {drivers.map((driver) => {
          // eslint-disable-next-line eqeqeq
          if (driver.lat == null || driver.lng == null) return null;
          const isSelected = driver.id === selectedDriverId;
          return (
            <Marker
              key={driver.id}
              longitude={driver.lng}
              latitude={driver.lat}
              anchor="center"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                onSelectDriver(driver.id);
              }}
            >
              <div
                className={`cursor-pointer transition-transform ${
                  isSelected ? "scale-150" : "hover:scale-125"
                }`}
                title={driver.displayName}
              >
                <div
                  className={`text-2xl leading-none drop-shadow-lg ${
                    isSelected ? "animate-bounce" : ""
                  }`}
                >
                  🐴
                </div>
                {isSelected && (
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <span className="text-xs font-medium bg-orange-600 text-white px-1.5 py-0.5 rounded shadow">
                      {driver.displayName}
                    </span>
                  </div>
                )}
              </div>
            </Marker>
          );
        })}
      </Map>
    </div>
  );
}
