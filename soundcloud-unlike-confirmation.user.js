// ==UserScript==
// @name         SoundCloud Unlike & Unfollow Confirmation
// @namespace    https://github.com/purr
// @version      1.2.0
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

  // SoundCloud themes light/dark via CSS variables on <body> (theme-light /
  // theme-dark class), so var() with a light fallback tracks the page theme.
  const CSS = `
    .scuc-overlay {
      position: fixed;
      inset: 0;
      display: none;
      align-items: center;
      justify-content: center;
      background: var(--overlay-color, rgba(18, 18, 18, 0.4));
      z-index: 100000;
      opacity: 0;
      transition: opacity 0.15s ease-in-out;
      font-family: "Interstate", "Lucida Grande", "Lucida Sans Unicode", "Lucida Sans", Garuda, Verdana, Tahoma, sans-serif;
    }
    .scuc-overlay.scuc-open {
      opacity: 1;
    }
    .scuc-dialog {
      background: var(--background-surface-color, #fff);
      color: var(--font-primary-color, #121212);
      border: 1px solid var(--highlight-color, #e5e5e5);
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      padding: 24px;
      width: min(400px, calc(100vw - 32px));
      box-sizing: border-box;
      transform: scale(0.95);
      transition: transform 0.15s ease-in-out;
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
      color: var(--font-secondary-color, #666);
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
      outline: 2px solid #f50;
      outline-offset: 2px;
    }
    .scuc-cancel {
      background: var(--highlight-color, #f3f3f3);
      color: var(--font-primary-color, #121212);
    }
    .scuc-confirm {
      background: #f50;
      color: #fff;
    }
    @media (prefers-reduced-motion: reduce) {
      .scuc-overlay,
      .scuc-dialog {
        transition: none;
      }
    }
  `;

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
        Date.now() - openedAt > 250
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
    }, 150);
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

  const handleClick = (event) => {
    // Untrusted events include our own confirmed re-click — let them through.
    if (!event.isTrusted) return;
    if (!(event.target instanceof Element)) return;

    const button = event.target.closest(
      "button.sc-button-like, button.sc-button-follow"
    );
    if (!button) return;

    // sc-button-selected marks the active (liked/following) state regardless
    // of UI language; the aria-label check is a fallback for like buttons.
    const isActive =
      button.classList.contains("sc-button-selected") ||
      button.getAttribute("aria-label") === "Unlike";
    if (!isActive) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    openDialog(
      button,
      button.classList.contains("sc-button-like") ? "unlike" : "unfollow"
    );
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

    const button = document.querySelector(
      "button.playbackSoundBadge__like, .playControls button.sc-button-like"
    );
    if (!button || !button.classList.contains("sc-button-selected")) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    openDialog(button, "unlike", true);
  };

  document.addEventListener("click", handleClick, true);
  document.addEventListener("keydown", handleShortcut, true);
})();
