/**
 * PURE AUTHENTIC ANDROID / PIXEL / MATERIAL YOU OPERATING SYSTEM
 * Complete vanilla JavaScript state machine & interaction engine
 */

(function () {
  'use strict';

  // --- Sound & Haptic Synthesizer ---
  class AndroidHaptics {
    constructor() {
      this.audioCtx = null;
    }

    initAudio() {
      if (!this.audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          this.audioCtx = new AudioContext();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
    }

    vibrate(ms = 15) {
      if (window.AndroidBridge && typeof window.AndroidBridge.vibrate === 'function') {
        window.AndroidBridge.vibrate(ms);
      } else if (navigator.vibrate) {
        navigator.vibrate(ms);
      }
    }

    playClick() {
      this.vibrate(10);
      try {
        this.initAudio();
        if (!this.audioCtx) return;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, this.audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, this.audioCtx.currentTime + 0.04);
        gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.04);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.05);
      } catch (e) {}
    }

    playDtmf(freq1, freq2) {
      this.vibrate(15);
      try {
        this.initAudio();
        if (!this.audioCtx) return;
        const now = this.audioCtx.currentTime;
        const osc1 = this.audioCtx.createOscillator();
        const osc2 = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc1.frequency.setValueAtTime(freq1, now);
        osc2.frequency.setValueAtTime(freq2, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc1.start();
        osc2.start();
        osc1.stop(now + 0.13);
        osc2.stop(now + 0.13);
      } catch (e) {}
    }

    playShutter() {
      this.vibrate(30);
      try {
        this.initAudio();
        if (!this.audioCtx) return;
        const now = this.audioCtx.currentTime;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(2400, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.08);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start();
        osc.stop(now + 0.1);
      } catch (e) {}
    }
  }

  const haptics = new AndroidHaptics();

  // --- System State ---
  const state = {
    setupCompleted: localStorage.getItem('android_setup_done') === 'true',
    userPin: localStorage.getItem('android_user_pin') || '',
    currentScreen: 'setup', // 'setup', 'lock', 'home'
    currentApp: null,
    setupStep: 1,
    pinBuffer: '',
    shadeOpen: false,
    drawerOpen: false,
    flashlightOn: false,
    wifiConnected: true,
    bluetoothOn: true,
    dndOn: false,
    darkTheme: true,
    calcExpression: '0'
  };

  // --- DOM Elements ---
  const screens = {
    setup: document.getElementById('screen-setup'),
    lock: document.getElementById('screen-lock'),
    home: document.getElementById('screen-home'),
    drawer: document.getElementById('screen-drawer'),
    appWindow: document.getElementById('app-window'),
    searchOverlay: document.getElementById('search-overlay')
  };

  const shade = document.getElementById('quick-settings-shade');
  const statusBar = document.getElementById('status-bar');
  const navPillTouch = document.getElementById('nav-pill-touch');

  // --- Clock & Date Formatter ---
  function updateTime() {
    const now = new Date();
    let hours = now.getHours();
    let minutes = now.getMinutes();
    const strHours = hours < 10 ? '0' + hours : '' + hours;
    const strMinutes = minutes < 10 ? '0' + minutes : '' + minutes;
    const timeFormatted = `${strHours}:${strMinutes}`;

    // Status bar clock
    const statusClock = document.getElementById('status-clock');
    if (statusClock) statusClock.textContent = timeFormatted;

    // Lockscreen double line clock
    const lockHours = document.getElementById('lock-clock-hours');
    const lockMinutes = document.getElementById('lock-clock-minutes');
    if (lockHours && lockMinutes) {
      lockHours.textContent = strHours;
      lockMinutes.textContent = strMinutes;
    }

    // Shade clock & date
    const shadeClock = document.getElementById('shade-clock');
    if (shadeClock) shadeClock.textContent = timeFormatted;

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dayName = days[now.getDay()];
    const monthName = months[now.getMonth()];
    const dateNum = now.getDate();
    const dateStr = `${dayName}, ${monthName} ${dateNum}`;

    const shadeDate = document.getElementById('shade-date');
    if (shadeDate) shadeDate.textContent = dateStr;

    const lockDate = document.getElementById('lock-date');
    if (lockDate) lockDate.textContent = `${dayName.slice(0, 3)}, ${monthName} ${dateNum}`;

    const homeGlanceDate = document.getElementById('home-glance-date');
    if (homeGlanceDate) homeGlanceDate.textContent = dateStr;
  }

  setInterval(updateTime, 1000);
  updateTime();

  // --- Screen Navigation Router ---
  function switchScreen(target) {
    state.currentScreen = target;
    Object.keys(screens).forEach(key => {
      if (screens[key]) {
        screens[key].classList.remove('active');
      }
    });

    if (target === 'setup') {
      screens.setup.classList.add('active');
      statusBar.style.display = 'none';
      navPillTouch.style.display = 'none';
    } else if (target === 'lock') {
      screens.lock.classList.remove('unlocking');
      screens.lock.classList.add('active');
      statusBar.style.display = 'flex';
      navPillTouch.style.display = 'flex';
      closeAppWindow();
      closeDrawer();
      closeShade();
    } else if (target === 'home') {
      screens.home.classList.add('active');
      statusBar.style.display = 'flex';
      navPillTouch.style.display = 'flex';
    }
  }

  // --- 1. SETUP WIZARD LOGIC ---
  function setSetupStep(stepNum) {
    state.setupStep = stepNum;
    for (let i = 1; i <= 6; i++) {
      const el = document.getElementById(`setup-step-${i}`);
      if (el) el.classList.remove('active');
    }
    const current = document.getElementById(`setup-step-${stepNum}`);
    if (current) current.classList.add('active');
  }

  // Setup Step 1: Start
  document.getElementById('btn-setup-start')?.addEventListener('click', () => {
    haptics.playClick();
    setSetupStep(2);
  });

  // Setup Step 2: Wi-Fi
  document.querySelectorAll('#wifi-list .wifi-item').forEach(item => {
    item.addEventListener('click', () => {
      haptics.playClick();
      setSetupStep(3);
    });
  });

  document.getElementById('btn-wifi-next')?.addEventListener('click', () => {
    haptics.playClick();
    setSetupStep(3);
  });

  document.getElementById('btn-setup-offline')?.addEventListener('click', () => {
    haptics.playClick();
    setSetupStep(3);
  });

  // Setup Step 3: Copy Data
  document.getElementById('btn-dont-copy')?.addEventListener('click', () => {
    haptics.playClick();
    setSetupStep(4);
  });

  document.getElementById('btn-copy-next')?.addEventListener('click', () => {
    haptics.playClick();
    setSetupStep(4);
  });

  // Setup Step 4: Google Services
  document.getElementById('btn-services-accept')?.addEventListener('click', () => {
    haptics.playClick();
    setSetupStep(5);
  });

  document.getElementById('btn-services-more')?.addEventListener('click', () => {
    haptics.playClick();
    setSetupStep(5);
  });

  // Setup Step 5: PIN Pad
  let setupPin = '';
  function updateSetupPinDots() {
    for (let i = 1; i <= 4; i++) {
      const dot = document.getElementById(`setup-pin-dot-${i}`);
      if (dot) {
        if (i <= setupPin.length) dot.classList.add('filled');
        else dot.classList.remove('filled');
      }
    }
  }

  document.querySelectorAll('#setup-keypad .keypad-btn[data-key]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (setupPin.length < 4) {
        setupPin += btn.getAttribute('data-key');
        haptics.playClick();
        updateSetupPinDots();
        if (setupPin.length === 4) {
          state.userPin = setupPin;
          localStorage.setItem('android_user_pin', setupPin);
          setTimeout(() => {
            setSetupStep(6);
            startFinalizing();
          }, 300);
        }
      }
    });
  });

  document.getElementById('btn-setup-pin-del')?.addEventListener('click', () => {
    haptics.playClick();
    setupPin = setupPin.slice(0, -1);
    updateSetupPinDots();
  });

  document.getElementById('btn-setup-pin-skip')?.addEventListener('click', () => {
    haptics.playClick();
    state.userPin = '';
    localStorage.removeItem('android_user_pin');
    setSetupStep(6);
    startFinalizing();
  });

  // Setup Step 6: Finalizing & Seamless Navigation to Home
  function startFinalizing() {
    setTimeout(() => {
      const title = document.getElementById('setup-final-title');
      const sub = document.getElementById('setup-final-sub');
      const actions = document.getElementById('setup-finish-actions');
      if (title) title.textContent = "You're all set!";
      if (sub) sub.textContent = "Welcome to your Android experience.";
      if (actions) actions.classList.remove('hidden');
    }, 1800);
  }

  document.getElementById('btn-finish-setup')?.addEventListener('click', () => {
    haptics.playClick();
    state.setupCompleted = true;
    localStorage.setItem('android_setup_done', 'true');
    // Seamless navigation takes user directly to home screen
    switchScreen('home');
  });

  // --- 2. LOCK SCREEN LOGIC ---
  const lockUnlockArea = document.getElementById('lock-unlock-area');
  const lockPinSheet = document.getElementById('lock-pin-sheet');
  let lockPinInput = '';

  function updateLockPinDots() {
    for (let i = 1; i <= 4; i++) {
      const dot = document.getElementById(`lock-pin-dot-${i}`);
      if (dot) {
        if (i <= lockPinInput.length) dot.classList.add('filled');
        else dot.classList.remove('filled');
      }
    }
  }

  function triggerUnlock() {
    if (state.userPin && state.userPin.length > 0) {
      // Show PIN Pad
      lockPinSheet.classList.add('open');
      lockPinInput = '';
      updateLockPinDots();
    } else {
      // Direct unlock animation
      haptics.playClick();
      screens.lock.classList.add('unlocking');
      setTimeout(() => {
        switchScreen('home');
      }, 250);
    }
  }

  lockUnlockArea?.addEventListener('click', triggerUnlock);

  // Swipe up gesture detection on Lock Screen
  let touchStartY = 0;
  screens.lock.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  screens.lock.addEventListener('touchend', (e) => {
    const touchEndY = e.changedTouches[0].clientY;
    if (touchStartY - touchEndY > 60) {
      triggerUnlock();
    }
  }, { passive: true });

  // Lockscreen Keypad Buttons
  document.querySelectorAll('#lock-keypad .keypad-btn[data-key]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (lockPinInput.length < 4) {
        lockPinInput += btn.getAttribute('data-key');
        haptics.playClick();
        updateLockPinDots();
        if (lockPinInput.length === 4) {
          if (lockPinInput === state.userPin) {
            haptics.playClick();
            lockPinSheet.classList.remove('open');
            screens.lock.classList.add('unlocking');
            setTimeout(() => {
              switchScreen('home');
            }, 250);
          } else {
            haptics.vibrate(100);
            lockPinSheet.classList.add('shake');
            setTimeout(() => {
              lockPinSheet.classList.remove('shake');
              lockPinInput = '';
              updateLockPinDots();
            }, 400);
          }
        }
      }
    });
  });

  document.getElementById('btn-lock-pin-del')?.addEventListener('click', () => {
    haptics.playClick();
    lockPinInput = lockPinInput.slice(0, -1);
    updateLockPinDots();
  });

  document.getElementById('btn-cancel-pin-sheet')?.addEventListener('click', () => {
    haptics.playClick();
    lockPinSheet.classList.remove('open');
    lockPinInput = '';
  });

  // Lockscreen Torch Toggle
  document.getElementById('lock-btn-torch')?.addEventListener('click', () => {
    toggleFlashlight();
  });

  // Lockscreen Camera Shortcut
  document.getElementById('lock-btn-camera')?.addEventListener('click', () => {
    haptics.playClick();
    switchScreen('home');
    openApp('camera');
  });

  // --- 3. QUICK SETTINGS & NOTIFICATION SHADE ---
  function openShade() {
    state.shadeOpen = true;
    shade.classList.add('open');
    haptics.playClick();
  }

  function closeShade() {
    state.shadeOpen = false;
    shade.classList.remove('open');
  }

  statusBar.addEventListener('click', () => {
    if (state.currentScreen !== 'setup') {
      if (state.shadeOpen) closeShade();
      else openShade();
    }
  });

  document.getElementById('shade-handle-bottom')?.addEventListener('click', closeShade);

  // Quick Tile Toggles
  function toggleFlashlight() {
    state.flashlightOn = !state.flashlightOn;
    haptics.playClick();
    const tile = document.getElementById('tile-flashlight');
    const sub = document.getElementById('tile-sub-flashlight');
    if (state.flashlightOn) {
      tile?.classList.add('active');
      if (sub) sub.textContent = 'On';
    } else {
      tile?.classList.remove('active');
      if (sub) sub.textContent = 'Off';
    }
  }

  document.getElementById('tile-flashlight')?.addEventListener('click', toggleFlashlight);

  document.getElementById('tile-internet')?.addEventListener('click', function () {
    state.wifiConnected = !state.wifiConnected;
    haptics.playClick();
    this.classList.toggle('active', state.wifiConnected);
    const sub = document.getElementById('tile-sub-internet');
    if (sub) sub.textContent = state.wifiConnected ? 'Pixel_WiFi' : 'Disconnected';
  });

  document.getElementById('tile-bluetooth')?.addEventListener('click', function () {
    state.bluetoothOn = !state.bluetoothOn;
    haptics.playClick();
    this.classList.toggle('active', state.bluetoothOn);
    const sub = document.getElementById('tile-sub-bluetooth');
    if (sub) sub.textContent = state.bluetoothOn ? 'Pixel Buds' : 'Off';
  });

  document.getElementById('tile-dnd')?.addEventListener('click', function () {
    state.dndOn = !state.dndOn;
    haptics.playClick();
    this.classList.toggle('active', state.dndOn);
    const sub = document.getElementById('tile-sub-dnd');
    if (sub) sub.textContent = state.dndOn ? 'Priority only' : 'Off';
  });

  document.getElementById('tile-darkmode')?.addEventListener('click', function () {
    state.darkTheme = !state.darkTheme;
    haptics.playClick();
    document.body.setAttribute('data-theme', state.darkTheme ? 'dark' : 'light');
    this.classList.toggle('active', state.darkTheme);
  });

  // Power Button in shade locks device
  document.getElementById('btn-power-shade')?.addEventListener('click', () => {
    haptics.playClick();
    closeShade();
    switchScreen('lock');
  });

  // Settings gear in shade
  document.getElementById('btn-open-settings-shade')?.addEventListener('click', () => {
    closeShade();
    openApp('settings');
  });

  // Clear notifications
  document.getElementById('btn-clear-notifications')?.addEventListener('click', () => {
    haptics.playClick();
    const notifs = document.querySelector('.shade-notifications');
    if (notifs) {
      notifs.innerHTML = '<div style="padding:16px;text-align:center;color:var(--md-sys-color-outline);">No new notifications</div>';
    }
  });

  // --- 4. APP LAUNCHER & APPS ENGINE ---
  const allAppsList = [
    { id: 'phone', name: 'Phone', iconClass: 'icon-phone' },
    { id: 'messages', name: 'Messages', iconClass: 'icon-messages' },
    { id: 'chrome', name: 'Chrome', iconClass: 'icon-chrome' },
    { id: 'camera', name: 'Camera', iconClass: 'icon-camera' },
    { id: 'playstore', name: 'Play Store', iconClass: 'icon-playstore' },
    { id: 'gallery', name: 'Photos', iconClass: 'icon-gallery' },
    { id: 'settings', name: 'Settings', iconClass: 'icon-settings' },
    { id: 'weather', name: 'Weather', iconClass: 'icon-weather' },
    { id: 'calculator', name: 'Calculator', iconClass: 'icon-calculator' }
  ];

  function openApp(appId) {
    state.currentApp = appId;
    haptics.playClick();
    closeDrawer();
    closeShade();
    renderAppContent(appId);
    screens.appWindow.classList.add('open');
  }

  function closeAppWindow() {
    state.currentApp = null;
    screens.appWindow.classList.remove('open');
  }

  document.getElementById('btn-app-back')?.addEventListener('click', () => {
    haptics.playClick();
    closeAppWindow();
  });

  // Bind app buttons on Home Screen & Dock
  document.querySelectorAll('[data-app]').forEach(btn => {
    btn.addEventListener('click', () => {
      const appId = btn.getAttribute('data-app');
      openApp(appId);
    });
  });

  // At A Glance Clicks
  document.getElementById('widget-at-a-glance')?.addEventListener('click', () => {
    openApp('weather');
  });

  // Search Pill Click
  document.getElementById('google-search-pill')?.addEventListener('click', () => {
    haptics.playClick();
    screens.searchOverlay.classList.add('open');
  });

  document.getElementById('btn-search-back')?.addEventListener('click', () => {
    haptics.playClick();
    screens.searchOverlay.classList.remove('open');
  });

  // Populate App Drawer
  const drawerGrid = document.getElementById('drawer-grid');
  function populateDrawer() {
    if (!drawerGrid) return;
    drawerGrid.innerHTML = '';
    allAppsList.forEach(app => {
      const item = document.createElement('button');
      item.className = 'app-icon-item';
      item.innerHTML = `
        <div class="icon-bubble ${app.iconClass}">
          ${getAppIconSvg(app.id)}
        </div>
        <span class="app-label">${app.name}</span>
      `;
      item.addEventListener('click', () => openApp(app.id));
      drawerGrid.appendChild(item);
    });
  }
  populateDrawer();

  function openDrawer() {
    state.drawerOpen = true;
    screens.drawer.classList.add('open');
    haptics.playClick();
  }

  function closeDrawer() {
    state.drawerOpen = false;
    screens.drawer.classList.remove('open');
  }

  // --- Dynamic App Views Renderer ---
  function renderAppContent(appId) {
    const titleEl = document.getElementById('app-window-title');
    const contentEl = document.getElementById('app-window-content');
    if (!contentEl) return;

    if (appId === 'phone') {
      if (titleEl) titleEl.textContent = 'Phone';
      contentEl.innerHTML = `
        <div class="dialer-container">
          <div class="dialer-screen" id="dialer-display"></div>
          <div class="keypad-grid" id="phone-keypad">
            <button class="keypad-btn" data-dial="1">1</button>
            <button class="keypad-btn" data-dial="2">2</button>
            <button class="keypad-btn" data-dial="3">3</button>
            <button class="keypad-btn" data-dial="4">4</button>
            <button class="keypad-btn" data-dial="5">5</button>
            <button class="keypad-btn" data-dial="6">6</button>
            <button class="keypad-btn" data-dial="7">7</button>
            <button class="keypad-btn" data-dial="8">8</button>
            <button class="keypad-btn" data-dial="9">9</button>
            <button class="keypad-btn" data-dial="*">*</button>
            <button class="keypad-btn" data-dial="0">0</button>
            <button class="keypad-btn" data-dial="#">#</button>
          </div>
          <div class="dialer-actions">
            <button class="dialer-call-btn" id="btn-phone-call">
              <svg viewBox="0 0 24 24"><path fill="#FFF" d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-2.2 2.2a15.053 15.053 0 0 1-6.59-6.59l2.2-2.21a.96.96 0 0 0 .25-1A11.36 11.36 0 0 1 8.5 4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.5c0-.55-.45-1-1-1z"/></svg>
            </button>
          </div>
        </div>
      `;

      let dialedNumber = '';
      const display = document.getElementById('dialer-display');
      document.querySelectorAll('#phone-keypad .keypad-btn[data-dial]').forEach(btn => {
        btn.addEventListener('click', () => {
          const val = btn.getAttribute('data-dial');
          dialedNumber += val;
          if (display) display.textContent = dialedNumber;
          haptics.playDtmf(697, 1209);
        });
      });

      document.getElementById('btn-phone-call')?.addEventListener('click', () => {
        if (!dialedNumber) return;
        haptics.playClick();
        if (display) display.textContent = `Calling ${dialedNumber}...`;
        setTimeout(() => {
          if (display) display.textContent = 'Call ended';
          dialedNumber = '';
        }, 3000);
      });

    } else if (appId === 'settings') {
      if (titleEl) titleEl.textContent = 'Settings';
      contentEl.innerHTML = `
        <div class="settings-list-container">
          <div class="settings-group-item">
            <svg class="settings-item-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12 4C7.31 4 3.07 5.9 0 8.98L12 21 24 8.98C20.93 5.9 16.69 4 12 4z"/></svg>
            <div class="settings-item-text">
              <div class="settings-item-title">Network & internet</div>
              <div class="settings-item-sub">Wi-Fi, Mobile, Hotspot</div>
            </div>
          </div>
          <div class="settings-group-item">
            <svg class="settings-item-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M17.71 7.71L12 2h-1v7.59L6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 11 14.41V22h1l5.71-5.71-4.3-4.29 4.3-4.29z"/></svg>
            <div class="settings-item-text">
              <div class="settings-item-title">Connected devices</div>
              <div class="settings-item-sub">Bluetooth, pairing</div>
            </div>
          </div>
          <div class="settings-group-item">
            <svg class="settings-item-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4z"/></svg>
            <div class="settings-item-text">
              <div class="settings-item-title">Battery</div>
              <div class="settings-item-sub">94% • About 1 day remaining</div>
            </div>
          </div>
          <div class="settings-group-item">
            <svg class="settings-item-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14z"/></svg>
            <div class="settings-item-text">
              <div class="settings-item-title">Display & Wallpaper</div>
              <div class="settings-item-sub">Dark theme, colors, font</div>
            </div>
          </div>
          <div class="settings-group-item" id="setting-reset-setup">
            <svg class="settings-item-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>
            <div class="settings-item-text">
              <div class="settings-item-title">Re-run Setup Wizard</div>
              <div class="settings-item-sub">Experience the out-of-the-box flow again</div>
            </div>
          </div>
          <div class="settings-group-item">
            <svg class="settings-item-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>
            <div class="settings-item-text">
              <div class="settings-item-title">About phone</div>
              <div class="settings-item-sub">Android 15 • Build Pure-AOSP</div>
            </div>
          </div>
        </div>
      `;

      document.getElementById('setting-reset-setup')?.addEventListener('click', () => {
        haptics.playClick();
        localStorage.removeItem('android_setup_done');
        localStorage.removeItem('android_user_pin');
        state.setupCompleted = false;
        state.userPin = '';
        closeAppWindow();
        setSetupStep(1);
        switchScreen('setup');
      });

    } else if (appId === 'camera') {
      if (titleEl) titleEl.textContent = 'Camera';
      contentEl.innerHTML = `
        <div class="camera-viewfinder">
          <div class="camera-preview-sim">
            <div class="camera-crosshairs"></div>
          </div>
          <div class="camera-controls-bar">
            <div class="camera-thumb-preview" id="camera-thumb"></div>
            <button class="camera-shutter-btn" id="btn-camera-shutter" title="Take photo"></button>
            <button class="material-btn-text" id="btn-camera-flip">
              <svg viewBox="0 0 24 24" style="width:28px;height:28px;fill:#FFF;"><path d="M20 5h-3.17L15 3H9L7.17 5H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-8 13c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/></svg>
            </button>
          </div>
        </div>
      `;

      document.getElementById('btn-camera-shutter')?.addEventListener('click', () => {
        haptics.playShutter();
        const vf = document.querySelector('.camera-viewfinder');
        if (vf) {
          vf.style.opacity = '0.3';
          setTimeout(() => { vf.style.opacity = '1'; }, 100);
        }
      });

    } else if (appId === 'weather') {
      if (titleEl) titleEl.textContent = 'Weather';
      contentEl.innerHTML = `
        <div class="weather-app-view">
          <div class="weather-city">Current Location</div>
          <div class="weather-big-temp">72°</div>
          <div style="font-size:18px;color:var(--md-sys-color-primary);margin-bottom:24px;">Mostly Sunny</div>

          <div style="width:100%;font-size:14px;font-weight:500;margin-bottom:8px;">Hourly forecast</div>
          <div class="weather-hourly-list">
            <div class="weather-hourly-card"><span>Now</span><span>72°</span></div>
            <div class="weather-hourly-card"><span>10 AM</span><span>74°</span></div>
            <div class="weather-hourly-card"><span>11 AM</span><span>77°</span></div>
            <div class="weather-hourly-card"><span>12 PM</span><span>79°</span></div>
            <div class="weather-hourly-card"><span>1 PM</span><span>81°</span></div>
            <div class="weather-hourly-card"><span>2 PM</span><span>80°</span></div>
          </div>
        </div>
      `;

    } else if (appId === 'calculator') {
      if (titleEl) titleEl.textContent = 'Calculator';
      contentEl.innerHTML = `
        <div class="calc-container">
          <div class="calc-display" id="calc-display">0</div>
          <div class="calc-grid">
            <button class="calc-btn op" data-calc="C">C</button>
            <button class="calc-btn op" data-calc="(">(</button>
            <button class="calc-btn op" data-calc=")">)</button>
            <button class="calc-btn op" data-calc="/">÷</button>
            <button class="calc-btn" data-calc="7">7</button>
            <button class="calc-btn" data-calc="8">8</button>
            <button class="calc-btn" data-calc="9">9</button>
            <button class="calc-btn op" data-calc="*">×</button>
            <button class="calc-btn" data-calc="4">4</button>
            <button class="calc-btn" data-calc="5">5</button>
            <button class="calc-btn" data-calc="6">6</button>
            <button class="calc-btn op" data-calc="-">−</button>
            <button class="calc-btn" data-calc="1">1</button>
            <button class="calc-btn" data-calc="2">2</button>
            <button class="calc-btn" data-calc="3">3</button>
            <button class="calc-btn op" data-calc="+">+</button>
            <button class="calc-btn" data-calc="0">0</button>
            <button class="calc-btn" data-calc=".">.</button>
            <button class="calc-btn" data-calc="DEL">⌫</button>
            <button class="calc-btn eq" data-calc="=">=</button>
          </div>
        </div>
      `;

      let expression = '0';
      const disp = document.getElementById('calc-display');
      document.querySelectorAll('.calc-btn').forEach(b => {
        b.addEventListener('click', () => {
          haptics.playClick();
          const action = b.getAttribute('data-calc');
          if (action === 'C') {
            expression = '0';
          } else if (action === 'DEL') {
            expression = expression.slice(0, -1) || '0';
          } else if (action === '=') {
            try {
              expression = '' + eval(expression.replace(/×/g, '*').replace(/÷/g, '/'));
            } catch (e) {
              expression = 'Error';
            }
          } else {
            if (expression === '0' && !isNaN(action)) expression = action;
            else expression += action;
          }
          if (disp) disp.textContent = expression;
        });
      });

    } else if (appId === 'messages') {
      if (titleEl) titleEl.textContent = 'Messages';
      contentEl.innerHTML = `
        <div style="padding:16px;display:flex;flex-direction:column;gap:12px;">
          <div style="background:var(--md-sys-color-surface-container);padding:14px;border-radius:16px;display:flex;gap:12px;align-items:center;">
            <div style="width:40px;height:40px;border-radius:50%;background:#4285F4;color:#FFF;display:flex;align-items:center;justify-content:center;font-weight:600;">G</div>
            <div style="flex:1;">
              <div style="font-weight:500;font-size:15px;">Google Support</div>
              <div style="font-size:13px;color:var(--md-sys-color-outline);">Welcome to your new Android device!</div>
            </div>
            <span style="font-size:11px;color:var(--md-sys-color-outline);">10:00 AM</span>
          </div>
        </div>
      `;

    } else if (appId === 'chrome') {
      if (titleEl) titleEl.textContent = 'Chrome';
      contentEl.innerHTML = `
        <div style="padding:24px;display:flex;flex-direction:column;align-items:center;text-align:center;">
          <div class="icon-bubble icon-chrome" style="width:64px;height:64px;margin-bottom:16px;">
            ${getAppIconSvg('chrome')}
          </div>
          <h2 style="font-size:22px;margin-bottom:8px;">Google Chrome</h2>
          <p style="color:var(--md-sys-color-on-surface-variant);margin-bottom:24px;">Search or type URL to browse the web.</p>
          <div style="width:100%;max-width:320px;background:var(--md-sys-color-surface-container);border-radius:24px;padding:12px 16px;display:flex;align-items:center;gap:10px;">
            <svg viewBox="0 0 24 24" style="width:20px;height:20px;fill:var(--md-sys-color-outline);"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
            <input type="text" placeholder="Search or type URL" style="border:none;background:transparent;outline:none;color:#FFF;flex:1;font-size:14px;">
          </div>
        </div>
      `;

    } else if (appId === 'gallery') {
      if (titleEl) titleEl.textContent = 'Photos';
      contentEl.innerHTML = `
        <div style="padding:16px;display:grid;grid-template-columns:repeat(3, 1fr);gap:4px;">
          <div style="aspect-ratio:1;background:linear-gradient(45deg, #1A237E, #0D47A1);border-radius:4px;"></div>
          <div style="aspect-ratio:1;background:linear-gradient(45deg, #004D40, #00796B);border-radius:4px;"></div>
          <div style="aspect-ratio:1;background:linear-gradient(45deg, #BF360C, #E64A19);border-radius:4px;"></div>
          <div style="aspect-ratio:1;background:linear-gradient(45deg, #311B92, #512DA8);border-radius:4px;"></div>
          <div style="aspect-ratio:1;background:linear-gradient(45deg, #F57F17, #FBC02D);border-radius:4px;"></div>
          <div style="aspect-ratio:1;background:linear-gradient(45deg, #880E4F, #C2185B);border-radius:4px;"></div>
        </div>
      `;

    } else if (appId === 'playstore') {
      if (titleEl) titleEl.textContent = 'Play Store';
      contentEl.innerHTML = `
        <div style="padding:16px;display:flex;flex-direction:column;gap:16px;">
          <div style="font-size:16px;font-weight:600;">Recommended for you</div>
          <div style="display:flex;gap:12px;overflow-x:auto;">
            <div style="min-width:110px;background:var(--md-sys-color-surface-container);padding:12px;border-radius:12px;text-align:center;">
              <div style="width:48px;height:48px;border-radius:12px;background:#4285F4;margin:0 auto 8px;"></div>
              <div style="font-size:12px;font-weight:500;">Google Maps</div>
            </div>
            <div style="min-width:110px;background:var(--md-sys-color-surface-container);padding:12px;border-radius:12px;text-align:center;">
              <div style="width:48px;height:48px;border-radius:12px;background:#EA4335;margin:0 auto 8px;"></div>
              <div style="font-size:12px;font-weight:500;">YouTube</div>
            </div>
            <div style="min-width:110px;background:var(--md-sys-color-surface-container);padding:12px;border-radius:12px;text-align:center;">
              <div style="width:48px;height:48px;border-radius:12px;background:#34A853;margin:0 auto 8px;"></div>
              <div style="font-size:12px;font-weight:500;">Google Drive</div>
            </div>
          </div>
        </div>
      `;
    }
  }

  // --- SVG Icons Provider ---
  function getAppIconSvg(id) {
    switch (id) {
      case 'phone':
        return '<svg viewBox="0 0 24 24"><path fill="#FFF" d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-2.2 2.2a15.053 15.053 0 0 1-6.59-6.59l2.2-2.21a.96.96 0 0 0 .25-1A11.36 11.36 0 0 1 8.5 4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.5c0-.55-.45-1-1-1z"/></svg>';
      case 'messages':
        return '<svg viewBox="0 0 24 24"><path fill="#FFF" d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/></svg>';
      case 'chrome':
        return '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#FFF"/><circle cx="12" cy="12" r="5" fill="#4285F4"/><path fill="#EA4335" d="M12 2C8.6 2 5.6 3.8 3.9 6.5l4.8 8.3L12 7h9.8C20.6 4 16.6 2 12 2z"/><path fill="#FBBC05" d="M2.2 14.5c.9 4.3 4.5 7.5 8.8 7.5 2.1 0 4.1-.7 5.7-1.9l-4.7-8.1H3.3l-1.1 2.5z"/><path fill="#34A853" d="M21.8 9.5H12l4.8 8.3 1.9-1.1C20.7 15 21.8 12.9 21.8 9.5z"/></svg>';
      case 'camera':
        return '<svg viewBox="0 0 24 24"><path fill="#FFF" d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/></svg>';
      case 'playstore':
        return '<svg viewBox="0 0 24 24"><path fill="#4285F4" d="M4 3.53v16.94c0 .82.91 1.31 1.6 0.88l13.3-8.47c.65-.41.65-1.35 0-1.76L5.6 2.65C4.91 2.22 4 2.71 4 3.53z"/></svg>';
      case 'gallery':
        return '<svg viewBox="0 0 24 24"><path fill="#4285F4" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>';
      case 'settings':
        return '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>';
      case 'weather':
        return '<svg viewBox="0 0 24 24"><path fill="#FFF" d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/></svg>';
      case 'calculator':
        return '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-6 2h5v3h-5V5zm-6 0h5v3H7V5zm0 5h5v3H7v-3zm0 5h5v3H7v-3zm11 3h-5v-8h5v8z"/></svg>';
      default:
        return '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#FFF"/></svg>';
    }
  }

  // --- 5. GESTURE NAVIGATION BAR (BOTTOM PILL) ---
  navPillTouch.addEventListener('click', () => {
    haptics.playClick();
    if (screens.searchOverlay.classList.contains('open')) {
      screens.searchOverlay.classList.remove('open');
      return;
    }
    if (screens.appWindow.classList.contains('open')) {
      closeAppWindow();
      return;
    }
    if (state.drawerOpen) {
      closeDrawer();
      return;
    }
    if (state.shadeOpen) {
      closeShade();
      return;
    }
  });

  // Swipe up on Home Screen opens App Drawer
  let homeTouchStartY = 0;
  screens.home.addEventListener('touchstart', (e) => {
    homeTouchStartY = e.touches[0].clientY;
  }, { passive: true });

  screens.home.addEventListener('touchend', (e) => {
    const homeTouchEndY = e.changedTouches[0].clientY;
    if (homeTouchStartY - homeTouchEndY > 80 && !state.drawerOpen) {
      openDrawer();
    }
  }, { passive: true });

  // Native Android back handling bridge
  window.onAndroidBackPressed = function () {
    if (screens.searchOverlay.classList.contains('open')) {
      screens.searchOverlay.classList.remove('open');
      return true;
    }
    if (screens.appWindow.classList.contains('open')) {
      closeAppWindow();
      return true;
    }
    if (state.drawerOpen) {
      closeDrawer();
      return true;
    }
    if (state.shadeOpen) {
      closeShade();
      return true;
    }
    return false;
  };

  // --- Initial System Boot ---
  if (!state.setupCompleted) {
    setSetupStep(1);
    switchScreen('setup');
  } else {
    // If setup was completed previously, boot into Lock Screen or Home
    switchScreen('lock');
  }

})();
