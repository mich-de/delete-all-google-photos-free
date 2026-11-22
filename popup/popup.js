'use strict';

(function () {
  const i18n = window.__DAGP.i18n;
  const appEl = document.getElementById('app');

  const STORAGE_KEY_SETTINGS = 'dagp_settings_v1';
  const STORAGE_KEY_STATS = 'dagp_stats_v1';

  const EXTRA_STRINGS = {
    it: {
      notOnPhotosTitle: 'Apri Google Foto per iniziare',
      notOnPhotosDesc:
        'Scegli cosa pulire su photos.google.com (Libreria, File Pesanti, Video, Screenshot, Archivio). Il pannello apparirà automaticamente.',
      openLibrary: 'Apri Google Foto',
      showPanel: 'Mostra pannello',
      hidePanel: 'Nascondi pannello',
      reloadHint: 'Hai appena installato o aggiornato l\'estensione: ricarica la scheda Google Foto (F5).',
      reloadTab: 'Ricarica scheda Google Foto',
      privacyNote: '100% locale • Zero tracciamento • Illimitata e gratuita'
    },
    en: {
      notOnPhotosTitle: 'Open Google Photos to get started',
      notOnPhotosDesc:
        'Pick a cleanup target on photos.google.com (Library, Large Files, Videos, Screenshots, Archive). The control panel appears automatically.',
      openLibrary: 'Open Google Photos',
      showPanel: 'Show panel',
      hidePanel: 'Hide panel',
      reloadHint: 'Extension was just installed or updated: reload your Google Photos tab (F5).',
      reloadTab: 'Reload Google Photos tab',
      privacyNote: '100% local • Zero tracking • Free & unlimited'
    },
    zh: {
      notOnPhotosTitle: '打开谷歌相册即可开始',
      notOnPhotosDesc:
        '选择要清理的分类（主相册、大文件、视频、截图、归档），控制面板将在页面右下角自动显示。',
      openLibrary: '打开谷歌相册',
      showPanel: '显示悬浮面板',
      hidePanel: '隐藏悬浮面板',
      reloadHint: '刚刚安装或更新了扩展：请刷新当前谷歌相册标签页 (F5)。',
      reloadTab: '刷新谷歌相册页面',
      privacyNote: '100% 本地运行 • 无隐私收集 • 永久免费无限制'
    }
  };

  let activeTab = null;
  let isPhotosTab = false;
  let contentReachable = false;
  let panelHidden = false;
  let pendingConfirm = null;
  let popupTab = 'delete'; // 'delete' | 'filters' | 'cleanup' | 'options'

  let state = {
    status: 'idle',
    sessionDeleted: 0,
    sessionSkipped: 0,
    allTimeDeleted: 0,
    batchesCompleted: 0,
    ratePerMin: 0,
    hasFilters: false,
    pageContext: { view: 'library', accountIndex: 0, isTrash: false },
    settings: {
      lang: i18n.detectDefaultLang(),
      theme: 'auto',
      speed: 'normal',
      batchSize: 250,
      strategy: 'smart',
      maxLimit: 0,
      dryRun: false,
      autoScroll: true,
      mediaFilter: 'all',
      dateFrom: '',
      dateTo: '',
      skipFavorites: false
    }
  };

  function t(key) {
    const lang = state.settings.lang || 'en';
    if (EXTRA_STRINGS[lang] && EXTRA_STRINGS[lang][key]) return EXTRA_STRINGS[lang][key];
    return i18n.t(lang, key);
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function buildUrl(dest, acc = 0) {
    const prefix = acc > 0 ? `https://photos.google.com/u/${acc}` : 'https://photos.google.com';
    const routes = {
      library: `${prefix}/`,
      archive: `${prefix}/archive`,
      trash: `${prefix}/trash`,
      large: `${prefix}/quotamanagement/large`,
      blurry: `${prefix}/quotamanagement/blurry`,
      screenshots: `${prefix}/quotamanagement/screenshots`,
      videos: `${prefix}/videos`,
      recent: `${prefix}/search/_tra_`,
      storage: `${prefix}/quotamanagement`,
      takeout: 'https://takeout.google.com/'
    };
    return routes[dest] || routes.library;
  }

  function applyTheme() {
    const th = state.settings.theme || 'auto';
    const dark =
      th === 'dark' ||
      (th === 'auto' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.body.classList.toggle('dark', dark);
    return dark;
  }

  function hasFilters(s) {
    return s.mediaFilter !== 'all' || Boolean(s.dateFrom) || Boolean(s.dateTo) || Boolean(s.skipFavorites);
  }

  async function sendToTab(payload) {
    if (!activeTab?.id) return null;
    try {
      return await chrome.tabs.sendMessage(activeTab.id, payload);
    } catch {
      return null;
    }
  }

  async function openUrl(url, sameTab = false) {
    if (sameTab && activeTab?.id) {
      await chrome.tabs.update(activeTab.id, { url });
    } else {
      await chrome.tabs.create({ url });
    }
    window.close();
  }

  async function updateSettings(partial) {
    state.settings = { ...state.settings, ...partial };
    state.hasFilters = hasFilters(state.settings);
    if (contentReachable) {
      const res = await sendToTab({ type: 'DAGP_UPDATE_SETTINGS', settings: partial });
      if (res?.state) state = res.state;
    } else {
      await chrome.storage.local.set({ [STORAGE_KEY_SETTINGS]: state.settings });
    }
    render();
  }

  function getViewLabel(view) {
    const map = {
      library: 'viewLibrary',
      archive: 'viewArchive',
      trash: 'viewTrash',
      search: 'viewSearch',
      album: 'viewAlbum',
      favorites: 'viewFavorites',
      videos: 'viewVideos',
      recentlyAdded: 'viewRecentlyAdded',
      large: 'viewLarge',
      blurry: 'viewBlurry',
      screenshots: 'viewScreenshots',
      unsupported: 'viewUnsupported',
      otherapps: 'viewOtherApps',
      storage: 'viewStorage',
      other: 'viewOther'
    };
    return t(map[view] || 'viewOther');
  }

  function getStatusLabel(status) {
    const map = {
      idle: 'statusIdle',
      running: 'statusRunning',
      paused: 'statusPaused',
      stopping: 'statusStopping',
      completed: 'statusCompleted',
      error: 'statusError'
    };
    return t(map[status] || 'statusIdle');
  }

  function buildFilterPillsHtml(s) {
    const pills = [];
    if (s.mediaFilter === 'videos') pills.push(`🎬 ${t('mediaVideos')}`);
    if (s.mediaFilter === 'photos') pills.push(`🖼 ${t('mediaPhotos')}`);
    if (s.dateFrom) pills.push(`≥ ${s.dateFrom}`);
    if (s.dateTo) pills.push(`≤ ${s.dateTo}`);
    if (s.skipFavorites) pills.push('★ Skip Fav');
    if (pills.length === 0) return '';
    return `
      <div class="filter-pills">
        <span>${escapeHtml(t('filterActiveBadge'))}</span>
        ${pills.map((p) => `<span class="fpill">${escapeHtml(p)}</span>`).join('')}
      </div>
    `;
  }

  function renderCleanupSection(acc, sameTab) {
    const act = sameTab ? 'nav-same' : 'open';
    return `
      <div class="section-title">${escapeHtml(t('cleanupTitle'))}</div>
      <div class="grid-2">
        <button class="cleanup-tile" data-action="${act}" data-dest="large">💾 ${escapeHtml(t('navLarge'))}</button>
        <button class="cleanup-tile" data-action="${act}" data-dest="videos">🎬 ${escapeHtml(t('navVideos'))}</button>
        <button class="cleanup-tile" data-action="${act}" data-dest="screenshots">📱 ${escapeHtml(t('navScreenshots'))}</button>
        <button class="cleanup-tile" data-action="${act}" data-dest="blurry">🌫 ${escapeHtml(t('navBlurry'))}</button>
        <button class="cleanup-tile" data-action="${act}" data-dest="archive">📦 ${escapeHtml(t('navArchive'))}</button>
        <button class="cleanup-tile" data-action="${act}" data-dest="recent">🕒 ${escapeHtml(t('navRecent'))}</button>
        <button class="cleanup-tile" data-action="${act}" data-dest="library">🖼 ${escapeHtml(t('navLibrary'))}</button>
        <button class="cleanup-tile" data-action="${act}" data-dest="trash">🗑 ${escapeHtml(t('navTrash'))}</button>
      </div>
      <div class="card">
        <div class="section-title">${escapeHtml(t('switchAccount'))}</div>
        <div class="accounts">
          ${[0, 1, 2, 3, 4]
            .map((i) => `<button class="acc-btn ${sameTab && i === acc ? 'active' : ''}" data-action="${act}" data-dest="library" data-acc="${i}">u/${i}</button>`)
            .join('')}
        </div>
      </div>
      <div class="actions">
        <button class="btn sm" data-action="${act}" data-dest="storage">📊 ${escapeHtml(t('navStorage'))}</button>
        <button class="btn sm" data-action="open" data-dest="takeout">↗ ${escapeHtml(t('navTakeout'))}</button>
      </div>
    `;
  }

  function render() {
    const isDark = applyTheme();
    const s = state.settings;
    const acc = state.pageContext?.accountIndex || 0;
    const langBadge = s.lang === 'zh' ? '中文' : s.lang.toUpperCase();
    const isActive = state.status === 'running' || state.status === 'paused' || state.status === 'stopping';

    const headerHtml = `
      <div class="header">
        <div class="brand">
          <div class="logo">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
            </svg>
          </div>
          <div>
            <div class="title">${escapeHtml(t('appTitle'))}</div>
            <div class="badge">${escapeHtml(t('freeBadge'))}</div>
          </div>
        </div>
        <div class="header-actions">
          <button class="icon-btn" data-action="toggle-lang">${langBadge}</button>
          <button class="icon-btn" data-action="toggle-theme">${isDark ? '☀️' : '🌙'}</button>
        </div>
      </div>
    `;

    // Not on Google Photos -> Storage Cleanup & Quick Launch Dashboard
    if (!isPhotosTab) {
      appEl.innerHTML = `
        ${headerHtml}
        <div class="content">
          <div class="card">
            <div style="font-weight:700; margin-bottom:4px;">${escapeHtml(t('notOnPhotosTitle'))}</div>
            <p class="muted">${escapeHtml(t('notOnPhotosDesc'))}</p>
          </div>
          <button class="btn primary" data-action="open" data-dest="library">🖼 ${escapeHtml(t('openLibrary'))}</button>
          ${renderCleanupSection(0, false)}
          <div class="muted" style="text-align:center;">${escapeHtml(t('privacyNote'))}</div>
        </div>
      `;
      return;
    }

    // On Google Photos, needs reload
    if (!contentReachable) {
      appEl.innerHTML = `
        ${headerHtml}
        <div class="content">
          <div class="card"><p class="muted">${escapeHtml(t('reloadHint'))}</p></div>
          <button class="btn primary" data-action="reload-tab">↻ ${escapeHtml(t('reloadTab'))}</button>
        </div>
      `;
      return;
    }

    // Connected to active Google Photos tab -> 4-tab UI
    const filtersOn = hasFilters(s);
    let bodyHtml = '';

    if (popupTab === 'delete') {
      let confirmHtml = '';
      if (pendingConfirm) {
        const bodyText =
          pendingConfirm === 'emptyTrash' || state.pageContext.isTrash
            ? t('confirmTrashBody')
            : t('confirmStartBody');
        confirmHtml = `
          <div class="confirm-box">
            <div class="confirm-title">${escapeHtml(t('confirmStartTitle'))}</div>
            <p class="muted" style="color:var(--text);">${escapeHtml(bodyText)}</p>
            <div class="actions">
              <button class="btn sm" data-action="confirm-cancel">${escapeHtml(t('confirmCancel'))}</button>
              <button class="btn primary sm" data-action="confirm-proceed">${escapeHtml(t('confirmProceed'))}</button>
            </div>
          </div>
        `;
      }

      let primaryBtns = '';
      if (state.status === 'running') {
        primaryBtns = `
          <div class="actions">
            <button class="btn warn" data-action="pause">⏸ ${escapeHtml(t('btnPause'))}</button>
            <button class="btn primary" data-action="stop">⏹ ${escapeHtml(t('btnStop'))}</button>
          </div>
        `;
      } else if (state.status === 'paused') {
        primaryBtns = `
          <div class="actions">
            <button class="btn primary" data-action="resume">▶ ${escapeHtml(t('btnResume'))}</button>
            <button class="btn" data-action="stop">⏹ ${escapeHtml(t('btnStop'))}</button>
          </div>
        `;
      } else {
        primaryBtns = `
          <div class="actions">
            <button class="btn primary" data-action="request-start" ${state.status === 'stopping' ? 'disabled' : ''}>
              🗑 ${escapeHtml(s.dryRun ? t('btnStartDryRun') : t('btnStart'))}
            </button>
            ${state.pageContext.isTrash ? `<button class="btn" data-action="request-empty-trash">${escapeHtml(t('btnEmptyTrash'))}</button>` : ''}
          </div>
        `;
      }

      const progressPct = s.maxLimit > 0 ? Math.min(100, Math.round((state.sessionDeleted / s.maxLimit) * 100)) : 0;
      const thirdVal = filtersOn
        ? (state.sessionSkipped || 0).toLocaleString()
        : (state.ratePerMin > 0 ? state.ratePerMin : state.batchesCompleted);
      const thirdLabel = filtersOn
        ? t('skippedCount')
        : (state.ratePerMin > 0 ? `${t('speedRate')} (${t('perMin')})` : t('batchesDone'));

      bodyHtml = `
        <div class="card row-between">
          <div style="font-weight:600; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
            <span class="status-dot ${escapeHtml(state.status)}"></span>
            ${escapeHtml(getViewLabel(state.pageContext.view))} (u/${acc})
          </div>
          <span class="chip ${escapeHtml(state.status)}">${escapeHtml(getStatusLabel(state.status))}</span>
        </div>

        ${state.pageContext.isTrash ? `<div class="banner danger">${escapeHtml(t('trashWarning'))}</div>` : ''}
        ${s.dryRun ? `<div class="banner warn">${escapeHtml(t('dryRunBanner'))}</div>` : ''}
        ${buildFilterPillsHtml(s)}

        <div class="stats">
          <div class="stat">
            <div class="stat-val accent">${state.sessionDeleted.toLocaleString()}</div>
            <div class="stat-label">${escapeHtml(t('sessionDeleted'))}</div>
          </div>
          <div class="stat">
            <div class="stat-val">${state.allTimeDeleted.toLocaleString()}</div>
            <div class="stat-label">${escapeHtml(t('totalDeleted'))}</div>
          </div>
          <div class="stat">
            <div class="stat-val">${thirdVal}</div>
            <div class="stat-label">${escapeHtml(thirdLabel)}</div>
          </div>
        </div>

        ${s.maxLimit > 0 ? `<div class="progress-wrap"><div class="progress-fill" style="width:${progressPct}%"></div></div>` : ''}

        ${confirmHtml}
        ${primaryBtns}

        <div class="grid-2">
          <button class="btn sm" data-action="toggle-panel">${escapeHtml(panelHidden ? t('showPanel') : t('hidePanel'))}</button>
          <button class="btn sm" data-action="reset-stats">↺ ${escapeHtml(t('btnResetStats'))}</button>
        </div>

        <div class="muted" style="text-align:center;">${escapeHtml(t('privacyNote'))}</div>
      `;
    } else if (popupTab === 'filters') {
      bodyHtml = `
        <div class="card">
          <div class="field">
            <label>${escapeHtml(t('filterMediaType'))}</label>
            <select data-setting="mediaFilter" ${isActive ? 'disabled' : ''}>
              <option value="all" ${s.mediaFilter === 'all' ? 'selected' : ''}>${escapeHtml(t('mediaAll'))}</option>
              <option value="videos" ${s.mediaFilter === 'videos' ? 'selected' : ''}>${escapeHtml(t('mediaVideos'))}</option>
              <option value="photos" ${s.mediaFilter === 'photos' ? 'selected' : ''}>${escapeHtml(t('mediaPhotos'))}</option>
            </select>
          </div>
          <div class="field">
            <label>${escapeHtml(t('filterDateFrom'))}</label>
            <input type="date" value="${escapeHtml(s.dateFrom)}" data-setting="dateFrom" ${isActive ? 'disabled' : ''}>
          </div>
          <div class="field">
            <label>${escapeHtml(t('filterDateTo'))}</label>
            <input type="date" value="${escapeHtml(s.dateTo)}" data-setting="dateTo" ${isActive ? 'disabled' : ''}>
          </div>
          <label class="check-field">
            <input type="checkbox" data-setting="skipFavorites" ${s.skipFavorites ? 'checked' : ''} ${isActive ? 'disabled' : ''}>
            <span>${escapeHtml(t('filterSkipFavorites'))}</span>
          </label>
          <div class="field" style="margin-top:8px;">
            <label>${escapeHtml(t('settingMaxLimit'))}</label>
            <input type="number" min="0" max="1000000" step="50" value="${s.maxLimit}" data-setting="maxLimit" ${isActive ? 'disabled' : ''}>
          </div>
          <label class="check-field">
            <input type="checkbox" data-setting="dryRun" ${s.dryRun ? 'checked' : ''} ${isActive ? 'disabled' : ''}>
            <span>${escapeHtml(t('settingDryRun'))}</span>
          </label>
        </div>
        <p class="muted">${escapeHtml(t('filterNote'))}</p>
        <div class="actions">
          <button class="btn sm" data-action="clear-filters" ${isActive ? 'disabled' : ''}>↺ ${escapeHtml(t('btnClearFilters'))}</button>
          <button class="btn primary sm" data-action="tab" data-tab="delete">← ${escapeHtml(t('tabDelete'))}</button>
        </div>
      `;
    } else if (popupTab === 'cleanup') {
      bodyHtml = renderCleanupSection(acc, true);
    } else {
      bodyHtml = `
        <div class="card">
          <div class="field">
            <label>${escapeHtml(t('settingSpeed'))}</label>
            <select data-setting="speed" ${isActive ? 'disabled' : ''}>
              <option value="safe" ${s.speed === 'safe' ? 'selected' : ''}>${escapeHtml(t('speedSafe'))}</option>
              <option value="normal" ${s.speed === 'normal' ? 'selected' : ''}>${escapeHtml(t('speedNormal'))}</option>
              <option value="fast" ${s.speed === 'fast' ? 'selected' : ''}>${escapeHtml(t('speedFast'))}</option>
            </select>
          </div>
          <div class="field">
            <label>${escapeHtml(t('settingBatchSize'))}</label>
            <input type="number" min="10" max="450" step="10" value="${s.batchSize}" data-setting="batchSize" ${isActive ? 'disabled' : ''}>
          </div>
          <div class="field">
            <label>${escapeHtml(t('settingStrategy'))}</label>
            <select data-setting="strategy" ${isActive ? 'disabled' : ''}>
              <option value="smart" ${s.strategy === 'smart' ? 'selected' : ''}>${escapeHtml(t('strategySmart'))}</option>
              <option value="turbo" ${s.strategy === 'turbo' ? 'selected' : ''}>${escapeHtml(t('strategyTurbo'))}</option>
              <option value="photo" ${s.strategy === 'photo' ? 'selected' : ''}>${escapeHtml(t('strategyPhoto'))}</option>
            </select>
          </div>
          <label class="check-field">
            <input type="checkbox" data-setting="autoScroll" ${s.autoScroll ? 'checked' : ''} ${isActive ? 'disabled' : ''}>
            <span>${escapeHtml(t('settingAutoScroll'))}</span>
          </label>
        </div>
        <div class="muted" style="text-align:center;">${escapeHtml(t('privacyNote'))}</div>
      `;
    }

    appEl.innerHTML = `
      ${headerHtml}
      <div class="tabs">
        <button class="tab ${popupTab === 'delete' ? 'active' : ''}" data-action="tab" data-tab="delete">${escapeHtml(t('tabDelete'))}</button>
        <button class="tab ${popupTab === 'filters' ? 'active' : ''}" data-action="tab" data-tab="filters">${escapeHtml(t('tabFilters'))}${filtersOn ? '<span class="tab-dot"></span>' : ''}</button>
        <button class="tab ${popupTab === 'cleanup' ? 'active' : ''}" data-action="tab" data-tab="cleanup">${escapeHtml(t('tabCleanup'))}</button>
        <button class="tab ${popupTab === 'options' ? 'active' : ''}" data-action="tab" data-tab="options">${escapeHtml(t('tabOptions'))}</button>
      </div>
      <div class="content">${bodyHtml}</div>
    `;
  }

  appEl.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.getAttribute('data-action');
    const acc = btn.hasAttribute('data-acc')
      ? Number(btn.getAttribute('data-acc'))
      : (state.pageContext?.accountIndex || 0);

    switch (action) {
      case 'tab':
        popupTab = btn.getAttribute('data-tab') || 'delete';
        pendingConfirm = null;
        render();
        break;
      case 'toggle-lang':
        await updateSettings({ lang: i18n.nextLang(state.settings.lang) });
        break;
      case 'toggle-theme':
        await updateSettings({ theme: state.settings.theme === 'dark' ? 'light' : 'dark' });
        break;
      case 'open':
        await openUrl(buildUrl(btn.getAttribute('data-dest'), acc), false);
        break;
      case 'nav-same':
        await openUrl(buildUrl(btn.getAttribute('data-dest'), acc), true);
        break;
      case 'reload-tab':
        if (activeTab?.id) {
          await chrome.tabs.reload(activeTab.id);
          window.close();
        }
        break;
      case 'request-start':
        if (state.settings.dryRun) {
          const res = await sendToTab({ type: 'DAGP_START' });
          if (res?.state) state = res.state;
          render();
        } else {
          pendingConfirm = 'start';
          render();
        }
        break;
      case 'request-empty-trash':
        pendingConfirm = 'emptyTrash';
        render();
        break;
      case 'confirm-proceed': {
        const p = pendingConfirm;
        pendingConfirm = null;
        if (p === 'start') {
          const res = await sendToTab({ type: 'DAGP_START' });
          if (res?.state) state = res.state;
        } else if (p === 'emptyTrash') {
          await sendToTab({ type: 'DAGP_EMPTY_TRASH' });
        }
        render();
        break;
      }
      case 'confirm-cancel':
        pendingConfirm = null;
        render();
        break;
      case 'pause': {
        const res = await sendToTab({ type: 'DAGP_PAUSE' });
        if (res?.state) state = res.state;
        render();
        break;
      }
      case 'resume': {
        const res = await sendToTab({ type: 'DAGP_RESUME' });
        if (res?.state) state = res.state;
        render();
        break;
      }
      case 'stop': {
        const res = await sendToTab({ type: 'DAGP_STOP' });
        if (res?.state) state = res.state;
        render();
        break;
      }
      case 'clear-filters': {
        const res = await sendToTab({ type: 'DAGP_CLEAR_FILTERS' });
        if (res?.state) state = res.state;
        render();
        break;
      }
      case 'toggle-panel': {
        const res = await sendToTab({ type: 'DAGP_TOGGLE_PANEL' });
        if (res) panelHidden = Boolean(res.panelHidden);
        render();
        break;
      }
      case 'reset-stats': {
        const res = await sendToTab({ type: 'DAGP_RESET_STATS' });
        if (res?.state) state = res.state;
        render();
        break;
      }
    }
  });

  appEl.addEventListener('change', async (e) => {
    const el = e.target;
    const key = el.getAttribute('data-setting');
    if (!key) return;
    let val;
    if (el.type === 'checkbox') val = el.checked;
    else if (el.type === 'number') val = Number(el.value);
    else val = el.value;
    await updateSettings({ [key]: val });
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === 'DAGP_POPUP_STATE_SYNC' && message.tabId === activeTab?.id && message.state) {
      state = message.state;
      render();
    }
  });

  async function init() {
    try {
      const stored = await chrome.storage.local.get([STORAGE_KEY_SETTINGS, STORAGE_KEY_STATS]);
      if (stored[STORAGE_KEY_SETTINGS]) {
        state.settings = { ...state.settings, ...stored[STORAGE_KEY_SETTINGS] };
      }
      if (stored[STORAGE_KEY_STATS]?.allTimeDeleted) {
        state.allTimeDeleted = stored[STORAGE_KEY_STATS].allTimeDeleted;
      }
    } catch {
      // ignore
    }

    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    activeTab = tabs[0] || null;
    isPhotosTab = Boolean(activeTab?.url && activeTab.url.startsWith('https://photos.google.com/'));

    if (isPhotosTab) {
      const res = await sendToTab({ type: 'DAGP_GET_STATE' });
      if (res && res.ok && res.state) {
        contentReachable = true;
        state = res.state;
        panelHidden = Boolean(res.panelHidden);
      }
    }

    render();
  }

  init();
})();
