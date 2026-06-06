import { test } from "node:test";
import * as assert from "node:assert";
import { WiiMAPI } from "./api";
import { WiiMAPIError } from "./errors";
import type { WiiMDevice } from "./types";

const device: WiiMDevice = { ip: "192.168.1.100", port: 443 };

// Helper: create a WiiMAPI instance with a stubbed request method
function makeApi(responses: Record<string, string>): WiiMAPI {
  const api = new WiiMAPI(device);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (api as any).request = (command: string): Promise<string> => {
    const key = Object.keys(responses).find((k) => command.startsWith(k));
    if (key !== undefined) return Promise.resolve(responses[key]);
    return Promise.reject(new WiiMAPIError("COMMAND_FAILED", `Unexpected command: ${command}`));
  };
  return api;
}

// --- Volume clamping ---

test("setVolume clamps value below 0 to 0", async () => {
  let sent = "";
  const api = new WiiMAPI(device);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (api as any).request = (cmd: string) => {
    sent = cmd;
    return Promise.resolve("OK");
  };
  await api.setVolume(-10);
  assert.strictEqual(sent, "setvolume:0");
});

test("setVolume clamps value above 100 to 100", async () => {
  let sent = "";
  const api = new WiiMAPI(device);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (api as any).request = (cmd: string) => {
    sent = cmd;
    return Promise.resolve("OK");
  };
  await api.setVolume(150);
  assert.strictEqual(sent, "setvolume:100");
});

test("setVolume passes through valid value unchanged", async () => {
  let sent = "";
  const api = new WiiMAPI(device);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (api as any).request = (cmd: string) => {
    sent = cmd;
    return Promise.resolve("OK");
  };
  await api.setVolume(55);
  assert.strictEqual(sent, "setvolume:55");
});

// --- selectPreset clamping ---

test("selectPreset clamps value below 0 to 0", async () => {
  let sent = "";
  const api = new WiiMAPI(device);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (api as any).request = (cmd: string) => {
    sent = cmd;
    return Promise.resolve("OK");
  };
  await api.selectPreset(-5);
  assert.strictEqual(sent, "play_preset:0");
});

test("selectPreset clamps value above 11 to 11", async () => {
  let sent = "";
  const api = new WiiMAPI(device);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (api as any).request = (cmd: string) => {
    sent = cmd;
    return Promise.resolve("OK");
  };
  await api.selectPreset(20);
  assert.strictEqual(sent, "play_preset:11");
});

test("selectPreset passes through valid value unchanged", async () => {
  let sent = "";
  const api = new WiiMAPI(device);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (api as any).request = (cmd: string) => {
    sent = cmd;
    return Promise.resolve("OK");
  };
  await api.selectPreset(6);
  assert.strictEqual(sent, "play_preset:6");
});

// --- setEQPreset clamping ---

test("setEQPreset clamps value below 0 to 0", async () => {
  let sent = "";
  const api = new WiiMAPI(device);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (api as any).request = (cmd: string) => {
    sent = cmd;
    return Promise.resolve("OK");
  };
  await api.setEQPreset(-1);
  assert.strictEqual(sent, "seteq:0");
});

test("setEQPreset clamps value above 21 to 21", async () => {
  let sent = "";
  const api = new WiiMAPI(device);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (api as any).request = (cmd: string) => {
    sent = cmd;
    return Promise.resolve("OK");
  };
  await api.setEQPreset(30);
  assert.strictEqual(sent, "seteq:21");
});

test("setEQPreset passes through valid value unchanged", async () => {
  let sent = "";
  const api = new WiiMAPI(device);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (api as any).request = (cmd: string) => {
    sent = cmd;
    return Promise.resolve("OK");
  };
  await api.setEQPreset(10);
  assert.strictEqual(sent, "seteq:10");
});

// --- Input map ---

test("switchInput maps line-in to linein", async () => {
  let sent = "";
  const api = new WiiMAPI(device);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (api as any).request = (cmd: string) => {
    sent = cmd;
    return Promise.resolve("OK");
  };
  await api.switchInput("line-in");
  assert.strictEqual(sent, "setinput:linein");
});

test("switchInput maps bluetooth to bluetooth", async () => {
  let sent = "";
  const api = new WiiMAPI(device);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (api as any).request = (cmd: string) => {
    sent = cmd;
    return Promise.resolve("OK");
  };
  await api.switchInput("bluetooth");
  assert.strictEqual(sent, "setinput:bluetooth");
});

test("switchInput maps optical to optical", async () => {
  let sent = "";
  const api = new WiiMAPI(device);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (api as any).request = (cmd: string) => {
    sent = cmd;
    return Promise.resolve("OK");
  };
  await api.switchInput("optical");
  assert.strictEqual(sent, "setinput:optical");
});

test("switchInput maps usb to usb", async () => {
  let sent = "";
  const api = new WiiMAPI(device);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (api as any).request = (cmd: string) => {
    sent = cmd;
    return Promise.resolve("OK");
  };
  await api.switchInput("usb");
  assert.strictEqual(sent, "setinput:usb");
});

test("switchInput maps wifi to wifi", async () => {
  let sent = "";
  const api = new WiiMAPI(device);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (api as any).request = (cmd: string) => {
    sent = cmd;
    return Promise.resolve("OK");
  };
  await api.switchInput("wifi");
  assert.strictEqual(sent, "setinput:wifi");
});

