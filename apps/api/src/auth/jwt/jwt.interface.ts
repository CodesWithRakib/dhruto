import { UserRole } from "../../database/entities/index.js";

export interface JwtPayload {
  sub: string;
  email: string;
  phone: string;
  role: UserRole;
  merchantId?: string | null;
  riderId?: string | null;
  hubId?: string | null;
  type?: "access" | "refresh";
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  phone: string;
  role: UserRole;
  merchantId?: string | null;
  riderId?: string | null;
  hubId?: string | null;
}
