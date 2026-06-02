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

export interface RoutePoint {
  id: string;
  address: string;
  type: string;
  segment: string;
}

export interface SlotOccupancy {
  slot: string;
  confirmedCount: number;
  percentage: number;
}

export interface OperationsDashboard {
  success: true;
  lineId: string;
  date: string;
  capacity: number;
  slots: {
    departureSlots: SlotOccupancy[];
    arrivalSlots: SlotOccupancy[];
  };
  occupancy: {
    outbound: SegmentOccupancy;
    return: SegmentOccupancy;
  };
  alerts: OperationsAlert[];
  routePoints: RoutePoint[];
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
    const url = ApiEndpoints.GET_OPERATIONS_DASHBOARD.replace(
      ":lineId",
      lineId,
    );
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

export async function createLineInvite(lineId: string) {
  try {
    const url = ApiEndpoints.CREATE_LINE_INVITE.replace(":lineId", lineId);
    const response = await apiService.post<{ success: true; data: { token: string; url: string } }>(url);
    return response.data;
  } catch (error: any) {
    return {
      success: false,
      error: {
        code: error?.response?.data?.error?.code || "NETWORK_ERROR",
        message:
          error?.response?.data?.error?.message || "Não foi possível criar o link de convite.",
      },
    } as OperationsErrorResponse;
  }
}

export async function acceptLineInvite(token: string) {
  try {
    const response = await apiService.post(ApiEndpoints.ACCEPT_LINE_INVITE, { token });
    return response.data;
  } catch (error: any) {
    return {
      success: false,
      error: {
        code: error?.response?.data?.error?.code || "NETWORK_ERROR",
        message:
          error?.response?.data?.error?.message || "Não foi possível aceitar o link de convite.",
      },
    } as OperationsErrorResponse;
  }
}
