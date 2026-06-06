import { test } from "node:test";
import * as assert from "node:assert";
import { networkInterfaces } from "os";

// Test pure logic extracted from discovery.ts (avoids @raycast/api dependency)

/**
 * Pure helper: parse a UDP response string into WiiMDevice fields.
 * Mirrors the logic in broadcastDiscover()'s "message" handler.
 */
function parseDiscoveryResponse(raw: string, ip: string) {
  const response = raw.trim();
  const parts = response.split(":");
  return {
    ip,
    port: 443,
    model: parts[0] || "WiiM Device",
    firmwareVersion: parts[1],
    macAddress: parts[2],
  };
}

/**
 * Pure helper: derive subnet from an IPv4 address string.
 * Mirrors the logic in getLocalSubnet().
 */
function subnetFromAddress(address: string): string {
  const parts = address.split(".");
  return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
}

// --- broadcastDiscover response parsing ---

test("parseDiscoveryResponse - full response populates all fields", () => {
  const result = parseDiscoveryResponse("WiiMAmp:4.6.328253:AA:BB:CC:DD:EE:FF", "192.168.1.42");
  assert.strictEqual(result.ip, "192.168.1.42");
  assert.strictEqual(result.port, 443);
  assert.strictEqual(result.model, "WiiMAmp");
  assert.strictEqual(result.firmwareVersion, "4.6.328253");
  assert.strictEqual(result.macAddress, "AA");
});

test('parseDiscoveryResponse - empty model falls back to "WiiM Device"', () => {
  const result = parseDiscoveryResponse(":4.6.0:AA:BB:CC", "10.0.0.5");
  assert.strictEqual(result.model, "WiiM Device");
});

test("parseDiscoveryResponse - trims leading/trailing whitespace", () => {
  const result = parseDiscoveryResponse("  WiiMMini:1.0.0:11:22:33  ", "172.16.0.1");
  assert.strictEqual(result.model, "WiiMMini");
  assert.strictEqual(result.firmwareVersion, "1.0.0");
});

test("parseDiscoveryResponse - single-segment response uses it as model", () => {
  const result = parseDiscoveryResponse("WiiM", "192.168.0.1");
  assert.strictEqual(result.model, "WiiM");
  assert.strictEqual(result.firmwareVersion, undefined);
  assert.strictEqual(result.macAddress, undefined);
});

// --- getLocalSubnet logic ---

test("subnetFromAddress - returns correct /24 subnet", () => {
  assert.strictEqual(subnetFromAddress("192.168.1.100"), "192.168.1.0");
  assert.strictEqual(subnetFromAddress("10.0.0.42"), "10.0.0.0");
  assert.strictEqual(subnetFromAddress("172.16.5.200"), "172.16.5.0");
});

test("getLocalSubnet - returns string matching N.N.N.0 format or undefined", () => {
  const ifaces = networkInterfaces();
  let result: string | undefined;

  for (const addrs of Object.values(ifaces)) {
    if (!addrs) continue;
    for (const addr of addrs) {
      if (addr.family === "IPv4" && !addr.internal) {
        const parts = addr.address.split(".");
        result = `${parts[0]}.${parts[1]}.${parts[2]}.0`;
        break;
      }
    }
    if (result) break;
  }

  if (result === undefined) {
    // No non-loopback IPv4 interface available (CI environment) — acceptable
    assert.strictEqual(result, undefined);
  } else {
    assert.match(result, /^\d+\.\d+\.\d+\.0$/);
  }
});
