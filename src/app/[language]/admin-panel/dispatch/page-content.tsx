"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGetDriverProfilesService } from "@/services/api/services/driver-profiles";
import {
  useGetRidesService,
  usePostRideService,
  usePatchRideService,
} from "@/services/api/services/rides";
import { DriverProfile } from "@/services/api/types/driver-profile";
import { Ride, RideStatus, STANDS } from "@/services/api/types/ride";
import HTTP_CODES_ENUM from "@/services/api/types/http-codes";
import { useTranslation } from "@/services/i18n/client";
import { useSnackbar } from "@/hooks/use-snackbar";
import { RoleEnum } from "@/services/api/types/role";
import withPageRequiredAuth from "@/services/auth/with-page-required-auth";

const DispatchMap = dynamic(() => import("./dispatch-map"), { ssr: false });

function DispatchPageContent() {
  const { t } = useTranslation("admin-panel-dispatch");
  const { enqueueSnackbar } = useSnackbar();

  const getDriverProfiles = useGetDriverProfilesService();
  const getRides = useGetRidesService();
  const postRide = usePostRideService();
  const patchRide = usePatchRideService();

  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [rides, setRides] = useState<Ride[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<DriverProfile | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  // Manual ride creation form state
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [fare, setFare] = useState("");
  const [assignedDriverId, setAssignedDriverId] = useState("");
  const [creating, setCreating] = useState(false);

  const loadData = useCallback(async () => {
    const [dRes, rRes] = await Promise.all([
      getDriverProfiles({ page: 1, limit: 200 }),
      getRides({ page: 1, limit: 500 }),
    ]);
    if (dRes.status === HTTP_CODES_ENUM.OK && dRes.data) {
      setDrivers(dRes.data.data);
    }
    if (rRes.status === HTTP_CODES_ENUM.OK && rRes.data) {
      setRides(rRes.data.data);
    }
    setLoading(false);
  }, [getDriverProfiles, getRides]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Poll every 8s for live updates
  useEffect(() => {
    const interval = setInterval(loadData, 8000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Derived data
  const activeDrivers = drivers.filter((d) => d.isActive);
  const driversWithLocation = activeDrivers.filter(
    // eslint-disable-next-line eqeqeq
    (d) => d.lat != null && d.lng != null
  );

  const getDriverRideCount = (driverId: string) =>
    rides.filter(
      (r) => r.driverId === driverId && r.status === RideStatus.COMPLETED
    ).length;

  const getDriverCurrentRide = (driverId: string) =>
    rides.find(
      (r) =>
        r.driverId === driverId &&
        (r.status === RideStatus.ACCEPTED ||
          r.status === RideStatus.IN_PROGRESS)
    );

  const getDriverStatus = (driver: DriverProfile) => {
    const currentRide = getDriverCurrentRide(driver.userId);
    if (currentRide?.status === RideStatus.IN_PROGRESS)
      return t("admin-panel-dispatch:driverStatus.onTrip");
    if (currentRide?.status === RideStatus.ACCEPTED)
      return t("admin-panel-dispatch:driverStatus.enRoute");
    return t("admin-panel-dispatch:driverStatus.available");
  };

  const getOnlineDuration = (driver: DriverProfile) => {
    // Approximate: time since profile was last updated (which happens on
    // every GPS ping when active). This is a POC heuristic.
    const updated = new Date(driver.updatedAt).getTime();
    const now = Date.now();
    const mins = Math.round((now - updated) / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m`;
  };

  // Manual ride creation
  const handleCreateRide = async () => {
    if (!pickup || !dropoff || !assignedDriverId) return;
    setCreating(true);

    const assignedDriver = drivers.find((d) => d.id === assignedDriverId);
    const fareNum = fare ? parseFloat(fare) : 15;

    // 1. Create the ride
    const { status, data } = await postRide({
      riderId: "dispatch-manual",
      riderName: t("admin-panel-dispatch:form.manualRiderName"),
      pickup,
      dropoff,
      status: RideStatus.ACCEPTED,
      fare: fareNum,
    });

    if (status === HTTP_CODES_ENUM.CREATED && data) {
      // 2. Assign it to the driver
      await patchRide({
        id: data.id,
        data: {
          driverId: assignedDriver?.userId ?? assignedDriverId,
          driverName:
            assignedDriver?.displayName ??
            assignedDriver?.carriageName ??
            "Driver",
          status: RideStatus.ACCEPTED,
        },
      });

      enqueueSnackbar(t("admin-panel-dispatch:form.alerts.created"), {
        variant: "success",
      });
      setPickup("");
      setDropoff("");
      setFare("");
      setAssignedDriverId("");
      loadData();
    }

    setCreating(false);
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-8">
        <p>{t("admin-panel-dispatch:loading")}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">
        {t("admin-panel-dispatch:heading")}
      </h1>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-lg border p-4 text-center">
          <div className="text-2xl font-bold">{activeDrivers.length}</div>
          <div className="text-sm text-muted-foreground">
            {t("admin-panel-dispatch:stats.activeDrivers")}
          </div>
        </div>
        <div className="rounded-lg border p-4 text-center">
          <div className="text-2xl font-bold">
            {
              rides.filter(
                (r) =>
                  r.status === RideStatus.ACCEPTED ||
                  r.status === RideStatus.IN_PROGRESS
              ).length
            }
          </div>
          <div className="text-sm text-muted-foreground">
            {t("admin-panel-dispatch:stats.activeRides")}
          </div>
        </div>
        <div className="rounded-lg border p-4 text-center">
          <div className="text-2xl font-bold">
            {rides.filter((r) => r.status === RideStatus.REQUESTED).length}
          </div>
          <div className="text-sm text-muted-foreground">
            {t("admin-panel-dispatch:stats.pendingRequests")}
          </div>
        </div>
        <div className="rounded-lg border p-4 text-center">
          <div className="text-2xl font-bold">{drivers.length}</div>
          <div className="text-sm text-muted-foreground">
            {t("admin-panel-dispatch:stats.totalDrivers")}
          </div>
        </div>
      </div>

      {/* Map + selected driver info */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="md:col-span-2">
          <DispatchMap
            drivers={driversWithLocation}
            selectedDriverId={selectedDriver?.id ?? null}
            onSelectDriver={(id) => {
              const d = drivers.find((dr) => dr.id === id);
              setSelectedDriver(d ?? null);
            }}
          />
        </div>

        {/* Driver detail panel */}
        <div className="rounded-lg border p-4">
          {selectedDriver ? (
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">
                {selectedDriver.displayName}
              </h3>
              {selectedDriver.carriageName && (
                <div className="text-sm text-muted-foreground">
                  🐴 {selectedDriver.carriageName}
                </div>
              )}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("admin-panel-dispatch:driverPanel.status")}
                  </span>
                  <span className="font-medium">
                    {getDriverStatus(selectedDriver)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("admin-panel-dispatch:driverPanel.lastUpdate")}
                  </span>
                  <span className="font-medium">
                    {getOnlineDuration(selectedDriver)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("admin-panel-dispatch:driverPanel.completedRides")}
                  </span>
                  <span className="font-medium">
                    {getDriverRideCount(selectedDriver.userId)}
                  </span>
                </div>
                {getDriverCurrentRide(selectedDriver.userId) && (
                  <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950 rounded text-xs">
                    <div className="font-medium">
                      {t("admin-panel-dispatch:driverPanel.currentRide")}
                    </div>
                    <div>
                      {getDriverCurrentRide(selectedDriver.userId)!.pickup} →{" "}
                      {getDriverCurrentRide(selectedDriver.userId)!.dropoff}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              <p>{t("admin-panel-dispatch:driverPanel.selectPrompt")}</p>
            </div>
          )}
        </div>
      </div>

      {/* Manual ride creation */}
      <div className="rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">
          {t("admin-panel-dispatch:form.heading")}
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>{t("admin-panel-dispatch:form.pickup")}</Label>
            <Select value={pickup} onValueChange={setPickup}>
              <SelectTrigger>
                <SelectValue
                  placeholder={t("admin-panel-dispatch:form.pickupPlaceholder")}
                />
              </SelectTrigger>
              <SelectContent>
                {STANDS.map((stand) => (
                  <SelectItem
                    key={stand}
                    value={stand}
                    disabled={stand === dropoff}
                  >
                    {stand}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>{t("admin-panel-dispatch:form.dropoff")}</Label>
            <Select value={dropoff} onValueChange={setDropoff}>
              <SelectTrigger>
                <SelectValue
                  placeholder={t(
                    "admin-panel-dispatch:form.dropoffPlaceholder"
                  )}
                />
              </SelectTrigger>
              <SelectContent>
                {STANDS.map((stand) => (
                  <SelectItem
                    key={stand}
                    value={stand}
                    disabled={stand === pickup}
                  >
                    {stand}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>{t("admin-panel-dispatch:form.fare")}</Label>
            <Input
              type="number"
              min="1"
              step="1"
              placeholder="15"
              value={fare}
              onChange={(e) => setFare(e.target.value)}
            />
          </div>

          <div>
            <Label>{t("admin-panel-dispatch:form.assignDriver")}</Label>
            <Select
              value={assignedDriverId}
              onValueChange={setAssignedDriverId}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={t("admin-panel-dispatch:form.driverPlaceholder")}
                />
              </SelectTrigger>
              <SelectContent>
                {activeDrivers.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.displayName}
                    {d.carriageName ? ` (${d.carriageName})` : ""}
                    {getDriverCurrentRide(d.userId)
                      ? ` — ${t("admin-panel-dispatch:driverStatus.onTrip")}`
                      : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Button
            onClick={handleCreateRide}
            disabled={!pickup || !dropoff || !assignedDriverId || creating}
          >
            {creating
              ? t("admin-panel-dispatch:form.creating")
              : t("admin-panel-dispatch:form.createRide")}
          </Button>
          <p className="text-xs text-muted-foreground">
            {t("admin-panel-dispatch:form.cashNote")}
          </p>
        </div>
      </div>
    </div>
  );
}

export default withPageRequiredAuth(DispatchPageContent, {
  roles: [RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN],
});
