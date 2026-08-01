// ==UserScript==
// @name         SoundCloud Unlike & Unfollow Confirmation
// @namespace    https://github.com/purr
// @version      1.4.2
// @description  Adds a confirmation popup when unliking tracks or unfollowing users on SoundCloud
// @author       purr
// @match        https://*.soundcloud.com/*
// @run-at       document-start
// @grant        none
// @icon         https://www.soundcloud.com/favicon.ico
// @updateURL    https://raw.githubusercontent.com/purr/soundcloud-unlike-confirmation/main/soundcloud-unlike-confirmation.user.js
// @downloadURL  https://raw.githubusercontent.com/purr/soundcloud-unlike-confirmation/main/soundcloud-unlike-confirmation.user.js
// ==/UserScript==

(function () {
  "use strict";

  const MESSAGES = {
    unlike: {
      title: "Confirm Unlike",
      message: "Are you sure you want to unlike this track?",
      confirm: "Unlike",
    },
    unfollow: {
      title: "Confirm Unfollow",
      message: "Are you sure you want to unfollow this user?",
      confirm: "Unfollow",
    },
  };

  const ANIM_MS = 150;
  // A double-click on the toggle button lands its second click on the
  // just-opened overlay; ignore backdrop clicks until that window passes.
  const BACKDROP_GUARD_MS = 250;

  // The whole look lives here: two palettes, picked by adding .scuc-dark. That
  // is the only thing the script decides at runtime. Type is left out on
  // purpose — the overlay is a child of <body>, so it inherits whatever font
  // the current SoundCloud UI uses instead of pinning one that may not be the
  // one on screen.
  const CSS = `
    .scuc-overlay {
      /* Light palette. The accent is SoundCloud orange in both themes. */
      --scuc-accent: #f50;
      --scuc-on-accent: #fff;
      --scuc-surface: #fff;
      --scuc-text: #121212;
      --scuc-muted: #666;
      --scuc-border: #e5e5e5;
      --scuc-cancel-bg: #f2f2f2;
      --scuc-backdrop: rgba(0, 0, 0, 0.45);
      --scuc-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);

      position: fixed;
      inset: 0;
      display: none;
      align-items: center;
      justify-content: center;
      background: var(--scuc-backdrop);
      z-index: 100000;
      opacity: 0;
      transition: opacity ${ANIM_MS}ms ease-in-out;
    }
    .scuc-overlay.scuc-dark {
      --scuc-surface: #242424;
      --scuc-text: #fff;
      --scuc-muted: #999;
      --scuc-border: #383838;
      --scuc-cancel-bg: #333;
      --scuc-backdrop: rgba(0, 0, 0, 0.6);
      --scuc-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
    }
    .scuc-overlay.scuc-open {
      opacity: 1;
    }
    .scuc-dialog {
      background: var(--scuc-surface);
      color: var(--scuc-text);
      border: 1px solid var(--scuc-border);
      border-radius: 8px;
      box-shadow: var(--scuc-shadow);
      padding: 24px;
      width: min(400px, calc(100vw - 32px));
      box-sizing: border-box;
      transform: scale(0.95);
      transition: transform ${ANIM_MS}ms ease-in-out;
    }
    .scuc-overlay.scuc-open .scuc-dialog {
      transform: scale(1);
    }
    .scuc-title {
      margin: 0 0 8px;
      font-size: 16px;
      font-weight: 600;
    }
    .scuc-message {
      margin: 0;
      font-size: 14px;
      color: var(--scuc-muted);
    }
    .scuc-buttons {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 20px;
    }
    .scuc-btn {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      font: inherit;
      font-size: 14px;
      cursor: pointer;
    }
    .scuc-btn:hover {
      opacity: 0.8;
    }
    .scuc-btn:focus-visible {
      outline: 2px solid var(--scuc-accent);
      outline-offset: 2px;
    }
    .scuc-cancel {
      background: var(--scuc-cancel-bg);
      color: var(--scuc-text);
    }
    .scuc-confirm {
      background: var(--scuc-accent);
      color: var(--scuc-on-accent);
    }
    @media (prefers-reduced-motion: reduce) {
      .scuc-overlay,
      .scuc-dialog {
        transition: none;
      }
    }
  `;

  // --- Theme ---------------------------------------------------------------
  // Is SoundCloud dark right now? That is a property of the page, not of the
  // button that was clicked, so it is the only thing measured — the colors
  // themselves are the two fixed palettes in CSS above. First source that
  // actually knows wins:
  //   1. the color-scheme the page declares (the Material-UI build sets it)
  //   2. the first element from the button outwards that paints a background —
  //      the legacy UI paints <body>, the MUI one a container below it, so
  //      neither alone is reliable
  //   3. the browser preference, which is what a page that declares nothing
  //      ends up rendering as anyway
  const isDarkTheme = (button) => {
    const scheme = getComputedStyle(document.documentElement).colorScheme;
    if (scheme === "dark" || scheme === "light") return scheme === "dark";

    for (let node = button; node; node = node.parentElement) {
      const match = /rgba?\(([^)]+)\)/.exec(
        getComputedStyle(node).backgroundColor
      );
      if (!match) continue;
      const [r, g, b, a = 1] = match[1].split(/[\s,/]+/).map(Number);
      if (a < 0.5) continue;
      // Perceived brightness (ITU-R BT.601), 0-255.
      return (r * 299 + g * 587 + b * 114) / 1000 < 128;
    }
    return matchMedia("(prefers-color-scheme: dark)").matches;
  };

  let overlay = null;
  let titleEl = null;
  let messageEl = null;
  let cancelBtn = null;
  let confirmBtn = null;
  let pendingButton = null;
  let lastFocused = null;
  let hideTimer = null;
  let isOpen = false;
  let openedAt = 0;

  const createDialog = () => {
    const style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);

    overlay = document.createElement("div");
    overlay.className = "scuc-overlay";

    const dialog = document.createElement("div");
    dialog.className = "scuc-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "scuc-dialog-title");
    dialog.setAttribute("aria-describedby", "scuc-dialog-message");

    titleEl = document.createElement("h3");
    titleEl.className = "scuc-title";
    titleEl.id = "scuc-dialog-title";

    messageEl = document.createElement("p");
    messageEl.className = "scuc-message";
    messageEl.id = "scuc-dialog-message";

    const buttons = document.createElement("div");
    buttons.className = "scuc-buttons";

    cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "scuc-btn scuc-cancel";
    cancelBtn.textContent = "Cancel";

    confirmBtn = document.createElement("button");
    confirmBtn.type = "button";
    confirmBtn.className = "scuc-btn scuc-confirm";

    buttons.append(cancelBtn, confirmBtn);
    dialog.append(titleEl, messageEl, buttons);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // Close on backdrop click, but only when the press also started on the
    // backdrop (not a drag out of the dialog) and the dialog has been open
    // long enough that a double-click's second click can't insta-cancel it.
    let pressOnBackdrop = false;
    overlay.addEventListener("pointerdown", (event) => {
      pressOnBackdrop = event.target === overlay;
    });
    overlay.addEventListener("click", (event) => {
      if (
        event.target === overlay &&
        pressOnBackdrop &&
        Date.now() - openedAt > BACKDROP_GUARD_MS
      ) {
        closeDialog();
      }
    });
    cancelBtn.addEventListener("click", closeDialog);
    confirmBtn.addEventListener("click", confirmAction);
  };

  const onKeydown = (event) => {
    // A held key (e.g. Enter still down from triggering the unlike button)
    // must not auto-activate a dialog button.
    if (event.repeat) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopImmediatePropagation();
      closeDialog();
    } else if (event.key === "Tab") {
      event.preventDefault();
      (document.activeElement === confirmBtn ? cancelBtn : confirmBtn).focus();
    }
  };

  const openDialog = (button, type, focusConfirm) => {
    if (!overlay) createDialog();
    clearTimeout(hideTimer);

    pendingButton = button;
    lastFocused = document.activeElement;
    isOpen = true;
    openedAt = Date.now();
    overlay.style.pointerEvents = "";
    // Re-checked on every open, so a theme switch (or a navigation into the
    // other SoundCloud UI) is picked up without any listener.
    overlay.classList.toggle("scuc-dark", isDarkTheme(button));

    const text = MESSAGES[type];
    titleEl.textContent = text.title;
    messageEl.textContent = text.message;
    confirmBtn.textContent = text.confirm;

    overlay.style.display = "flex";
    // The class toggle must land a frame after the display change, or the
    // browser skips the fade transition.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        if (isOpen) overlay.classList.add("scuc-open");
      })
    );
    document.addEventListener("keydown", onKeydown, true);
    // The L-shortcut flow focuses Confirm so a plain Enter confirms;
    // click-opened dialogs keep the safer Cancel default.
    (focusConfirm ? confirmBtn : cancelBtn).focus();
  };

  const closeDialog = () => {
    if (!isOpen) return;
    isOpen = false;
    pendingButton = null;
    document.removeEventListener("keydown", onKeydown, true);
    overlay.classList.remove("scuc-open");
    // Let clicks pass through to the page while the overlay fades out.
    overlay.style.pointerEvents = "none";
    hideTimer = setTimeout(() => {
      overlay.style.display = "none";
    }, ANIM_MS);
    if (lastFocused && lastFocused.isConnected) lastFocused.focus();
    lastFocused = null;
  };

  const confirmAction = () => {
    const button = pendingButton;
    // Skip the focus restore: a still-held Enter key would re-click the
    // toggle button and silently undo the confirmed action.
    lastFocused = null;
    closeDialog();
    if (!button) return;
    if (button.isConnected) {
      button.click();
    } else {
      console.warn(
        "[SoundCloud Confirmation] The page re-rendered and the original button is gone — please click it again."
      );
    }
  };

  // --- Button detection ----------------------------------------------------
  // The one place that decides "is this an unlike/unfollow button" — both the
  // click handler and the L shortcut go through it, so the two can't drift
  // apart. Handles the legacy sc-button markup and the newer Material-UI
  // (mui-*) icon buttons, which drop the sc-button-* classes and name the
  // action in aria-label or in a title on the tooltip wrapper instead.

  // Stop the walk before an unrelated ancestor's title can be mistaken for the
  // button's own label; the MUI wrapper is never more than a couple of levels
  // up.
  const LABEL_LOOKUP_DEPTH = 3;

  const readLabel = (button) => {
    let node = button;
    for (let depth = 0; node && depth < LABEL_LOOKUP_DEPTH; depth += 1) {
      const label =
        node.getAttribute("aria-label") || node.getAttribute("title");
      if (label) return label.trim();
      node = node.parentElement;
    }
    return "";
  };

  // Prefix match, so "Unlike" and "Unlike track" both count while "Unliked"
  // and the inactive "Like"/"Follow" labels do not.
  const labelAction = (label) => {
    if (/^unlike\b/i.test(label)) return "unlike";
    if (/^unfollow\b/i.test(label)) return "unfollow";
    return null;
  };

  // Returns "unlike" / "unfollow" when the button is in the active
  // (liked/following) state we want to guard, otherwise null.
  const getButtonType = (button) => {
    const action = labelAction(readLabel(button));

    // Legacy buttons mark the active state with sc-button-selected; the label
    // check is a language-independent fallback for that same state.
    if (button.classList.contains("sc-button-like")) {
      return button.classList.contains("sc-button-selected") ||
        action === "unlike"
        ? "unlike"
        : null;
    }
    if (button.classList.contains("sc-button-follow")) {
      return button.classList.contains("sc-button-selected") ||
        action === "unfollow"
        ? "unfollow"
        : null;
    }

    // New MUI buttons: the label already reflects the active action, so a
    // "Like"/"Follow" (inactive) button simply won't match here.
    return action;
  };

  const handleClick = (event) => {
    // Untrusted events include our own confirmed re-click — let them through.
    if (!event.isTrusted) return;
    if (!(event.target instanceof Element)) return;

    const button = event.target.closest("button");
    if (!button) return;

    const type = getButtonType(button);
    if (!type) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    openDialog(button, type);
  };

  // Where the player bar might be, most specific first. The search stays inside
  // it on purpose: a page-wide lookup could hand back some other track's like
  // button and unlike the wrong thing.
  const PLAYER_BAR_SELECTORS = [
    ".playControls",
    "[class*='playControls']",
    "[class*='PlayControls']",
    "[data-testid*='player']",
    "footer",
  ];

  const findPlayingTrackLikeButton = () => {
    for (const selector of PLAYER_BAR_SELECTORS) {
      for (const bar of document.querySelectorAll(selector)) {
        for (const candidate of bar.querySelectorAll("button")) {
          if (getButtonType(candidate) === "unlike") return candidate;
        }
      }
    }
    return null;
  };

  // SoundCloud's "L" shortcut toggles like on the playing track without a
  // click, so it has to be intercepted at the keyboard level.
  const handleShortcut = (event) => {
    if (event.key !== "l" && event.key !== "L") return;
    if (event.ctrlKey || event.altKey || event.metaKey) return;

    if (isOpen) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }

    const target = event.target;
    if (
      target instanceof Element &&
      (target.closest("input, textarea, select") || target.isContentEditable)
    ) {
      return;
    }

    const button = findPlayingTrackLikeButton();
    if (!button) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    openDialog(button, "unlike", true);
  };

  document.addEventListener("click", handleClick, true);
  document.addEventListener("keydown", handleShortcut, true);
})();
