export type DriverProfile = {
  id: string;
  userId: string;
  displayName: string;
  bio?: string | null;
  carriageName?: string | null;
  isActive?: boolean;
  lat?: number | null;
  lng?: number | null;
  createdAt: string;
  updatedAt: string;
};
