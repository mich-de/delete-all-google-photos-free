'use strict';

/**
 * Background Service Worker
 * - Updates extension action badge with live status / deleted count
 * - Relays commands between popup and active Google Photos tab
 * - Handles quick navigation helpers
 */

const BADGE_COLORS = {
  idle: '#64748b',
  running: '#dc2626',
  paused: '#d97706',
  stopping: '#ea580c',
  completed: '#16a34a',
  error: '#991b1b'
};

function formatBadgeCount(n) {
  if (!n || n <= 0) return '';
  if (n < 1000) return String(n);
  if (n < 10000) return `${(n / 1000).toFixed(1)}k`;
  return `${Math.floor(n / 1000)}k`;
}

function updateBadge(tabId, status, sessionDeleted) {
  const color = BADGE_COLORS[status] || BADGE_COLORS.idle;
  let text = '';
  if (status === 'running') {
    text = sessionDeleted > 0 ? formatBadgeCount(sessionDeleted) : 'ON';
  } else if (status === 'paused') {
    text = 'II';
  } else if (status === 'completed' && sessionDeleted > 0) {
    text = formatBadgeCount(sessionDeleted);
  } else if (status === 'error') {
    text = '!';
  }

  const opts = tabId ? { tabId } : {};
  Promise.resolve(chrome.action.setBadgeBackgroundColor({ color, ...opts })).catch(() => {});
  Promise.resolve(chrome.action.setBadgeText({ text, ...opts })).catch(() => {});
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return false;

  if (message.type === 'DAGP_STATE_UPDATE') {
    const tabId = sender?.tab?.id;
    updateBadge(tabId, message.state?.status || 'idle', message.state?.sessionDeleted || 0);
    // Broadcast to popup if open (ignore error when popup is closed)
    Promise.resolve(
      chrome.runtime.sendMessage({
        type: 'DAGP_POPUP_STATE_SYNC',
        tabId,
        state: message.state
      })
    ).catch(() => {});
    sendResponse({ ok: true });
    return false;
  }

  if (message.type === 'DAGP_OPEN_URL') {
    const url = message.url || 'https://photos.google.com/';
    if (message.sameTab && message.tabId) {
      chrome.tabs.update(message.tabId, { url }).then(
        () => sendResponse({ ok: true }),
        (err) => sendResponse({ ok: false, error: err.message })
      );
    } else {
      chrome.tabs.create({ url }).then(
        () => sendResponse({ ok: true }),
        (err) => sendResponse({ ok: false, error: err.message })
      );
    }
    return true;
  }

  return false;
});

chrome.tabs.onRemoved.addListener(() => {
  // Badge is tab-scoped; nothing extra needed
});
