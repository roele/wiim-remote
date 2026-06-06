import * as https from "https";
import type { WiiMDevice, DeviceStatus, SystemInfo, InputSource, EQPresetIndex } from "./types";
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

      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new WiiMAPIError("NETWORK_TIMEOUT", `Device did not respond within ${API_TIMEOUT_MS}ms`));
      }, API_TIMEOUT_MS);

      https
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
    await this.command("toggle");
  }
  async next(): Promise<void> {
    await this.command("next");
  }
  async previous(): Promise<void> {
    await this.command("previous");
  }

  // --- Volume ---
  async getVolume(): Promise<number> {
    const raw = await this.request("getvolume");
    const n = parseInt(raw, 10);
    if (isNaN(n)) throw new WiiMAPIError("INVALID_RESPONSE", `Expected number, got: ${raw}`);
    return n;
  }

  async setVolume(volume: number): Promise<void> {
    const clamped = Math.max(0, Math.min(100, volume));
    await this.command(`setvolume:${clamped}`);
  }

  async volumeUp(step: number): Promise<void> {
    const current = await this.getVolume();
    await this.setVolume(current + step);
  }

  async volumeDown(step: number): Promise<void> {
    const current = await this.getVolume();
    await this.setVolume(current - step);
  }

  // --- Preset ---
  async selectPreset(index: number): Promise<void> {
    const clamped = Math.max(0, Math.min(11, index));
    await this.command(`play_preset:${clamped}`);
  }

  // --- Input ---
  async switchInput(input: InputSource): Promise<void> {
    const map: Record<InputSource, string> = {
      "line-in": "linein",
      bluetooth: "bluetooth",
      optical: "optical",
      usb: "usb",
      wifi: "wifi",
    };
    await this.command(`setinput:${map[input]}`);
  }

  // --- EQ ---
  async setEQPreset(index: EQPresetIndex): Promise<void> {
    const clamped = Math.max(0, Math.min(21, index));
    await this.command(`seteq:${clamped}`);
  }

  async toggleEQ(enabled: boolean): Promise<void> {
    await this.command(`eq:${enabled ? "on" : "off"}`);
  }

  // --- Device info ---
  async getSystemInfo(): Promise<SystemInfo> {
    const raw = await this.request("getSystemInfo");
    try {
      const json = JSON.parse(raw);
      return {
        model: json.model ?? "Unknown",
        firmwareVersion: json.fwVersion ?? json.fw_version ?? "Unknown",
        macAddress: json.mac ?? "Unknown",
        serialNumber: json.sn ?? json.serial ?? "Unknown",
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
        title: json.title ?? "",
        artist: json.artist ?? "",
        album: json.album ?? "",
        albumArt: json.pic ?? "",
      };
    } catch {
      throw new WiiMAPIError("INVALID_RESPONSE", `Cannot parse player status: ${raw}`);
    }
  }
}
