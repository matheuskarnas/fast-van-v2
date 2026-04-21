import { apiService } from "./api";
import { ApiEndpoints } from "../constants/api";

export interface GeofencePointPayload {
  id: string;
  segment: "IDA" | "VOLTA";
  latitude: number;
  longitude: number;
  radiusMeters: number;
  confirmedPassengerIds?: string[];
}

export interface CreateGeofenceLinePayload {
  lineId: string;
  driverId?: string;
  nextDate?: string;
  points?: GeofencePointPayload[];
}

export interface StartLineExecutionPayload {
  lineId: string;
  date: string;
}

export interface CheckInPayload {
  lineId: string;
  pointId: string;
  date: string;
  location: {
    latitude: number;
    longitude: number;
  };
}

export async function createGeofenceLine(payload: CreateGeofenceLinePayload) {
  const response = await apiService.post(
    ApiEndpoints.CREATE_GEOFENCE_LINE,
    payload,
  );
  return response.data;
}

export async function startLineExecution(payload: StartLineExecutionPayload) {
  const response = await apiService.post(
    ApiEndpoints.START_GEOFENCE_LINE.replace(":lineId", payload.lineId),
    { date: payload.date },
  );
  return response.data;
}

export async function processGeofenceCheckIn(payload: CheckInPayload) {
  const response = await apiService.post(
    ApiEndpoints.PROCESS_GEOFENCE_CHECKIN.replace(":lineId", payload.lineId),
    {
      pointId: payload.pointId,
      date: payload.date,
      location: payload.location,
    },
  );
  return response.data;
}

export async function getLineExecutionState(lineId: string, date: string) {
  const response = await apiService.get(
    `${ApiEndpoints.GET_GEOFENCE_EXECUTION.replace(":lineId", lineId)}?date=${encodeURIComponent(date)}`,
  );
  return response.data;
}
