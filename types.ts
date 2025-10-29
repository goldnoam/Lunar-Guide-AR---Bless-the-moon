export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface DeviceOrientation {
  alpha: number | null; // Compass heading [0, 360)
  beta: number | null;  // Front-to-back tilt [-180, 180] or [-90, 90]
  gamma: number | null; // Left-to-right tilt [-90, 90]
}

export interface MoonPosition {
  azimuth: number;   // Azimuth in degrees [0, 360), north-based
  altitude: number;  // Altitude in degrees [-90, 90]
}

export enum AppState {
  REQUESTING_PERMISSIONS,
  LOADING,
  READY,
  ERROR,
}
