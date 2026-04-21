import { User } from "./user";

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  redirectTo?: string;
  error?: {
    code: string;
    field?: string;
    message: string;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  cpf: string;
  email: string;
  password: string;
  role: "DRIVER" | "PASSENGER";
  birthDate: string;
  cnh?: string;
}
