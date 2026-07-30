"use client";

import { useCallback, useEffect, useState } from "react";
import useAuth from "@/services/auth/use-auth";
import { useGetRidesService } from "@/services/api/services/rides";
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

function RideHistoryPageContent() {
  const { user } = useAuth();
  const { t } = useTranslation("ride-history");
  const getRides = useGetRidesService();
  const getRideLocations = useGetRideLocationsService();

  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRideId, setExpandedRideId] = useState<string | null>(null);
  const [rideLocations, setRideLocations] = useState<RideLocationPoint[]>([]);

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const loadData = useCallback(async () => {
    if (!user?.id) return;
    const { status, data } = await getRides({ page: 1, limit: 200 });
    if (status === HTTP_CODES_ENUM.OK && data) {
      const myRides = data.data
        .filter((r) => r.riderId === user.id)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      setRides(myRides);
    }
    setLoading(false);
  }, [user?.id, getRides]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExpandRide = async (rideId: string) => {
    if (expandedRideId === rideId) {
      setExpandedRideId(null);
      setRideLocations([]);
    } else {
      setExpandedRideId(rideId);
      const { data } = await getRideLocations(rideId);
      if (Array.isArray(data)) {
        setRideLocations(data);
      } else {
        setRideLocations([]);
      }
    }
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <p>{t("ride-history:loading")}</p>
      </div>
    );
  }

  const completedRides = rides.filter((r) => r.status === RideStatus.COMPLETED);
  const totalSpent = completedRides.reduce((sum, r) => sum + (r.fare ?? 0), 0);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">{t("ride-history:heading")}</h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="rounded-lg border p-4 text-center">
          <div className="text-2xl font-bold">{rides.length}</div>
          <div className="text-sm text-muted-foreground">
            {t("ride-history:stats.totalRides")}
          </div>
        </div>
        <div className="rounded-lg border p-4 text-center">
          <div className="text-2xl font-bold">{completedRides.length}</div>
          <div className="text-sm text-muted-foreground">
            {t("ride-history:stats.completed")}
          </div>
        </div>
        <div className="rounded-lg border p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            ${totalSpent.toFixed(0)}
          </div>
          <div className="text-sm text-muted-foreground">
            {t("ride-history:stats.totalSpent")}
          </div>
        </div>
      </div>

      {/* Ride list */}
      {rides.length === 0 ? (
        <div className="rounded-lg border p-6 text-center text-muted-foreground">
          <p>{t("ride-history:empty")}</p>
          <Button asChild className="mt-4">
            <Link href="/ride">{t("ride-history:emptyAction")}</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {rides.map((ride) => (
            <div key={ride.id} className="rounded-lg border overflow-hidden">
              <div
                className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => handleExpandRide(ride.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">
                      {ride.pickup} → {ride.dropoff}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {ride.driverName && (
                        <span>
                          {t("ride-history:card.driver")}: {ride.driverName}
                          {" · "}
                        </span>
                      )}
                      {new Date(ride.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">
                      {typeof ride.fare === "number" ? `$${ride.fare}` : "—"}
                    </div>
                    <StatusBadge status={ride.status} t={t} />
                  </div>
                </div>
              </div>

              {/* Expanded view with map and actions */}
              {expandedRideId === ride.id && (
                <div className="border-t p-4 space-y-3 bg-muted/10">
                  {/* Map showing GPS trail or route */}
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
                        ? rideLocations.map((loc) => ({
                            lat: loc.lat,
                            lng: loc.lng,
                          }))
                        : undefined
                    }
                    height={200}
                  />

                  {rideLocations.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {t("ride-history:card.gpsPoints", {
                        count: rideLocations.length,
                      })}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button asChild size="sm">
                      <Link href={`/ride/${ride.id}`}>
                        {t("ride-history:card.viewDetails")}
                      </Link>
                    </Button>
                    {ride.status === RideStatus.COMPLETED && !ride.paid && (
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/ride/${ride.id}`}>
                          {t("ride-history:card.tipDriver")}
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({
  status,
  t,
}: {
  status?: string | null;
  t: (key: string) => string;
}) {
  const styles: Record<string, string> = {
    completed:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    in_progress:
      "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    accepted:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    requested: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  };
  const style = styles[status ?? ""] ?? styles.requested;
  const labelKey = status
    ? `ride-history:statusLabels.${status}`
    : "ride-history:statusLabels.unknown";
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded font-medium inline-block mt-1 ${style}`}
    >
      {t(labelKey)}
    </span>
  );
}

export default withPageRequiredAuth(RideHistoryPageContent);
