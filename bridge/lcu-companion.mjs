/**
 * Compagnon local Node.js — Pont Client League of Legends (LCU API)
 * Lancer avec : npm run lcu-bridge
 *
 * Détecte le fichier `lockfile` du client LoL, interroge
 * https://127.0.0.1:<lcuPort>/lol-champ-select/v1/session à intervalle régulier
 * et diffuse les sessions de champ select via WebSocket vers l'application web
 * (src/services/lcuBridge.js). Aucune dépendance externe (Node.js natif uniquement).
 */
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import crypto from 'node:crypto';

const PORT = Number(process.env.LCU_BRIDGE_PORT || 4242);
const HOST = '127.0.0.1';
const POLL_INTERVAL_MS = 1500;
const WS_MAGIC = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

const DEFAULT_LOCKFILE_PATHS = [
  'C:\\Riot Games\\League of Legends\\lockfile',
  '/Applications/League of Legends.app/Contents/LoL/lockfile'
];

let lockState = null;        // { processName, pid, port, password, protocol, filePath }
let pollTimer = null;
let lastSessionPayload = null;
const clients = new Set();   // WebSocket client sockets

// ---------------------------------------------------------------------------
// Lockfile detection
// ---------------------------------------------------------------------------
function findLockfile() {
  for (const candidate of DEFAULT_LOCKFILE_PATHS) {
    try {
      if (fs.existsSync(candidate)) {
        const raw = fs.readFileSync(candidate, 'utf8').trim();
        const parts = raw.split(':');
        if (parts.length >= 5) {
          return {
            processName: parts[0],
            pid: parts[1],
            port: parts[2],
            password: parts[3],
            protocol: parts[4],
            filePath: candidate
          };
        }
      }
    } catch (e) {
      // Ignore unreadable lockfile
    }
  }
  return null;
}

function setLockState(next) {
  const changed = JSON.stringify(next) !== JSON.stringify(lockState);
  lockState = next;
  if (changed) {
    console.log(
      lockState
        ? `[LCU Companion] Client LoL détecté sur le port ${lockState.port} (${lockState.protocol})`
        : '[LCU Companion] Client LoL déconnecté.'
    );
    if (!lockState) stopPolling();
    else startPolling();
    broadcast({
      type: 'LCU_STATUS',
      lcuDetected: Boolean(lockState),
      lcuPort: lockState ? lockState.port : null
    });
  }
}

// ---------------------------------------------------------------------------
// LCU API polling (self-signed certificate tolerated, local client only)
// ---------------------------------------------------------------------------
function lcuRequest(path) {
  if (!lockState) return null;
  const auth = Buffer.from(`riot:${lockState.password}`).toString('base64');
  return new Promise((resolve, reject) => {
    const req = https.get(
      `https://127.0.0.1:${lockState.port}${path}`,
      { rejectUnauthorized: false, headers: { Authorization: `Basic ${auth}` } },
      (res) => {
        let data = '';
        res.on('data', (c) => { data += c; });
        res.on('end', () => {
          try { resolve(JSON.parse(data || '{}')); } catch (e) { resolve({}); }
        });
      }
    );
    req.on('error', (err) => reject(err));
    req.setTimeout(2000, () => { req.destroy(new Error('timeout')); });
  });
}

async function pollSession() {
  if (!lockState) return;
  try {
    const session = await lcuRequest('/lol-champ-select/v1/session');
    if (!session || session.error) return;
    const actions = Array.isArray(session.actions) ? session.actions : [];
    const payload = {
      type: 'CHAMP_SELECT_SESSION',
      session: {
        id: session.id,
        timer: session.timer,
        myTeam: session.myTeam,
        theirTeam: session.theirTeam,
        actions: actions.map((row) => row.map((act) => ({
          id: act.id,
          actorId: act.actorId,
          championId: act.championId,
          isAllyAction: act.isAllyAction,
          isInProgress: act.isInProgress,
          isCompleted: act.isCompleted,
          completed: Boolean(act.completed ?? act.isCompleted),
          type: act.type,
          pickTurn: act.pickTurn
        })))
      },
      ts: Date.now()
    };
    const serialized = JSON.stringify(payload);
    if (serialized !== lastSessionPayload) {
      lastSessionPayload = serialized;
      broadcast(payload);
    }
  } catch (e) {
    // LCU may briefly reject while champ select is opening/closing
  }
}

function startPolling() {
  stopPolling();
  pollTimer = setInterval(pollSession, POLL_INTERVAL_MS);
  pollSession();
}
function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}

