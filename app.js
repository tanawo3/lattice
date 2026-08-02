import { makeReader, write, connectWallet, activeAccount, short, fmtErr }
  from "./shared/genlayer-lite.js";
import { mountReviewDesk } from "./shared/review-desk.js";

const CONTRACT = "0xda1623CB747eb4CC9c33B17D4A40DA12948BAb13";
const { read } = makeReader(CONTRACT);
const NOPARENT = 2 ** 31 - 1;
const ST = { label: ["Unverified", "Supported", "Refuted"], key: ["unverified", "supported", "refuted"], hex: ["#3fc6ff", "#36d399", "#ff6b6b"] };
const $ = (id) => document.getElementById(id);

queueMicrotask(() => mountReviewDesk({
  contract: CONTRACT, read, write, ensureWallet, fmtErr,
  entity: "Knowledge node", idLabel: "Node ID", countMethod: "get_node_count", recordMethod: "get_knowledge_node",
  openWindowMethod: "open_challenge_window", submitChallengeMethod: "submit_challenge", resolveChallengeMethod: "resolve_challenge_with_genlayer",
  submitAppealMethod: "submit_appeal", resolveAppealMethod: "resolve_appeal_with_genlayer", finalMethod: "finalize_node", archiveMethod: "archive_node",
  variant: "rail", kicker: "Contradiction control", title: "Lattice evidence junction",
  intro: "Inspect one node in the knowledge graph, introduce contradictory evidence, resolve its effect on confidence, and finalize the surviving claim.",
  finalLabel: "Finalize node", archiveLabel: "Archive node",
}));
const esc = (s) => (s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch (_) { return u; } };
const clip = (s, n) => (s.length > n ? s.slice(0, n - 1) + "..." : s);

let account = null, raw = [], stats = null;
let nodes = [], edges = [], sel = null, citeParent = NOPARENT;
const view = { x: 0, y: 0, zoom: 1 };
let canvas, ctx, W = 0, H = 0;
const drag = { node: null, panning: false, lastX: 0, lastY: 0, moved: false };
const mouse = { x: 0, y: 0 };
window.__lat = { ready: false, frames: 0, nodes: 0, edges: 0 };

function toast(msg, kind = "", title = "lattice") {
  const el = document.createElement("div"); el.className = "toast " + kind;
  el.innerHTML = `<span class="tt">${title}</span>`; el.appendChild(document.createTextNode(msg));
  $("log").appendChild(el); setTimeout(() => el.remove(), kind === "err" ? 15000 : 5000);
}

async function load() {
  stats = await read("get_stats");
  const n = Number(await read("get_node_count"));
  const out = await Promise.all(Array.from({ length: n }, (_, i) => read("get_node", [i]).then((record) => ({ id: i, ...record }))));
  raw = out;
  buildGraph();
  renderHud();
}

function buildGraph() {
  const prev = {}; nodes.forEach((n) => prev[n.id] = n);
  nodes = raw.map((d, i) => {
    const p = prev[d.id];
    const ang = (i / Math.max(raw.length, 1)) * Math.PI * 2;
    return { id: d.id, status: d.status, lifecycleStatus: d.lifecycleStatus || "DRAFT", evidenceCount: Number(d.evidenceCount || 0), contradictionCount: Number(d.contradictionCount || 0), statement: d.statement, source_url: d.source_url, parent: d.parent, author: d.author, rationale: d.rationale,
      x: p ? p.x : Math.cos(ang) * 180 + (Math.random() - .5) * 40, y: p ? p.y : Math.sin(ang) * 180 + (Math.random() - .5) * 40, vx: 0, vy: 0, r: 22 };
  });
  const byId = {}; nodes.forEach((n) => byId[n.id] = n);
  edges = [];
  nodes.forEach((n) => { if (n.parent !== NOPARENT && byId[n.parent]) edges.push({ a: byId[n.parent], b: n }); });
  window.__lat.nodes = nodes.length; window.__lat.edges = edges.length;
  $("graphEmpty").hidden = nodes.length !== 0;
}

