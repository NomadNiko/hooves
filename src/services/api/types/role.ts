export enum RoleEnum {
  SUPER_ADMIN = 1,
  ADMIN = 2,
  DRIVER = 3,
  USER = 4,
}

export type Role = {
  id: number | string;
  name?: string;
};