// ---------------------------------------------------------------------------
// Minimal WebSocket server (RFC 6455), dependency-free
// ---------------------------------------------------------------------------
function wsSend(socket, payloadString) {
  try {
    const payload = Buffer.from(payloadString, 'utf8');
    const header = Buffer.allocUnsafe(payload.length < 126 ? 2 : payload.length < 65536 ? 4 : 10);
    header[0] = 0x81; // FIN + text frame
    if (payload.length < 126) {
      header[1] = payload.length;
    } else if (payload.length < 65536) {
      header[1] = 126;
      header.writeUInt16BE(payload.length, 2);
    } else {
      header[1] = 127;
      header.writeBigUInt64BE(BigInt(payload.length), 2);
    }
    socket.write(Buffer.concat([header, payload]));
  } catch (e) {
    destroySocket(socket);
  }
}

function destroySocket(socket) {
  try { socket.end(); } catch (e) { /* ignore */ }
  clients.delete(socket);
}

function parseWsFrames(socket, buffer) {
  // Minimal text-frame reader; enough for client PING/subscription messages
  while (buffer.length >= 2) {
    const b0 = buffer[0];
    const b1 = buffer[1];
    const fin = !!(b0 & 0x80);
    const opcode = b0 & 0x0f;
    const masked = !!(b1 & 0x80);
    const len = b1 & 0x7f;
    if (!fin || (opcode !== 1 && opcode !== 8)) break;
    if (!masked) break; // clients must mask
    let offset = 2;
    let maskKey;
    let payloadLen = len;
    if (len === 126) {
      if (buffer.length < 4) break;
      payloadLen = buffer.readUInt16BE(2);
      offset = 4;
      maskKey = buffer.slice(offset, offset + 4); offset += 4;
    } else if (len === 127) {
      if (buffer.length < 10) break;
      offset = 10;
      maskKey = buffer.slice(offset, offset + 4); offset += 4;
      // read 64-bit length (high 32 bits must be 0 for reasonable sizes)
      payloadLen = Number(buffer.readBigUInt64BE(2));
    } else {
      maskKey = buffer.slice(offset, offset + 4); offset += 4;
    }
    if (buffer.length < offset + payloadLen) break;
    const payload = Buffer.allocUnsafe(payloadLen);
    for (let i = 0; i < payloadLen; i++) payload[i] = buffer[offset + i] ^ maskKey[i % 4];
    buffer = buffer.slice(offset + payloadLen);
    if (opcode === 8) {
      wsSendClose(socket);
      destroySocket(socket);
      return Buffer.alloc(0);
    }
  }
  return buffer;
}

function wsSendClose(socket) {
  try {
    const header = Buffer.from([0x88, 0x00]);
    socket.write(header);
  } catch (e) { /* ignore */ }
}

function broadcast(message) {
  const text = JSON.stringify(message);
  for (const client of clients) wsSend(client, text);
}

function attachWs(socket, upgradeReq) {
  clients.add(socket);
  console.log(`[LCU Companion] Client WS connecté (${clients.size})`);
  broadcast({ type: 'LCU_STATUS', lcuDetected: Boolean(lockState), lcuPort: lockState ? lockState.port : null, ts: Date.now() });
  let buffer = Buffer.alloc(0);
  socket.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    buffer = parseWsFrames(socket, buffer);
  });
  socket.on('close', () => { clients.delete(socket); console.log(`[LCU Companion] Client WS déconnecté (${clients.size})`); });
  socket.on('error', () => { destroySocket(socket); });
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  const url = new URL(req.url, `http://${HOST}:${PORT}`);

  if (req.url === '/health') {
    setLockState(findLockfile());
    res.end(JSON.stringify({
      status: 'ok',
      lcuDetected: Boolean(lockState),
      lcuPort: lockState ? lockState.port : null,
      wsClients: clients.size
    }));
    return;
  }

  res.statusCode = 404;
  res.end(JSON.stringify({ error: 'Not found. Use /health or open a WebSocket on /lcu.' }));
});

server.on('upgrade', (req, socket, head) => {
  if (req.headers.upgrade?.toLowerCase() === 'websocket' && req.headers['sec-websocket-key']) {
    const key = req.headers['sec-websocket-key'];
    const accept = crypto.createHash('sha1').update(key + WS_MAGIC).digest('base64');
    const response = [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${accept}`,
      '',
      ''
    ].join('\r\n');
    socket.setTimeout(0);
    socket.write(response);
    if (head && head.length > 0) socket.unshift(head);
    attachWs(socket, req);
  } else {
    socket.destroy();
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[LCU Companion] HTTP+WS sur http://${HOST}:${PORT}/health et WebSocket`);
  setInterval(() => setLockState(findLockfile()), 3000);
  setLockState(findLockfile());
});