/* ---- simulation ---- */
function tick() {
  const REP = 9000, SPRING = 0.012, REST = 150, CENTER = 0.004, DAMP = 0.85;
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i];
    for (let j = i + 1; j < nodes.length; j++) {
      const b = nodes[j];
      let dx = a.x - b.x, dy = a.y - b.y; let d2 = dx * dx + dy * dy; if (d2 < 1) d2 = 1;
      const d = Math.sqrt(d2); const f = REP / d2; const fx = (dx / d) * f, fy = (dy / d) * f;
      a.vx += fx; a.vy += fy; b.vx -= fx; b.vy -= fy;
    }
  }
  edges.forEach((e) => {
    let dx = e.b.x - e.a.x, dy = e.b.y - e.a.y; const d = Math.sqrt(dx * dx + dy * dy) || 1;
    const f = (d - REST) * SPRING; const fx = (dx / d) * f, fy = (dy / d) * f;
    e.a.vx += fx; e.a.vy += fy; e.b.vx -= fx; e.b.vy -= fy;
  });
  nodes.forEach((n) => {
    n.vx += -n.x * CENTER; n.vy += -n.y * CENTER;
    if (drag.node === n) return;
    n.vx *= DAMP; n.vy *= DAMP; n.x += n.vx; n.y += n.vy;
  });
}

function toScreen(wx, wy) { return [(wx - view.x) * view.zoom + W / 2, (wy - view.y) * view.zoom + H / 2]; }
function toWorld(sx, sy) { return [(sx - W / 2) / view.zoom + view.x, (sy - H / 2) / view.zoom + view.y]; }

function rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; }

