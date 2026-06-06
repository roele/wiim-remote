/**
 * WiiM Device information and connection details
 * Used to specify which device to communicate with and store device metadata
 */
export interface WiiMDevice {
  ip: string;
  port: number;
  name?: string;
  model?: string;
  firmwareVersion?: string;
  macAddress?: string;
}

/**
 * Current playback status from the WiiM device
 * Retrieved via /httpapi.asp?command=getPlayerStatus
 */
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

/**
 * System information about the WiiM device
 * Retrieved via /httpapi.asp?command=getSystemInfo
 */
export interface SystemInfo {
  model: string;
  firmwareVersion: string;
  macAddress: string;
  serialNumber: string;
}

/**
 * Volume control state for the device
 */
export interface VolumeResponse {
  volume: number;
  muted: boolean;
}

/** Supported playback modes */
export type PlaybackMode = 'play' | 'pause' | 'stop';

/** Supported audio input sources */
export type InputSource = 'line-in' | 'bluetooth' | 'optical' | 'usb' | 'wifi';

/** EQ preset index (0-21 representing 22 available presets) */
export type EQPresetIndex = number;

/** Generic API response types */
export type ApiResponse = string | Record<string, string | number | boolean>;

/** Error response from WiiM API */
export interface ApiErrorResponse {
  errorCode: number;
  errorMessage: string;
}
