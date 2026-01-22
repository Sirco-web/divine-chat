(() => {
  const socket = io();

  // UI elements
  const btnCreate = document.getElementById('btnCreate');
  const btnJoin = document.getElementById('btnJoin');
  const btnGlobal = document.getElementById('btnGlobal');
  const btnSettings = document.getElementById('btnSettings');
  const modal = document.getElementById('modal');
  const createForm = document.getElementById('createForm');
  const joinForm = document.getElementById('joinForm');
  const settingsForm = document.getElementById('settingsForm');
  const modalClose = document.getElementById('modalClose');
  const createSubmit = document.getElementById('createSubmit');
  const joinSubmit = document.getElementById('joinSubmit');
  const createCancel = document.getElementById('createCancel');
  const joinCancel = document.getElementById('joinCancel');
  const settingsClose = document.getElementById('settingsClose');
  const pane = document.getElementById('pane');
  const hero = document.getElementById('hero');
  const chatTitle = document.getElementById('chatTitle');
  const userListEl = document.getElementById('userList');
  const messagesEl = document.getElementById('messages');
  const msgForm = document.getElementById('msgForm');
  const msgInput = document.getElementById('msgInput');
  const btnClear = document.getElementById('btnClear');
  const btnLeave = document.getElementById('btnLeave');
  const toast = document.getElementById('toast');

  const safeIndicator = document.getElementById('safeIndicator');
  const typingEl = document.getElementById('typing');

  const openStickersBtn = document.getElementById('open-stickers');
  const stickerPanel = document.getElementById('stickerPanel');
  const stickersGrid = document.getElementById('stickers');
  const closeStickersBtn = document.getElementById('close-stickers');

  // Theme options (two groups, still uses .theme-option)
  const themeOptions = document.querySelectorAll('.theme-option');
  const toggleShortcut = document.getElementById('toggleShortcut');

  let currentRoom = null;
  let myUsername = null;
  let ownerId = null;
  let ownerName = null;

  // Typing state
  let typingTimeout = null;
  const typingUsers = new Map(); // socketId -> username

  // Settings persisted
  const SETTINGS_KEY = 'divine_chat_settings_v4';
  const defaultSettings = { themeClass: '', theme: 'dark', shortcutEnabled: true, starsEnabled: true, reducedMotion: false };
  let settings = loadSettings();

  // ---- Animated starfield (CSS + light JS) ----
  let starsRoot = null;
  function ensureStarsLayer() {
    if (starsRoot) return starsRoot;
    starsRoot = document.getElementById('stars');
    if (starsRoot) return starsRoot;
    const div = document.createElement('div');
    div.id = 'stars';
    div.className = 'stars';
    document.body.prepend(div);
    starsRoot = div;
    return starsRoot;
  }

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function buildStars() {
    const root = ensureStarsLayer();
    root.innerHTML = '';
    if (!settings.starsEnabled || settings.reducedMotion) return;

    const w = Math.max(320, window.innerWidth || 800);
    const h = Math.max(320, window.innerHeight || 600);
    const count = Math.min(220, Math.max(90, Math.floor((w * h) / 12000)));

    const seed = (Date.now() ^ (w << 16) ^ h) >>> 0;
    const rnd = mulberry32(seed);

    for (let i = 0; i < count; i++) {
      const s = document.createElement('span');
      s.className = 'star';

      const x = Math.floor(rnd() * 10000) / 100;
      const y = Math.floor(rnd() * 10000) / 100;
      const z = rnd();
      const size = z < 0.18 ? 1 : z < 0.65 ? 2 : 3;
      const opacity = 0.35 + rnd() * 0.55;
      const tw = 1.4 + rnd() * 3.2;
      const drift = 24 + Math.floor(rnd() * 90);

      s.style.left = `${x}%`;
      s.style.top = `${y}%`;
      s.style.opacity = `${opacity}`;
      s.style.width = `${size}px`;
      s.style.height = `${size}px`;
      s.style.setProperty('--tw', `${tw}s`);
      s.style.setProperty('--drift', `${drift}s`);
      s.style.setProperty('--depth', `${0.2 + z * 1.2}`);
      s.style.setProperty('--delay', `${(-rnd() * 6).toFixed(2)}s`);

      root.appendChild(s);
    }
  }

  function setReducedMotionFromMedia() {
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (mq && mq.matches) settings.reducedMotion = true;
    } catch {}
  }
  setReducedMotionFromMedia();

  function loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return { ...defaultSettings };
      return { ...defaultSettings, ...JSON.parse(raw) };
    } catch {
      return { ...defaultSettings };
    }
  }
  function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  function applySettingsToUI() {
    // Remove theme classes
    document.body.classList.remove(
      'theme-forest','theme-amethyst','theme-ocean','theme-kawaii','theme-space','theme-golden',
      'theme-sky','theme-strawberry','theme-mint','theme-lemon'
    );

    if (settings.themeClass) document.body.classList.add(settings.themeClass);

    // Light vs Dark base
    if (settings.theme === 'light') document.body.classList.add('light-mode');
    else document.body.classList.remove('light-mode');

    toggleShortcut.checked = !!settings.shortcutEnabled;

    // mark active theme
    themeOptions.forEach(opt => {
      const cls = opt.getAttribute('data-theme-class') || '';
      const themeKey = opt.getAttribute('data-theme') || '';
      if (settings.themeClass === cls || settings.theme === themeKey) opt.classList.add('active');
      else opt.classList.remove('active');
    });

    // Motion class
    document.body.classList.toggle('reduced-motion', !!settings.reducedMotion);

    // Stars
    document.body.classList.toggle('stars-on', !!settings.starsEnabled && !settings.reducedMotion);

    buildStars();
  }

  applySettingsToUI();

  window.addEventListener('resize', () => {
    if (settings.reducedMotion) return;
    if (window.__starsResizeT) clearTimeout(window.__starsResizeT);
    window.__starsResizeT = setTimeout(() => buildStars(), 200);
  });

  function showToast(msg, duration = 2500, type = 'info') {
    toast.textContent = msg;
    toast.classList.remove('hidden');
    toast.classList.toggle('error', type === 'error');
    setTimeout(() => {
      toast.classList.add('hidden');
      toast.classList.remove('error');
    }, duration);
  }

  function showModal(which) {
    modal.classList.remove('hidden');
    createForm.classList.add('hidden');
    joinForm.classList.add('hidden');
    settingsForm.classList.add('hidden');
    if (which === 'create') createForm.classList.remove('hidden');
    if (which === 'join') joinForm.classList.remove('hidden');
    if (which === 'settings') settingsForm.classList.remove('hidden');
    const first = modal.querySelector('.form:not(.hidden) input');
    first && first.focus();
  }
  function closeModal() { modal.classList.add('hidden'); }

  btnCreate.addEventListener('click', () => showModal('create'));
  btnJoin.addEventListener('click', () => showModal('join'));

  // Settings button: same color as other buttons (remove outline style on index.html too)
  btnSettings.addEventListener('click', () => {
    settings = loadSettings();
    applySettingsToUI();
    showModal('settings');
  });

  btnGlobal.addEventListener('click', () => {
    const name = prompt('Enter a username for Global Chat:', 'Guest');
    if (!name) return;
    socket.emit('joinGlobal', { username: name }, (res) => {
      if (!res || !res.ok) return showToast(res && res.message ? res.message : 'Failed to join global', 3000, 'error');
      enterRoom(res.room, name, res.messages || [], res.users || [], res.ownerId, res.ownerUsername);
    });
  });

  modalClose.addEventListener('click', closeModal);
  createCancel.addEventListener('click', closeModal);
  joinCancel.addEventListener('click', closeModal);

  settingsClose.addEventListener('click', () => {
    settings.shortcutEnabled = !!toggleShortcut.checked;
    saveSettings();
    applySettingsToUI();
    closeModal();
  });

  // Theme options
  themeOptions.forEach(btn => {
    btn.addEventListener('click', () => {
      const cls = btn.getAttribute('data-theme-class') || '';
      const theme = btn.getAttribute('data-theme') || '';

      settings.themeClass = cls;

      // Determine light/dark base for new themes
      const lightThemes = new Set(['light','kawaii','sky','strawberry','mint','lemon']);
      if (lightThemes.has(theme)) settings.theme = 'light';
      else settings.theme = 'dark';

      // enable stars for space by default (nice), keep for others
      if (cls === 'theme-space') settings.starsEnabled = true;

      saveSettings();
      applySettingsToUI();
      showToast(`Theme: ${btn.title || theme || 'Custom'}`, 1200);
    });
  });

  // Create inputs
  const createUsername = document.getElementById('createUsername');
  const createCode = document.getElementById('createCode');
  const createPassword = document.getElementById('createPassword');
  const createMax = document.getElementById('createMax');
  const createSafe = document.getElementById('createSafe');

  // Join inputs
  const joinUsername = document.getElementById('joinUsername');
  const joinCode = document.getElementById('joinCode');
  const joinPassword = document.getElementById('joinPassword');

  createSubmit.addEventListener('click', () => {
    const username = createUsername.value.trim();
    const code = createCode.value.trim();
    const password = createPassword.value;
    const max = createMax.value;
    const safe = createSafe.checked;
    if (!username || !code) return showToast('Username and Code required', 2500, 'error');
    socket.emit('createRoom', { username, code, password, maxUsers: max, safe }, (res) => {
      if (!res || !res.ok) return showToast(res && res.message ? res.message : 'Failed to create', 3000, 'error');
      enterRoom(res.room, username, res.messages || [], res.users || [], res.ownerId, res.ownerUsername);
      closeModal();
    });
  });

  joinSubmit.addEventListener('click', () => {
    const username = joinUsername.value.trim();
    const code = joinCode.value.trim();
    const password = joinPassword.value;
    if (!username || !code) return showToast('Username and Code required', 2500, 'error');
    socket.emit('joinRoom', { username, code, password }, (res) => {
      if (!res || !res.ok) return showToast(res && res.message ? res.message : 'Failed to join', 3000, 'error');
      enterRoom(res.room, username, res.messages || [], res.users || [], res.ownerId, res.ownerUsername);
      closeModal();
    });
  });

  function enterRoom(room, username, messages = [], users = [], owner, ownerUsernameParam) {
    currentRoom = room.code;
    myUsername = username;
    ownerId = owner || null;
    ownerName = ownerUsernameParam || null;

    hero.classList.add('hidden');
    pane.classList.remove('hidden');

    chatTitle.textContent = room.isGlobal ? 'Global Chat' : 'Private Chat';

    if (room.safe) {
      safeIndicator.textContent = 'Safe: ON';
      safeIndicator.title = 'Safe room — refresh will close the room and kick everyone';
    } else {
      safeIndicator.textContent = 'Safe: OFF';
      safeIndicator.title = 'Non-safe room — refresh will NOT kill the room';
    }

    updateUserList(users, ownerId, ownerUsernameParam);
    messagesEl.innerHTML = '';
    messages.forEach(m => appendMessage(m));

    if (room.isGlobal) {
      btnClear.disabled = true;
      btnClear.classList.add('muted');
    } else {
      btnClear.disabled = false;
      btnClear.classList.remove('muted');
    }

    pane.classList.add('pane-enter');
    setTimeout(() => pane.classList.remove('pane-enter'), 380);

    setTimeout(() => msgInput.focus(), 150);
    loadStickers();
  }

  function updateUserList(users, ownerIdParam, ownerUsernameParam) {
    ownerId = ownerIdParam || ownerId;
    ownerName = ownerUsernameParam || ownerName;
    userListEl.innerHTML = '';
    users.forEach(u => {
      const li = document.createElement('li');
      li.className = 'user-row';
      const left = document.createElement('div'); left.className = 'left';
      const avatar = document.createElement('div'); avatar.className = 'avatar';
      avatar.textContent = (u.username || 'U').slice(0,1).toUpperCase();
      const name = document.createElement('div'); name.textContent = u.username;
      left.appendChild(avatar); left.appendChild(name);
      li.appendChild(left);

      const right = document.createElement('div'); right.className = 'right';
      const badge = document.createElement('span'); badge.className = 'user-badge';
      if (u.socketId === ownerId) badge.textContent = 'Host';
      right.appendChild(badge);
      li.appendChild(right);
      userListEl.appendChild(li);

      li.style.animationDelay = `${Math.min(240, userListEl.children.length * 18)}ms`;
      li.classList.add('pop-in');
    });
  }

  socket.on('userList', (payload) => {
    const users = (payload && payload.users) ? payload.users : [];
    updateUserList(users, payload.ownerId, payload.ownerUsername);
    ownerName = payload.ownerUsername || ownerName;
  });

  socket.on('systemMessage', (m) => appendSystem(m.text || ''));
  socket.on('newMessage', (m) => appendMessage(m));

  socket.on('roomCleared', (payload) => {
    messagesEl.innerHTML = '';
    appendSystem(`Chat cleared by ${payload && payload.by ? payload.by : 'host'}`);
  });

  socket.on('kicked', (payload) => leaveRoom(true, payload && payload.reason));

  // Typing indicator events from server
  socket.on('typing', (payload) => {
    if (!payload || !payload.socketId) return;
    if (payload.typing) typingUsers.set(payload.socketId, payload.username);
    else typingUsers.delete(payload.socketId);
    renderTyping();
  });

  function renderTyping() {
    const names = Array.from(typingUsers.values()).filter(n => n && n !== myUsername);
    if (names.length === 0) {
      typingEl.classList.add('hidden');
      typingEl.textContent = '';
      return;
    }
    typingEl.classList.remove('hidden');
    typingEl.textContent = names.length === 1 ? `${names[0]} is typing...` : `${names.join(', ')} are typing...`;
  }

  // No bans: normal send
  msgForm.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const text = msgInput.value.trim();
    if (!text) return;
    socket.emit('sendMessage', { text }, (res) => {
      if (!res || !res.ok) showToast(res && res.message ? res.message : 'Failed to send', 3000, 'error');
      else {
        msgInput.value = '';
        sendTyping(false);
      }
    });
  });

  function sendSticker(filename) {
    if (!filename) return;
    socket.emit('sendMessage', { text: filename, type: 'sticker' }, (res) => {
      if (!res || !res.ok) showToast(res && res.message ? res.message : 'Failed to send sticker', 3000, 'error');
    });
  }

  function appendMessage(m) {
    const div = document.createElement('div');
    div.className = 'msg';
    div.setAttribute('data-mid', getMessageId(m));

    if (m.username === myUsername) div.classList.add('me');
    if (ownerName && m.username === ownerName) div.classList.add('host');

    const meta = document.createElement('div');
    meta.className = 'meta';

    const metaLeft = document.createElement('div');
    metaLeft.className = 'meta-left';
    const t = new Date(m.ts || Date.now());
    const who = document.createElement('span');
    who.className = 'meta-who';
    who.textContent = m.username || 'Anon';
    const when = document.createElement('span');
    when.className = 'meta-time';
    when.textContent = ` • ${t.toLocaleTimeString()}`;

    metaLeft.appendChild(who);
    metaLeft.appendChild(when);
    meta.appendChild(metaLeft);

    const body = document.createElement('div');
    body.className = 'body';

    if (m.type && m.type === 'sticker') {
      const img = document.createElement('img');
      img.src = `/assets/stickers/${encodeURIComponent(String(m.text || ''))}`;
      img.alt = 'sticker';
      img.className = 'sticker-img';
      body.appendChild(img);
    } else {
      try {
        const raw = marked.parse(m.text || '');
        const clean = DOMPurify.sanitize(raw);
        body.innerHTML = clean;
      } catch {
        body.innerHTML = escapeHtml(m.text || '');
      }
    }

    div.appendChild(meta);
    div.appendChild(body);

    div.classList.add('msg-enter');
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    setTimeout(() => div.classList.remove('msg-enter'), 420);
  }

  function appendSystem(text) {
    const div = document.createElement('div');
    div.className = 'msg system';
    div.textContent = text;
    div.classList.add('msg-enter');
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    setTimeout(() => div.classList.remove('msg-enter'), 420);
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/\n/g, '<br/>');
  }

  function sendTyping(isTyping) {
    socket.emit('typing', { typing: !!isTyping });
  }
  msgInput.addEventListener('input', () => {
    sendTyping(true);
    if (typingTimeout) clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      sendTyping(false);
      typingTimeout = null;
    }, 900);
  });

  btnClear.addEventListener('click', () => {
    if (!currentRoom || currentRoom === 'GLOBAL_CHAT_DIVINE') return showToast('Cannot clear global chat', 2500, 'error');
    socket.emit('clearRoom', {}, (res) => {
      if (!res || !res.ok) showToast(res && res.message ? res.message : 'Failed to clear', 3000, 'error');
    });
  });

  btnLeave.addEventListener('click', () => leaveRoom(false));

  function leaveRoom(kicked = false, reason = '') {
    socket.emit('leaveRoom');
    currentRoom = null;
    hero.classList.remove('hidden');
    pane.classList.add('hidden');
    messagesEl.innerHTML = '';
    userListEl.innerHTML = '';
    typingUsers.clear();
    renderTyping();
    closeStickers();
    if (kicked) showToast(reason || 'Kicked from room', 3000, 'error');
  }

  window.addEventListener('beforeunload', () => {
    try {
      if (currentRoom && currentRoom !== 'GLOBAL_CHAT_DIVINE') socket.emit('client-refresh');
    } catch {}
  });

  window.addEventListener('keydown', (e) => {
    if (!settings.shortcutEnabled) return;
    if (e.ctrlKey && e.altKey && (e.key === 'c' || e.key === 'C')) btnClear.click();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      closeStickers();
    }
  });

  function getMessageId(m) {
    return m.id || m._id || m.mid || (`m_${(m.ts || Date.now())}_${(m.username || 'u').replace(/\s+/g,'')}`);
  }

  // STICKERS
  const STICKER_MANIFEST = '/assets/stickers/index.json';

  async function loadStickers() {
    try {
      const res = await fetch(STICKER_MANIFEST, { cache: 'no-cache' });
      if (!res.ok) throw new Error('No stickers');
      const list = await res.json();
      renderStickers(list);
    } catch {
      stickersGrid.innerHTML = '<div style="opacity:.6">No stickers found</div>';
    }
  }

  function renderStickers(list) {
    stickersGrid.innerHTML = '';
    if (!Array.isArray(list) || list.length === 0) {
      stickersGrid.innerHTML = '<div style="opacity:.6">No stickers</div>';
      return;
    }
    list.forEach(fname => {
      const img = document.createElement('img');
      img.src = `/assets/stickers/${encodeURIComponent(fname)}`;
      img.alt = fname;
      img.title = fname;
      img.addEventListener('click', () => {
        sendSticker(fname);
        closeStickers();
      });
      stickersGrid.appendChild(img);
    });
  }

  function openStickers() {
    stickerPanel.classList.remove('hidden');
    stickerPanel.setAttribute('aria-hidden', 'false');
    loadStickers();
  }
  function closeStickers() {
    stickerPanel.classList.add('hidden');
    stickerPanel.setAttribute('aria-hidden', 'true');
  }

  openStickersBtn.addEventListener('click', () => {
    if (stickerPanel.classList.contains('hidden')) openStickers();
    else closeStickers();
  });
  closeStickersBtn && closeStickersBtn.addEventListener('click', closeStickers);

  (async () => { try { await fetch(STICKER_MANIFEST, { method: 'HEAD' }); } catch {} })();

})();
