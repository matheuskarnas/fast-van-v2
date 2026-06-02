import { apiService } from "./api";
import { ApiEndpoints } from "../constants/api";

export interface LinePoint {
  id: string;
  address: string;
  type: "pickup" | "dropoff";
  segment: "ida" | "volta";
  passengers?: string[];
  latitude?: number | null;
  longitude?: number | null;
  placeId?: string | null;
}

export interface Line {
  id: string;
  name: string;
  originCity: string;
  destinationPlace: string;
  vehicleId: string;
  capacity: number;
  arrivalTimes: string[];
  departureTimes: string[];
  points: LinePoint[];
  ownerDriverId: string;
  driverId?: string;
  passengerCount?: number;
}

export interface CreateLinePayload {
  name: string;
  originCity: string;
  destinationPlace: string;
  vehicleId: string;
  arrivalTimes: string[];
  departureTimes: string[];
}

export interface AddPointPayload {
  address: string;
  type: "pickup" | "dropoff";
  segment: "ida" | "volta";
  latitude?: number | null;
  longitude?: number | null;
  placeId?: string | null;
}

export interface ServiceError {
  code?: string;
  message?: string;
}

export interface LinesResponse {
  success: boolean;
  lines?: Line[];
  error?: ServiceError;
}

export interface LineResponse {
  success: boolean;
  line?: Line;
  error?: ServiceError;
}

export interface PointResponse {
  success: boolean;
  point?: LinePoint;
  message?: string;
  error?: ServiceError;
}

export interface InviteResponse {
  success: boolean;
  token?: string;
  url?: string;
  expiresAt?: string;
  error?: ServiceError;
}

export interface IBGECity {
  id: number;
  nome: string;
}

function extractError(error: any): ServiceError {
  return {
    code: error?.response?.data?.error?.code ?? "NETWORK_ERROR",
    message:
      error?.response?.data?.error?.message ??
      "Não foi possível completar a operação. Tente novamente.",
  };
}

function normalizeLine(raw: any): Line {
  return {
    ...raw,
    points: raw.pickupDropoffPoints ?? raw.points ?? [],
  };
}

export async function getDriverLines(): Promise<LinesResponse> {
  try {
    const response = await apiService.get<any>(ApiEndpoints.GET_LINES);
    const lines = (response.data.lines ?? []).map(normalizeLine);
    return { success: true, lines };
  } catch (error: any) {
    return { success: false, error: extractError(error) };
  }
}

export async function getLineById(lineId: string): Promise<LineResponse> {
  try {
    const url = ApiEndpoints.GET_LINE.replace(":id", lineId);
    const response = await apiService.get<any>(url);
    return { success: true, line: normalizeLine(response.data.line) };
  } catch (error: any) {
    return { success: false, error: extractError(error) };
  }
}

export async function createLine(payload: CreateLinePayload): Promise<LineResponse> {
  try {
    const response = await apiService.post<LineResponse>(ApiEndpoints.CREATE_LINE, payload);
    return response.data;
  } catch (error: any) {
    return { success: false, error: extractError(error) };
  }
}

export async function addLinePoint(lineId: string, payload: AddPointPayload): Promise<PointResponse> {
  try {
    const url = ApiEndpoints.ADD_LINE_POINT.replace(":lineId", lineId);
    const response = await apiService.post<PointResponse>(url, payload);
    return response.data;
  } catch (error: any) {
    return { success: false, error: extractError(error) };
  }
}

export async function updateLinePoint(
  lineId: string,
  pointId: string,
  payload: Partial<AddPointPayload>,
): Promise<PointResponse> {
  try {
    const url = ApiEndpoints.UPDATE_LINE_POINT
      .replace(":lineId", lineId)
      .replace(":pointId", pointId);
    const response = await apiService.patch<PointResponse>(url, payload);
    return response.data;
  } catch (error: any) {
    return { success: false, error: extractError(error) };
  }
}

export async function removeLinePoint(lineId: string, pointId: string): Promise<PointResponse> {
  try {
    const url = ApiEndpoints.DELETE_LINE_POINT
      .replace(":lineId", lineId)
      .replace(":pointId", pointId);
    const response = await apiService.delete<PointResponse>(url);
    return response.data;
  } catch (error: any) {
    return { success: false, error: extractError(error) };
  }
}

export async function generateLineInvite(lineId: string): Promise<InviteResponse> {
  try {
    const url = ApiEndpoints.CREATE_LINE_INVITE.replace(":lineId", lineId);
    const response = await apiService.post<{ success: boolean; data: { token: string; url: string; expiresAt: string } }>(url);
    return {
      success: true,
      token: response.data.data.token,
      url: response.data.data.url,
      expiresAt: response.data.data.expiresAt,
    };
  } catch (error: any) {
    return { success: false, error: extractError(error) };
  }
}

let _ibgeCache: IBGECity[] | null = null;

function normalize(str: string) {
  return str.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export async function searchIBGECities(query: string): Promise<IBGECity[]> {
  try {
    if (!_ibgeCache) {
      const response = await fetch(
        "https://servicodados.ibge.gov.br/api/v1/localidades/municipios",
      );
      if (!response.ok) return [];
      _ibgeCache = await response.json();
    }
    const q = normalize(query);
    return (_ibgeCache ?? []).filter((c) => normalize(c.nome).includes(q));
  } catch {
    return [];
  }
}
