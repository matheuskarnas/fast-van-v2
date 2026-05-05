import { apiService } from "./api";
import { ApiEndpoints } from "../constants/api";

export interface SegmentOccupancy {
  confirmedCount: number;
  percentage: number;
  confirmedPassengerIds: string[];
}

export interface OperationsAlert {
  segment: "ida" | "volta";
  active: boolean;
  level: "normal" | "critical" | "capacity-exceeded";
  threshold: number;
  confirmedCount: number;
  percentage: number;
  message: string;
}

export interface OperationsDashboard {
  success: true;
  lineId: string;
  date: string;
  capacity: number;
  occupancy: {
    outbound: SegmentOccupancy;
    return: SegmentOccupancy;
  };
  alerts: OperationsAlert[];
  hasCriticalAlert: boolean;
  hasExceededAlert: boolean;
}

export interface OperationsLineSummary {
  lineId: string;
  nextDate?: string;
  capacity?: number;
  ownerDriverId?: string;
  driverId?: string | null;
}

export interface OperationsErrorResponse {
  success: false;
  error?: {
    code?: string;
    message?: string;
  };
}

export interface OperationsLinesResponse {
  success: boolean;
  lines?: OperationsLineSummary[];
  error?: {
    code?: string;
    message?: string;
  };
}

export async function listOperationsLines() {
  try {
    const response = await apiService.get<OperationsLinesResponse>(
      ApiEndpoints.LIST_OPERATIONS_LINES,
    );

    return response.data;
  } catch (error: any) {
    return {
      success: false,
      error: {
        code: error?.response?.data?.error?.code || "NETWORK_ERROR",
        message:
          error?.response?.data?.error?.message ||
          "Não foi possível carregar suas linhas operacionais.",
      },
    } as OperationsLinesResponse;
  }
}

export async function getOperationsDashboard(lineId: string, date: string) {
  try {
    const url = ApiEndpoints.GET_OPERATIONS_DASHBOARD.replace(":lineId", lineId);
    const response = await apiService.get<OperationsDashboard>(
      `${url}?date=${encodeURIComponent(date)}`,
    );

    return response.data;
  } catch (error: any) {
    return {
      success: false,
      error: {
        code: error?.response?.data?.error?.code || "NETWORK_ERROR",
        message:
          error?.response?.data?.error?.message ||
          "Não foi possível carregar o dashboard operacional.",
      },
    } as OperationsErrorResponse;
  }
}
