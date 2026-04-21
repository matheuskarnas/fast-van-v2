import axios, { AxiosInstance, AxiosError } from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_TIMEOUT } from "../constants/api";

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000",
      timeout: API_TIMEOUT,
    });

    // Request interceptor
    this.api.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem("userToken");
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error),
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired, redirect to login
          await AsyncStorage.removeItem("userToken");
          // TODO: Implement redirect to login
        }
        return Promise.reject(error);
      },
    );
  }

  public async get<T>(url: string, config = {}) {
    return this.api.get<T>(url, config);
  }

  public async post<T>(url: string, data = {}, config = {}) {
    return this.api.post<T>(url, data, config);
  }

  public async put<T>(url: string, data = {}, config = {}) {
    return this.api.put<T>(url, data, config);
  }

  public async patch<T>(url: string, data = {}, config = {}) {
    return this.api.patch<T>(url, data, config);
  }

  public async delete<T>(url: string, config = {}) {
    return this.api.delete<T>(url, config);
  }
}

export const apiService = new ApiService();
