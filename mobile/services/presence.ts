import { apiService } from "./api";
import { ApiEndpoints } from "../constants/api";

export type PresenceStatus =
  | "vai e volta"
  | "não vai e nem volta"
  | "só vou e não volto"
  | "não vou mas volto";

export interface PresenceLineSummary {
  lineId: string;
  name?: string;
  originCity?: string;
  destinationPlace?: string;
  nextDate?: string;
  status: PresenceStatus;
  departureTime?: string | null;
  arrivalTime?: string | null;
  departureTimes?: string[];
  arrivalTimes?: string[];
  alternateDepartureTime?: string | null;
  alternateArrivalTime?: string | null;
  slotStatus?: "confirmed" | "switched" | "waitlist";
}

export interface PresenceError {
  code?: string;
  message?: string;
}

export interface PresenceListResponse {
  success: boolean;
  lines?: PresenceLineSummary[];
  error?: PresenceError;
}

export interface PresenceUpdateResponse {
  success: boolean;
  status?: PresenceStatus;
  error?: PresenceError;
}

export async function listMyPresenceLines(
  date: string,
): Promise<PresenceListResponse> {
  try {
    const response = await apiService.get<PresenceListResponse>(
      `${ApiEndpoints.GET_MY_PRESENCE_LINES}?date=${encodeURIComponent(date)}`,
    );

    return response.data;
  } catch (error: any) {
    return {
      success: false,
      error: {
        code: error?.response?.data?.error?.code || "NETWORK_ERROR",
        message:
          error?.response?.data?.error?.message ||
          "Não foi possível carregar suas linhas agora.",
      },
    };
  }
}

export async function updateMyPresenceStatus(
  lineId: string,
  date: string,
  status: PresenceStatus,
): Promise<PresenceUpdateResponse> {
  try {
    const response = await apiService.patch<PresenceUpdateResponse>(
      ApiEndpoints.UPDATE_MY_PRESENCE_STATUS.replace(":lineId", lineId),
      { date, status },
    );

    return response.data;
  } catch (error: any) {
    return {
      success: false,
      error: {
        code: error?.response?.data?.error?.code || "NETWORK_ERROR",
        message:
          error?.response?.data?.error?.message ||
          "Não foi possível salvar sua presença agora.",
      },
    };
  }
}
