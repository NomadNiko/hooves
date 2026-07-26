"use client";

import { useCallback, useEffect, useState } from "react";
import { useGetRidesService } from "@/services/api/services/rides";
import { Ride, RideStatus } from "@/services/api/types/ride";
import HTTP_CODES_ENUM from "@/services/api/types/http-codes";
import Link from "@/components/link";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/services/i18n/client";

import withPageRequiredAuth from "@/services/auth/with-page-required-auth";
import { RoleEnum } from "@/services/api/types/role";

function AdminRidesPageContent() {
  const getRides = useGetRidesService();
  const { t } = useTranslation("admin-panel-rides");

  const STATUS_OPTIONS = [
    { value: "", label: t("admin-panel-rides:filter.options.all") },
    {
      value: RideStatus.REQUESTED,
      label: t("admin-panel-rides:filter.options.requested"),
    },
    {
      value: RideStatus.ACCEPTED,
      label: t("admin-panel-rides:filter.options.accepted"),
    },
    {
      value: RideStatus.IN_PROGRESS,
      label: t("admin-panel-rides:filter.options.in_progress"),
    },
    {
      value: RideStatus.COMPLETED,
      label: t("admin-panel-rides:filter.options.completed"),
    },
    {
      value: RideStatus.CANCELLED,
      label: t("admin-panel-rides:filter.options.cancelled"),
    },
  ];

  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  const loadData = useCallback(async () => {
    const { status, data } = await getRides({ page: 1, limit: 500 });
    if (status === HTTP_CODES_ENUM.OK && data) {
      setRides(data.data);
    }
    setLoading(false);
  }, [getRides]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredRides = statusFilter
    ? rides.filter((r) => r.status === statusFilter)
    : rides;

  const totalRevenue = rides
    .filter((r) => r.status === RideStatus.COMPLETED)
    .reduce((sum, r) => sum + (r.fare ?? 0), 0);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        <p>{t("admin-panel-rides:loading")}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t("admin-panel-rides:heading")}</h1>
        <Link
          href="/admin-panel/drivers"
          className="text-sm underline text-muted-foreground hover:text-foreground"
        >
          {t("admin-panel-rides:fleetOverviewLink")}
        </Link>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 mb-6 md:grid-cols-4">
        <div className="rounded-lg border p-4 text-center">
          <div className="text-2xl font-bold">{rides.length}</div>
          <div className="text-sm text-muted-foreground">
            {t("admin-panel-rides:stats.totalRides")}
          </div>
        </div>
        <div className="rounded-lg border p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            {rides.filter((r) => r.status === RideStatus.COMPLETED).length}
          </div>
          <div className="text-sm text-muted-foreground">
            {t("admin-panel-rides:stats.completed")}
          </div>
        </div>
        <div className="rounded-lg border p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">
            {rides.filter((r) => r.status === RideStatus.REQUESTED).length}
          </div>
          <div className="text-sm text-muted-foreground">
            {t("admin-panel-rides:stats.pending")}
          </div>
        </div>
        <div className="rounded-lg border p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            ${totalRevenue.toFixed(0)}
          </div>
          <div className="text-sm text-muted-foreground">
            {t("admin-panel-rides:stats.revenue")}
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm font-medium text-muted-foreground">
          {t("admin-panel-rides:filter.label")}
        </span>
        {STATUS_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            size="sm"
            variant={statusFilter === opt.value ? "default" : "outline"}
            onClick={() => setStatusFilter(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {/* Rides table */}
      {filteredRides.length === 0 ? (
        <div className="rounded-lg border p-6 text-center text-muted-foreground">
          {t("admin-panel-rides:table.empty")}
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">
                  {t("admin-panel-rides:table.columns.route")}
                </th>
                <th className="text-left p-3 font-medium">
                  {t("admin-panel-rides:table.columns.rider")}
                </th>
                <th className="text-left p-3 font-medium">
                  {t("admin-panel-rides:table.columns.driver")}
                </th>
                <th className="text-center p-3 font-medium">
                  {t("admin-panel-rides:table.columns.status")}
                </th>
                <th className="text-center p-3 font-medium">
                  {t("admin-panel-rides:table.columns.paid")}
                </th>
                <th className="text-right p-3 font-medium">
                  {t("admin-panel-rides:table.columns.fare")}
                </th>
                <th className="text-right p-3 font-medium">
                  {t("admin-panel-rides:table.columns.date")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredRides
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
                      {ride.riderName || t("admin-panel-rides:table.noRider")}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {ride.driverName || t("admin-panel-rides:table.noDriver")}
                    </td>
                    <td className="p-3 text-center">
                      <StatusBadge status={ride.status} t={t} />
                    </td>
                    <td className="p-3 text-center">
                      {ride.paid ? (
                        <span className="text-green-600">
                          {t("admin-panel-rides:table.paidYes")}
                        </span>
                      ) : (
                        t("admin-panel-rides:table.paidNo")
                      )}
                    </td>
                    <td className="p-3 text-right font-medium">
                      {ride.fare !== null
                        ? `$${ride.fare}`
                        : t("admin-panel-rides:table.noFare")}
                    </td>
                    <td className="p-3 text-right text-muted-foreground text-xs">
                      {new Date(ride.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 text-sm text-muted-foreground">
        {t("admin-panel-rides:showingCount", {
          shown: filteredRides.length,
          total: rides.length,
        })}
      </div>
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
    ? `admin-panel-rides:table.statusLabels.${status}`
    : "admin-panel-rides:table.statusLabels.unknown";
  return (
    <span className={`text-xs px-2 py-0.5 rounded font-medium ${style}`}>
      {t(labelKey)}
    </span>
  );
}

export default withPageRequiredAuth(AdminRidesPageContent, {
  roles: [RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN],
});
