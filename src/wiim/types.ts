// WiiM Device and network discovery
export interface WiiMDevice {
  ip: string;
  port: number;
  name?: string;
  model?: string;
  firmwareVersion?: string;
  mac?: string;
}

// Device status from /httpapi.asp?command=getPlayerStatus
export interface DeviceStatus {
  playStatus: 'play' | 'pause' | 'stop' | 'buffering';
  currentTrack: number;
  totalTracks: number;
  currentTime: number;
  totalTime: number;
  title: string;
  artist: string;
  album: string;
  albumArt: string;
}

// Device information from /httpapi.asp?command=getSystemInfo
export interface SystemInfo {
  model: string;
  firmwareVersion: string;
  macAddress: string;
  serialNumber: string;
}

// Volume control response
export interface VolumeResponse {
  volume: number;
  muted: boolean;
}

// Playback modes
export type PlaybackMode = 'play' | 'pause' | 'stop';

// Input sources
export type InputSource = 'line-in' | 'bluetooth' | 'optical' | 'usb' | 'wifi';

// EQ preset indices (0-21 for 22 available presets)
export type EQPresetIndex = number; // 0-21

// Response types for various API calls
export type ApiResponse = string | Record<string, any>;

// Error response types
export interface ApiErrorResponse {
  errorCode: number;
  errorMessage: string;
}