function render() {
  ctx.clearRect(0, 0, W, H);
  // edges
  edges.forEach((e) => {
    const [ax, ay] = toScreen(e.a.x, e.a.y), [bx, by] = toScreen(e.b.x, e.b.y);
    const col = ST.hex[e.b.status];
    const grad = ctx.createLinearGradient(ax, ay, bx, by);
    grad.addColorStop(0, rgba(ST.hex[e.a.status], 0.5)); grad.addColorStop(1, rgba(col, 0.5));
    ctx.strokeStyle = grad; ctx.lineWidth = 1.5 * view.zoom; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
  });
  // nodes
  const t = performance.now() * 0.001;
  nodes.forEach((n) => {
    const [sx, sy] = toScreen(n.x, n.y); const r = n.r * view.zoom; const col = ST.hex[n.status];
    const pulse = n.status === 0 ? 0.5 + Math.sin(t * 2 + n.id) * 0.3 : 0.7;
    const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 2.6);
    glow.addColorStop(0, rgba(col, 0.45 * pulse)); glow.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(sx, sy, r * 2.6, 0, 7); ctx.fill();
    ctx.fillStyle = sel === n.id ? "#fff" : col; ctx.beginPath(); ctx.arc(sx, sy, r, 0, 7); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = rgba(col, 0.9); ctx.stroke();
    ctx.fillStyle = "#04121f"; ctx.font = `700 ${12 * view.zoom}px Syne, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("#" + n.id, sx, sy);
    if (view.zoom > 0.55) {
      ctx.fillStyle = rgba("#e9eefb", 0.82); ctx.font = `500 ${11.5 * view.zoom}px Inter, sans-serif`;
      ctx.fillText(clip(n.statement, 26), sx, sy + r + 14 * view.zoom);
    }
  });
  window.__lat.frames++;
}

function loop() { requestAnimationFrame(loop); tick(); render(); }

/* ---- interaction ---- */
function nodeAt(sx, sy) {
  const [wx, wy] = toWorld(sx, sy);
  for (let i = nodes.length - 1; i >= 0; i--) { const n = nodes[i]; const dx = n.x - wx, dy = n.y - wy; if (dx * dx + dy * dy <= (n.r + 6) ** 2) return n; }
  return null;
}
function bindCanvas() {
  canvas.addEventListener("mousedown", (e) => {
    const n = nodeAt(e.clientX, e.clientY); drag.moved = false; drag.lastX = e.clientX; drag.lastY = e.clientY;
    if (n) { drag.node = n; } else { drag.panning = true; canvas.classList.add("grabbing"); }
  });
  addEventListener("mousemove", (e) => {
    mouse.x = e.clientX; mouse.y = e.clientY;
    if (drag.node) { const [wx, wy] = toWorld(e.clientX, e.clientY); drag.node.x = wx; drag.node.y = wy; drag.node.vx = drag.node.vy = 0; drag.moved = true; }
    else if (drag.panning) { view.x -= (e.clientX - drag.lastX) / view.zoom; view.y -= (e.clientY - drag.lastY) / view.zoom; drag.lastX = e.clientX; drag.lastY = e.clientY; drag.moved = true; }
  });
  addEventListener("mouseup", (e) => {
    if (drag.node && !drag.moved) openPanel(drag.node.id);
    else if (!drag.node && !drag.moved && !drag.panning) {}
    drag.node = null; drag.panning = false; canvas.classList.remove("grabbing");
  });
  canvas.addEventListener("wheel", (e) => {
    e.preventDefault(); const factor = e.deltaY < 0 ? 1.1 : 0.9;
    const [wx, wy] = toWorld(e.clientX, e.clientY);
    view.zoom = Math.max(0.3, Math.min(2.4, view.zoom * factor));
    const [nx, ny] = toScreen(wx, wy); view.x += (e.clientX - nx) / view.zoom; view.y += (e.clientY - ny) / view.zoom;
  }, { passive: false });
}

/* ---- panel ---- */
function openPanel(id) {
  const n = nodes.find((x) => x.id === id); if (!n) return; sel = id;
  const k = ST.key[n.status];
  let reason = "";
  if (n.status !== 0) reason = `<div class="p-reason">${esc(n.rationale || "The validators reached this verdict from the source.")}</div>`;
  const par = n.parent === NOPARENT ? "root" : "cites #" + n.parent;
  $("panelBody").innerHTML = `
    <div class="p-id">NODE #${n.id}</div>
    <span class="p-status ps-${k}"><i class="dot ${k}"></i> ${ST.label[n.status]}</span>
    <div class="p-stmt">${esc(n.statement)}</div>
    ${reason}
    <div class="p-meta">
      <div class="p-kv"><span class="k">Cites</span><span class="v">${par}</span></div>
      <div class="p-kv"><span class="k">Lifecycle</span><span class="v">${esc(n.lifecycleStatus)}</span></div>
      <div class="p-kv"><span class="k">Evidence</span><span class="v">${n.evidenceCount} sources</span></div>
      <div class="p-kv"><span class="k">Contradictions</span><span class="v">${n.contradictionCount}</span></div>
      <div class="p-kv"><span class="k">Source</span><span class="v"><a href="${esc(n.source_url)}" target="_blank" rel="noopener">${esc(hostOf(n.source_url))} ↗</a></span></div>
      <div class="p-kv"><span class="k">Author</span><span class="v">${short(n.author)}</span></div>
    </div>
    <div class="p-actions">
      ${["DRAFT", "OPEN", "UNDER_SYNTHESIS"].includes(n.lifecycleStatus) ? `<button class="hbtn accent" id="verifyBtn"><i class="ph-bold ph-shield-check"></i> Synthesize graph evidence</button>` : ""}
      <button class="hbtn ghost" id="evidenceBtn"><i class="ph-bold ph-link-simple"></i> Add evidence</button>
      <button class="hbtn ghost" id="contradictionBtn"><i class="ph-bold ph-warning-diamond"></i> Report contradiction</button>
      <button class="hbtn ghost" id="citeBtn"><i class="ph-bold ph-arrow-bend-down-right"></i> Cite this node</button>
    </div>`;
  $("panel").setAttribute("aria-hidden", "false");
  if ($("verifyBtn")) $("verifyBtn").onclick = () => doVerify(n.id);
  $("evidenceBtn").onclick = () => doAddEvidence(n.id);
  $("contradictionBtn").onclick = () => doContradiction(n.id);
  $("citeBtn").onclick = () => { citeParent = n.id; $("citeTag").textContent = "#" + n.id; openDock(); };
}
$("panelX").onclick = () => { $("panel").setAttribute("aria-hidden", "true"); sel = null; };

/* ---- dock ---- */
function openDock() { $("dock").setAttribute("aria-hidden", "false"); $("aStmt").focus(); }
function closeDock() { $("dock").setAttribute("aria-hidden", "true"); }
$("addBtn").onclick = () => { citeParent = NOPARENT; $("citeTag").textContent = "none"; openDock(); };
$("emptyAddBtn").onclick = () => { citeParent = NOPARENT; $("citeTag").textContent = "none"; openDock(); };
$("dockClose").onclick = closeDock;

/* ---- actions ---- */
async function doVerify(id) {
  if (!confirm("Verify this node? Validators read the source and rule it supported or refuted. Calls a real LLM consensus.")) return;
  const btn = $("verifyBtn"); if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> validators reading...'; }
  try { await ensureWallet(); toast("Validators reading graph evidence and contradictions...", "", "verify"); await write(CONTRACT, "synthesize_with_genlayer", [String(id)]); toast("Synthesis recorded; challenge period opened.", "ok"); await load(); openPanel(id); }
  catch (e) { toast(fmtErr(e), "err"); if (btn) { btn.disabled = false; btn.textContent = "Verify with validators"; } }
}
async function doAdd() {
  const stmt = $("aStmt").value.trim(), url = $("aUrl").value.trim();
  if (!stmt) return toast("Write the statement.", "err");
  if (!url) return toast("Add a source URL.", "err");
  const btn = $("dockSubmit"); btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> adding';
  try {
    await ensureWallet();
    const nodeId = String(Number(await read("get_node_count")));
    await write(CONTRACT, "create_node", [stmt, url, "claim"]);
    if (citeParent !== NOPARENT) await write(CONTRACT, "connect_nodes", [String(citeParent), nodeId, "supports", "Source-backed citation edge"]);
    toast("Node added to the lattice.", "ok");
    $("aStmt").value = $("aUrl").value = ""; closeDock(); await load();
  } catch (e) { toast(fmtErr(e), "err"); btn.disabled = false; btn.innerHTML = "Add node"; }
}
$("dockSubmit").onclick = doAdd;

async function doAddEvidence(id) {
  const url = prompt("Public evidence URL"); if (!url) return;
  const note = prompt("What does this source contribute?") || "Additional public evidence";
  try { await ensureWallet(); await write(CONTRACT, "add_evidence", [String(id), url, "supporting", note]); toast("Evidence added to the node.", "ok"); await load(); openPanel(id); }
  catch (e) { toast(fmtErr(e), "err"); }
}

async function doContradiction(id) {
  const claim = prompt("Describe the contradiction"); if (!claim) return;
  const url = prompt("Public evidence URL for the contradiction"); if (!url) return;
  try { await ensureWallet(); await write(CONTRACT, "add_contradiction_report", [String(id), claim, url]); toast("Contradiction attached to the graph.", "ok"); await load(); openPanel(id); }
  catch (e) { toast(fmtErr(e), "err"); }
}

/* ---- wallet ---- */
async function refreshWallet() {
  account = await activeAccount();
  const slot = $("walletslot");
  if (account) slot.innerHTML = `<span class="hbtn" style="cursor:default"><i class="ph-fill ph-circle" style="color:var(--green);font-size:8px"></i> ${short(account)}</span>`;
  else { slot.innerHTML = `<button class="hbtn" id="connectBtn"><i class="ph-bold ph-wallet"></i> Connect</button>`; $("connectBtn").onclick = doConnect; }
}
async function doConnect() { try { account = await connectWallet(); toast("Connected on studionet.", "ok"); await refreshWallet(); } catch (e) { toast(fmtErr(e), "err"); } }
async function ensureWallet() { if (!account) account = await connectWallet(); await refreshWallet(); }

function renderHud() {
  if (!stats) return;
  $("hudStats").innerHTML = `<span><b>${stats.total}</b> nodes</span>
    <span class="d-green"><b>${stats.supported}</b> supported</span>
    <span class="d-red"><b>${stats.refuted}</b> refuted</span>
    <span class="d-cyan"><b>${stats.unverified}</b> unverified</span>`;
}

function resize() { W = innerWidth; H = innerHeight; const dpr = Math.min(devicePixelRatio, 2); canvas.width = W * dpr; canvas.height = H * dpr; canvas.style.width = W + "px"; canvas.style.height = H + "px"; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }

const _cb = $("connectBtn"); if (_cb) _cb.onclick = doConnect;
if (window.ethereum) window.ethereum.on?.("accountsChanged", refreshWallet);

(async () => {
  canvas = $("graph"); ctx = canvas.getContext("2d"); resize(); addEventListener("resize", resize); bindCanvas();
  await refreshWallet();
  try { await load(); } catch (e) { toast("Could not reach the chain. " + fmtErr(e), "err"); }
  loop();
  window.__lat.ready = true;
})();
