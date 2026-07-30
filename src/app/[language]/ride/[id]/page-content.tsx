"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useGetRideService } from "@/services/api/services/rides";
import {
  useGetRideLocationsService,
  RideLocationPoint,
} from "@/services/api/services/location";
import { Ride, RideStatus, resolveCoords } from "@/services/api/types/ride";
import HTTP_CODES_ENUM from "@/services/api/types/http-codes";
import Link from "@/components/link";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/services/i18n/client";
import dynamic from "next/dynamic";
import withPageRequiredAuth from "@/services/auth/with-page-required-auth";

const DriverTrackingMap = dynamic(
  () => import("@/components/map/driver-tracking-map"),
  { ssr: false }
);

function RideDetailPageContent() {
  const { t } = useTranslation("ride-detail");
  const params = useParams<{ id: string }>();
  const rideId = params.id;

  const getRide = useGetRideService();
  const getRideLocations = useGetRideLocationsService();

  const [ride, setRide] = useState<Ride | null>(null);
  const [rideLocations, setRideLocations] = useState<RideLocationPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipSent, setTipSent] = useState(false);

  const loadRide = useCallback(async () => {
    if (!rideId) return;
    const { status, data } = await getRide({ id: rideId });
    if (status === HTTP_CODES_ENUM.OK && data) {
      setRide(data);
    }
    const locResult = await getRideLocations(rideId);
    if (Array.isArray(locResult.data)) {
      setRideLocations(locResult.data);
    }
    setLoading(false);
  }, [rideId, getRide, getRideLocations]);

  useEffect(() => {
    loadRide();
  }, [loadRide]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-lg px-4 py-8">
        <p>{t("ride-detail:loading")}</p>
      </div>
    );
  }

  if (!ride) {
    return (
      <div className="mx-auto w-full max-w-lg px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">
          {t("ride-detail:notFound.heading")}
        </h1>
        <p className="text-muted-foreground">
          {t("ride-detail:notFound.description")}
        </p>
        <Button asChild className="mt-4">
          <Link href="/ride/history">
            {t("ride-detail:notFound.backToHistory")}
          </Link>
        </Button>
      </div>
    );
  }

  const isCompleted = ride.status === RideStatus.COMPLETED;
  const isCancelled = ride.status === RideStatus.CANCELLED;

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-8">
      {/* Back link */}
      <Link
        href="/ride/history"
        className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-block"
      >
        ← {t("ride-detail:backToHistory")}
      </Link>

      <h1 className="text-2xl font-bold mb-2">
        {isCompleted
          ? t("ride-detail:heading.completed")
          : isCancelled
            ? t("ride-detail:heading.cancelled")
            : t("ride-detail:heading.inProgress")}
      </h1>

      {/* Route */}
      <div className="text-lg font-medium mb-4">
        {ride.pickup} → {ride.dropoff}
      </div>

      {/* Journey map */}
      <div className="mb-6">
        <DriverTrackingMap
          driverLocation={null}
          pickupCoords={resolveCoords(
            ride.pickup,
            ride.pickupLat,
            ride.pickupLng
          )}
          dropoffCoords={resolveCoords(
            ride.dropoff,
            ride.dropoffLat,
            ride.dropoffLng
          )}
          pickupLabel={ride.pickup}
          dropoffLabel={ride.dropoff}
          fitMode="pickupAndDropoff"
          routeLine={
            rideLocations.length >= 2
              ? rideLocations.map((loc) => ({ lat: loc.lat, lng: loc.lng }))
              : undefined
          }
          height={280}
        />
        {rideLocations.length > 0 && (
          <div className="text-xs text-muted-foreground mt-2">
            {t("ride-detail:map.gpsPoints", { count: rideLocations.length })}
          </div>
        )}
      </div>

      {/* Trip details card */}
      <div className="rounded-lg border p-5 space-y-4 mb-6">
        <h2 className="font-semibold">{t("ride-detail:details.heading")}</h2>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-muted-foreground">
              {t("ride-detail:details.status")}
            </div>
            <div className="font-medium">
              {t(`ride-detail:statusLabels.${ride.status ?? "unknown"}`)}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">
              {t("ride-detail:details.date")}
            </div>
            <div className="font-medium">
              {new Date(ride.createdAt).toLocaleDateString()}
            </div>
          </div>
          {ride.driverName && (
            <div>
              <div className="text-muted-foreground">
                {t("ride-detail:details.driver")}
              </div>
              <div className="font-medium">{ride.driverName}</div>
            </div>
          )}
          <div>
            <div className="text-muted-foreground">
              {t("ride-detail:details.fare")}
            </div>
            <div className="font-medium text-lg">
              {typeof ride.fare === "number" ? `$${ride.fare}` : "—"}
            </div>
          </div>
        </div>

        {ride.paid && (
          <div className="text-sm text-green-600 font-medium">
            ✓ {t("ride-detail:details.paid")}
          </div>
        )}
      </div>

      {/* Tip section — placeholder */}
      {isCompleted && (
        <div className="rounded-lg border p-5 space-y-4">
          <h2 className="font-semibold">{t("ride-detail:tip.heading")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("ride-detail:tip.description")}
          </p>

          {!tipSent ? (
            <div className="flex gap-2 flex-wrap">
              {[2, 5, 10].map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  onClick={() => setTipSent(true)}
                >
                  ${amount}
                </Button>
              ))}
              <Button variant="outline" onClick={() => setTipSent(true)}>
                {t("ride-detail:tip.custom")}
              </Button>
            </div>
          ) : (
            <div className="text-green-600 font-medium">
              🎉 {t("ride-detail:tip.thankYou")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default withPageRequiredAuth(RideDetailPageContent);
