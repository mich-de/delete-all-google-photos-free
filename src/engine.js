'use strict';

/**
 * Bulk Deletion & Smart Storage Cleanup Automation Engine (v2.0)
 * Combines features of "Delete All Google Photos" + "Google Photos Bulk Delete - Free Up Storage Fast":
 * - 100% Free & Unlimited (no daily caps, no paywalls)
 * - Smart Filters: Media Type (All / Videos / Photos), Date Range (From / To), Skip Favorites (★)
 * - 3 Selection Modes: Smart (Days + Photos), Turbo (Shift+Click range), Photo-by-Photo (Precise)
 * - Works across Main Library, Archive, Large Files, Blurry, Screenshots, Videos, Search, Albums & Trash
 * - Dry Run simulation, optional max cap, Pause/Resume, ESC emergency stop, persistent stats & live logs
 */
(function () {
  const root = (window.__DAGP = window.__DAGP || {});

  const SPEED_PRESETS = {
    safe: {
      clickDelayMs: 70,
      dayClickDelayMs: 220,
      afterSelectWaitMs: 900,
      afterDeleteClickWaitMs: 1400,
      afterConfirmWaitMs: 3200,
      scrollWaitMs: 1400,
      betweenBatchesMs: 2200,
      maxConfirmWaitMs: 12000
    },
    normal: {
      clickDelayMs: 30,
      dayClickDelayMs: 140,
      afterSelectWaitMs: 550,
      afterDeleteClickWaitMs: 900,
      afterConfirmWaitMs: 2000,
      scrollWaitMs: 950,
      betweenBatchesMs: 1200,
      maxConfirmWaitMs: 10000
    },
    fast: {
      clickDelayMs: 12,
      dayClickDelayMs: 85,
      afterSelectWaitMs: 320,
      afterDeleteClickWaitMs: 550,
      afterConfirmWaitMs: 1200,
      scrollWaitMs: 650,
      betweenBatchesMs: 650,
      maxConfirmWaitMs: 8000
    }
  };

  const DEFAULT_SETTINGS = {
    lang: root.i18n.detectDefaultLang(),
    theme: 'auto', // 'auto' | 'dark' | 'light'
    speed: 'normal', // 'safe' | 'normal' | 'fast'
    batchSize: 250, // 10..450
    strategy: 'smart', // 'smart' | 'turbo' | 'photo'
    maxLimit: 0, // 0 = unlimited
    dryRun: false,
    autoScroll: true,
    // v2.0 Smart Filters
    mediaFilter: 'all', // 'all' | 'videos' | 'photos'
    dateFrom: '', // 'YYYY-MM-DD' or ''
    dateTo: '', // 'YYYY-MM-DD' or ''
    skipFavorites: false
  };

  const STORAGE_KEY_SETTINGS = 'dagp_settings_v1';
  const STORAGE_KEY_STATS = 'dagp_stats_v1';

  class DeletionEngine {
    constructor() {
      this.settings = { ...DEFAULT_SETTINGS };
      this.state = {
        status: 'idle',
        sessionDeleted: 0,
        sessionSkipped: 0,
        allTimeDeleted: 0,
        batchesCompleted: 0,
        startedAt: null,
        lastError: null,
        pageContext: root.selectors.parsePageContext(),
        logs: []
      };
      this.listeners = new Set();
      this._pauseResolver = null;
      this._stopRequested = false;
      this._loaded = false;
      this._skippedElements = new WeakSet();
    }

    async init() {
      if (this._loaded) return;
      this._loaded = true;
      try {
        const stored = await chrome.storage.local.get([STORAGE_KEY_SETTINGS, STORAGE_KEY_STATS]);
        if (stored[STORAGE_KEY_SETTINGS]) {
          this.settings = { ...DEFAULT_SETTINGS, ...stored[STORAGE_KEY_SETTINGS] };
        }
        if (stored[STORAGE_KEY_STATS] && typeof stored[STORAGE_KEY_STATS].allTimeDeleted === 'number') {
          this.state.allTimeDeleted = stored[STORAGE_KEY_STATS].allTimeDeleted;
        }
      } catch {
        // ignore storage errors
      }
      this.refreshPageContext();
      this.emit();
    }

    hasActiveFilters() {
      return (
        this.settings.mediaFilter !== 'all' ||
        Boolean(this.settings.dateFrom) ||
        Boolean(this.settings.dateTo) ||
        Boolean(this.settings.skipFavorites)
      );
    }

    subscribe(fn) {
      this.listeners.add(fn);
      return () => this.listeners.delete(fn);
    }

    getSnapshot() {
      const elapsedSec = this.state.startedAt
        ? Math.max(1, (Date.now() - this.state.startedAt) / 1000)
        : 0;
      const ratePerMin =
        elapsedSec > 2 && this.state.sessionDeleted > 0
          ? Math.round((this.state.sessionDeleted / elapsedSec) * 60)
          : 0;

      return {
        ...this.state,
        ratePerMin,
        hasFilters: this.hasActiveFilters(),
        settings: { ...this.settings }
      };
    }

    emit() {
      const snap = this.getSnapshot();
      for (const fn of this.listeners) {
        try {
          fn(snap);
        } catch {
          // ignore
        }
      }
      try {
        chrome.runtime.sendMessage({
          type: 'DAGP_STATE_UPDATE',
          state: snap
        }).catch(() => {});
      } catch {
        // ignore
      }
    }

    refreshPageContext() {
      const next = root.selectors.parsePageContext();
      const prev = this.state.pageContext;
      if (!prev || prev.url !== next.url || prev.view !== next.view) {
        this.state.pageContext = next;
        this.emit();
      }
      return next;
    }

    async updateSettings(partial) {
      const s = { ...this.settings, ...partial };
      s.batchSize = Math.max(10, Math.min(450, Number(s.batchSize) || 250));
      s.maxLimit = Math.max(0, Number(s.maxLimit) || 0);
      if (!SPEED_PRESETS[s.speed]) s.speed = 'normal';
      if (!['smart', 'turbo', 'photo'].includes(s.strategy)) s.strategy = 'smart';
      if (!['it', 'en', 'zh'].includes(s.lang)) s.lang = 'en';
      if (!['auto', 'dark', 'light'].includes(s.theme)) s.theme = 'auto';
      if (!['all', 'videos', 'photos'].includes(s.mediaFilter)) s.mediaFilter = 'all';
      s.dateFrom = typeof s.dateFrom === 'string' ? s.dateFrom.trim() : '';
      s.dateTo = typeof s.dateTo === 'string' ? s.dateTo.trim() : '';
      s.skipFavorites = Boolean(s.skipFavorites);
      s.dryRun = Boolean(s.dryRun);
      s.autoScroll = Boolean(s.autoScroll);

      this.settings = s;
      try {
        await chrome.storage.local.set({ [STORAGE_KEY_SETTINGS]: this.settings });
      } catch {
        // ignore
      }
      this.emit();
    }

    async clearFilters() {
      await this.updateSettings({
        mediaFilter: 'all',
        dateFrom: '',
        dateTo: '',
        skipFavorites: false
      });
    }

    async resetAllTimeStats() {
      this.state.allTimeDeleted = 0;
      this.state.sessionDeleted = 0;
      this.state.sessionSkipped = 0;
      this.state.batchesCompleted = 0;
      try {
        await chrome.storage.local.set({ [STORAGE_KEY_STATS]: { allTimeDeleted: 0 } });
      } catch {
        // ignore
      }
      this.emit();
    }

    async _persistAllTimeStats() {
      try {
        await chrome.storage.local.set({
          [STORAGE_KEY_STATS]: { allTimeDeleted: this.state.allTimeDeleted }
        });
      } catch {
        // ignore
      }
    }

    log(key, vars, level = 'info') {
      const msg = root.i18n.t(this.settings.lang, key, vars);
      const now = new Date();
      const time = now.toTimeString().slice(0, 8);
      this.state.logs.unshift({ time, msg, level });
      if (this.state.logs.length > 100) {
        this.state.logs.length = 100;
      }
      this.emit();
    }

    async sleep(ms) {
      const step = 100;
      let remaining = ms;
      while (remaining > 0) {
        if (this._stopRequested) return;
        await this._waitIfPaused();
        if (this._stopRequested) return;
        const chunk = Math.min(step, remaining);
        await new Promise((r) => setTimeout(r, chunk));
        remaining -= chunk;
      }
    }

    async _waitIfPaused() {
      if (this.state.status !== 'paused') return;
      await new Promise((resolve) => {
        this._pauseResolver = resolve;
      });
    }

    pause() {
      if (this.state.status !== 'running') return;
      this.state.status = 'paused';
      this.log('logPaused', null, 'warn');
      this.emit();
    }

    resume() {
      if (this.state.status !== 'paused') return;
      this.state.status = 'running';
      if (this._pauseResolver) {
        const res = this._pauseResolver;
        this._pauseResolver = null;
        res();
      }
      this.log('logResumed', null, 'info');
      this.emit();
    }

    stop() {
      if (this.state.status !== 'running' && this.state.status !== 'paused') return;
      this._stopRequested = true;
      this.state.status = 'stopping';
      if (this._pauseResolver) {
        const res = this._pauseResolver;
        this._pauseResolver = null;
        res();
      }
      this.log('logStopped', null, 'warn');
      this.emit();
    }

    async emptyTrashNow() {
      const btn = root.selectors.findEmptyTrashButton();
      if (!btn) {
        this.log('logEmptyTrashNotFound', null, 'warn');
        return { ok: false };
      }
      this.log('logEmptyTrashClick', null, 'info');
      root.selectors.safeClick(btn);

      for (let i = 0; i < 15; i++) {
        await new Promise((r) => setTimeout(r, 250));
        const confirm = root.selectors.findConfirmDialogButton();
        if (confirm && confirm.el) {
          root.selectors.safeClick(confirm.el);
          this.log('logEmptyTrashDone', null, 'success');
          return { ok: true };
        }
      }
      this.log('logConfirmNotFound', null, 'warn');
      return { ok: true };
    }

    async start() {
      if (this.state.status === 'running' || this.state.status === 'paused') return;

      this._stopRequested = false;
      this._skippedElements = new WeakSet();
      this.state.status = 'running';
      this.state.sessionDeleted = 0;
      this.state.sessionSkipped = 0;
      this.state.batchesCompleted = 0;
      this.state.startedAt = Date.now();
      this.state.lastError = null;
      this.refreshPageContext();

      const modeLabel = this.settings.dryRun
        ? 'DRY RUN'
        : `${this.state.pageContext.view.toUpperCase()}${this.hasActiveFilters() ? ' + FILTERS' : ''}`;
      this.log('logStarted', {
        mode: modeLabel,
        batch: this.settings.batchSize,
        speed: this.settings.speed
      });

      const preset = SPEED_PRESETS[this.settings.speed] || SPEED_PRESETS.normal;
      let emptyAttempts = 0;
      const MAX_EMPTY_ATTEMPTS = this.hasActiveFilters() ? 10 : 5;
      let consecutiveDeleteFailures = 0;

      try {
        while (!this._stopRequested) {
          await this._waitIfPaused();
          if (this._stopRequested) break;

          if (this.settings.maxLimit > 0 && this.state.sessionDeleted >= this.settings.maxLimit) {
            this.log('logLimitReached', { limit: this.settings.maxLimit }, 'success');
            break;
          }

          const remainingCap =
            this.settings.maxLimit > 0
              ? Math.max(1, this.settings.maxLimit - this.state.sessionDeleted)
              : this.settings.batchSize;
          const targetBatch = Math.min(this.settings.batchSize, remainingCap, 450);

          const selectedCount = await this._selectBatch(targetBatch, preset);
          if (this._stopRequested) break;

          if (selectedCount === 0) {
            emptyAttempts++;
            if (emptyAttempts >= MAX_EMPTY_ATTEMPTS) {
              break;
            }
            this.log('logNoMoreItems', { attempt: emptyAttempts, max: MAX_EMPTY_ATTEMPTS }, 'warn');
            const moved = await this._nudgeScroll(emptyAttempts, preset, this.hasActiveFilters());
            if (!moved && emptyAttempts >= 3) {
              this.log('logReachedBottom', null, 'info');
              break;
            }
            continue;
          }

          emptyAttempts = 0;
          this.log('logSelected', { count: selectedCount, skipped: this.state.sessionSkipped });
          await this.sleep(preset.afterSelectWaitMs);
          if (this._stopRequested) break;

          if (this.settings.dryRun) {
            this.log('logDryRunPause', { count: selectedCount }, 'warn');
            await this.sleep(1500);
            const clearBtn = root.selectors.findClearSelectionButton();
            if (clearBtn) root.selectors.safeClick(clearBtn);
            this.state.batchesCompleted++;
            this.state.sessionDeleted += selectedCount;
            this.emit();
            await this._scrollDown(preset);
            if (this.settings.maxLimit === 0 && this.state.batchesCompleted >= 3) {
              break;
            }
            continue;
          }

          const deleted = await this._triggerDeleteAndConfirm(preset);
          if (this._stopRequested) break;

          if (!deleted) {
            consecutiveDeleteFailures++;
            this.log('logDeleteBtnNotFound', null, 'warn');
            if (consecutiveDeleteFailures >= 4) {
              throw new Error('Delete button could not be triggered after 4 retries.');
            }
            await this.sleep(1500);
            continue;
          }

          consecutiveDeleteFailures = 0;
          await this._waitForDeletionToSettle(preset);

          this.state.batchesCompleted++;
          this.state.sessionDeleted += selectedCount;
          this.state.allTimeDeleted += selectedCount;
          await this._persistAllTimeStats();

          this.log('logBatchSuccess', {
            batch: this.state.batchesCompleted,
            count: selectedCount
          }, 'success');

          await this.sleep(preset.betweenBatchesMs);
        }

        if (this._stopRequested) {
          this.state.status = 'idle';
        } else {
          this.state.status = 'completed';
          this.log('logFinished', {
            total: this.state.sessionDeleted,
            skipped: this.state.sessionSkipped,
            batches: this.state.batchesCompleted
          }, 'success');
        }
      } catch (err) {
        this.state.status = 'error';
        this.state.lastError = err?.message || String(err);
        this.log('logError', { msg: this.state.lastError }, 'error');
      } finally {
        this._stopRequested = false;
        this.emit();
      }
    }

    async _selectBatch(targetCount, preset) {
      this.log('logSelecting');

      const filtered = this.hasActiveFilters();
      // When any filter is active, always inspect photo-by-photo so non-matching items are never deleted
      const effectiveStrategy = filtered ? 'photo' : this.settings.strategy;
      const allowDayBoxes = effectiveStrategy === 'smart' && targetCount >= 35;

      let scrollPasses = 0;
      const maxScrollPasses = this.settings.autoScroll ? (filtered ? 6 : 3) : 0;
      let clickedManually = 0;

      while (!this._stopRequested) {
        await this._waitIfPaused();
        if (this._stopRequested) break;

        let currentCount = root.selectors.getSelectedCount();
        if (currentCount >= targetCount) {
          return currentCount;
        }

        const { dayBoxes, photoBoxes } = root.selectors.findUncheckedCheckboxes();

        if (dayBoxes.length === 0 && photoBoxes.length === 0) {
          if (scrollPasses < maxScrollPasses) {
            scrollPasses++;
            const moved = await this._scrollDown(preset);
            if (!moved) break;
            continue;
          }
          break;
        }

        let clickedInPass = 0;

        // Mode A: Turbo Shift+Click Range Selection (no filters active, >= 3 photo boxes visible)
        if (effectiveStrategy === 'turbo' && photoBoxes.length >= 3 && currentCount === 0) {
          const sliceLen = Math.min(photoBoxes.length, targetCount);
          const firstBox = photoBoxes[0];
          const lastBox = photoBoxes[sliceLen - 1];
          this.log('logTurboRange', { count: sliceLen });
          root.selectors.safeClick(firstBox);
          await this.sleep(Math.max(120, preset.dayClickDelayMs));
          if (!this._stopRequested && lastBox.isConnected) {
            root.selectors.shiftClick(lastBox);
            await this.sleep(Math.max(180, preset.dayClickDelayMs));
          }
          currentCount = root.selectors.getSelectedCount();
          if (currentCount >= Math.min(sliceLen, targetCount) * 0.7) {
            clickedManually += currentCount;
            if (currentCount >= targetCount) return currentCount;
            if (scrollPasses < maxScrollPasses) {
              scrollPasses++;
              const moved = await this._scrollDown(preset);
              if (!moved) break;
              continue;
            }
            break;
          }
          // If Shift+Click didn't expand on this Google Photos view, fall through seamlessly to normal selection
        }

        // Mode B: Smart Day-Header Selection
        if (allowDayBoxes && dayBoxes.length > 0) {
          for (const box of dayBoxes) {
            if (this._stopRequested) break;
            await this._waitIfPaused();
            if (!box.isConnected || box.getAttribute('aria-checked') === 'true') continue;

            root.selectors.safeClick(box);
            clickedInPass++;
            clickedManually++;
            await this.sleep(preset.dayClickDelayMs);

            currentCount = root.selectors.getSelectedCount();
            if (currentCount >= targetCount) {
              return currentCount;
            }
          }
        }

        // Mode C: Individual Photo Checkboxes (with optional Smart Filters)
        const fresh = root.selectors.findUncheckedCheckboxes();
        for (const box of fresh.photoBoxes) {
          if (this._stopRequested) break;
          await this._waitIfPaused();
          if (!box.isConnected || box.getAttribute('aria-checked') === 'true') continue;

          if (filtered) {
            const meta = root.selectors.inspectCheckboxItem(box);
            if (!root.selectors.matchesFilters(meta, this.settings)) {
              if (!this._skippedElements.has(box)) {
                this._skippedElements.add(box);
                this.state.sessionSkipped++;
              }
              continue;
            }
          }

          root.selectors.safeClick(box);
          clickedInPass++;
          clickedManually++;

          if (preset.clickDelayMs > 0) {
            await this.sleep(preset.clickDelayMs);
          }

          if (clickedManually % 10 === 0 || targetCount < 40) {
            currentCount = root.selectors.getSelectedCount();
            if (currentCount >= targetCount) {
              return currentCount;
            }
          } else if (clickedManually >= targetCount) {
            currentCount = root.selectors.getSelectedCount();
            if (currentCount >= targetCount) {
              return currentCount;
            }
          }
        }

        currentCount = root.selectors.getSelectedCount();
        if (currentCount >= targetCount) {
          return currentCount;
        }

        if (scrollPasses < maxScrollPasses && currentCount < targetCount * 0.75) {
          scrollPasses++;
          const moved = await this._scrollDown(preset);
          if (!moved) break;
          continue;
        }

        if (clickedInPass === 0) break;
      }

      const finalCount = root.selectors.getSelectedCount();
      return finalCount > 0 ? finalCount : clickedManually;
    }

    async _triggerDeleteAndConfirm(preset) {
      this.log('logClickingDelete');
      const deleteMatch = root.selectors.findDeleteButton();

      if (deleteMatch && deleteMatch.el) {
        root.selectors.safeClick(deleteMatch.el);
      } else {
        this.log('logFallbackShortcut', null, 'warn');
        root.selectors.sendDeleteShortcut();
      }

      await this.sleep(Math.min(450, preset.afterDeleteClickWaitMs));

      let confirmedAny = false;
      const deadline = Date.now() + preset.maxConfirmWaitMs;

      while (Date.now() < deadline && !this._stopRequested) {
        await this._waitIfPaused();
        const confirmMatch = root.selectors.findConfirmDialogButton();
        if (confirmMatch && confirmMatch.el) {
          this.log('logConfirming');
          root.selectors.safeClick(confirmMatch.el);
          confirmedAny = true;
          await this.sleep(650);
          if (!root.selectors.findVisibleDialog()) {
            return true;
          }
        } else {
          if (root.selectors.getSelectedCount() === 0 && deleteMatch) {
            return true;
          }
          if (confirmedAny && !root.selectors.findVisibleDialog()) {
            return true;
          }
          await this.sleep(250);
        }
      }

      if (!confirmedAny) {
        this.log('logConfirmNotFound', null, 'warn');
      }
      return Boolean(confirmedAny || (deleteMatch && root.selectors.getSelectedCount() === 0));
    }

    async _waitForDeletionToSettle(preset) {
      const maxWait = 12000;
      const start = Date.now();
      while (Date.now() - start < maxWait && !this._stopRequested) {
        await this._waitIfPaused();
        const stillDialog = root.selectors.findVisibleDialog();
        const stillSelected = root.selectors.getSelectedCount();
        if (!stillDialog && stillSelected === 0) {
          break;
        }
        await this.sleep(300);
      }
      await this.sleep(preset.afterConfirmWaitMs);
    }

    async _scrollDown(preset) {
      const scroller = root.selectors.findScrollContainer();
      if (!scroller) return false;
      const before = scroller.scrollTop || 0;
      const step = Math.max(400, Math.floor((scroller.clientHeight || window.innerHeight) * 0.72));
      scroller.scrollTop = before + step;
      await this.sleep(preset.scrollWaitMs);
      return (scroller.scrollTop || 0) > before + 5;
    }

    async _nudgeScroll(attempt, preset, keepScrollingDown = false) {
      const scroller = root.selectors.findScrollContainer();
      if (!scroller) return false;
      const before = scroller.scrollTop || 0;
      if (!keepScrollingDown && (attempt === 1 || attempt === 3)) {
        scroller.scrollTop = 0;
        await this.sleep(preset.scrollWaitMs + 400);
        return true;
      }
      const step = Math.max(500, Math.floor((scroller.clientHeight || window.innerHeight) * 0.85));
      scroller.scrollTop = before + step;
      await this.sleep(preset.scrollWaitMs + 400);
      return (scroller.scrollTop || 0) > before + 5;
    }
  }

  root.engine = new DeletionEngine();
})();
