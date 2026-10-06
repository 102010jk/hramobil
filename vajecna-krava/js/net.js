// Multiplayer přes WebRTC (PeerJS). Funguje i na GitHub Pages – žádný vlastní server.
// Hostitel lobby drží celý zápas (včetně botů), ostatní se k němu připojí kódem
// nebo ze seznamu veřejných lobby. Spojení zprostředkuje veřejný server PeerJS.
import { netMessage, netDisconnected, exportRoster, mySkins, myAgents, MATCH } from './match.js';

const VER = 1;
const PREFIX = 'vajecnakrava-v1-';
const PUB_SLOTS = 10;
const MAX_PLAYERS = 10;
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const PEER_OPTS = {
  debug: 0,
  config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }, { urls: 'stun:global.stun.twilio.com:3478' }] },
};

// Vlastní PeerJS server (např. pro testy nebo LAN): ?peer=host:port
const custom = new URLSearchParams(location.search).get('peer');
if (custom) {
  const [host, port] = custom.split(':');
  Object.assign(PEER_OPTS, { host, port: Number(port) || 9000, path: '/', secure: location.protocol === 'https:' && !/^(localhost|127\.|192\.|10\.)/.test(host) });
}

export const Lobby = {
  state: 'idle', // idle | connecting | hosting | joined | ingame
  isHost: false,
  code: '',
  isPublic: false,
  players: [], // [{peer|null, name, team, agents, skins, host}]
  cfg: { map: 'kravin', mode: 'comp', difficulty: 'normal', teamSize: 5 },
  name: '',
  error: '',
  onChange: () => {},
  onStart: null, // (cfg, netSetup) => void
  onLost: () => {},
};

let peer = null;
const conns = new Map(); // host: peer id -> DataConnection
let hostConn = null;

function Peer() {
  if (!window.Peer) throw new Error('Knihovna PeerJS se nenačetla (chybí internet?)');
  return window.Peer;
}

function changed() {
  Lobby.onChange();
}

function randomCode() {
  let c = '';
  for (let i = 0; i < 5; i++) c += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return c;
}

function codeToId(code) {
  code = code.trim().toUpperCase();
  if (/^P\d+$/.test(code)) return PREFIX + 'pub-' + code.slice(1);
  return PREFIX + code;
}

function openPeer(id) {
  return new Promise((resolve, reject) => {
    const P = Peer();
    const p = id ? new P(id, PEER_OPTS) : new P(PEER_OPTS);
    const t = setTimeout(() => reject(new Error('Server pro připojení neodpovídá.')), 12000);
    p.on('open', () => {
      clearTimeout(t);
      resolve(p);
    });
    p.on('error', (e) => {
      clearTimeout(t);
      reject(e);
    });
  });
}

/* ================= hostitel ================= */

export async function hostLobby({ name, isPublic, cfg }) {
  leave();
  Lobby.state = 'connecting';
  Lobby.error = '';
  Lobby.name = name;
  Lobby.cfg = { ...cfg };
  changed();
  try {
    if (isPublic) {
      for (let i = 0; i < PUB_SLOTS && !peer; i++) {
        try {
          peer = await openPeer(PREFIX + 'pub-' + i);
          Lobby.code = 'P' + i;
        } catch (e) {
          if (e.type !== 'unavailable-id') throw e;
        }
      }
      if (!peer) throw new Error('Všechna veřejná lobby jsou obsazená, zkus soukromé.');
    } else {
      for (let tries = 0; tries < 5 && !peer; tries++) {
        const code = randomCode();
        try {
          peer = await openPeer(PREFIX + code);
          Lobby.code = code;
        } catch (e) {
          if (e.type !== 'unavailable-id') throw e;
        }
      }
    }
  } catch (e) {
    Lobby.state = 'idle';
    Lobby.error = errText(e);
    changed();
    return;
  }
  Lobby.isHost = true;
  Lobby.isPublic = isPublic;
  Lobby.state = 'hosting';
  Lobby.players = [{ peer: null, name, team: 'CT', agents: myAgents(), skins: mySkins(), host: true }];
  peer.on('connection', onHostConnection);
  peer.on('disconnected', () => peer && !peer.destroyed && peer.reconnect());
  peer.on('error', (e) => console.warn('peer', e.type));
  changed();
}

