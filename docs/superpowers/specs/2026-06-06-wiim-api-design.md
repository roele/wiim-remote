# WiiM Raycast Extension API Integration Design

**Date:** 2026-06-06  
**Status:** Approved for Implementation  
**Scope:** Extended features (playback, volume, presets, input source, EQ)  
**Platform Support:** macOS, Windows

---

## Executive Summary

This design specifies the implementation of a WiiM HTTP API integration for the Raycast extension, enabling remote control of WiiM audio devices over the local network. The extension will include automatic device discovery via UDP broadcast, manual IP override in preferences, and support for playback control, volume adjustment, preset management, input source switching, and EQ controls.

---

## Requirements

### Functional Requirements

1. **Device Discovery**
   - Auto-discover WiiM device on local network using UDP broadcast
   - Cache discovered IP address in preferences for subsequent use
   - Allow manual IP entry in preferences as fallback
   - Validate device reachability before caching

2. **Single Device Control**
   - Support control of one WiiM device at a time
   - No multi-device management or selection UI

3. **Playback Control**
   - Play/Pause toggle
   - Next track
   - Previous track
   - Seek to position (optional, based on API availability)

4. **Volume Management**
   - Volume up/down with configurable step (default: 5)
   - Set volume to specific level (0-100)
   - Global volume step preference applied to all commands

5. **Presets**
   - Play preset by number (1-12)
   - List available presets
   - UI for quick preset selection

6. **Input Source**
   - Switch between inputs: line-in, bluetooth, optical, USB, WiFi
   - Show current input source

7. **EQ Controls**
   - Enable/disable EQ
   - Select from 22 EQ presets
   - Show current EQ status

8. **Device Status**
   - Query current playback state, volume, mute status, current track info
   - Use status for validation and display

### Non-Functional Requirements

- Support Windows and macOS platforms
- Minimal discovery latency (~2s for initial auto-discover)
- Graceful error handling with user-facing messages
- Type-safe TypeScript implementation
- Testable code structure with clear separation of concerns

---

## Architecture

### Layer 1: API Wrapper (`src/wiim/api.ts`)

**Purpose:** Encapsulate all HTTPS communication with WiiM device.

**Responsibilities:**
- Construct URLs for WiiM API endpoints (`https://{ip}/httpapi.asp?command=...`)
- Handle HTTPS requests with timeout and retry logic
- Parse JSON and plain-text responses
- Map API responses to typed TypeScript objects
- Throw typed errors for connection/parsing failures

**Public API:**
```typescript
class WiiMAPI {
  constructor(deviceIP: string);
  
  // Playback
  play(): Promise<void>;
  pause(): Promise<void>;
  toggle(): Promise<void>;
  next(): Promise<void>;
  previous(): Promise<void>;
  seek(ms: number): Promise<void>;
  
  // Volume
  setVolume(level: 0-100): Promise<void>;
  getVolume(): Promise<number>;
  
  // Presets
  playPreset(number: 1-12): Promise<void>;
  getPresetList(): Promise<PresetInfo[]>;
  
  // Input Source
  setInputSource(source: InputSource): Promise<void>;
  getInputSource(): Promise<InputSource>;
  
  // EQ
  enableEQ(): Promise<void>;
  disableEQ(): Promise<void>;
  setEQPreset(presetNum: 0-21): Promise<void>;
  getEQStatus(): Promise<{ enabled: boolean; preset: number }>;
  
  // Status
  getStatus(): Promise<DeviceStatus>;
}

interface DeviceStatus {
  deviceName: string;
  uuid: string;
  firmwareVersion: string;
  volume: number;
  mute: boolean;
  playbackMode: number;
  currentTrack?: { title: string; artist: string; album: string };
}

type InputSource = "line-in" | "bluetooth" | "optical" | "usb" | "wifi";

class WiiMAPIError extends Error {
  code: "NETWORK" | "TIMEOUT" | "INVALID_RESPONSE" | "DEVICE_ERROR";
}
```

**Error Handling:**
- Network errors (no device at IP) → `WiiMAPIError("NETWORK")`
- Timeout (>5s) → `WiiMAPIError("TIMEOUT")`
- Invalid JSON/unexpected format → `WiiMAPIError("INVALID_RESPONSE")`
- Device returns error response → `WiiMAPIError("DEVICE_ERROR", message)`

---

### Layer 2: Device Discovery (`src/wiim/discovery.ts`)

**Purpose:** Find WiiM device on local network and validate reachability.

**Responsibilities:**
- Send UDP broadcast query to discover device
- Parse device info from broadcast response
- Validate HTTPS connectivity to discovered IP
- Return device IP and metadata

**Public API:**
```typescript
interface DiscoveredDevice {
  ip: string;
  deviceName: string;
  mac: string;
  uuid: string;
}

class WiiMDiscovery {
  static async findDevice(timeoutMs: number = 5000): Promise<DiscoveredDevice>;
}
```

