'use strict';

/**
 * Resilient, Language-Independent DOM Selectors & Item Metadata Inspector for Google Photos
 * Combines:
 *   - Multi-tier Delete & Confirm detection (data attrs -> Material SVG -> 30+ lang keywords -> '#' fallback)
 *   - Storage Cleanup view detection (Large files, Blurry, Screenshots, Videos, Archive, Trash, etc.)
 *   - Rich item metadata extraction (Media Type: Video vs Photo, Date YYYY-MM-DD, Favorite ★ detection)
 *   - Turbo Shift+Click range selection helper
 */
(function () {
  const root = (window.__DAGP = window.__DAGP || {});

  const TRASH_SVG_SIGNATURES = [
    'M15 4V3H9v1H4v2h1v13',
    'M6 19c0 1.1',
    'M7 21q-.825',
    'M7 21c-.55',
    'M16 9v10H8V9',
    'M9 3v1H4v2h1v13',
    'M5 21V6H4V4h5V3h6v1h5v2h-1v15',
    'M6 7v13',
    'M3 6h18',
    'M19 4h-3.5l-1-1h-5l-1 1H5v2h14'
  ];

  // Google Material Star / Favorite icon SVG path prefixes
  const STAR_SVG_SIGNATURES = [
    'M12 17.27L18.18 21',
    'M12 17.27',
    'M5.825 21',
    'M12 2l3.09 6.26',
    'M22 9.24l-7.19-.62',
    'M14.43 10l-2.43-8'
  ];

  function isVisible(el) {
    if (!el || !el.isConnected) return false;
    const style = window.getComputedStyle(el);
    if (!style || style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) {
      return false;
    }
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function isInViewport(el, margin = 200) {
    if (!isVisible(el)) return false;
    const rect = el.getBoundingClientRect();
    return rect.bottom >= -margin && rect.top <= window.innerHeight + margin;
  }

  function isDisabled(el) {
    if (!el) return true;
    if (el.disabled) return true;
    if (el.getAttribute('aria-disabled') === 'true') return true;
    return false;
  }

  function getRawLabel(el) {
    if (!el) return '';
    return [
      el.getAttribute('aria-label'),
      el.getAttribute('title'),
      el.getAttribute('data-tooltip'),
      el.getAttribute('data-title'),
      el.innerText || el.textContent
    ]
      .filter(Boolean)
      .join(' ');
  }

  function getAccessibleLabel(el) {
    return root.i18n.normalizeText(getRawLabel(el));
  }

  function matchesAny(normalizedStr, keywords) {
    if (!normalizedStr) return false;
    for (const kw of keywords) {
      if (normalizedStr.includes(kw)) return true;
    }
    return false;
  }

  function parsePageContext() {
    const path = window.location.pathname || '/';
    const accountMatch = path.match(/\/u\/(\d+)/);
    const accountIndex = accountMatch ? Number(accountMatch[1]) : 0;
    const cleanPath = path.replace(/^\/u\/\d+/, '') || '/';

    let view = 'other';
    let searchYear = null;
    if (cleanPath === '/' || cleanPath === '/photos' || cleanPath.startsWith('/photo/')) {
      view = 'library';
    } else if (cleanPath.startsWith('/archive')) {
      view = 'archive';
    } else if (cleanPath.startsWith('/trash')) {
      view = 'trash';
    } else if (cleanPath.startsWith('/quotamanagement/large')) {
      view = 'large';
    } else if (cleanPath.startsWith('/quotamanagement/blurry')) {
      view = 'blurry';
    } else if (cleanPath.startsWith('/quotamanagement/screenshots')) {
      view = 'screenshots';
    } else if (cleanPath.startsWith('/quotamanagement/unsupportedvideos')) {
      view = 'unsupported';
    } else if (cleanPath.startsWith('/quotamanagement/otherapps')) {
      view = 'otherapps';
    } else if (cleanPath.startsWith('/quotamanagement') || cleanPath.startsWith('/storage')) {
      view = 'storage';
    } else if (cleanPath.startsWith('/videos')) {
      view = 'videos';
    } else if (cleanPath.startsWith('/search/_tra_')) {
      view = 'recentlyAdded';
    } else if (cleanPath.startsWith('/search/')) {
      const q = decodeURIComponent(cleanPath.slice('/search/'.length));
      const ym = q.match(/\b(20\d{2}|19\d{2})\b/);
      if (ym) {
        view = 'yearSearch';
        searchYear = ym[1];
      } else {
        view = 'search';
      }
    } else if (cleanPath.startsWith('/search')) {
      view = 'search';
    } else if (cleanPath.startsWith('/album') || cleanPath.startsWith('/share')) {
      view = 'album';
    } else if (cleanPath.startsWith('/favorites')) {
      view = 'favorites';
    }

    return {
      url: window.location.href,
      path,
      cleanPath,
      accountIndex,
      view,
      searchYear,
      isTrash: view === 'trash'
    };
  }

  const ENGLISH_MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  function buildYearSearchUrl(year, month = 0, accountIndex = 0) {
    const y = Number(year);
    const m = Number(month) || 0;
    const prefix = accountIndex > 0 ? `https://photos.google.com/u/${accountIndex}` : 'https://photos.google.com';
    if (m >= 1 && m <= 12) {
      return `${prefix}/search/${encodeURIComponent(`${ENGLISH_MONTHS[m - 1]} ${y}`)}`;
    }
    return `${prefix}/search/${y}`;
  }

  function getYearDateRange(year, month = 0) {
    const y = Number(year);
    const m = Number(month) || 0;
    const pad = (n) => (n < 10 ? `0${n}` : String(n));
    if (m >= 1 && m <= 12) {
      const lastDay = new Date(y, m, 0).getDate();
      return {
        dateFrom: `${y}-${pad(m)}-01`,
        dateTo: `${y}-${pad(m)}-${pad(lastDay)}`
      };
    }
    return {
      dateFrom: `${y}-01-01`,
      dateTo: `${y}-12-31`
    };
  }

  function getDayHeaderDate(el) {
    let d = root.i18n.parseDateFromLabel(getRawLabel(el));
    if (!d && el && el.parentElement) {
      d = root.i18n.parseDateFromLabel(el.parentElement.innerText || el.parentElement.textContent);
    }
    return d;
  }

  function buildPhotosUrl(dest, accountIndex = 0) {
    const prefix = accountIndex > 0 ? `https://photos.google.com/u/${accountIndex}` : 'https://photos.google.com';
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

  function findScrollContainer() {
    const candidates = Array.from(document.querySelectorAll('div, main, section, c-wiz'));
    let best = null;
    let bestScore = 0;

    for (const el of candidates) {
      if (!isVisible(el)) continue;
      const style = window.getComputedStyle(el);
      const oy = style.overflowY;
      if (oy !== 'auto' && oy !== 'scroll' && oy !== 'overlay') continue;
      const scrollable = el.scrollHeight - el.clientHeight;
      if (scrollable < 80) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width < window.innerWidth * 0.45 || rect.height < window.innerHeight * 0.45) continue;
      const score = rect.width * rect.height + scrollable;
      if (score > bestScore) {
        bestScore = score;
        best = el;
      }
    }

    return best || document.scrollingElement || document.documentElement;
  }

  function isDayHeaderCheckbox(el) {
    const label = getAccessibleLabel(el);
    if (matchesAny(label, root.i18n.DOM_KEYWORDS.dayCheckboxHints)) {
      return true;
    }
    const parent = el.parentElement;
    if (parent) {
      const hasPhotoLink =
        (parent.querySelector && parent.querySelector('a[href*="/photo/"], a[href*="/lr/"]')) ||
        (el.closest && el.closest('a[href*="/photo/"]'));
      if (hasPhotoLink) return false;
    }
    const row = el.closest && el.closest('[role="heading"], header, div');
    if (row && (!row.querySelector || !row.querySelector('a[href*="/photo/"]')) && row.getBoundingClientRect().height < 64) {
      if (label && !/\b(photo|video|foto|image|immagine)\b/.test(label)) {
        return true;
      }
    }
    return false;
  }

  function hasSvgMatching(container, signatures) {
    if (!container || !container.querySelectorAll) return false;
    const svgs = container.querySelectorAll('svg');
    for (const svg of svgs) {
      const paths = svg.querySelectorAll('path');
      for (const p of paths) {
        const d = (p.getAttribute('d') || '').replace(/\s+/g, ' ').trim();
        if (!d) continue;
        for (const sig of signatures) {
          if (d.startsWith(sig)) return true;
        }
      }
    }
    return false;
  }

  /**
   * Extracts rich metadata from a photo/video checkbox and its tile container:
   * - mediaType: 'video' | 'photo' | 'unknown'
   * - isFavorite: boolean
   * - date: 'YYYY-MM-DD' | null
   */
  function inspectCheckboxItem(el) {
    const rawLabel = getRawLabel(el);
    const normLabel = root.i18n.normalizeText(rawLabel);

    // Tile container (parent or grandparent holding thumbnail, duration badge, star icon)
    const tile = (el.closest && (el.closest('div[data-latest-bg], c-wiz > div, div[jsaction]') || el.parentElement)) || el.parentElement;
    const tileText = tile ? (tile.innerText || tile.textContent || '') : '';
    const tileNorm = root.i18n.normalizeText(tileText);

    // 1. Media Type Detection (Video vs Photo)
    let mediaType = 'unknown';
    if (
      matchesAny(normLabel, root.i18n.DOM_KEYWORDS.videoHints) ||
      /\b\d{1,2}:\d{2}(:\d{2})?\b/.test(tileText) // Video duration badge like "0:18" or "1:04:22"
    ) {
      mediaType = 'video';
    } else if (matchesAny(normLabel, root.i18n.DOM_KEYWORDS.photoHints)) {
      mediaType = 'photo';
    } else {
      // Check sibling link aria-label if present
      const link = tile && tile.querySelector && tile.querySelector('a[aria-label]');
      if (link) {
        const linkNorm = getAccessibleLabel(link);
        if (matchesAny(linkNorm, root.i18n.DOM_KEYWORDS.videoHints)) mediaType = 'video';
        else if (matchesAny(linkNorm, root.i18n.DOM_KEYWORDS.photoHints)) mediaType = 'photo';
      }
    }

    // 2. Favorite / Starred Detection
    let isFavorite =
      matchesAny(normLabel, root.i18n.DOM_KEYWORDS.favoriteHints) ||
      matchesAny(tileNorm, root.i18n.DOM_KEYWORDS.favoriteHints) ||
      hasSvgMatching(tile, STAR_SVG_SIGNATURES);

    // 3. Date Extraction
    let date = root.i18n.parseDateFromLabel(rawLabel);
    if (!date && tile && tile.querySelector) {
      const link = tile.querySelector('a[aria-label]');
      if (link) {
        date = root.i18n.parseDateFromLabel(link.getAttribute('aria-label'));
      }
    }

    return { mediaType, isFavorite, date };
  }

  /**
   * Evaluates whether a checkbox item matches user-configured filters.
   */
  function matchesFilters(meta, settings) {
    if (!settings) return true;

    if (settings.skipFavorites && meta.isFavorite) {
      return false;
    }

    if (settings.mediaFilter === 'videos' && meta.mediaType !== 'video') {
      return false;
    }
    if (settings.mediaFilter === 'photos' && meta.mediaType === 'video') {
      return false;
    }

    if (settings.dateFrom || settings.dateTo) {
      // If we can't determine date when a date filter is active, skip safely to avoid deleting wrong dates
      if (!meta.date) return false;
      if (settings.dateFrom && meta.date < settings.dateFrom) return false;
      if (settings.dateTo && meta.date > settings.dateTo) return false;
    }

    return true;
  }

  function findUncheckedCheckboxes() {
    const all = Array.from(document.querySelectorAll('[role="checkbox"]'));
    const dayBoxes = [];
    const photoBoxes = [];

    for (const el of all) {
      if (!el.isConnected) continue;
      if (el.getAttribute('aria-checked') === 'true') continue;
      if (isDisabled(el)) continue;
      if (el.closest && el.closest('[role="dialog"], [role="alertdialog"], [role="navigation"], nav')) continue;

      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;
      if (rect.bottom < 56 || rect.top > window.innerHeight + 350) continue;

      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') continue;

      if (isDayHeaderCheckbox(el)) {
        dayBoxes.push(el);
      } else {
        photoBoxes.push(el);
      }
    }

    const sortByPos = (a, b) => {
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      if (Math.abs(ra.top - rb.top) > 12) return ra.top - rb.top;
      return ra.left - rb.left;
    };

    dayBoxes.sort(sortByPos);
    photoBoxes.sort(sortByPos);

    return { dayBoxes, photoBoxes };
  }

  function getSelectedCount() {
    const clearBtn = findClearSelectionButton();
    if (clearBtn) {
      const bar = clearBtn.closest && clearBtn.closest('header, [role="banner"], div[jsname], div');
      if (bar) {
        const text = (bar.innerText || bar.textContent || '').trim();
        const match = text.match(/(\d[\d.,\s\u00a0]*\d|\d+)/);
        if (match) {
          const digits = match[1].replace(/[^\d]/g, '');
          const n = parseInt(digits, 10);
          if (!Number.isNaN(n) && n > 0 && n <= 100000) {
            return n;
          }
        }
      }
    }

    const checked = document.querySelectorAll('[role="checkbox"][aria-checked="true"]');
    if (checked.length > 0) {
      let photoChecked = 0;
      for (const el of checked) {
        if (!isDayHeaderCheckbox(el)) photoChecked++;
      }
      return photoChecked > 0 ? photoChecked : checked.length;
    }

    return 0;
  }

  function findClearSelectionButton() {
    const buttons = document.querySelectorAll('button, [role="button"]');
    for (const btn of buttons) {
      if (!isVisible(btn) || isDisabled(btn)) continue;
      const rect = btn.getBoundingClientRect();
      if (rect.top > 120) continue;
      const label = getAccessibleLabel(btn);
      if (matchesAny(label, root.i18n.DOM_KEYWORDS.clearSelectionButton)) {
        return btn;
      }
    }
    return null;
  }

  function hasTrashSvgIcon(btn) {
    return hasSvgMatching(btn, TRASH_SVG_SIGNATURES);
  }

  function findDeleteButton() {
    const allButtons = Array.from(document.querySelectorAll('button, [role="button"]'));
    const topBarButtons = [];

    for (const btn of allButtons) {
      if (!isVisible(btn) || isDisabled(btn)) continue;
      if (btn.closest && btn.closest('[role="dialog"], [role="alertdialog"], [role="navigation"], nav')) continue;
      const rect = btn.getBoundingClientRect();
      if (rect.top < -5 || rect.top > 150) continue;
      topBarButtons.push(btn);
    }

    for (const btn of topBarButtons) {
      if (btn.hasAttribute('data-delete-origin')) {
        return { el: btn, method: 'data-delete-origin' };
      }
    }

    for (const btn of topBarButtons) {
      const label = getAccessibleLabel(btn);
      if (matchesAny(label, root.i18n.DOM_KEYWORDS.deleteNegative)) continue;
      if (hasTrashSvgIcon(btn)) {
        return { el: btn, method: 'svg-trash-icon' };
      }
    }

    let fallbackMatch = null;
    for (const btn of topBarButtons) {
      const label = getAccessibleLabel(btn);
      if (!label) continue;
      if (matchesAny(label, root.i18n.DOM_KEYWORDS.deleteNegative)) continue;
      if (matchesAny(label, root.i18n.DOM_KEYWORDS.deleteButton)) {
        if (
          label.includes('trash') || label.includes('bin') || label.includes('cestino') ||
          label.includes('回收站') || label.includes('垃圾桶') ||
          label.includes('permanently') || label.includes('definitiv')
        ) {
          return { el: btn, method: 'aria-strong-match' };
        }
        if (!fallbackMatch) fallbackMatch = btn;
      }
    }

    if (fallbackMatch) {
      return { el: fallbackMatch, method: 'aria-keyword-match' };
    }

    return null;
  }

  function findEmptyTrashButton() {
    const buttons = Array.from(document.querySelectorAll('button, [role="button"]'));
    for (const btn of buttons) {
      if (!isVisible(btn) || isDisabled(btn)) continue;
      if (btn.closest && btn.closest('[role="dialog"], [role="alertdialog"]')) continue;
      const label = getAccessibleLabel(btn);
      if (matchesAny(label, root.i18n.DOM_KEYWORDS.emptyTrashButton)) {
        return btn;
      }
    }
    return null;
  }

  function findVisibleDialog() {
    const dialogs = Array.from(
      document.querySelectorAll('[role="dialog"], [role="alertdialog"], [aria-modal="true"]')
    );
    for (let i = dialogs.length - 1; i >= 0; i--) {
      const d = dialogs[i];
      if (!isVisible(d)) continue;
      const rect = d.getBoundingClientRect();
      if (rect.width < 120 || rect.height < 60) continue;
      return d;
    }
    return null;
  }

  function findConfirmDialogButton() {
    const dialog = findVisibleDialog();
    if (!dialog) return null;

    const buttons = Array.from(dialog.querySelectorAll('button, [role="button"]'))
      .filter((b) => isVisible(b) && !isDisabled(b));

    if (buttons.length === 0) return null;

    const nonCancelButtons = buttons.filter((btn) => {
      const label = getAccessibleLabel(btn);
      const mdcAction = root.i18n.normalizeText(btn.getAttribute('data-mdc-dialog-action'));
      if (mdcAction === 'cancel' || mdcAction === 'close') return false;
      if (
        label &&
        matchesAny(label, root.i18n.DOM_KEYWORDS.cancelDialog) &&
        !matchesAny(label, root.i18n.DOM_KEYWORDS.confirmDialog)
      ) {
        return false;
      }
      return true;
    });

    let secondaryMatch = null;
    for (const btn of nonCancelButtons) {
      const label = getAccessibleLabel(btn);
      if (matchesAny(label, root.i18n.DOM_KEYWORDS.confirmDialog)) {
        if (
          label.includes('trash') || label.includes('bin') || label.includes('cestino') ||
          label.includes('delete') || label.includes('elimina') || label.includes('empty') ||
          label.includes('svuota') || label.includes('回收站') || label.includes('删除')
        ) {
          return { el: btn, method: 'dialog-strong-keyword' };
        }
        if (!secondaryMatch) secondaryMatch = btn;
      }
    }
    if (secondaryMatch) {
      return { el: secondaryMatch, method: 'dialog-keyword' };
    }

    for (const btn of nonCancelButtons) {
      const action = btn.getAttribute('data-mdc-dialog-action');
      if (action && action !== 'cancel' && action !== 'close') {
        return { el: btn, method: 'dialog-mdc-action' };
      }
      if (btn.hasAttribute('autofocus') || btn.hasAttribute('data-autofocus')) {
        return { el: btn, method: 'dialog-autofocus' };
      }
    }

    if (nonCancelButtons.length > 0 && buttons.length >= 2) {
      return { el: nonCancelButtons[nonCancelButtons.length - 1], method: 'dialog-last-button' };
    }

    return null;
  }

  function safeClick(el, extraMouseOpts = {}) {
    if (!el || !el.isConnected) return false;
    try {
      const rect = el.getBoundingClientRect();
      const clientX = rect.left + rect.width / 2;
      const clientY = rect.top + rect.height / 2;
      const common = { bubbles: true, cancelable: true, view: window, clientX, clientY, ...extraMouseOpts };
      el.dispatchEvent(new MouseEvent('mouseover', common));
      el.dispatchEvent(new MouseEvent('mousedown', common));
      el.dispatchEvent(new MouseEvent('mouseup', common));
      if (extraMouseOpts.shiftKey) {
        el.dispatchEvent(new MouseEvent('click', common));
      } else {
        el.click();
      }
      return true;
    } catch {
      try {
        el.click();
        return true;
      } catch {
        return false;
      }
    }
  }

  function shiftClick(el) {
    return safeClick(el, { shiftKey: true });
  }

  function sendDeleteShortcut() {
    const target = document.activeElement || document.body;
    const opts = {
      key: '#',
      code: 'Digit3',
      keyCode: 51,
      which: 51,
      shiftKey: true,
      bubbles: true,
      cancelable: true
    };
    target.dispatchEvent(new KeyboardEvent('keydown', opts));
    target.dispatchEvent(new KeyboardEvent('keypress', opts));
    target.dispatchEvent(new KeyboardEvent('keyup', opts));
  }

  root.selectors = {
    isVisible,
    isInViewport,
    parsePageContext,
    buildPhotosUrl,
    buildYearSearchUrl,
    getYearDateRange,
    getDayHeaderDate,
    findScrollContainer,
    isDayHeaderCheckbox,
    inspectCheckboxItem,
    matchesFilters,
    findUncheckedCheckboxes,
    getSelectedCount,
    findClearSelectionButton,
    findDeleteButton,
    findEmptyTrashButton,
    findVisibleDialog,
    findConfirmDialogButton,
    safeClick,
    shiftClick,
    sendDeleteShortcut
  };
})();
