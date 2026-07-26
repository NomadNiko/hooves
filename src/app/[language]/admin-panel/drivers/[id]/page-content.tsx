"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useGetDriverProfileService } from "@/services/api/services/driver-profiles";
import { useGetRidesService } from "@/services/api/services/rides";
import { DriverProfile } from "@/services/api/types/driver-profile";
import { Ride, RideStatus } from "@/services/api/types/ride";
import HTTP_CODES_ENUM from "@/services/api/types/http-codes";
import Link from "@/components/link";
import { Button } from "@/components/ui/button";

import withPageRequiredAuth from "@/services/auth/with-page-required-auth";
import { RoleEnum } from "@/services/api/types/role";
import { useTranslation } from "@/services/i18n/client";

function AdminDriverDetailPageContent() {
  const params = useParams();
  const driverId = params.id as string;
  const { t } = useTranslation("admin-panel-driver-detail");

  const getDriverProfile = useGetDriverProfileService();
  const getRides = useGetRidesService();

  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!driverId) return;

    const { status: pStatus, data: pData } = await getDriverProfile({
      id: driverId,
    });
    let loadedProfile: DriverProfile | null = null;
    if (pStatus === HTTP_CODES_ENUM.OK && pData && "userId" in pData) {
      loadedProfile = pData;
      setProfile(pData);
    }

    const { status: rStatus, data: rData } = await getRides({
      page: 1,
      limit: 500,
    });
    if (rStatus === HTTP_CODES_ENUM.OK && rData && loadedProfile) {
      const driverRides = rData.data.filter(
        (r) => r.driverId === loadedProfile!.userId
      );
      setRides(driverRides);
    }

    setLoading(false);
  }, [driverId, getDriverProfile, getRides]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-8">
        <p>{t("admin-panel-driver-detail:loading")}</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">
          {t("admin-panel-driver-detail:notFound.heading")}
        </h1>
        <Button asChild>
          <Link href="/admin-panel/drivers">
            {t("admin-panel-driver-detail:notFound.backToFleet")}
          </Link>
        </Button>
      </div>
    );
  }

  const completedRides = rides.filter((r) => r.status === RideStatus.COMPLETED);
  const cancelledRides = rides.filter((r) => r.status === RideStatus.CANCELLED);
  const totalEarnings = completedRides.reduce(
    (sum, r) => sum + (r.fare ?? 0),
    0
  );
  const avgFare =
    completedRides.length > 0 ? totalEarnings / completedRides.length : 0;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="mb-4">
        <Link
          href="/admin-panel/drivers"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          {t("admin-panel-driver-detail:backToFleet")}
        </Link>
      </div>

      {/* Driver profile header */}
      <div className="rounded-lg border p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{profile.displayName}</h1>
            {profile.carriageName && (
              <p className="text-muted-foreground">
                {t("admin-panel-driver-detail:profile.carriageLabel", {
                  carriageName: profile.carriageName,
                })}
              </p>
            )}
            {profile.bio && (
              <p className="text-sm text-muted-foreground mt-1">
                {profile.bio}
              </p>
            )}
          </div>
          <div>
            {profile.isActive ? (
              <span className="text-sm px-3 py-1 rounded-full font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                {t("admin-panel-driver-detail:profile.status.active")}
              </span>
            ) : (
              <span className="text-sm px-3 py-1 rounded-full font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
                {t("admin-panel-driver-detail:profile.status.offline")}
              </span>
            )}
          </div>
        </div>
        <div className="text-xs text-muted-foreground mt-2">
          {t("admin-panel-driver-detail:profile.joinedLine", {
            date: new Date(profile.createdAt).toLocaleDateString(),
            userId: profile.userId,
          })}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8 md:grid-cols-4">
        <div className="rounded-lg border p-4 text-center">
          <div className="text-2xl font-bold">{completedRides.length}</div>
          <div className="text-sm text-muted-foreground">
            {t("admin-panel-driver-detail:stats.completed")}
          </div>
        </div>
        <div className="rounded-lg border p-4 text-center">
          <div className="text-2xl font-bold text-red-600">
            {cancelledRides.length}
          </div>
          <div className="text-sm text-muted-foreground">
            {t("admin-panel-driver-detail:stats.cancelled")}
          </div>
        </div>
        <div className="rounded-lg border p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            ${totalEarnings.toFixed(0)}
          </div>
          <div className="text-sm text-muted-foreground">
            {t("admin-panel-driver-detail:stats.totalEarnings")}
          </div>
        </div>
        <div className="rounded-lg border p-4 text-center">
          <div className="text-2xl font-bold">${avgFare.toFixed(2)}</div>
          <div className="text-sm text-muted-foreground">
            {t("admin-panel-driver-detail:stats.avgFare")}
          </div>
        </div>
      </div>

      {/* Ride history */}
      <h2 className="text-lg font-semibold mb-3">
        {t("admin-panel-driver-detail:rideHistory.heading", {
          count: rides.length,
        })}
      </h2>

      {rides.length === 0 ? (
        <div className="rounded-lg border p-6 text-center text-muted-foreground">
          {t("admin-panel-driver-detail:rideHistory.empty")}
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">
                  {t("admin-panel-driver-detail:rideHistory.table.route")}
                </th>
                <th className="text-left p-3 font-medium">
                  {t("admin-panel-driver-detail:rideHistory.table.rider")}
                </th>
                <th className="text-center p-3 font-medium">
                  {t("admin-panel-driver-detail:rideHistory.table.status")}
                </th>
                <th className="text-center p-3 font-medium">
                  {t("admin-panel-driver-detail:rideHistory.table.paid")}
                </th>
                <th className="text-right p-3 font-medium">
                  {t("admin-panel-driver-detail:rideHistory.table.fare")}
                </th>
                <th className="text-right p-3 font-medium">
                  {t("admin-panel-driver-detail:rideHistory.table.date")}
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
                  <tr key={ride.id} className="hover:bg-muted/30">
                    <td className="p-3">
                      {ride.pickup} → {ride.dropoff}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {ride.riderName ||
                        t("admin-panel-driver-detail:rideHistory.noRider")}
                    </td>
                    <td className="p-3 text-center">
                      <StatusBadge status={ride.status} t={t} />
                    </td>
                    <td className="p-3 text-center">
                      {ride.paid
                        ? t("admin-panel-driver-detail:rideHistory.paidYes")
                        : t("admin-panel-driver-detail:rideHistory.paidNo")}
                    </td>
                    <td className="p-3 text-right font-medium">
                      {ride.fare !== null
                        ? `$${ride.fare}`
                        : t("admin-panel-driver-detail:rideHistory.noFare")}
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
    ? `admin-panel-driver-detail:rideHistory.statusLabels.${status}`
    : "admin-panel-driver-detail:rideHistory.statusLabels.unknown";
  return (
    <span className={`text-xs px-2 py-0.5 rounded font-medium ${style}`}>
      {t(labelKey)}
    </span>
  );
}

export default withPageRequiredAuth(AdminDriverDetailPageContent, {
  roles: [RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN],
});
