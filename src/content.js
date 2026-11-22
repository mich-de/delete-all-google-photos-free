'use strict';

/**
 * Shadow-DOM Floating HUD Panel on photos.google.com (v2.0)
 * 4 Clean Tabs: Delete | Filters | Storage Cleanup | Options & Log
 * Draggable, collapsible pill, Light/Dark mode, IT/EN/ZH toggle, ESC emergency stop
 */
(function () {
  const root = (window.__DAGP = window.__DAGP || {});
  if (window.__DAGP_MOUNTED) return;
  window.__DAGP_MOUNTED = true;

  const uiState = {
    minimized: false,
    hidden: false,
    activeTab: 'delete', // 'delete' | 'filters' | 'cleanup' | 'options'
    pendingConfirm: null, // null | 'start' | 'emptyTrash'
    copiedLog: false,
    selectedYear: new Date().getFullYear() - 1,
    selectedMonth: 0
  };

  const MONTH_NAMES = {
    it: ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'],
    en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    zh: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
  };

  let hostEl = null;
  let shadow = null;
  let containerEl = null;

  function resolveDarkMode(themeSetting) {
    if (themeSetting === 'dark') return true;
    if (themeSetting === 'light') return false;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getViewLabel(lang, pageContext) {
    if (pageContext?.view === 'yearSearch' && pageContext.searchYear) {
      return root.i18n.t(lang, 'viewYearSearch', { year: pageContext.searchYear });
    }
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
    return root.i18n.t(lang, map[pageContext?.view] || 'viewOther');
  }

  function getStatusLabel(lang, status) {
    const map = {
      idle: 'statusIdle',
      running: 'statusRunning',
      paused: 'statusPaused',
      stopping: 'statusStopping',
      completed: 'statusCompleted',
      error: 'statusError'
    };
    return root.i18n.t(lang, map[status] || 'statusIdle');
  }

  async function mountOverlay() {
    if (hostEl) return;
    hostEl = document.createElement('div');
    hostEl.id = 'dagp-extension-host';
    shadow = hostEl.attachShadow({ mode: 'open' });

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL('src/overlay.css');
    shadow.appendChild(link);

    containerEl = document.createElement('div');
    containerEl.className = 'dagp-root';
    shadow.appendChild(containerEl);

    document.documentElement.appendChild(hostEl);

    // Drag support
    let dragState = null;
    shadow.addEventListener('mousedown', (e) => {
      const header = e.target.closest('.dagp-header');
      if (!header || e.target.closest('button')) return;
      const rect = containerEl.getBoundingClientRect();
      dragState = {
        startX: e.clientX,
        startY: e.clientY,
        origLeft: rect.left,
        origTop: rect.top
      };
      containerEl.style.right = 'auto';
      containerEl.style.bottom = 'auto';
      containerEl.style.left = `${rect.left}px`;
      containerEl.style.top = `${rect.top}px`;
      e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      if (!dragState) return;
      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;
      const maxX = Math.max(8, window.innerWidth - containerEl.offsetWidth - 8);
      const maxY = Math.max(8, window.innerHeight - containerEl.offsetHeight - 8);
      containerEl.style.left = `${Math.max(8, Math.min(maxX, dragState.origLeft + dx))}px`;
      containerEl.style.top = `${Math.max(8, Math.min(maxY, dragState.origTop + dy))}px`;
    });

    window.addEventListener('mouseup', () => {
      dragState = null;
    });

    containerEl.addEventListener('click', handleClick);
    containerEl.addEventListener('change', handleChange);
  }

  function handleClick(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.getAttribute('data-action');
    const engine = root.engine;
    const snap = engine.getSnapshot();

    switch (action) {
      case 'expand':
        uiState.minimized = false;
        render(snap);
        break;
      case 'minimize':
        uiState.minimized = true;
        uiState.pendingConfirm = null;
        render(snap);
        break;
      case 'hide':
        uiState.hidden = true;
        uiState.pendingConfirm = null;
        render(snap);
        break;
      case 'tab':
        uiState.activeTab = btn.getAttribute('data-tab') || 'delete';
        uiState.pendingConfirm = null;
        render(snap);
        break;
      case 'toggle-lang':
        engine.updateSettings({ lang: root.i18n.nextLang(snap.settings.lang) });
        break;
      case 'toggle-theme':
        engine.updateSettings({ theme: snap.settings.theme === 'dark' ? 'light' : 'dark' });
        break;
      case 'request-start':
        if (snap.settings.dryRun) {
          uiState.pendingConfirm = null;
          engine.start();
        } else {
          uiState.pendingConfirm = 'start';
          render(snap);
        }
        break;
      case 'request-empty-trash':
        uiState.pendingConfirm = 'emptyTrash';
        render(snap);
        break;
      case 'confirm-proceed': {
        const pending = uiState.pendingConfirm;
        uiState.pendingConfirm = null;
        render(snap);
        if (pending === 'start') engine.start();
        else if (pending === 'emptyTrash') engine.emptyTrashNow();
        break;
      }
      case 'confirm-cancel':
        uiState.pendingConfirm = null;
        render(snap);
        break;
      case 'pause':
        engine.pause();
        break;
      case 'resume':
        engine.resume();
        break;
      case 'stop':
        engine.stop();
        break;
      case 'clear-filters':
        engine.clearFilters();
        break;
      case 'reset-stats':
        engine.resetAllTimeStats();
        break;
      case 'copy-log': {
        const text = snap.logs.map((l) => `[${l.time}] (${l.level}) ${l.msg}`).join('\n');
        navigator.clipboard?.writeText(text).catch(() => {});
        uiState.copiedLog = true;
        render(snap);
        setTimeout(() => {
          uiState.copiedLog = false;
          render(engine.getSnapshot());
        }, 1500);
        break;
      }
      case 'nav': {
        const dest = btn.getAttribute('data-dest');
        const acc = snap.pageContext.accountIndex || 0;
        const url = root.selectors.buildPhotosUrl(dest, acc);
        if (dest === 'takeout') window.open(url, '_blank', 'noopener');
        else window.location.href = url;
        break;
      }
      case 'switch-account': {
        const accIdx = Number(btn.getAttribute('data-acc')) || 0;
        window.location.href = root.selectors.buildPhotosUrl('library', accIdx);
        break;
      }
      case 'pick-year': {
        uiState.selectedYear = Number(btn.getAttribute('data-year')) || uiState.selectedYear;
        uiState.selectedMonth = 0;
        render(snap);
        break;
      }
      case 'apply-year-here': {
        const range = root.selectors.getYearDateRange(uiState.selectedYear, uiState.selectedMonth);
        engine.updateSettings({ dateFrom: range.dateFrom, dateTo: range.dateTo }).then(() => {
          uiState.activeTab = 'delete';
          render(engine.getSnapshot());
        });
        break;
      }
      case 'apply-before-year': {
        const prevYear = Number(uiState.selectedYear) - 1;
        engine.updateSettings({ dateFrom: '', dateTo: `${prevYear}-12-31` }).then(() => {
          uiState.activeTab = 'delete';
          render(engine.getSnapshot());
        });
        break;
      }
      case 'open-year-search': {
        const range = root.selectors.getYearDateRange(uiState.selectedYear, uiState.selectedMonth);
        const acc = snap.pageContext.accountIndex || 0;
        const targetUrl = root.selectors.buildYearSearchUrl(uiState.selectedYear, uiState.selectedMonth, acc);
        engine.updateSettings({ dateFrom: range.dateFrom, dateTo: range.dateTo }).then(() => {
          window.location.href = targetUrl;
        });
        break;
      }
    }
  }

  function handleChange(e) {
    const el = e.target;
    if (el.hasAttribute('data-year-picker')) {
      uiState.selectedYear = Number(el.value) || uiState.selectedYear;
      render(root.engine.getSnapshot());
      return;
    }
    if (el.hasAttribute('data-month-picker')) {
      uiState.selectedMonth = Number(el.value) || 0;
      render(root.engine.getSnapshot());
      return;
    }
    const key = el.getAttribute('data-setting');
    if (!key) return;
    let val;
    if (el.type === 'checkbox') val = el.checked;
    else if (el.type === 'number') val = Number(el.value);
    else val = el.value;
    root.engine.updateSettings({ [key]: val });
  }

  function buildFilterPillsHtml(s, t) {
    const pills = [];
    if (s.mediaFilter === 'videos') pills.push(`🎬 ${t('mediaVideos')}`);
    if (s.mediaFilter === 'photos') pills.push(`🖼 ${t('mediaPhotos')}`);
    if (s.dateFrom) pills.push(`≥ ${s.dateFrom}`);
    if (s.dateTo) pills.push(`≤ ${s.dateTo}`);
    if (s.skipFavorites) pills.push('★ Skip Fav');
    if (pills.length === 0) return '';
    return `
      <div class="dagp-filter-pills">
        <span>${escapeHtml(t('filterActiveBadge'))}</span>
        ${pills.map((p) => `<span class="dagp-fpill">${escapeHtml(p)}</span>`).join('')}
      </div>
    `;
  }

  function render(snap) {
    if (!containerEl) return;
    if (uiState.hidden) {
      containerEl.classList.add('hidden');
      return;
    }
    containerEl.classList.remove('hidden');

    const s = snap.settings;
    const lang = s.lang;
    const t = (k, v) => root.i18n.t(lang, k, v);
    const isDark = resolveDarkMode(s.theme);
    containerEl.classList.toggle('dark', isDark);

    const isActive = snap.status === 'running' || snap.status === 'paused' || snap.status === 'stopping';

    if (uiState.minimized) {
      containerEl.innerHTML = `
        <div class="dagp-pill" data-action="expand" title="${escapeHtml(t('expand'))}">
          <span class="dagp-dot ${escapeHtml(snap.status)}"></span>
          <span class="dagp-pill-title">Delete Photos</span>
          <span class="dagp-pill-count">${snap.sessionDeleted}</span>
        </div>
      `;
      return;
    }

    const viewLabel = getViewLabel(lang, snap.pageContext);
    const acc = snap.pageContext.accountIndex || 0;
    const statusLabel = getStatusLabel(lang, snap.status);
    const langBadge = lang === 'zh' ? '中文' : lang.toUpperCase();

    let tabBody = '';

    if (uiState.activeTab === 'delete') {
      let confirmHtml = '';
      if (uiState.pendingConfirm) {
        const bodyText =
          uiState.pendingConfirm === 'emptyTrash' || snap.pageContext.isTrash
            ? t('confirmTrashBody')
            : t('confirmStartBody');
        confirmHtml = `
          <div class="dagp-confirm-box">
            <div class="dagp-confirm-title">${escapeHtml(t('confirmStartTitle'))}</div>
            <p class="dagp-confirm-body">${escapeHtml(bodyText)}</p>
            <div class="dagp-actions">
              <button class="dagp-btn secondary sm" data-action="confirm-cancel">${escapeHtml(t('confirmCancel'))}</button>
              <button class="dagp-btn primary sm" data-action="confirm-proceed">${escapeHtml(t('confirmProceed'))}</button>
            </div>
          </div>
        `;
      }

      let actionBtns = '';
      if (snap.status === 'running') {
        actionBtns = `
          <div class="dagp-actions">
            <button class="dagp-btn warn" data-action="pause">⏸ ${escapeHtml(t('btnPause'))}</button>
            <button class="dagp-btn primary" data-action="stop">⏹ ${escapeHtml(t('btnStop'))}</button>
          </div>
        `;
      } else if (snap.status === 'paused') {
        actionBtns = `
          <div class="dagp-actions">
            <button class="dagp-btn primary" data-action="resume">▶ ${escapeHtml(t('btnResume'))}</button>
            <button class="dagp-btn secondary" data-action="stop">⏹ ${escapeHtml(t('btnStop'))}</button>
          </div>
        `;
      } else {
        actionBtns = `
          <div class="dagp-actions">
            <button class="dagp-btn primary" data-action="request-start" ${snap.status === 'stopping' ? 'disabled' : ''}>
              🗑 ${escapeHtml(s.dryRun ? t('btnStartDryRun') : t('btnStart'))}
            </button>
            ${snap.pageContext.isTrash ? `<button class="dagp-btn secondary" data-action="request-empty-trash">${escapeHtml(t('btnEmptyTrash'))}</button>` : ''}
          </div>
        `;
      }

      const progressPct = s.maxLimit > 0 ? Math.min(100, Math.round((snap.sessionDeleted / s.maxLimit) * 100)) : 0;
      const thirdStatVal = snap.hasFilters
        ? snap.sessionSkipped.toLocaleString()
        : (snap.ratePerMin > 0 ? snap.ratePerMin : snap.batchesCompleted);
      const thirdStatLabel = snap.hasFilters
        ? t('skippedCount')
        : (snap.ratePerMin > 0 ? `${t('speedRate')} (${t('perMin')})` : t('batchesDone'));

      tabBody = `
        <div class="dagp-context">
          <div class="dagp-context-left">
            <span class="dagp-dot ${escapeHtml(snap.status)}"></span>
            <span class="dagp-context-view">${escapeHtml(viewLabel)} (u/${acc})</span>
          </div>
          <span class="dagp-status-chip ${escapeHtml(snap.status)}">${escapeHtml(statusLabel)}</span>
        </div>

        ${snap.pageContext.isTrash ? `<div class="dagp-banner danger">${escapeHtml(t('trashWarning'))}</div>` : ''}
        ${s.dryRun ? `<div class="dagp-banner warn">${escapeHtml(t('dryRunBanner'))}</div>` : ''}
        ${buildFilterPillsHtml(s, t)}

        <div class="dagp-stats">
          <div class="dagp-stat-card">
            <div class="dagp-stat-val accent">${snap.sessionDeleted.toLocaleString()}</div>
            <div class="dagp-stat-label">${escapeHtml(t('sessionDeleted'))}</div>
          </div>
          <div class="dagp-stat-card">
            <div class="dagp-stat-val">${snap.allTimeDeleted.toLocaleString()}</div>
            <div class="dagp-stat-label">${escapeHtml(t('totalDeleted'))}</div>
          </div>
          <div class="dagp-stat-card">
            <div class="dagp-stat-val">${thirdStatVal}</div>
            <div class="dagp-stat-label">${escapeHtml(thirdStatLabel)}</div>
          </div>
        </div>

        ${s.maxLimit > 0 ? `<div class="dagp-progress-wrap"><div class="dagp-progress-fill" style="width:${progressPct}%"></div></div>` : ''}

        ${confirmHtml}
        ${actionBtns}

        <div class="dagp-hint">${escapeHtml(t('keepTabActive'))}</div>
      `;
    } else if (uiState.activeTab === 'filters') {
      const nowYear = new Date().getFullYear();
      const years = [];
      for (let y = nowYear; y >= 2005; y--) years.push(y);
      const quickYears = [nowYear, nowYear - 1, nowYear - 2, nowYear - 3, nowYear - 4, nowYear - 5];
      const months = MONTH_NAMES[lang] || MONTH_NAMES.en;

      tabBody = `
        <div class="dagp-year-card">
          <div class="dagp-sub-title">${escapeHtml(t('yearSectionTitle'))}</div>
          <div class="dagp-year-chips">
            ${quickYears
              .map((y) => `<button class="dagp-year-chip ${uiState.selectedYear === y ? 'active' : ''}" data-action="pick-year" data-year="${y}" ${isActive ? 'disabled' : ''}>${y}</button>`)
              .join('')}
          </div>
          <div class="dagp-year-row">
            <select data-year-picker="1" ${isActive ? 'disabled' : ''}>
              ${years.map((y) => `<option value="${y}" ${uiState.selectedYear === y ? 'selected' : ''}>${y}</option>`).join('')}
            </select>
            <select data-month-picker="1" ${isActive ? 'disabled' : ''}>
              <option value="0" ${uiState.selectedMonth === 0 ? 'selected' : ''}>${escapeHtml(t('monthAll'))}</option>
              ${months.map((m, idx) => `<option value="${idx + 1}" ${uiState.selectedMonth === idx + 1 ? 'selected' : ''}>${escapeHtml(m)}</option>`).join('')}
            </select>
          </div>
          <button class="dagp-btn primary sm" data-action="open-year-search" ${isActive ? 'disabled' : ''}>
            ${escapeHtml(t('btnOpenYear'))} (${uiState.selectedYear}${uiState.selectedMonth > 0 ? `/${String(uiState.selectedMonth).padStart(2, '0')}` : ''})
          </button>
          <div class="dagp-actions">
            <button class="dagp-btn secondary sm" data-action="apply-year-here" ${isActive ? 'disabled' : ''}>${escapeHtml(t('btnApplyYearHere'))}</button>
            <button class="dagp-btn secondary sm" data-action="apply-before-year" ${isActive ? 'disabled' : ''}>≤ ${escapeHtml(t('btnBeforeYear'))} ${uiState.selectedYear}</button>
          </div>
        </div>

        <div class="dagp-card">
          <div class="dagp-field">
            <label>${escapeHtml(t('filterMediaType'))}</label>
            <select data-setting="mediaFilter" ${isActive ? 'disabled' : ''}>
              <option value="all" ${s.mediaFilter === 'all' ? 'selected' : ''}>${escapeHtml(t('mediaAll'))}</option>
              <option value="videos" ${s.mediaFilter === 'videos' ? 'selected' : ''}>${escapeHtml(t('mediaVideos'))}</option>
              <option value="photos" ${s.mediaFilter === 'photos' ? 'selected' : ''}>${escapeHtml(t('mediaPhotos'))}</option>
            </select>
          </div>
          <div class="dagp-field">
            <label>${escapeHtml(t('filterDateFrom'))}</label>
            <input type="date" value="${escapeHtml(s.dateFrom)}" data-setting="dateFrom" ${isActive ? 'disabled' : ''}>
          </div>
          <div class="dagp-field">
            <label>${escapeHtml(t('filterDateTo'))}</label>
            <input type="date" value="${escapeHtml(s.dateTo)}" data-setting="dateTo" ${isActive ? 'disabled' : ''}>
          </div>
          <label class="dagp-check-field">
            <input type="checkbox" data-setting="skipFavorites" ${s.skipFavorites ? 'checked' : ''} ${isActive ? 'disabled' : ''}>
            <span>${escapeHtml(t('filterSkipFavorites'))}</span>
          </label>
          <div class="dagp-field">
            <label>${escapeHtml(t('settingMaxLimit'))}</label>
            <input type="number" min="0" max="1000000" step="50" value="${s.maxLimit}" data-setting="maxLimit" ${isActive ? 'disabled' : ''}>
          </div>
          <label class="dagp-check-field">
            <input type="checkbox" data-setting="dryRun" ${s.dryRun ? 'checked' : ''} ${isActive ? 'disabled' : ''}>
            <span>${escapeHtml(t('settingDryRun'))}</span>
          </label>
        </div>

        <div class="dagp-hint">${escapeHtml(t('filterNote'))}</div>

        <div class="dagp-actions">
          <button class="dagp-btn secondary sm" data-action="clear-filters" ${isActive ? 'disabled' : ''}>↺ ${escapeHtml(t('btnClearFilters'))}</button>
          <button class="dagp-btn primary sm" data-action="tab" data-tab="delete">← ${escapeHtml(t('tabDelete'))}</button>
        </div>
      `;
    } else if (uiState.activeTab === 'cleanup') {
      tabBody = `
        <div class="dagp-sub-title">${escapeHtml(t('cleanupTitle'))}</div>
        <div class="dagp-hint" style="text-align:left;">${escapeHtml(t('cleanupDesc'))}</div>

        <div class="dagp-grid-2">
          <button class="dagp-cleanup-tile" data-action="nav" data-dest="large">💾 ${escapeHtml(t('navLarge'))}</button>
          <button class="dagp-cleanup-tile" data-action="nav" data-dest="videos">🎬 ${escapeHtml(t('navVideos'))}</button>
          <button class="dagp-cleanup-tile" data-action="nav" data-dest="screenshots">📱 ${escapeHtml(t('navScreenshots'))}</button>
          <button class="dagp-cleanup-tile" data-action="nav" data-dest="blurry">🌫 ${escapeHtml(t('navBlurry'))}</button>
          <button class="dagp-cleanup-tile" data-action="nav" data-dest="archive">📦 ${escapeHtml(t('navArchive'))}</button>
          <button class="dagp-cleanup-tile" data-action="nav" data-dest="recent">🕒 ${escapeHtml(t('navRecent'))}</button>
          <button class="dagp-cleanup-tile" data-action="nav" data-dest="library">🖼 ${escapeHtml(t('navLibrary'))}</button>
          <button class="dagp-cleanup-tile" data-action="nav" data-dest="trash">🗑 ${escapeHtml(t('navTrash'))}</button>
        </div>

        <div class="dagp-card" style="gap:6px;">
          <div class="dagp-sub-title">${escapeHtml(t('switchAccount'))}</div>
          <div class="dagp-accounts">
            ${[0, 1, 2, 3, 4]
              .map((i) => `<button class="dagp-acc-btn ${i === acc ? 'active' : ''}" data-action="switch-account" data-acc="${i}">u/${i}</button>`)
              .join('')}
          </div>
        </div>

        <div class="dagp-actions">
          <button class="dagp-btn secondary sm" data-action="nav" data-dest="storage">📊 ${escapeHtml(t('navStorage'))}</button>
          <button class="dagp-btn secondary sm" data-action="nav" data-dest="takeout">↗ ${escapeHtml(t('navTakeout'))}</button>
        </div>
      `;
    } else {
      tabBody = `
        <div class="dagp-card">
          <div class="dagp-field">
            <label>${escapeHtml(t('settingSpeed'))}</label>
            <select data-setting="speed" ${isActive ? 'disabled' : ''}>
              <option value="safe" ${s.speed === 'safe' ? 'selected' : ''}>${escapeHtml(t('speedSafe'))}</option>
              <option value="normal" ${s.speed === 'normal' ? 'selected' : ''}>${escapeHtml(t('speedNormal'))}</option>
              <option value="fast" ${s.speed === 'fast' ? 'selected' : ''}>${escapeHtml(t('speedFast'))}</option>
            </select>
          </div>
          <div class="dagp-field">
            <label>${escapeHtml(t('settingBatchSize'))}</label>
            <input type="number" min="10" max="450" step="10" value="${s.batchSize}" data-setting="batchSize" ${isActive ? 'disabled' : ''}>
          </div>
          <div class="dagp-field">
            <label>${escapeHtml(t('settingStrategy'))}</label>
            <select data-setting="strategy" ${isActive ? 'disabled' : ''}>
              <option value="smart" ${s.strategy === 'smart' ? 'selected' : ''}>${escapeHtml(t('strategySmart'))}</option>
              <option value="turbo" ${s.strategy === 'turbo' ? 'selected' : ''}>${escapeHtml(t('strategyTurbo'))}</option>
              <option value="photo" ${s.strategy === 'photo' ? 'selected' : ''}>${escapeHtml(t('strategyPhoto'))}</option>
            </select>
          </div>
          <label class="dagp-check-field">
            <input type="checkbox" data-setting="autoScroll" ${s.autoScroll ? 'checked' : ''} ${isActive ? 'disabled' : ''}>
            <span>${escapeHtml(t('settingAutoScroll'))}</span>
          </label>
          <div class="dagp-actions" style="margin-top:2px;">
            <button class="dagp-btn secondary sm" data-action="reset-stats">↺ ${escapeHtml(t('btnResetStats'))}</button>
          </div>
        </div>

        <div class="dagp-log-header">
          <span>📋 ${escapeHtml(t('logTitle'))} (${snap.logs.length})</span>
          <button class="dagp-icon-btn" style="width:auto; padding:0 7px;" data-action="copy-log">${escapeHtml(uiState.copiedLog ? t('btnCopied') : t('btnCopyLog'))}</button>
        </div>

        <div class="dagp-log-box">
          ${
            snap.logs.length === 0
              ? `<div class="dagp-log-time">${escapeHtml(t('logEmpty'))}</div>`
              : snap.logs
                  .slice(0, 40)
                  .map(
                    (entry) => `
                  <div class="dagp-log-entry ${escapeHtml(entry.level)}">
                    <span class="dagp-log-time">${escapeHtml(entry.time)}</span>
                    <span class="dagp-log-msg">${escapeHtml(entry.msg)}</span>
                  </div>
                `
                  )
                  .join('')
          }
        </div>
      `;
    }

    containerEl.innerHTML = `
      <div class="dagp-panel">
        <div class="dagp-header">
          <div class="dagp-brand">
            <div class="dagp-logo">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
              </svg>
            </div>
            <div class="dagp-title-wrap">
              <div class="dagp-title">${escapeHtml(t('appTitle'))}</div>
              <div class="dagp-badge">${escapeHtml(t('freeBadge'))}</div>
            </div>
          </div>
          <div class="dagp-header-actions">
            <button class="dagp-icon-btn" data-action="toggle-lang" title="IT / EN / 中文">${langBadge}</button>
            <button class="dagp-icon-btn" data-action="toggle-theme" title="${escapeHtml(t('settingTheme'))}">${isDark ? '☀️' : '🌙'}</button>
            <button class="dagp-icon-btn" data-action="minimize" title="${escapeHtml(t('minimize'))}">—</button>
            <button class="dagp-icon-btn" data-action="hide" title="${escapeHtml(t('hidePanel'))}">✕</button>
          </div>
        </div>

        <div class="dagp-tabs">
          <button class="dagp-tab ${uiState.activeTab === 'delete' ? 'active' : ''}" data-action="tab" data-tab="delete">${escapeHtml(t('tabDelete'))}</button>
          <button class="dagp-tab ${uiState.activeTab === 'filters' ? 'active' : ''}" data-action="tab" data-tab="filters">${escapeHtml(t('tabFilters'))}${snap.hasFilters ? '<span class="dagp-tab-dot"></span>' : ''}</button>
          <button class="dagp-tab ${uiState.activeTab === 'cleanup' ? 'active' : ''}" data-action="tab" data-tab="cleanup">${escapeHtml(t('tabCleanup'))}</button>
          <button class="dagp-tab ${uiState.activeTab === 'options' ? 'active' : ''}" data-action="tab" data-tab="options">${escapeHtml(t('tabOptions'))}</button>
        </div>

        <div class="dagp-body">
          ${tabBody}
        </div>
      </div>
    `;
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const st = root.engine.state.status;
      if (st === 'running' || st === 'paused') {
        root.engine.stop();
      }
    }
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || !message.type) return false;
    const engine = root.engine;

    switch (message.type) {
      case 'DAGP_GET_STATE':
        engine.refreshPageContext();
        sendResponse({ ok: true, state: engine.getSnapshot(), panelHidden: uiState.hidden });
        return false;
      case 'DAGP_START':
        uiState.hidden = false;
        uiState.minimized = false;
        uiState.pendingConfirm = null;
        engine.start();
        sendResponse({ ok: true, state: engine.getSnapshot() });
        return false;
      case 'DAGP_PAUSE':
        engine.pause();
        sendResponse({ ok: true, state: engine.getSnapshot() });
        return false;
      case 'DAGP_RESUME':
        engine.resume();
        sendResponse({ ok: true, state: engine.getSnapshot() });
        return false;
      case 'DAGP_STOP':
        engine.stop();
        sendResponse({ ok: true, state: engine.getSnapshot() });
        return false;
      case 'DAGP_EMPTY_TRASH':
        engine.emptyTrashNow().then((res) => sendResponse(res));
        return true;
      case 'DAGP_UPDATE_SETTINGS':
        engine.updateSettings(message.settings || {}).then(() => {
          sendResponse({ ok: true, state: engine.getSnapshot() });
        });
        return true;
      case 'DAGP_CLEAR_FILTERS':
        engine.clearFilters().then(() => {
          sendResponse({ ok: true, state: engine.getSnapshot() });
        });
        return true;
      case 'DAGP_RESET_STATS':
        engine.resetAllTimeStats().then(() => {
          sendResponse({ ok: true, state: engine.getSnapshot() });
        });
        return true;
      case 'DAGP_TOGGLE_PANEL':
        uiState.hidden = !uiState.hidden;
        if (!uiState.hidden) uiState.minimized = false;
        render(engine.getSnapshot());
        sendResponse({ ok: true, panelHidden: uiState.hidden });
        return false;
      default:
        return false;
    }
  });

  let lastUrl = window.location.href;
  setInterval(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      root.engine.refreshPageContext();
    }
  }, 800);

  (async function boot() {
    await root.engine.init();
    await mountOverlay();
    root.engine.subscribe((snap) => render(snap));
    render(root.engine.getSnapshot());
  })();
})();
