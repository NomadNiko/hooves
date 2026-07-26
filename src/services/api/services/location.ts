import { useCallback } from "react";
import useFetch from "../use-fetch";
import { API_URL } from "../config";
import wrapperFetchJsonResponse from "../wrapper-fetch-json-response";
import { RequestConfigType } from "./types/request-config";

// Driver location ping
export type LocationPingRequest = {
  lat: number;
  lng: number;
};

export type LocationPingResponse = {
  updated: boolean;
  breadcrumbRecorded: boolean;
  activeRideId?: string;
};

export function usePostLocationPingService() {
  const fetch = useFetch();

  return useCallback(
    (data: LocationPingRequest, requestConfig?: RequestConfigType) => {
      return fetch(`${API_URL}/v1/driver-location/ping`, {
        method: "POST",
        body: JSON.stringify(data),
        ...requestConfig,
      }).then(wrapperFetchJsonResponse<LocationPingResponse>);
    },
    [fetch]
  );
}

// Ride locations (breadcrumb trail)
export type RideLocationPoint = {
  id: string;
  rideId: string;
  driverId: string;
  lat: number;
  lng: number;
  createdAt: string;
  updatedAt: string;
};

export type RideLocationsResponse = RideLocationPoint[];

export function useGetRideLocationsService() {
  const fetch = useFetch();

  return useCallback(
    (rideId: string, requestConfig?: RequestConfigType) => {
      return fetch(`${API_URL}/v1/ride-locations/by-ride/${rideId}`, {
        method: "GET",
        ...requestConfig,
      }).then(wrapperFetchJsonResponse<RideLocationsResponse>);
    },
    [fetch]
  );
}
