import { useCallback } from "react";
import useFetch from "../use-fetch";
import { API_URL } from "../config";
import wrapperFetchJsonResponse from "../wrapper-fetch-json-response";
import { Ride } from "../types/ride";
import { InfinityPaginationType } from "../types/infinity-pagination";
import { RequestConfigType } from "./types/request-config";

export type RidesRequest = {
  page: number;
  limit: number;
};

export type RidesResponse = InfinityPaginationType<Ride>;

export function useGetRidesService() {
  const fetch = useFetch();

  return useCallback(
    (data: RidesRequest, requestConfig?: RequestConfigType) => {
      const requestUrl = new URL(`${API_URL}/v1/rides`);
      requestUrl.searchParams.append("page", data.page.toString());
      requestUrl.searchParams.append("limit", data.limit.toString());

      return fetch(requestUrl, {
        method: "GET",
        ...requestConfig,
      }).then(wrapperFetchJsonResponse<RidesResponse>);
    },
    [fetch]
  );
}

export type RideGetRequest = {
  id: Ride["id"];
};

export type RideGetResponse = Ride;

export function useGetRideService() {
  const fetch = useFetch();

  return useCallback(
    (data: RideGetRequest, requestConfig?: RequestConfigType) => {
      return fetch(`${API_URL}/v1/rides/${data.id}`, {
        method: "GET",
        ...requestConfig,
      }).then(wrapperFetchJsonResponse<RideGetResponse>);
    },
    [fetch]
  );
}

export type RidePostRequest = Pick<Ride, "riderId" | "pickup" | "dropoff"> &
  Partial<
    Pick<
      Ride,
      | "riderName"
      | "status"
      | "fare"
      | "pickupLat"
      | "pickupLng"
      | "dropoffLat"
      | "dropoffLng"
    >
  >;

export type RidePostResponse = Ride;

export function usePostRideService() {
  const fetch = useFetch();

  return useCallback(
    (data: RidePostRequest, requestConfig?: RequestConfigType) => {
      return fetch(`${API_URL}/v1/rides`, {
        method: "POST",
        body: JSON.stringify(data),
        ...requestConfig,
      }).then(wrapperFetchJsonResponse<RidePostResponse>);
    },
    [fetch]
  );
}

export type RidePatchRequest = {
  id: Ride["id"];
  data: Partial<
    Pick<Ride, "status" | "driverId" | "driverName" | "fare" | "paid">
  >;
};

export type RidePatchResponse = Ride;

export function usePatchRideService() {
  const fetch = useFetch();

  return useCallback(
    (data: RidePatchRequest, requestConfig?: RequestConfigType) => {
      return fetch(`${API_URL}/v1/rides/${data.id}`, {
        method: "PATCH",
        body: JSON.stringify(data.data),
        ...requestConfig,
      }).then(wrapperFetchJsonResponse<RidePatchResponse>);
    },
    [fetch]
  );
}