function onHostConnection(conn) {
  if (conn.metadata?.probe) {
    conn.on('open', () => {
      conn.send({ t: 'info', name: Lobby.players[0]?.name, map: Lobby.cfg.map, mode: Lobby.cfg.mode, n: Lobby.players.length, max: MAX_PLAYERS, ingame: Lobby.state === 'ingame', ver: VER });
      setTimeout(() => conn.close(), 800);
    });
    return;
  }
  conn.on('data', (m) => onHostData(conn, m));
  conn.on('close', () => {
    conns.delete(conn.peer);
    const i = Lobby.players.findIndex((p) => p.peer === conn.peer);
    if (i >= 0) Lobby.players.splice(i, 1);
    if (Lobby.state === 'ingame') netDisconnected(conn.peer);
    broadcastLobby();
    changed();
  });
  conn.on('error', () => {});
}

function onHostData(conn, m) {
  if (!m || typeof m !== 'object') return;
  if (m.t === 'hello') {
    if (m.ver !== VER) {
      conn.send({ t: 'kick', reason: 'Máte různé verze hry – obnovte stránku.' });
      return setTimeout(() => conn.close(), 500);
    }
    if (Lobby.state === 'ingame') {
      conn.send({ t: 'kick', reason: 'Zápas už běží, počkej na další.' });
      return setTimeout(() => conn.close(), 500);
    }
    if (Lobby.players.length >= MAX_PLAYERS) {
      conn.send({ t: 'kick', reason: 'Lobby je plné.' });
      return setTimeout(() => conn.close(), 500);
    }
    conns.set(conn.peer, conn);
    const ct = Lobby.players.filter((p) => p.team === 'CT').length;
    const t = Lobby.players.length - ct;
    Lobby.players.push({ peer: conn.peer, name: String(m.name || 'Hráč').slice(0, 16), team: ct > t ? 'T' : 'CT', agents: m.agents, skins: m.skins || {} });
    broadcastLobby();
    changed();
    return;
  }
  if (m.t === 'team') {
    const p = Lobby.players.find((x) => x.peer === conn.peer);
    if (p && (m.team === 'T' || m.team === 'CT')) p.team = m.team;
    broadcastLobby();
    changed();
    return;
  }
  if (Lobby.state === 'ingame') netMessage(conn.peer, m);
}

function broadcastLobby() {
  if (!Lobby.isHost) return;
  const msg = { t: 'lobby', code: Lobby.code, cfg: Lobby.cfg, players: Lobby.players.map((p) => ({ name: p.name, team: p.team, host: !!p.host })) };
  for (const c of conns.values()) if (c.open) c.send(msg);
}

export function setHostCfg(cfg) {
  Lobby.cfg = { ...Lobby.cfg, ...cfg };
  broadcastLobby();
  changed();
}

export function startHostGame() {
  if (!Lobby.isHost || Lobby.state !== 'hosting') return;
  Lobby.state = 'ingame';
  const net = {
    role: 'host',
    broadcast(msg) {
      for (const c of conns.values()) if (c.open) c.send(msg);
    },
  };
  Lobby.onStart({ ...Lobby.cfg }, { role: 'host', players: Lobby.players.map((p) => ({ ...p })), net });
  const roster = exportRoster();
  for (const [id, c] of conns) {
    const you = roster.findIndex((r) => r.peer === id);
    if (you >= 0 && c.open) c.send({ t: 'start', cfg: Lobby.cfg, roster, you });
  }
  changed();
}

/** Po skončení zápasu zpět do lobby. */
export function backToLobby() {
  if (Lobby.state !== 'ingame') return;
  Lobby.state = Lobby.isHost ? 'hosting' : 'joined';
  if (Lobby.isHost) broadcastLobby();
  changed();
}

/* ================= klient ================= */

