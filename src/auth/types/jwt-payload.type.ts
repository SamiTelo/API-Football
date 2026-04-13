export type JwtUser = {
  sub: number;
  email: string;
  role?: string;
  permissions?: string[];
};
