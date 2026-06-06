import * as https from "https";
import type { WiiMDevice, DeviceStatus, SystemInfo, InputSource } from "./types";
import { WiiMAPIError } from "./errors";

const API_TIMEOUT_MS = 5000;

export class WiiMAPI {
  private agent: https.Agent;

  constructor(private device: WiiMDevice) {
    this.agent = new https.Agent({ rejectUnauthorized: false });
  }

  private url(command: string): string {
    return `https://${this.device.ip}:${this.device.port}/httpapi.asp?command=${encodeURIComponent(command)}`;
  }

  private request(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      let settled = false;

      const req = https
        .get(this.url(command), { agent: this.agent }, (res) => {
          let body = "";
          res.on("data", (chunk: string) => {
            body += chunk;
          });
          res.on("end", () => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            if (res.statusCode === 200) {
              resolve(body.trim());
            } else {
              reject(new WiiMAPIError("COMMAND_FAILED", `HTTP ${res.statusCode}`, res.statusCode));
            }
          });
        })
        .on("error", (err) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          reject(new WiiMAPIError("NETWORK_TIMEOUT", `Network error: ${err.message}`, undefined, err));
        });

      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        req.destroy();
        reject(new WiiMAPIError("NETWORK_TIMEOUT", `Device did not respond within ${API_TIMEOUT_MS}ms`));
      }, API_TIMEOUT_MS);
    });
  }

  private async command(cmd: string): Promise<void> {
    const response = await this.request(cmd);
    if (response !== "OK") {
      throw new WiiMAPIError("COMMAND_FAILED", `Command "${cmd}" returned: ${response}`);
    }
  }

  // --- Playback ---
  async togglePlayPause(): Promise<void> {
    await this.command("setPlayerCmd:onepause");
  }
  async next(): Promise<void> {
    await this.command("setPlayerCmd:next");
  }
  async previous(): Promise<void> {
    await this.command("setPlayerCmd:prev");
  }

  // --- Volume ---
  async getVolume(): Promise<number> {
    // Volume is embedded in getPlayerStatus response as the "vol" field
    const raw = await this.request("getPlayerStatus");
    try {
      const json = JSON.parse(raw);
      const n = parseInt(json.vol, 10);
      if (isNaN(n)) throw new Error("vol field missing or non-numeric");
      return n;
    } catch {
      throw new WiiMAPIError("INVALID_RESPONSE", `Cannot parse volume from: ${raw}`);
    }
  }

  async setVolume(volume: number): Promise<void> {
    const clamped = Math.max(0, Math.min(100, volume));
    await this.command(`setPlayerCmd:vol:${clamped}`);
  }

  async volumeUp(step: number): Promise<void> {
    const current = await this.getVolume();
    await this.setVolume(current + Math.max(1, step));
  }

  async volumeDown(step: number): Promise<void> {
    const current = await this.getVolume();
    await this.setVolume(current - Math.max(1, step));
  }

  // --- Preset (1-based: MCUKeyShortClick:1 = first preset) ---
  async selectPreset(index: number): Promise<void> {
    const clamped = Math.max(0, Math.min(11, index));
    await this.command(`MCUKeyShortClick:${clamped + 1}`);
  }

  // --- Input ---
  async switchInput(input: InputSource): Promise<void> {
    const map: Record<InputSource, string> = {
      "line-in": "line-in",
      bluetooth: "bluetooth",
      optical: "optical",
      usb: "usb",
      wifi: "wifi",
    };
    await this.command(`setPlayerCmd:switchmode:${map[input]}`);
  }

  // --- EQ ---
  async getEQPresets(): Promise<string[]> {
    const raw = await this.request("EQGetList");
    try {
      return JSON.parse(raw) as string[];
    } catch {
      throw new WiiMAPIError("INVALID_RESPONSE", `Cannot parse EQ preset list: ${raw}`);
    }
  }

  async getEQPresetIndex(): Promise<number> {
    // eq field in getPlayerStatus is the active preset index (0 = Flat/off)
    const raw = await this.request("getPlayerStatus");
    try {
      return parseInt(JSON.parse(raw).eq ?? "0", 10);
    } catch {
      return 0;
    }
  }

  async setEQPreset(name: string): Promise<void> {
    // EQLoad accepts the preset name and returns JSON {status:"OK"}
    const raw = await this.request(`EQLoad:${name}`);
    try {
      const json = JSON.parse(raw);
      if (json.status !== "OK") {
        throw new WiiMAPIError("COMMAND_FAILED", `EQLoad:${name} failed: ${raw}`);
      }
    } catch (e) {
      if (e instanceof WiiMAPIError) throw e;
      throw new WiiMAPIError("INVALID_RESPONSE", `Unexpected EQLoad response: ${raw}`);
    }
  }

  async setEQEnabled(enabled: boolean): Promise<void> {
    // EQOn/EQOff return JSON {status:"OK"} not plain "OK"
    const raw = await this.request(enabled ? "EQOn" : "EQOff");
    try {
      const json = JSON.parse(raw);
      if (json.status !== "OK") {
        throw new WiiMAPIError("COMMAND_FAILED", `EQ toggle failed: ${raw}`);
      }
    } catch (e) {
      if (e instanceof WiiMAPIError) throw e;
      throw new WiiMAPIError("INVALID_RESPONSE", `Unexpected EQ toggle response: ${raw}`);
    }
  }

  // --- Device info ---
  async getSystemInfo(): Promise<SystemInfo> {
    const raw = await this.request("getStatusEx");
    try {
      const json = JSON.parse(raw);
      return {
        model: json.project ?? json.DeviceName ?? "WiiM Device",
        firmwareVersion: json.firmware ?? json.FW_Release_version ?? "Unknown",
        macAddress: json.MAC ?? "Unknown",
        serialNumber: json.uuid ?? "Unknown",
      };
    } catch {
      throw new WiiMAPIError("INVALID_RESPONSE", `Cannot parse system info: ${raw}`);
    }
  }

  async getPlayerStatus(): Promise<DeviceStatus> {
    const raw = await this.request("getPlayerStatus");
    try {
      const json = JSON.parse(raw);
      let playStatus: DeviceStatus["playStatus"] = "stop";
      if (json.playStatus === "1" || json.status === "play") playStatus = "play";
      else if (json.playStatus === "2" || json.status === "pause") playStatus = "pause";
      else if (json.playStatus === "3" || json.status === "buffering") playStatus = "buffering";
      return {
        playStatus,
        currentTrack: Number(json.curpos ?? 0),
        totalTracks: Number(json.totlen ?? 0),
        currentTime: Number(json.curtime ?? 0),
        totalTime: Number(json.tottime ?? 0),
        title: hexDecode(json.Title ?? json.title ?? ""),
        artist: hexDecode(json.Artist ?? json.artist ?? ""),
        album: hexDecode(json.Album ?? json.album ?? ""),
        albumArt: json.pic ?? "",
      };
    } catch {
      throw new WiiMAPIError("INVALID_RESPONSE", `Cannot parse player status: ${raw}`);
    }
  }
}

/** WiiM encodes track metadata as hex UTF-8 strings. Decodes them safely. */
function hexDecode(s: string): string {
  if (!s || s.length === 0 || s.length % 2 !== 0) return s;
  try {
    return Buffer.from(s, "hex").toString("utf8");
  } catch {
    return s;
  }
}
