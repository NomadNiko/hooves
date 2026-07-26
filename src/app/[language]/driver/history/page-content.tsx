"use client";

import { useCallback, useEffect, useState } from "react";
import useAuth from "@/services/auth/use-auth";
import { useGetDriverProfilesService } from "@/services/api/services/driver-profiles";
import { useGetRidesService } from "@/services/api/services/rides";
import {
  useGetRideLocationsService,
  RideLocationPoint,
} from "@/services/api/services/location";
import { DriverProfile } from "@/services/api/types/driver-profile";
import { Ride, RideStatus } from "@/services/api/types/ride";
import HTTP_CODES_ENUM from "@/services/api/types/http-codes";
import Link from "@/components/link";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/services/i18n/client";
import { Trans } from "react-i18next";

import withPageRequiredAuth from "@/services/auth/with-page-required-auth";

function DriverHistoryPageContent() {
  const { user } = useAuth();
  const { t } = useTranslation("driver-history");
  const getDriverProfiles = useGetDriverProfilesService();
  const getRides = useGetRidesService();
  const getRideLocations = useGetRideLocationsService();

  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRideId, setExpandedRideId] = useState<string | null>(null);
  const [rideLocations, setRideLocations] = useState<RideLocationPoint[]>([]);

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const loadData = useCallback(async () => {
    if (!user?.id) return;

    // Get driver profile
    const { status: pStatus, data: pData } = await getDriverProfiles({
      page: 1,
      limit: 50,
    });
    if (pStatus === HTTP_CODES_ENUM.OK && pData) {
      const myProfile = pData.data.find((p) => p.userId === user.id);
      setProfile(myProfile || null);
    }

    // Get all rides
    const { status: rStatus, data: rData } = await getRides({
      page: 1,
      limit: 200,
    });
    if (rStatus === HTTP_CODES_ENUM.OK && rData) {
      // Filter to this driver's rides
      const myRides = rData.data.filter((r) => r.driverId === user.id);
      setRides(myRides);
    }

    setLoading(false);
  }, [user?.id, getDriverProfiles, getRides]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <p>{t("driver-history:loading")}</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">
          {t("driver-history:noProfile.heading")}
        </h1>
        <p className="text-muted-foreground">
          {t("driver-history:noProfile.description")}
        </p>
        <Button asChild className="mt-4">
          <Link href="/driver">
            {t("driver-history:noProfile.actions.createProfile")}
          </Link>
        </Button>
      </div>
    );
  }

  const completedRides = rides.filter((r) => r.status === RideStatus.COMPLETED);
  const totalEarnings = completedRides.reduce(
    (sum, r) => sum + (r.fare ?? 0),
    0
  );
  const avgFare =
    completedRides.length > 0 ? totalEarnings / completedRides.length : 0;

  // This week's earnings
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thisWeekRides = completedRides.filter(
    (r) => new Date(r.createdAt) >= weekAgo
  );
  const weekEarnings = thisWeekRides.reduce((sum, r) => sum + (r.fare ?? 0), 0);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">{t("driver-history:heading")}</h1>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4 mb-8 md:grid-cols-4">
        <div className="rounded-lg border p-4 text-center">
          <div className="text-2xl font-bold">{completedRides.length}</div>
          <div className="text-sm text-muted-foreground">
            {t("driver-history:stats.totalRides")}
          </div>
        </div>
        <div className="rounded-lg border p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            ${totalEarnings.toFixed(0)}
          </div>
          <div className="text-sm text-muted-foreground">
            {t("driver-history:stats.totalEarnings")}
          </div>
        </div>
        <div className="rounded-lg border p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            ${weekEarnings.toFixed(0)}
          </div>
          <div className="text-sm text-muted-foreground">
            {t("driver-history:stats.thisWeek")}
          </div>
        </div>
        <div className="rounded-lg border p-4 text-center">
          <div className="text-2xl font-bold">${avgFare.toFixed(2)}</div>
          <div className="text-sm text-muted-foreground">
            {t("driver-history:stats.avgFare")}
          </div>
        </div>
      </div>

      {/* Ride list */}
      <h2 className="text-lg font-semibold mb-3">
        {t("driver-history:rideList.heading", { count: rides.length })}
      </h2>

      {rides.length === 0 ? (
        <div className="rounded-lg border p-6 text-center text-muted-foreground">
          <Trans
            i18nKey="driver-history:rideList.empty"
            t={t}
            components={[<Link key="0" href="/driver" className="underline" />]}
          />
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">
                  {t("driver-history:rideList.table.route")}
                </th>
                <th className="text-left p-3 font-medium">
                  {t("driver-history:rideList.table.rider")}
                </th>
                <th className="text-left p-3 font-medium">
                  {t("driver-history:rideList.table.status")}
                </th>
                <th className="text-right p-3 font-medium">
                  {t("driver-history:rideList.table.fare")}
                </th>
                <th className="text-right p-3 font-medium">
                  {t("driver-history:rideList.table.date")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rides
                .sort(
                  (a, b) =>
                    new Date(b.createdAt).getTime() -
                    new Date(a.createdAt).getTime()
                )
                .map((ride) => (
                  <tr
                    key={ride.id}
                    className="hover:bg-muted/30 cursor-pointer"
                    onClick={async () => {
                      if (expandedRideId === ride.id) {
                        setExpandedRideId(null);
                        setRideLocations([]);
                      } else {
                        setExpandedRideId(ride.id);
                        const { data } = await getRideLocations(ride.id);
                        if (Array.isArray(data)) {
                          setRideLocations(data);
                        } else {
                          setRideLocations([]);
                        }
                      }
                    }}
                  >
                    <td className="p-3">
                      {ride.pickup} → {ride.dropoff}
                      {expandedRideId === ride.id && (
                        <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                          {rideLocations.length === 0 ? (
                            <span className="text-muted-foreground">
                              {t("driver-history:rideList.route.noBreadcrumbs")}
                            </span>
                          ) : (
                            <div>
                              <div className="font-medium mb-1">
                                {t("driver-history:rideList.route.heading", {
                                  count: rideLocations.length,
                                })}
                              </div>
                              <div className="max-h-32 overflow-y-auto space-y-0.5 font-mono">
                                {rideLocations.map((loc, i) => (
                                  <div
                                    key={loc.id}
                                    className="text-muted-foreground"
                                  >
                                    {i + 1}. ({loc.lat.toFixed(5)},{" "}
                                    {loc.lng.toFixed(5)}) —{" "}
                                    {new Date(
                                      loc.createdAt
                                    ).toLocaleTimeString()}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {ride.riderName || t("driver-history:rideList.noRider")}
                    </td>
                    <td className="p-3">
                      <StatusBadge status={ride.status} t={t} />
                    </td>
                    <td className="p-3 text-right font-medium">
                      {ride.fare !== null
                        ? `$${ride.fare}`
                        : t("driver-history:rideList.noFare")}
                    </td>
                    <td className="p-3 text-right text-muted-foreground">
                      {new Date(ride.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
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
    ? `driver-history:rideList.statusLabels.${status}`
    : "driver-history:rideList.statusLabels.unknown";
  return (
    <span className={`text-xs px-2 py-0.5 rounded font-medium ${style}`}>
      {t(labelKey)}
    </span>
  );
}

export default withPageRequiredAuth(DriverHistoryPageContent);
