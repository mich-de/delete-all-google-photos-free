'use strict';

/**
 * Internationalization (IT / EN / ZH) + Multi-language Google Photos DOM keywords & Date Parser
 */
(function () {
  const root = (window.__DAGP = window.__DAGP || {});

  const UI_STRINGS = {
    it: {
      appTitle: 'Delete All Google Photos',
      freeBadge: 'v2.1 • 100% FREE • ILLIMITATO',
      tabDelete: 'Elimina',
      tabFilters: 'Anno / Filtri',
      tabCleanup: 'Spazio',
      tabOptions: 'Opzioni',
      statusIdle: 'Pronto',
      statusRunning: 'In esecuzione',
      statusPaused: 'In pausa',
      statusStopping: 'Arresto...',
      statusCompleted: 'Completato',
      statusError: 'Errore',
      viewLibrary: 'Libreria Principale',
      viewArchive: 'Archivio',
      viewTrash: 'Cestino (Permanente)',
      viewSearch: 'Risultati Ricerca',
      viewAlbum: 'Album',
      viewFavorites: 'Preferiti',
      viewVideos: 'Solo Video',
      viewRecentlyAdded: 'Aggiunti di Recente',
      viewLarge: 'File Pesanti (Spazio)',
      viewBlurry: 'Foto Sfocate',
      viewScreenshots: 'Screenshot',
      viewUnsupported: 'Video Non Supportati',
      viewOtherApps: 'Altre App',
      viewStorage: 'Gestione Spazio',
      viewOther: 'Vista Google Foto',
      sessionDeleted: 'Eliminate',
      totalDeleted: 'Totale storico',
      batchesDone: 'Batch',
      skippedCount: 'Saltate',
      speedRate: 'Velocità',
      perMin: '/min',
      btnStart: 'Avvia Eliminazione',
      btnStartDryRun: 'Avvia Test (Dry Run)',
      btnPause: 'Pausa',
      btnResume: 'Riprendi',
      btnStop: 'Ferma (ESC)',
      btnEmptyTrash: 'Svuota Cestino',
      btnResetStats: 'Azzera contatore',
      btnCopyLog: 'Copia log',
      btnCopied: 'Copiato!',
      btnClearFilters: 'Azzera filtri',
      confirmStartTitle: 'Conferma eliminazione',
      confirmStartBody:
        'Gli elementi corrispondenti verranno spostati nel Cestino di Google Foto (recuperabili per 60 giorni). Hai fatto un backup con Google Takeout?',
      confirmTrashBody:
        'ATTENZIONE: Sei nel Cestino! Gli elementi eliminati qui NON possono essere recuperati. Vuoi davvero procedere?',
      confirmProceed: 'Sì, avvia',
      confirmCancel: 'Annulla',
      filterMediaType: 'Tipo file',
      mediaAll: 'Tutti (Foto + Video)',
      mediaVideos: 'Solo Video (libera spazio)',
      mediaPhotos: 'Solo Foto',
      filterDateFrom: 'Dalla data (opz.)',
      filterDateTo: 'Alla data (opz.)',
      filterSkipFavorites: 'Salta Preferiti (con stella ★)',
      filterActiveBadge: 'Filtri attivi:',
      filterNote:
        'Con filtri attivi lo script controlla le date e salta automaticamente ogni foto fuori intervallo (anche eventuali risultati extra della ricerca Google).',
      yearSectionTitle: '📅 Elimina per Anno (o Mese)',
      yearSelectLabel: 'Anno',
      monthSelectLabel: 'Mese',
      monthAll: 'Tutto l\'anno',
      btnOpenYear: '🔍 Apri anno + filtro sicuro',
      btnApplyYearHere: '✓ Solo filtro qui',
      btnBeforeYear: 'Prima del',
      viewYearSearch: 'Anno {year} (Ricerca)',
      logEarlyStopOlder: 'Raggiunte foto più vecchie del {date} nella libreria. Arresto automatico!',
      logDayDateMatch: 'Giorno {date} compatibile: selezione rapida intera giornata.',
      settingSpeed: 'Velocità',
      speedSafe: 'Sicura (lenta)',
      speedNormal: 'Normale',
      speedFast: 'Veloce',
      settingBatchSize: 'Dimensione batch (max 450)',
      settingStrategy: 'Selezione',
      strategySmart: 'Smart (Giorni + Foto)',
      strategyTurbo: 'Turbo (Shift+Click)',
      strategyPhoto: 'Singole foto (Precisa)',
      settingMaxLimit: 'Limite max (0 = illimitato)',
      settingDryRun: 'Modalità Test (seleziona senza eliminare)',
      settingAutoScroll: 'Auto-scroll pagina',
      settingTheme: 'Tema',
      cleanupTitle: 'Libera Spazio Velocemente',
      cleanupDesc: 'Apri una categoria di Google Foto e poi avvia la cancellazione a batch:',
      navLibrary: 'Libreria',
      navArchive: 'Archivio',
      navTrash: 'Cestino',
      navLarge: 'File Pesanti',
      navVideos: 'Tutti i Video',
      navScreenshots: 'Screenshot',
      navBlurry: 'Foto Sfocate',
      navRecent: 'Recenti',
      navStorage: 'Quota Spazio',
      navTakeout: 'Backup Takeout',
      switchAccount: 'Cambia Account Google',
      trashWarning: '⚠️ Sei nel Cestino: le eliminazioni qui sono PERMANENTI!',
      dryRunBanner: '🧪 MODALITÀ TEST ATTIVA: nessuna foto verrà eliminata realmente.',
      keepTabActive: 'Tieni questa scheda aperta e visibile mentre lavora.',
      minimize: 'Riduci',
      expand: 'Espandi',
      hidePanel: 'Nascondi pannello',
      logTitle: 'Log attività',
      logEmpty: 'Nessuna attività registrata.',
      logStarted: 'Avviato in modalità {mode} (batch: {batch}, velocità: {speed}).',
      logSelecting: 'Selezione elementi visibili...',
      logTurboRange: 'Selezione Turbo Shift+Click su {count} elementi...',
      logSelected: 'Selezionati {count} elementi (saltati: {skipped}).',
      logDryRunPause: '[TEST] Simulazione eliminazione di {count} elementi. Deselezione...',
      logClickingDelete: 'Click sul pulsante Elimina...',
      logFallbackShortcut: 'Pulsante toolbar non trovato, uso scorciatoia "#" ...',
      logConfirming: 'Conferma dialogo "Sposta nel cestino"...',
      logBatchSuccess: 'Batch #{batch} completato (~{count} elementi spostati).',
      logNoMoreItems: 'Nessun altro elemento compatibile ({attempt}/{max}). Scorro la pagina...',
      logReachedBottom: 'Fine della pagina raggiunta.',
      logFinished: 'Finito! Eliminati: {total} • Saltati: {skipped} • Batch: {batches}.',
      logLimitReached: 'Limite massimo impostato ({limit}) raggiunto. Arresto.',
      logPaused: 'In pausa. Premi Riprendi per continuare.',
      logResumed: 'Ripreso.',
      logStopped: 'Fermato dall\'utente.',
      logDeleteBtnNotFound: 'Pulsante Elimina non trovato. Riprovo...',
      logConfirmNotFound: 'Dialogo di conferma non comparso o già chiuso.',
      logError: 'Errore: {msg}',
      logEmptyTrashClick: 'Click su "Svuota cestino"...',
      logEmptyTrashDone: 'Richiesta svuotamento cestino inviata!',
      logEmptyTrashNotFound: 'Pulsante "Svuota cestino" non trovato (forse è già vuoto).'
    },

    en: {
      appTitle: 'Delete All Google Photos',
      freeBadge: 'v2.1 • 100% FREE • UNLIMITED',
      tabDelete: 'Delete',
      tabFilters: 'Year / Filters',
      tabCleanup: 'Storage',
      tabOptions: 'Options',
      statusIdle: 'Ready',
      statusRunning: 'Running',
      statusPaused: 'Paused',
      statusStopping: 'Stopping...',
      statusCompleted: 'Completed',
      statusError: 'Error',
      viewLibrary: 'Main Library',
      viewArchive: 'Archive',
      viewTrash: 'Trash (Permanent)',
      viewSearch: 'Search Results',
      viewAlbum: 'Album',
      viewFavorites: 'Favorites',
      viewVideos: 'Videos Only',
      viewRecentlyAdded: 'Recently Added',
      viewLarge: 'Large Files (Storage)',
      viewBlurry: 'Blurry Photos',
      viewScreenshots: 'Screenshots',
      viewUnsupported: 'Unsupported Videos',
      viewOtherApps: 'Other Apps',
      viewStorage: 'Storage Manager',
      viewOther: 'Google Photos View',
      sessionDeleted: 'Deleted',
      totalDeleted: 'All-time total',
      batchesDone: 'Batches',
      skippedCount: 'Skipped',
      speedRate: 'Speed',
      perMin: '/min',
      btnStart: 'Start Deleting',
      btnStartDryRun: 'Start Dry Run',
      btnPause: 'Pause',
      btnResume: 'Resume',
      btnStop: 'Stop (ESC)',
      btnEmptyTrash: 'Empty Trash',
      btnResetStats: 'Reset counter',
      btnCopyLog: 'Copy log',
      btnCopied: 'Copied!',
      btnClearFilters: 'Clear filters',
      confirmStartTitle: 'Confirm Bulk Deletion',
      confirmStartBody:
        'Matching items will be moved to Google Photos Trash (recoverable for 60 days). Have you backed up important files with Google Takeout?',
      confirmTrashBody:
        'WARNING: You are in Trash! Deleting items here is PERMANENT and irreversible. Proceed anyway?',
      confirmProceed: 'Yes, start',
      confirmCancel: 'Cancel',
      filterMediaType: 'Media type',
      mediaAll: 'All (Photos + Videos)',
      mediaVideos: 'Videos only (free space fast)',
      mediaPhotos: 'Photos only',
      filterDateFrom: 'From date (opt.)',
      filterDateTo: 'To date (opt.)',
      filterSkipFavorites: 'Skip Favorites (starred ★)',
      filterActiveBadge: 'Active filters:',
      filterNote:
        'With filters enabled, every item date is verified so out-of-range photos (including false-positive Google search matches) are skipped automatically.',
      yearSectionTitle: '📅 Delete by Year (or Month)',
      yearSelectLabel: 'Year',
      monthSelectLabel: 'Month',
      monthAll: 'Full year',
      btnOpenYear: '🔍 Open year + strict filter',
      btnApplyYearHere: '✓ Filter here only',
      btnBeforeYear: 'Before',
      viewYearSearch: 'Year {year} (Search)',
      logEarlyStopOlder: 'Reached photos older than {date} in library. Stopping early!',
      logDayDateMatch: 'Day {date} matches range: fast full-day selection.',
      settingSpeed: 'Speed',
      speedSafe: 'Safe (slow)',
      speedNormal: 'Normal',
      speedFast: 'Fast',
      settingBatchSize: 'Batch size (max 450)',
      settingStrategy: 'Selection mode',
      strategySmart: 'Smart (Days + Photos)',
      strategyTurbo: 'Turbo (Shift+Click)',
      strategyPhoto: 'Individual (Precise)',
      settingMaxLimit: 'Max limit (0 = unlimited)',
      settingDryRun: 'Dry Run (select only, do not delete)',
      settingAutoScroll: 'Auto-scroll page',
      settingTheme: 'Theme',
      cleanupTitle: 'Free Up Storage Fast',
      cleanupDesc: 'Jump to a Google Photos cleanup category and batch-delete it:',
      navLibrary: 'Library',
      navArchive: 'Archive',
      navTrash: 'Trash',
      navLarge: 'Large Files',
      navVideos: 'All Videos',
      navScreenshots: 'Screenshots',
      navBlurry: 'Blurry Photos',
      navRecent: 'Recently Added',
      navStorage: 'Storage Quota',
      navTakeout: 'Takeout Backup',
      switchAccount: 'Switch Google Account',
      trashWarning: '⚠️ You are in Trash: deletions here are PERMANENT!',
      dryRunBanner: '🧪 DRY RUN MODE ACTIVE: no photos will actually be deleted.',
      keepTabActive: 'Keep this tab open and visible while automation runs.',
      minimize: 'Minimize',
      expand: 'Expand',
      hidePanel: 'Hide panel',
      logTitle: 'Activity log',
      logEmpty: 'No activity yet.',
      logStarted: 'Started in {mode} mode (batch: {batch}, speed: {speed}).',
      logSelecting: 'Selecting visible items...',
      logTurboRange: 'Turbo Shift+Click range selection across {count} items...',
      logSelected: 'Selected {count} items (skipped: {skipped}).',
      logDryRunPause: '[DRY RUN] Simulating delete of {count} items. Clearing selection...',
      logClickingDelete: 'Clicking Delete button...',
      logFallbackShortcut: 'Toolbar button not found, trying "#" shortcut...',
      logConfirming: 'Confirming "Move to trash" dialog...',
      logBatchSuccess: 'Batch #{batch} completed (~{count} items moved).',
      logNoMoreItems: 'No matching items found ({attempt}/{max}). Scrolling...',
      logReachedBottom: 'Reached bottom of scroll container.',
      logFinished: 'Done! Deleted: {total} • Skipped: {skipped} • Batches: {batches}.',
      logLimitReached: 'Reached configured max limit ({limit}). Stopping.',
      logPaused: 'Paused. Click Resume to continue.',
      logResumed: 'Resumed.',
      logStopped: 'Stopped by user.',
      logDeleteBtnNotFound: 'Delete button not found. Retrying...',
      logConfirmNotFound: 'Confirmation dialog did not appear or closed automatically.',
      logError: 'Error: {msg}',
      logEmptyTrashClick: 'Clicking "Empty trash"...',
      logEmptyTrashDone: 'Empty trash request submitted!',
      logEmptyTrashNotFound: '"Empty trash" button not found (trash may already be empty).'
    },

    zh: {
      appTitle: '谷歌相册批量删除',
      freeBadge: 'v2.1 • 100% 免费 • 无限制',
      tabDelete: '删除',
      tabFilters: '按年份/筛选',
      tabCleanup: '空间清理',
      tabOptions: '设置',
      statusIdle: '就绪',
      statusRunning: '运行中',
      statusPaused: '已暂停',
      statusStopping: '正在停止...',
      statusCompleted: '已完成',
      statusError: '错误',
      viewLibrary: '主相册',
      viewArchive: '归档',
      viewTrash: '回收站 (永久删除)',
      viewSearch: '搜索结果',
      viewAlbum: '相册集',
      viewFavorites: '收藏夹',
      viewVideos: '仅视频',
      viewRecentlyAdded: '最近添加',
      viewLarge: '大文件 (释放空间)',
      viewBlurry: '模糊照片',
      viewScreenshots: '屏幕截图',
      viewUnsupported: '不支持的视频',
      viewOtherApps: '其他应用',
      viewStorage: '存储空间管理',
      viewOther: '谷歌相册页面',
      sessionDeleted: '本次已删',
      totalDeleted: '历史总计',
      batchesDone: '批次数',
      skippedCount: '已跳过',
      speedRate: '速率',
      perMin: '/分',
      btnStart: '开始批量删除',
      btnStartDryRun: '开始演练 (不真删)',
      btnPause: '暂停',
      btnResume: '继续',
      btnStop: '停止 (ESC)',
      btnEmptyTrash: '清空回收站',
      btnResetStats: '重置统计',
      btnCopyLog: '复制日志',
      btnCopied: '已复制!',
      btnClearFilters: '清除筛选',
      confirmStartTitle: '确认批量删除',
      confirmStartBody:
        '符合条件的项目将被移至谷歌相册回收站（保留60天，可恢复）。请确认重要照片已通过 Google Takeout 备份。',
      confirmTrashBody:
        '警告：您当前在回收站中！此处的删除是永久且不可恢复的，确定继续吗？',
      confirmProceed: '确认开始',
      confirmCancel: '取消',
      filterMediaType: '文件类型',
      mediaAll: '全部 (照片 + 视频)',
      mediaVideos: '仅删除视频 (快速省空间)',
      mediaPhotos: '仅删除照片',
      filterDateFrom: '起始日期 (可选)',
      filterDateTo: '截止日期 (可选)',
      filterSkipFavorites: '跳过收藏项 (带星标 ★)',
      filterActiveBadge: '当前筛选:',
      filterNote: '开启筛选后会严格校验每项日期，自动跳过不在范围内的照片（防止搜索误匹配）。',
      yearSectionTitle: '📅 按年份（或月份）删除',
      yearSelectLabel: '年份',
      monthSelectLabel: '月份',
      monthAll: '整年',
      btnOpenYear: '🔍 打开该年份 + 严格筛选',
      btnApplyYearHere: '✓ 仅在当前页筛选',
      btnBeforeYear: '早于',
      viewYearSearch: '{year} 年 (搜索)',
      logEarlyStopOlder: '已滚动至早于 {date} 的照片，自动提前停止！',
      logDayDateMatch: '日期 {date} 符合范围：快速勾选整天。',
      settingSpeed: '运行速度',
      speedSafe: '安全 (较慢)',
      speedNormal: '标准',
      speedFast: '极速',
      settingBatchSize: '每批数量 (最大 450)',
      settingStrategy: '勾选方式',
      strategySmart: '智能 (按天 + 单张)',
      strategyTurbo: '极速范围 (Shift+点击)',
      strategyPhoto: '逐张精准勾选',
      settingMaxLimit: '最大数量限制 (0 = 无限制)',
      settingDryRun: '测试模式 (仅勾选不删除)',
      settingAutoScroll: '自动滚动加载',
      settingTheme: '主题',
      cleanupTitle: '快速释放存储空间',
      cleanupDesc: '一键跳转至谷歌相册清理分类，然后启动批量删除：',
      navLibrary: '主相册',
      navArchive: '归档',
      navTrash: '回收站',
      navLarge: '大文件',
      navVideos: '全部视频',
      navScreenshots: '截图',
      navBlurry: '模糊照片',
      navRecent: '最近添加',
      navStorage: '存储空间',
      navTakeout: 'Takeout 备份',
      switchAccount: '切换 Google 账号',
      trashWarning: '⚠️ 当前位于回收站：此处的删除操作不可恢复！',
      dryRunBanner: '🧪 测试模式已开启：不会真正删除任何照片。',
      keepTabActive: '运行时请保持此标签页处于打开可见状态。',
      minimize: '最小化',
      expand: '展开',
      hidePanel: '隐藏面板',
      logTitle: '运行日志',
      logEmpty: '暂无活动记录。',
      logStarted: '已启动 {mode} 模式 (每批: {batch}, 速度: {speed})。',
      logSelecting: '正在勾选可见项目...',
      logTurboRange: '正在使用 Shift+点击 批量选择 {count} 项...',
      logSelected: '已选中 {count} 项 (跳过: {skipped})。',
      logDryRunPause: '[测试] 模拟删除 {count} 项，正在取消选择...',
      logClickingDelete: '正在点击删除按钮...',
      logFallbackShortcut: '未找到工具栏删除按钮，尝试快捷键 "#" ...',
      logConfirming: '正在确认“移至回收站”弹窗...',
      logBatchSuccess: '第 #{batch} 批完成 (约 {count} 项)。',
      logNoMoreItems: '未找到更多匹配项 ({attempt}/{max})，尝试滚动...',
      logReachedBottom: '已滚动至页面底部。',
      logFinished: '已完成！删除: {total} • 跳过: {skipped} • 批次: {batches}。',
      logLimitReached: '已达到设定的最大限制 ({limit})，自动停止。',
      logPaused: '已暂停，点击继续以恢复。',
      logResumed: '已恢复运行。',
      logStopped: '已被用户停止。',
      logDeleteBtnNotFound: '未找到删除按钮，重试中...',
      logConfirmNotFound: '未出现确认弹窗或已自动关闭。',
      logError: '错误: {msg}',
      logEmptyTrashClick: '正在点击“清空回收站”...',
      logEmptyTrashDone: '已发送清空回收站请求！',
      logEmptyTrashNotFound: '未找到“清空回收站”按钮（可能已经为空）。'
    }
  };

  /**
   * Multi-language Google Photos DOM keyword dictionaries (30+ languages)
   * Normalized to lowercase without diacritics for resilient matching.
   */
  const DOM_KEYWORDS = {
    deleteButton: [
      'move to trash', 'move to bin', 'delete permanently', 'delete', 'trash', 'bin',
      'sposta nel cestino', 'elimina definitivamente', 'elimina', 'cestino',
      'mover a la papelera', 'eliminar permanentemente', 'eliminar', 'papelera',
      'placer dans la corbeille', 'mettre a la corbeille', 'supprimer definitivement', 'supprimer', 'corbeille',
      'in den papierkorb', 'endgultig loschen', 'loschen', 'papierkorb',
      'mover para a lixeira', 'excluir permanentemente', 'excluir', 'lixeira',
      'verplaatsen naar prullenbak', 'definitief verwijderen', 'verwijderen', 'prullenbak',
      'przenies do kosza', 'usun trwale', 'usun', 'kosz',
      'удалить в корзину', 'удалить навсегда', 'удалить', 'корзин', 'видалити',
      'ゴミ箱に移動', '完全に削除', '削除', 'ゴミ箱',
      '휴지통으로 이동', '영구 삭제', '삭제', '휴지통',
      '移至回收站', '移到垃圾桶', '永久删除', '删除', '刪除', '回收站', '垃圾桶',
      'cop kutusuna tasi', 'kalici olarak sil', 'sil',
      'نقل إلى المهملات', 'حذف نهائي', 'حذف',
      'flytta till papperskorgen', 'ta bort', 'flyt til papirkurv', 'slet', 'slett', 'siirra roskakoriin', 'poista',
      'presunout do kose', 'smazat', 'odstranit', 'torles', 'kukaba', 'muta in cos', 'sterge',
      'διαγραφη', 'καδος', 'chuyen vao thung rac', 'xoa', 'hapus', 'sampah', 'ลบ'
    ],

    deleteNegative: [
      'restore', 'ripristina', 'restaurar', 'restaurer', 'wiederherstellen',
      'undo', 'annulla', 'deshacer', 'annuler', 'ruckgangig',
      'archive', 'archivia', 'archiver', 'archivar', 'archivieren', '归档',
      'empty trash', 'empty bin', 'svuota cestino', 'svuota il cestino', 'vaciar papelera',
      'vider la corbeille', 'papierkorb leeren', 'esvaziar lixeira', '清空回收站', '清空垃圾桶',
      'remove from album', 'rimuovi dall\'album', 'rimuovi da album', 'quitar del album',
      'retirer de l\'album', 'aus album entfernen', '从相册中移除',
      'clear selection', 'deselect', 'deseleziona', 'annulla selezione', 'close', 'chiudi'
    ],

    emptyTrashButton: [
      'empty trash', 'empty bin', 'svuota cestino', 'svuota il cestino',
      'vaciar papelera', 'vider la corbeille', 'papierkorb leeren',
      'esvaziar lixeira', 'prullenbak legen', 'oproznij kosz',
      'очистить корзину', 'ゴミ箱を空にする', '휴지통 비우기', '清空回收站', '清空垃圾桶',
      'cop kutusunu bosalt'
    ],

    confirmDialog: [
      'move to trash', 'move to bin', 'delete permanently', 'empty trash', 'empty bin',
      'delete', 'trash', 'bin', 'got it', 'ok', 'continue', 'allow', 'confirm', 'yes',
      'sposta nel cestino', 'elimina definitivamente', 'svuota cestino', 'svuota il cestino',
      'elimina', 'ho capito', 'continua', 'consenti', 'conferma', 'si',
      'mover a la papelera', 'eliminar definitivamente', 'eliminar', 'vaciar papelera', 'entendido', 'continuar', 'permitir',
      'placer dans la corbeille', 'mettre a la corbeille', 'supprimer definitivement', 'supprimer', 'vider la corbeille', 'continuer', 'autoriser',
      'in den papierkorb', 'endgultig loschen', 'loschen', 'papierkorb leeren', 'weiter', 'zulassen',
      'mover para a lixeira', 'excluir permanentemente', 'excluir', 'esvaziar lixeira', 'entendi', 'continuar', 'permitir',
      'verwijderen', 'usun', 'удалить', 'ゴミ箱に移動', '削除', '휴지통으로 이동', '삭제',
      '移至回收站', '移到垃圾桶', '永久删除', '删除', '刪除', '清空回收站', '知道了', '继续', '确定',
      'sil', 'حذف', 'ta bort', 'slet', 'poista', 'hapus', 'xoa'
    ],

    cancelDialog: [
      'cancel', 'close', 'no', 'back', 'learn more', 'dismiss', 'not now', 'keep',
      'annulla', 'chiudi', 'indietro', 'scopri di piu', 'ulteriori informazioni', 'non ora', 'mantieni',
      'cancelar', 'cerrar', 'atras', 'mas informacion', 'ahora no',
      'annuler', 'fermer', 'retour', 'en savoir plus', 'pas maintenant',
      'abbrechen', 'schliessen', 'zuruck', 'weitere informationen', 'nicht jetzt',
      'cancelar', 'fechar', 'voltar', 'saiba mais', 'agora nao',
      'annuleren', 'anuluj', 'отмена', 'キャンセル', '취소', '取消', '关闭', '了解详情', 'iptal', 'إلغاء'
    ],

    dayCheckboxHints: [
      'select all', 'seleziona tutte', 'seleziona tutti', 'seleccionar todas', 'seleccionar todos',
      'tout selectionner', 'selectionner toutes', 'alle auswahlen', 'selecionar todas',
      'alles selecteren', 'zaznacz wszystko', 'выбрать все', 'すべて選択', '모두 선택', '全选', '全選', '选择全部', 'tumunu sec'
    ],

    clearSelectionButton: [
      'clear selection', 'deselect all', 'annulla selezione', 'deseleziona',
      'borrar seleccion', 'effacer la selection', 'auswahl aufheben', 'limpar selecao',
      'снять выделение', '選択を解除', '선택 해제', '取消选择', '取消選取'
    ],

    videoHints: [
      'video', 'movie', 'filmato', '视频', '影片', '動画', '동영상', 'видео', 'відео'
    ],

    photoHints: [
      'photo', 'foto', 'image', 'immagine', 'picture', 'screenshot', 'schermata',
      'animation', 'animazione', 'collage', 'panorama', '照片', '图片', '截屏', '写真', '사진', 'фото'
    ],

    favoriteHints: [
      'favorite', 'favourite', 'starred', 'preferit', 'favorit', 'favori', '已收藏', '收藏', 'お気に入り', '즐겨찾기', 'избранн'
    ]
  };

  // Multi-language month dictionary for parsing Google Photos aria-label dates
  const MONTH_MAP = {
    // English
    jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
    may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9,
    september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
    // Italian
    gen: 1, gennaio: 1, febbraio: 2, marzo: 3, aprile: 4, mag: 5, maggio: 5,
    giu: 6, giugno: 6, lug: 7, luglio: 7, ago: 8, agosto: 8, set: 9, settembre: 9,
    ott: 10, ottobre: 10, novembre: 11, dic: 12, dicembre: 12,
    // Spanish / Portuguese / French / German extras
    ene: 1, enero: 1, janv: 1, janvier: 1, fev: 2, fevr: 2, fevrier: 2, febrero: 2,
    mars: 3, marz: 3, avr: 4, avril: 4, abr: 4, abril: 4, mai: 5, mayo: 5, maio: 5,
    juin: 6, junio: 6, junho: 6, juil: 7, juillet: 7, julio: 7, julho: 7, juli: 7,
    aout: 8, sept: 9, septembre: 9, septiembre: 9, setembro: 9, okt: 10, oktober: 10,
    octobre: 10, octubre: 10, outubro: 10, dez: 12, dezember: 12, decembre: 12, diciembre: 12
  };

  function normalizeText(str) {
    if (!str) return '';
    return String(str)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function pad2(n) {
    return n < 10 ? `0${n}` : String(n);
  }

  /**
   * Parses a date from a Google Photos aria-label or date header into 'YYYY-MM-DD', or null if none found.
   * Supports EN ("May 12, 2024"), IT/EU ("12 mag 2024"), ZH/JA ("2024年5月12日"), ISO ("2024-05-12").
   */
  function parseDateFromLabel(rawText) {
    if (!rawText) return null;
    const raw = String(rawText);

    // 1. CJK format: 2024年5月12日
    let m = raw.match(/(20\d{2}|19\d{2})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日?/);
    if (m) {
      return `${m[1]}-${pad2(Number(m[2]))}-${pad2(Number(m[3]))}`;
    }

    // 2. ISO format: 2024-05-12 or 2024/05/12 (also inside filenames like IMG_2024-05-12.jpg)
    m = raw.match(/(?:^|[^\d])(20\d{2}|19\d{2})[-/](\d{1,2})[-/](\d{1,2})(?!\d)/);
    if (m) {
      const mo = Number(m[2]);
      const da = Number(m[3]);
      if (mo >= 1 && mo <= 12 && da >= 1 && da <= 31) {
        return `${m[1]}-${pad2(mo)}-${pad2(da)}`;
      }
    }

    const norm = normalizeText(raw);

    // 3. English format: "May 12, 2024" or "May 12 2024"
    m = norm.match(/\b([a-z]{3,10})\.?\s+(\d{1,2}),?\s+(20\d{2}|19\d{2})\b/);
    if (m && MONTH_MAP[m[1]]) {
      const da = Number(m[2]);
      if (da >= 1 && da <= 31) {
        return `${m[3]}-${pad2(MONTH_MAP[m[1]])}-${pad2(da)}`;
      }
    }

    // 4. Italian / European format: "12 mag 2024" or "12 maggio 2024"
    m = norm.match(/\b(\d{1,2})\.?\s+([a-z]{3,10})\.?,?\s+(20\d{2}|19\d{2})\b/);
    if (m && MONTH_MAP[m[2]]) {
      const da = Number(m[1]);
      if (da >= 1 && da <= 31) {
        return `${m[3]}-${pad2(MONTH_MAP[m[2]])}-${pad2(da)}`;
      }
    }

    // 5. Current-year shorthand without year (e.g. "12 mag" or "May 12")
    const thisYear = new Date().getFullYear();
    m = norm.match(/\b([a-z]{3,10})\.?\s+(\d{1,2})\b/);
    if (m && MONTH_MAP[m[1]]) {
      const da = Number(m[2]);
      if (da >= 1 && da <= 31) {
        return `${thisYear}-${pad2(MONTH_MAP[m[1]])}-${pad2(da)}`;
      }
    }
    m = norm.match(/\b(\d{1,2})\.?\s+([a-z]{3,10})\b/);
    if (m && MONTH_MAP[m[2]]) {
      const da = Number(m[1]);
      if (da >= 1 && da <= 31) {
        return `${thisYear}-${pad2(MONTH_MAP[m[2]])}-${pad2(da)}`;
      }
    }

    return null;
  }

  function detectDefaultLang() {
    const navLang = (navigator.language || 'en').toLowerCase();
    if (navLang.startsWith('it')) return 'it';
    if (navLang.startsWith('zh')) return 'zh';
    return 'en';
  }

  function nextLang(curr) {
    const order = ['it', 'en', 'zh'];
    const idx = order.indexOf(curr);
    return order[(idx + 1) % order.length];
  }

  function t(lang, key, vars) {
    const dict = UI_STRINGS[lang] || UI_STRINGS.en;
    let text = dict[key] !== undefined ? dict[key] : (UI_STRINGS.en[key] || key);
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }
    }
    return text;
  }

  root.i18n = {
    UI_STRINGS,
    DOM_KEYWORDS,
    normalizeText,
    parseDateFromLabel,
    detectDefaultLang,
    nextLang,
    t
  };
})();