**Discovery Flow:**
1. Send UDP packet to broadcast address (255.255.255.255:7777) with discovery query
2. Listen for responses (max 5 seconds)
3. Parse device info from response
4. Validate by attempting HTTPS connection to `/httpapi.asp?command=getStatusEx`
5. Return first valid device or throw error

**Fallback Behavior:**
- If discovery fails: return null (caller should prompt for manual IP)
- Commands should use manual IP from preferences if discovery times out

---

### Layer 3: Preferences Management (`src/wiim/preferences.ts`)

**Purpose:** Manage user configuration and discovery cache.

**Responsibilities:**
- Provide type-safe access to Raycast preferences
- Cache discovered device IP
- Manage stale detection for cached IP

**Configuration Keys:**
```typescript
interface WiiMPreferences {
  deviceIP: string;           // Manual override, empty = auto-discover
  volumeStep: number;         // Default: 5, range: 1-50
  lastDiscoveryTime: number;  // Timestamp of last successful discovery
  cachedDeviceIP: string;     // Last discovered IP
  discoveryTimeout: number;   // Ms to wait for discovery, default: 5000
}
```

**Public API:**
```typescript
class Preferences {
  static getDeviceIP(): Promise<string>;      // Returns manual IP or cached IP
  static setDeviceIP(ip: string): Promise<void>;
  static getVolumeStep(): Promise<number>;
  static setVolumeStep(step: number): Promise<void>;
  static getCachedDeviceIP(): Promise<string | null>;
  static setCachedDeviceIP(ip: string): Promise<void>;
  static isCacheValid(maxAgeMins: number = 30): Promise<boolean>;
}
```

**Cache Strategy:**
- Cache is valid for 30 minutes
- If cache expired and manual IP not set, trigger discovery on next command
- Manual IP always takes precedence if set

---

### Layer 4: Commands (`src/*.ts`)

**Existing commands to implement:**
- `play-pause.ts` - Toggle playback
- `next-track.ts` - Skip to next
- `previous-track.ts` - Skip to previous
- `volume-up.ts` - Increase volume by step
- `volume-down.ts` - Decrease volume by step
- (Note: `set-volume` command in package.json but no file yet)

**New commands to add:**
- `select-preset.ts` - List presets and play selected
- `switch-input.ts` - List inputs and switch to selected
- `toggle-eq.ts` - Enable/disable EQ
- `set-eq-preset.ts` - Choose from 22 EQ presets

**Command Implementation Pattern:**
```typescript
export default async function main() {
  try {
    const deviceIP = await getDeviceIP();  // With discovery fallback
    const api = new WiiMAPI(deviceIP);
    
    // Execute command
    await api.play();
    
    // Success - typically silent in "no-view" mode
    showSuccessToast?.("Playing...");
  } catch (error) {
    showFailureToast(errorMessage(error));
  }
}

function errorMessage(error: Error): string {
  if (error instanceof WiiMAPIError) {
    switch (error.code) {
      case "NETWORK":
        return "Device not found. Check IP in preferences.";
      case "TIMEOUT":
        return "Device is not responding.";
      case "DEVICE_ERROR":
        return error.message;
      default:
        return error.message;
    }
  }
  return String(error);
}
```

**Error Toast Guidance:**
- Network/Timeout → Suggest checking device and preferences
- Device error → Surface the device's error message
- Success → Use silent completion (no-view mode) for speed

---

## Data Flow

### Typical Command Flow

**Example: User triggers "Volume Up"**

```
1. volumeUp.ts main() invoked
2. Call getDeviceIP() which:
   a. Check preferences for manual IP
      - If set and recent discovery valid → use it
      - If set but stale → use it (will auto-correct later)
   b. If no manual IP → try Discovery.findDevice()
      - If success → cache IP in preferences, return
      - If timeout → return null
   c. If no IP from either → throw error
3. Create WiiMAPI(deviceIP)
4. Call api.getVolume() → returns current volume
5. Call api.setVolume(currentVolume + volumeStep)
6. If success → done (silent in no-view mode)
7. If error → showFailureToast with typed error message
```

### Discovery on First Use

```
1. User installs extension
2. Triggers any command (e.g., Play/Pause)
3. getDeviceIP() → no manual IP, cache empty → calls Discovery.findDevice()
4. Discovery broadcasts UDP → device responds with IP
5. Validate IP by calling getStatusEx → success
6. Cache IP in preferences
7. Command executes with discovered IP
8. Subsequent commands use cached IP (no discovery delay)
```

### Manual IP Override

```
1. Auto-discovery fails (device offline, network issue)
2. User opens extension preferences
3. Enters manual IP address
4. Next command uses manual IP
5. If manual IP fails → user sees error suggesting to check device
```

---

## Error Handling Strategy