// --- getSystemInfo JSON parsing ---

test("getSystemInfo parses standard JSON fields", async () => {
  const api = makeApi({
    getSystemInfo: JSON.stringify({ model: "WiiM Pro", fwVersion: "4.6.415080", mac: "AA:BB:CC:DD:EE:FF", sn: "SN123" }),
  });
  const info = await api.getSystemInfo();
  assert.strictEqual(info.model, "WiiM Pro");
  assert.strictEqual(info.firmwareVersion, "4.6.415080");
  assert.strictEqual(info.macAddress, "AA:BB:CC:DD:EE:FF");
  assert.strictEqual(info.serialNumber, "SN123");
});

test("getSystemInfo falls back to fw_version and serial fields", async () => {
  const api = makeApi({
    getSystemInfo: JSON.stringify({ model: "WiiM Mini", fw_version: "3.0.0", mac: "11:22:33:44:55:66", serial: "SN456" }),
  });
  const info = await api.getSystemInfo();
  assert.strictEqual(info.firmwareVersion, "3.0.0");
  assert.strictEqual(info.serialNumber, "SN456");
});

test("getSystemInfo uses Unknown for missing fields", async () => {
  const api = makeApi({ getSystemInfo: JSON.stringify({}) });
  const info = await api.getSystemInfo();
  assert.strictEqual(info.model, "Unknown");
  assert.strictEqual(info.firmwareVersion, "Unknown");
  assert.strictEqual(info.macAddress, "Unknown");
  assert.strictEqual(info.serialNumber, "Unknown");
});

test("getSystemInfo throws INVALID_RESPONSE on bad JSON", async () => {
  const api = makeApi({ getSystemInfo: "not-json" });
  await assert.rejects(
    () => api.getSystemInfo(),
    (err: WiiMAPIError) => {
      assert.strictEqual(err.code, "INVALID_RESPONSE");
      return true;
    },
  );
});

// --- getPlayerStatus status code mapping ---

test("getPlayerStatus maps playStatus '1' to 'play'", async () => {
  const api = makeApi({ getPlayerStatus: JSON.stringify({ playStatus: "1" }) });
  const status = await api.getPlayerStatus();
  assert.strictEqual(status.playStatus, "play");
});

test("getPlayerStatus maps playStatus '2' to 'pause'", async () => {
  const api = makeApi({ getPlayerStatus: JSON.stringify({ playStatus: "2" }) });
  const status = await api.getPlayerStatus();
  assert.strictEqual(status.playStatus, "pause");
});

test("getPlayerStatus maps playStatus '3' to 'buffering'", async () => {
  const api = makeApi({ getPlayerStatus: JSON.stringify({ playStatus: "3" }) });
  const status = await api.getPlayerStatus();
  assert.strictEqual(status.playStatus, "buffering");
});

test("getPlayerStatus maps status 'play' string to 'play'", async () => {
  const api = makeApi({ getPlayerStatus: JSON.stringify({ status: "play" }) });
  const status = await api.getPlayerStatus();
  assert.strictEqual(status.playStatus, "play");
});

test("getPlayerStatus maps status 'pause' string to 'pause'", async () => {
  const api = makeApi({ getPlayerStatus: JSON.stringify({ status: "pause" }) });
  const status = await api.getPlayerStatus();
  assert.strictEqual(status.playStatus, "pause");
});

test("getPlayerStatus maps status 'buffering' string to 'buffering'", async () => {
  const api = makeApi({ getPlayerStatus: JSON.stringify({ status: "buffering" }) });
  const status = await api.getPlayerStatus();
  assert.strictEqual(status.playStatus, "buffering");
});

test("getPlayerStatus defaults to 'stop' for unknown status", async () => {
  const api = makeApi({ getPlayerStatus: JSON.stringify({ playStatus: "0" }) });
  const status = await api.getPlayerStatus();
  assert.strictEqual(status.playStatus, "stop");
});

test("getPlayerStatus parses track metadata", async () => {
  const api = makeApi({
    getPlayerStatus: JSON.stringify({
      playStatus: "1",
      curpos: "2",
      totlen: "10",
      curtime: "30",
      tottime: "240",
      title: "My Song",
      artist: "Artist Name",
      album: "Album Title",
      pic: "http://art.url/cover.jpg",
    }),
  });
  const status = await api.getPlayerStatus();
  assert.strictEqual(status.currentTrack, 2);
  assert.strictEqual(status.totalTracks, 10);
  assert.strictEqual(status.currentTime, 30);
  assert.strictEqual(status.totalTime, 240);
  assert.strictEqual(status.title, "My Song");
  assert.strictEqual(status.artist, "Artist Name");
  assert.strictEqual(status.album, "Album Title");
  assert.strictEqual(status.albumArt, "http://art.url/cover.jpg");
});

test("getPlayerStatus throws INVALID_RESPONSE on bad JSON", async () => {
  const api = makeApi({ getPlayerStatus: "not-json" });
  await assert.rejects(
    () => api.getPlayerStatus(),
    (err: WiiMAPIError) => {
      assert.strictEqual(err.code, "INVALID_RESPONSE");
      return true;
    },
  );
});
