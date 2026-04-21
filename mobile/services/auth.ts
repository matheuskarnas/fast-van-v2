import axios from "axios";
import { apiService } from "./api";
import { ApiEndpoints } from "../constants/api";
import { AuthResponse, LoginRequest, RegisterRequest } from "../types/auth";

export async function login(data: LoginRequest): Promise<AuthResponse> {
  try {
    const response = await apiService.post<AuthResponse>(
      ApiEndpoints.LOGIN,
      data,
    );
    return response.data;
  } catch (error) {
    // Captura erro da resposta do servidor
    if (axios.isAxiosError(error) && error.response?.data) {
      const errorData = error.response.data as AuthResponse;
      return {
        success: false,
        error: errorData.error || {
          code: "UNKNOWN_ERROR",
          message: "Erro ao autenticar. Tente novamente.",
        },
      };
    }
    return {
      success: false,
      error: {
        code: "NETWORK_ERROR",
        message: "Erro de conexão. Verifique sua internet.",
      },
    };
  }
}

export async function register(data: RegisterRequest): Promise<AuthResponse> {
  try {
    const response = await apiService.post<AuthResponse>(
      ApiEndpoints.REGISTER,
      data,
    );
    return response.data;
  } catch (error) {
    // Captura erro da resposta do servidor
    if (axios.isAxiosError(error) && error.response?.data) {
      const errorData = error.response.data as AuthResponse;
      return {
        success: false,
        error: errorData.error || {
          code: "UNKNOWN_ERROR",
          message: "Erro ao cadastrar. Tente novamente.",
        },
      };
    }
    return {
      success: false,
      error: {
        code: "NETWORK_ERROR",
        message: "Erro de conexão. Verifique sua internet.",
      },
    };
  }
}