### Error Categories and Response

| Error | Cause | User Message |
|-------|-------|--------------|
| NETWORK | Device IP not responding | "Device not found. Check IP in preferences." |
| TIMEOUT | Request took >5s | "Device is not responding." |
| INVALID_RESPONSE | Unexpected API response format | "Invalid response from device." |
| DEVICE_ERROR | Device returned error (e.g., offline) | Device's error message |
| Discovery timeout | Broadcast didn't get response | "Could not find device. Enter IP in preferences." |

### Retry Logic

- Single retry for transient network errors
- No retry for device errors (device returned error response)
- Discovery only on first command or if cache expired

---

## Type Definitions

**Core types** in `src/wiim/types.ts`:

```typescript
export type InputSource = "line-in" | "bluetooth" | "optical" | "usb" | "wifi";

export interface DeviceStatus {
  deviceName: string;
  uuid: string;
  firmwareVersion: string;
  volume: number;
  mute: boolean;
  playbackMode: number;
  currentTrack?: {
    title: string;
    artist: string;
    album: string;
    sampleRate?: number;
    bitDepth?: number;
  };
}

export interface PresetInfo {
  number: number;
  name: string;
}

export interface DiscoveredDevice {
  ip: string;
  deviceName: string;
  mac: string;
  uuid: string;
}

export class WiiMAPIError extends Error {
  code: "NETWORK" | "TIMEOUT" | "INVALID_RESPONSE" | "DEVICE_ERROR";
  constructor(code: string, message: string);
}
```

---

## Testing Strategy

### Unit Tests

**api.ts:**
- Parse valid JSON responses
- Handle malformed JSON with error
- Construct correct URLs
- Timeout after 5s
- Retry transient errors

**discovery.ts:**
- UDP broadcast sent to correct address/port
- Parse device info from response
- Validate IP reachability
- Timeout after 5s if no response

**preferences.ts:**
- Store/retrieve preferences correctly
- Detect stale cache
- Return cached IP when valid

### Integration Tests (Manual, Dev Environment)

- Real device discovery against test device
- Command execution end-to-end
- Error cases (device offline, bad IP, invalid response)

### Command Tests

- Commands correctly call API methods
- Errors converted to proper toast messages
- Discovery called when IP not cached

---

## File Structure

```
src/
├── wiim/
│   ├── api.ts              # Main API wrapper class
│   ├── discovery.ts        # UDP device discovery
│   ├── preferences.ts      # Raycast preferences wrapper
│   ├── types.ts            # Shared type definitions
│   └── errors.ts           # Error classes
├── play-pause.ts           # (Implement)
├── next-track.ts           # (Implement)
├── previous-track.ts       # (Implement)
├── volume-up.ts            # (Implement)
├── volume-down.ts          # (Implement)
├── set-volume.ts           # (New)
├── select-preset.ts        # (New)
├── switch-input.ts         # (New)
├── toggle-eq.ts            # (New)
├── set-eq-preset.ts        # (New)
└── util.ts                 # Shared utilities

docs/
└── superpowers/
    └── specs/
        └── 2026-06-06-wiim-api-design.md  (This file)
```

---

## Implementation Notes

### HTTPS Certificate Handling

WiiM devices use self-signed certificates. Node.js/Raycast will reject these by default.

**Solution:** Disable certificate verification for WiiM API calls (this is safe for local network LAN-only traffic).

```typescript
const agent = new https.Agent({ rejectUnauthorized: false });
// Use agent in fetch/node-fetch calls
```

### UDP Broadcast Address

For device discovery, broadcast to the local subnet:
- Determine subnet from local IP: `192.168.1.x` → broadcast to `192.168.1.255:7777`
- Cross-platform: use `os.networkInterfaces()` to find local IP, calculate broadcast address
- Fallback: broadcast to common ranges if local IP detection fails

### Volume Step Edge Cases

- Volume: 0-100, step: 5
- Volume Up at 98 → cap at 100 (don't go over)
- Volume Down at 2 → go to 0 (don't go negative)
- Implement safeguards in API or command layer

---

## Success Criteria

- [x] Design approved by user
- [ ] All modules implement typed interfaces per spec
- [ ] Commands execute without errors against real device
- [ ] Device discovery succeeds within 5 seconds
- [ ] Manual IP override works when discovery unavailable
- [ ] All commands show appropriate success/error toasts
- [ ] Code passes linting (eslint)
- [ ] Unit tests achieve >80% coverage
- [ ] README reflects all new commands and preferences
- [ ] Extension builds and publishes successfully

---

## Future Enhancements

Not in scope for this implementation, but noted for roadmap:

- Device-specific settings (per-device volume step)
- Multi-device support with device selector
- EQ visualizer or frequency display
- Now Playing widget showing current track
- Background refresh of device status
- Alarm management UI
- HTTP API v2.0 support (if released)

---