export async function joinLobby(code, name) {
  leave();
  Lobby.state = 'connecting';
  Lobby.error = '';
  Lobby.name = name;
  changed();
  try {
    peer = await openPeer(null);
    peer.on('error', (e) => {
      if (Lobby.state === 'connecting') {
        Lobby.error = e.type === 'peer-unavailable' ? 'Lobby s tímhle kódem neexistuje.' : errText(e);
        Lobby.state = 'idle';
        changed();
      }
    });
    const conn = peer.connect(codeToId(code), { reliable: true, serialization: 'json' });
    hostConn = conn;
    const opened = await new Promise((resolve) => {
      const t = setTimeout(() => resolve(false), 15000);
      conn.on('open', () => {
        clearTimeout(t);
        resolve(true);
      });
      conn.on('error', () => resolve(false));
    });
    if (!opened) throw new Error(Lobby.error || 'Nepodařilo se připojit (hostitel je offline nebo síť blokuje spojení).');
    conn.on('data', onClientData);
    conn.on('close', () => {
      const was = Lobby.state;
      hostConn = null;
      leave();
      if (was !== 'idle') Lobby.onLost(was === 'ingame' ? 'Hostitel ukončil hru.' : 'Spojení s lobby skončilo.');
    });
    conn.send({ t: 'hello', ver: VER, name, agents: myAgents(), skins: mySkins() });
    Lobby.isHost = false;
    Lobby.code = code.trim().toUpperCase();
    Lobby.state = 'joined';
    changed();
  } catch (e) {
    leave();
    Lobby.error = errText(e);
    changed();
  }
}

function onClientData(m) {
  if (!m || typeof m !== 'object') return;
  if (m.t === 'lobby') {
    Lobby.cfg = m.cfg;
    Lobby.players = m.players;
    Lobby.code = m.code;
    changed();
  } else if (m.t === 'kick') {
    Lobby.error = m.reason;
    leave();
    changed();
  } else if (m.t === 'start') {
    Lobby.state = 'ingame';
    const net = {
      role: 'client',
      send(msg) {
        if (hostConn?.open) hostConn.send(msg);
      },
    };
    Lobby.cfg = m.cfg;
    Lobby.onStart({ ...m.cfg }, { role: 'client', roster: m.roster, you: m.you, net });
    changed();
  } else if (Lobby.state === 'ingame') netMessage(null, m);
}

export function setMyTeam(team) {
  if (Lobby.isHost) {
    Lobby.players[0].team = team;
    broadcastLobby();
    changed();
  } else if (hostConn?.open) hostConn.send({ t: 'team', team });
}

/* ================= seznam veřejných lobby ================= */

export async function listPublic() {
  let p;
  try {
    p = await openPeer(null);
  } catch (e) {
    return { error: errText(e), list: [] };
  }
  p.on('error', () => {});
  const list = [];
  await Promise.all(
    Array.from({ length: PUB_SLOTS }, (_, i) =>
      new Promise((resolve) => {
        const c = p.connect(PREFIX + 'pub-' + i, { metadata: { probe: 1 }, serialization: 'json' });
        const t = setTimeout(resolve, 4000);
        c.on('data', (m) => {
          if (m?.t === 'info') list.push({ code: 'P' + i, ...m });
          clearTimeout(t);
          resolve();
        });
        c.on('error', resolve);
      })
    )
  );
  p.destroy();
  return { list: list.sort((a, b) => a.code.localeCompare(b.code)) };
}

/* ================= společné ================= */

export function leave() {
  for (const c of conns.values()) c.close();
  conns.clear();
  if (hostConn) {
    const c = hostConn;
    hostConn = null;
    c.close();
  }
  if (peer && !peer.destroyed) peer.destroy();
  peer = null;
  Lobby.state = 'idle';
  Lobby.isHost = false;
  Lobby.players = [];
  Lobby.code = '';
  changed();
}

function errText(e) {
  const t = e?.type;
  if (t === 'peer-unavailable') return 'Lobby s tímhle kódem neexistuje.';
  if (t === 'network' || t === 'server-error' || t === 'socket-error') return 'Nejde se spojit se serverem pro připojení. Jsi online?';
  if (t === 'browser-incompatible') return 'Tenhle prohlížeč nepodporuje WebRTC.';
  return e?.message || String(e);
}

export function inviteLink() {
  const u = new URL(location.href);
  u.hash = 'join=' + Lobby.code;
  return u.toString();
}

window.addEventListener('beforeunload', () => {
  if (peer && !peer.destroyed) peer.destroy();
});

export { MATCH };
