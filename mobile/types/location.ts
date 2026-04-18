export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface Route {
  id: string;
  origin: Location;
  destination: Location;
  waypoints: Location[];
  distance: number;
  duration: number;
}

export interface LineLocation extends Location {
  type: 'PICKUP' | 'DROPOFF';
  sequence: number;
}
