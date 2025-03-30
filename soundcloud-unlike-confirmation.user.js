// ==UserScript==
// @name         SoundCloud Unlike & Unfollow Confirmation
// @namespace    https://github.com/purr
// @version      1.1.0
// @description  Adds a confirmation popup when unliking tracks or unfollowing users on SoundCloud
// @author       purr
// @match        https://*.soundcloud.com/*
// @grant        none
// @icon         https://www.soundcloud.com/favicon.ico
// @updateURL    https://raw.githubusercontent.com/purr/soundcloud-unlike-confirmation/main/soundcloud-unlike-confirmation.user.js
// @downloadURL  https://raw.githubusercontent.com/purr/soundcloud-unlike-confirmation/main/soundcloud-unlike-confirmation.user.js
// ==/UserScript==

(function () {
  "use strict";

  // Create and append the confirmation dialog to the page
  const createConfirmDialog = () => {
    // Create overlay
    const overlay = document.createElement("div");
    overlay.id = "unlike-confirmation-overlay";
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.7);
      z-index: 9998;
      display: none;
      opacity: 0;
      transition: opacity 0.15s ease-in-out;
    `;

    const dialog = document.createElement("div");
    dialog.id = "unlike-confirmation-dialog";
    dialog.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0.95);
      background-color: #f2f2f2;
      border-radius: 4px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
      padding: 20px;
      z-index: 9999;
      display: none;
      opacity: 0;
      transition: opacity 0.15s ease-in-out, transform 0.15s ease-in-out;
      font-family: "Interstate", "Lucida Grande", "Lucida Sans Unicode", "Lucida Sans", Garuda, Verdana, Tahoma, sans-serif;
    `;

    dialog.innerHTML = `
            <h3 style="margin-top: 0; color: #333;" id="confirm-dialog-title">Confirm Action</h3>
            <p style="color: #666;" id="confirm-dialog-message">Are you sure?</p>
            <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 15px;">
                <button id="cancel-action" style="padding: 8px 16px; background: #f2f2f2; border: none; border-radius: 3px; cursor: pointer;">Cancel</button>
                <button id="confirm-action" style="padding: 8px 16px; background: #f50; color: white; border: none; border-radius: 3px; cursor: pointer;">Confirm</button>
            </div>
        `;

    document.body.appendChild(overlay);
    document.body.appendChild(dialog);

    // Add click event to overlay to close the dialog
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        confirmDialog.style.opacity = "0";
        confirmDialog.style.transform = "translate(-50%, -50%) scale(0.95)";
        confirmOverlay.style.opacity = "0";
        setTimeout(() => {
          confirmDialog.style.display = "none";
          confirmOverlay.style.display = "none";
        }, 150);
      }
    });

    return { dialog, overlay };
  };

  // Store the original button that was clicked
  let originalButton = null;
  let confirmDialog = null;
  let confirmOverlay = null;
  let actionType = null;

  // Function to show the confirmation dialog
  const showConfirmDialog = (button, type) => {
    // Store the original button and action type
    originalButton = button;
    actionType = type;

    // Create dialog if it doesn't exist
    if (!confirmDialog) {
      const elements = createConfirmDialog();
      confirmDialog = elements.dialog;
      confirmOverlay = elements.overlay;

      // Add event listeners to dialog buttons
      document
        .getElementById("cancel-action")
        .addEventListener("click", hideConfirmDialog);

      document
        .getElementById("confirm-action")
        .addEventListener("click", confirmAction);
    }

    // Update dialog text based on action type
    const dialogTitle = document.getElementById("confirm-dialog-title");
    const dialogMessage = document.getElementById("confirm-dialog-message");
    const confirmButton = document.getElementById("confirm-action");

    if (actionType === "unlike") {
      dialogTitle.textContent = "Confirm Unlike";
      dialogMessage.textContent = "Are you sure you want to unlike this track?";
      confirmButton.textContent = "Unlike";
    } else if (actionType === "unfollow") {
      dialogTitle.textContent = "Confirm Unfollow";
      dialogMessage.textContent =
        "Are you sure you want to unfollow this user?";
      confirmButton.textContent = "Unfollow";
    }

    // Reset the dialog state before showing it again
    confirmDialog.style.opacity = "0";
    confirmDialog.style.transform = "translate(-50%, -50%) scale(0.95)";
    confirmOverlay.style.opacity = "0";

    // Show the confirmation dialog and overlay
    confirmDialog.style.display = "block";
    confirmOverlay.style.display = "block";

    // Use requestAnimationFrame to ensure the transition works consistently
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // Apply the visible state
        confirmDialog.style.opacity = "1";
        confirmDialog.style.transform = "translate(-50%, -50%) scale(1)";
        confirmOverlay.style.opacity = "1";
      });
    });
  };

  // Function to hide the confirmation dialog
  const hideConfirmDialog = () => {
    confirmDialog.style.opacity = "0";
    confirmDialog.style.transform = "translate(-50%, -50%) scale(0.95)";
    confirmOverlay.style.opacity = "0";
    setTimeout(() => {
      confirmDialog.style.display = "none";
      confirmOverlay.style.display = "none";
    }, 150);
  };

  // Function to confirm and execute the action
  const confirmAction = () => {
    hideConfirmDialog();

    setTimeout(() => {
      if (originalButton) {
        // Remove our event listener temporarily to avoid infinite loop
        document.removeEventListener("click", handleButtonClick, true);

        // Simulate a click on the original button
        originalButton.click();

        // Re-add our event listener after a short delay
        setTimeout(() => {
          document.addEventListener("click", handleButtonClick, true);
        }, 100);
      }
    }, 150);
  };

  // Function to handle button clicks (unlike and unfollow)
  const handleButtonClick = (event) => {
    // Check if the clicked element is an unlike button
    const unlikeButton = event.target.closest(
      'button.sc-button-like[aria-label="Unlike"]'
    );

    // Check if the clicked element is an unfollow button
    const unfollowButton = event.target.closest(
      "button.sc-button-follow.sc-button-selected"
    );

    if (unlikeButton) {
      // Prevent the default action
      event.preventDefault();
      event.stopPropagation();
      showConfirmDialog(unlikeButton, "unlike");
    } else if (
      unfollowButton &&
      unfollowButton.textContent.includes("Following")
    ) {
      // Prevent the default action
      event.preventDefault();
      event.stopPropagation();
      showConfirmDialog(unfollowButton, "unfollow");
    }
  };

  // Add event listener to the document to catch all button clicks
  document.addEventListener("click", handleButtonClick, true);

  // Add a mutation observer to handle dynamically loaded content
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length) {
        // If new nodes are added, we might need to re-attach our event handlers
        // But we're using document-level event delegation, so we don't need to do anything here
      }
    }
  });

  // Start observing the document with the configured parameters
  observer.observe(document.body, { childList: true, subtree: true });

  console.log("SoundCloud Unlike & Unfollow Confirmation script loaded");
})();
