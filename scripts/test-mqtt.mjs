// Quick CLI check of an MQTT connection string, same library the browser client uses.
//
// Usage:
//   node scripts/test-mqtt.mjs "wss://user:pass@mqtt.masterdigitaldesign.com/mqtt"
//   MQTT_URL="ws://user:pass@127.0.0.1:8083" node scripts/test-mqtt.mjs
//
// Connects, subscribes to a test topic, publishes to it and waits for the echo.
import MQTT from "mqtt";

const url = process.argv[2] ?? process.env.MQTT_URL;
if (!url) {
  console.error('usage: node scripts/test-mqtt.mjs "wss://user:pass@host/mqtt"');
  process.exit(2);
}

// mqtt.js silently falls back to raw TCP (mqtt://host:1883) for unknown schemes like https://
const scheme = url.split(":")[0];
if (!["ws", "wss", "mqtt", "mqtts"].includes(scheme)) {
  console.error(`✗ unsupported scheme "${scheme}://" — use ws/wss (what the browser uses) or mqtt/mqtts`);
  process.exit(2);
}

const TIMEOUT_MS = Number(process.env.TIMEOUT_MS ?? 10000);
const topic = `shiftr-clone/test/${Date.now()}`;
const masked = url.replace(/\/\/([^:@/]+):[^@/]*@/, "//$1:****@");

console.log(`→ connecting to ${masked}`);

const client = MQTT.connect(url, {
  clientId: "SHIFTR_CLONE_CLI_TEST_" + Math.random().toString(16).slice(2, 10),
  connectTimeout: TIMEOUT_MS,
  reconnectPeriod: 0, // fail fast instead of retrying forever
});

const fail = (msg) => {
  console.error(`✗ ${msg}`);
  client.end(true);
  process.exit(1);
};

const timer = setTimeout(() => fail(`timed out after ${TIMEOUT_MS}ms`), TIMEOUT_MS);

client.on("connect", (connack) => {
  console.log(`✓ connected (session present: ${connack.sessionPresent})`);
  client.subscribe(topic, (err) => {
    if (err) return fail(`subscribe failed: ${err.message}`);
    console.log(`✓ subscribed to ${topic}`);
    client.publish(topic, "ping");
  });
});

client.on("message", (t, payload) => {
  if (t !== topic) return;
  console.log(`✓ received echo: ${payload.toString()}`);
  clearTimeout(timer);
  client.end(false, () => process.exit(0));
});

// ws handshake failures surface here, e.g. "Unexpected server response: 502"
client.on("error", (err) => fail(`error: ${err.message}${err.code ? ` (code ${err.code})` : ""}`));
client.on("close", () => {
  if (!client.connected && !client.disconnecting) {
    fail("socket closed before MQTT CONNACK — the server didn't accept the WebSocket/MQTT handshake");
  }
  console.log("· socket closed");
});
