import { useCallback } from "react";
import useFetch from "../use-fetch";
import { API_URL } from "../config";
import wrapperFetchJsonResponse from "../wrapper-fetch-json-response";
import { DriverProfile } from "../types/driver-profile";
import { InfinityPaginationType } from "../types/infinity-pagination";
import { RequestConfigType } from "./types/request-config";

export type DriverProfilesRequest = {
  page: number;
  limit: number;
};

export type DriverProfilesResponse = InfinityPaginationType<DriverProfile>;

export function useGetDriverProfilesService() {
  const fetch = useFetch();

  return useCallback(
    (data: DriverProfilesRequest, requestConfig?: RequestConfigType) => {
      const requestUrl = new URL(`${API_URL}/v1/driver-profiles`);
      requestUrl.searchParams.append("page", data.page.toString());
      requestUrl.searchParams.append("limit", data.limit.toString());

      return fetch(requestUrl, {
        method: "GET",
        ...requestConfig,
      }).then(wrapperFetchJsonResponse<DriverProfilesResponse>);
    },
    [fetch]
  );
}

export type DriverProfileRequest = {
  id: DriverProfile["id"];
};

export type DriverProfileResponse = DriverProfile;

export function useGetDriverProfileService() {
  const fetch = useFetch();

  return useCallback(
    (data: DriverProfileRequest, requestConfig?: RequestConfigType) => {
      return fetch(`${API_URL}/v1/driver-profiles/${data.id}`, {
        method: "GET",
        ...requestConfig,
      }).then(wrapperFetchJsonResponse<DriverProfileResponse>);
    },
    [fetch]
  );
}

export type DriverProfilePostRequest = Pick<
  DriverProfile,
  "userId" | "displayName"
> &
  Partial<Pick<DriverProfile, "bio" | "carriageName" | "isActive">>;

export type DriverProfilePostResponse = DriverProfile;

export function usePostDriverProfileService() {
  const fetch = useFetch();

  return useCallback(
    (data: DriverProfilePostRequest, requestConfig?: RequestConfigType) => {
      return fetch(`${API_URL}/v1/driver-profiles`, {
        method: "POST",
        body: JSON.stringify(data),
        ...requestConfig,
      }).then(wrapperFetchJsonResponse<DriverProfilePostResponse>);
    },
    [fetch]
  );
}

export type DriverProfilePatchRequest = {
  id: DriverProfile["id"];
  data: Partial<
    Pick<
      DriverProfile,
      "displayName" | "bio" | "carriageName" | "isActive" | "lat" | "lng"
    >
  >;
};

export type DriverProfilePatchResponse = DriverProfile;

export function usePatchDriverProfileService() {
  const fetch = useFetch();

  return useCallback(
    (data: DriverProfilePatchRequest, requestConfig?: RequestConfigType) => {
      return fetch(`${API_URL}/v1/driver-profiles/${data.id}`, {
        method: "PATCH",
        body: JSON.stringify(data.data),
        ...requestConfig,
      }).then(wrapperFetchJsonResponse<DriverProfilePatchResponse>);
    },
    [fetch]
  );
}
