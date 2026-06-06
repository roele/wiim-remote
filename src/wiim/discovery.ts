import { createSocket } from "dgram";
import { networkInterfaces } from "os";
import { WiiMDevice } from "./types";
import { WiiMAPIError } from "./errors";
import { getManualDeviceIP, getCachedDeviceIP, setCachedDeviceIP, isCacheValid } from "./preferences";

const DISCOVERY_PORT = 7777;
const DISCOVERY_TIMEOUT_MS = 5000;
const BROADCAST_ADDRESS = "255.255.255.255";

/**
 * Sends a UDP broadcast and waits for a WiiM device to respond.
 * Resolves with the discovered WiiMDevice on success.
 * Rejects with WiiMAPIError(DISCOVERY_FAILED) on timeout or error.
 */
export function broadcastDiscover(): Promise<WiiMDevice> {
  return new Promise((resolve, reject) => {
    const socket = createSocket("udp4");
    let settled = false;

    function settle(fn: () => void) {
      if (settled) return;
      settled = true;
      try {
        socket.close();
      } catch {
        /* ignore */
      }
      fn();
    }

    const timer = setTimeout(() => {
      settle(() => reject(new WiiMAPIError("DISCOVERY_FAILED", "No WiiM device responded within 5 seconds")));
    }, DISCOVERY_TIMEOUT_MS);

    socket.on("message", (msg, rinfo) => {
      clearTimeout(timer);
      const response = msg.toString("utf-8").trim();
      const parts = response.split(":");
      settle(() =>
        resolve({
          ip: rinfo.address,
          port: 443,
          model: parts[0] || "WiiM Device",
          firmwareVersion: parts[1],
          macAddress: parts[2],
        }),
      );
    });

    socket.on("error", (err) => {
      clearTimeout(timer);
      settle(() => reject(new WiiMAPIError("DISCOVERY_FAILED", `Socket error: ${err.message}`, undefined, err)));
    });

    socket.bind(() => {
      socket.setBroadcast(true);
      const packet = Buffer.from("WM-GETDEVICEINFO");
      socket.send(packet, 0, packet.length, DISCOVERY_PORT, BROADCAST_ADDRESS, (err) => {
        if (err) {
          clearTimeout(timer);
          settle(() => reject(new WiiMAPIError("DISCOVERY_FAILED", `Send error: ${err.message}`, undefined, err)));
        }
      });
    });
  });
}

/**
 * Resolves the WiiM device IP address using priority order:
 * 1. Manual IP from Raycast preferences (if set)
 * 2. Cached auto-discovered IP (if still valid, within 30 minutes)
 * 3. Fresh UDP broadcast discovery (result is cached for future calls)
 *
 * Throws WiiMAPIError(DISCOVERY_FAILED) if no device is found.
 */
export async function resolveDevice(): Promise<WiiMDevice> {
  // 1. Manual IP from preferences
  const manualIP = getManualDeviceIP();
  if (manualIP) {
    return { ip: manualIP, port: 443 };
  }

  // 2. Valid cache
  if (await isCacheValid()) {
    const cachedIP = await getCachedDeviceIP();
    if (cachedIP) {
      return { ip: cachedIP, port: 443 };
    }
  }

  // 3. Broadcast discovery
  const device = await broadcastDiscover();
  await setCachedDeviceIP(device.ip);
  return device;
}

/**
 * Returns the local network subnet (e.g., "192.168.1.0") from the first
 * non-loopback IPv4 interface. Used for diagnostics only.
 */
export function getLocalSubnet(): string | undefined {
  const ifaces = networkInterfaces();
  for (const addrs of Object.values(ifaces)) {
    if (!addrs) continue;
    for (const addr of addrs) {
      if (addr.family === "IPv4" && !addr.internal) {
        const parts = addr.address.split(".");
        return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
      }
    }
  }
  return undefined;
}
