"use client";

import { useCallback, useEffect, useState } from "react";
import { useGetDriverProfilesService } from "@/services/api/services/driver-profiles";
import { useGetRidesService } from "@/services/api/services/rides";
import { DriverProfile } from "@/services/api/types/driver-profile";
import { RideStatus } from "@/services/api/types/ride";
import HTTP_CODES_ENUM from "@/services/api/types/http-codes";
import Link from "@/components/link";

type DriverWithStats = DriverProfile & {
  totalRides: number;
  completedRides: number;
  totalEarnings: number;
};

import withPageRequiredAuth from "@/services/auth/with-page-required-auth";
import { RoleEnum } from "@/services/api/types/role";
import { useTranslation } from "@/services/i18n/client";

function AdminDriversPageContent() {
  const getDriverProfiles = useGetDriverProfilesService();
  const getRides = useGetRidesService();
  const { t } = useTranslation("admin-panel-drivers");

  const [drivers, setDrivers] = useState<DriverWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [fleetStats, setFleetStats] = useState({
    totalDrivers: 0,
    activeDrivers: 0,
    totalRides: 0,
    totalRevenue: 0,
  });

  const loadData = useCallback(async () => {
    const [profilesRes, ridesRes] = await Promise.all([
      getDriverProfiles({ page: 1, limit: 100 }),
      getRides({ page: 1, limit: 500 }),
    ]);

    const profiles =
      profilesRes.status === HTTP_CODES_ENUM.OK ? profilesRes.data.data : [];
    const rides =
      ridesRes.status === HTTP_CODES_ENUM.OK ? ridesRes.data.data : [];

    // Compute stats per driver
    const driversWithStats: DriverWithStats[] = profiles.map((p) => {
      const driverRides = rides.filter((r) => r.driverId === p.userId);
      const completed = driverRides.filter(
        (r) => r.status === RideStatus.COMPLETED
      );
      return {
        ...p,
        totalRides: driverRides.length,
        completedRides: completed.length,
        totalEarnings: completed.reduce((sum, r) => sum + (r.fare ?? 0), 0),
      };
    });

    // Fleet-wide stats
    const completedRides = rides.filter(
      (r) => r.status === RideStatus.COMPLETED
    );
    setFleetStats({
      totalDrivers: profiles.length,
      activeDrivers: profiles.filter((p) => p.isActive).length,
      totalRides: completedRides.length,
      totalRevenue: completedRides.reduce((sum, r) => sum + (r.fare ?? 0), 0),
    });

    setDrivers(driversWithStats);
    setLoading(false);
  }, [getDriverProfiles, getRides]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-8">
        <p>{t("admin-panel-drivers:loading")}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">
          {t("admin-panel-drivers:heading")}
        </h1>
        <Link
          href="/admin-panel/rides"
          className="text-sm underline text-muted-foreground hover:text-foreground"
        >
          {t("admin-panel-drivers:viewAllRides")}
        </Link>
      </div>

      {/* Fleet-wide stats */}
      <div className="grid grid-cols-2 gap-4 mb-8 md:grid-cols-4">
        <div className="rounded-lg border p-4 text-center">
          <div className="text-2xl font-bold">{fleetStats.totalDrivers}</div>
          <div className="text-sm text-muted-foreground">
            {t("admin-panel-drivers:stats.totalDrivers")}
          </div>
        </div>
        <div className="rounded-lg border p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            {fleetStats.activeDrivers}
          </div>
          <div className="text-sm text-muted-foreground">
            {t("admin-panel-drivers:stats.activeNow")}
          </div>
        </div>
        <div className="rounded-lg border p-4 text-center">
          <div className="text-2xl font-bold">{fleetStats.totalRides}</div>
          <div className="text-sm text-muted-foreground">
            {t("admin-panel-drivers:stats.completedRides")}
          </div>
        </div>
        <div className="rounded-lg border p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            ${fleetStats.totalRevenue.toFixed(0)}
          </div>
          <div className="text-sm text-muted-foreground">
            {t("admin-panel-drivers:stats.totalRevenue")}
          </div>
        </div>
      </div>

      {/* Drivers table */}
      <h2 className="text-lg font-semibold mb-3">
        {t("admin-panel-drivers:table.heading")}
      </h2>

      {drivers.length === 0 ? (
        <div className="rounded-lg border p-6 text-center text-muted-foreground">
          {t("admin-panel-drivers:table.empty")}
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">
                  {t("admin-panel-drivers:table.columns.driver")}
                </th>
                <th className="text-left p-3 font-medium">
                  {t("admin-panel-drivers:table.columns.carriage")}
                </th>
                <th className="text-center p-3 font-medium">
                  {t("admin-panel-drivers:table.columns.status")}
                </th>
                <th className="text-right p-3 font-medium">
                  {t("admin-panel-drivers:table.columns.rides")}
                </th>
                <th className="text-right p-3 font-medium">
                  {t("admin-panel-drivers:table.columns.earnings")}
                </th>
                <th className="text-right p-3 font-medium">
                  {t("admin-panel-drivers:table.columns.joined")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {drivers
                .sort((a, b) => b.totalEarnings - a.totalEarnings)
                .map((driver) => (
                  <tr key={driver.id} className="hover:bg-muted/30">
                    <td className="p-3">
                      <Link
                        href={`/admin-panel/drivers/${driver.id}`}
                        className="font-medium hover:underline"
                      >
                        {driver.displayName}
                      </Link>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {driver.carriageName ||
                        t("admin-panel-drivers:table.noCarriage")}
                    </td>
                    <td className="p-3 text-center">
                      {driver.isActive ? (
                        <span className="text-xs px-2 py-0.5 rounded font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          {t("admin-panel-drivers:table.status.active")}
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
                          {t("admin-panel-drivers:table.status.offline")}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right">{driver.completedRides}</td>
                    <td className="p-3 text-right font-medium text-green-600">
                      ${driver.totalEarnings.toFixed(0)}
                    </td>
                    <td className="p-3 text-right text-muted-foreground">
                      {new Date(driver.createdAt).toLocaleDateString()}
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

export default withPageRequiredAuth(AdminDriversPageContent, {
  roles: [RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN],
});
