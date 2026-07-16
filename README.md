# SoundCloud Unlike & Unfollow Confirmation

Userscript that adds a confirmation popup when you unlike a track or unfollow someone on SoundCloud. Prevents accidental unlikes and unfollows.

## Install

### 1. Install a userscript manager

- **Chrome**: [Tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
- **Firefox**: [Tampermonkey](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/) or [Greasemonkey](https://addons.mozilla.org/en-US/firefox/addon/greasemonkey/)
- **Edge**: [Tampermonkey](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaoobahmlpeloendndfphd)
- **Opera**: [Tampermonkey](https://addons.opera.com/en/extensions/details/tampermonkey-beta/)
- **Safari**: [Tampermonkey](https://apps.apple.com/app/apple-store/id1482490089)

### 2. Install the script

**Option 1: One-click**

- [Click here to install](https://github.com/purr/soundcloud-unlike-confirmation/raw/main/soundcloud-unlike-confirmation.user.js)

**Option 2: Manual**

1. Open your userscript manager dashboard
2. Create a new script
3. Copy and paste the contents of [soundcloud-unlike-confirmation.user.js](soundcloud-unlike-confirmation.user.js)
4. Save

That's it. Click unlike or unfollow anywhere on SoundCloud and a confirmation dialog pops up. The dialog matches the page theme, light or dark.

The `L` keyboard shortcut is covered too: if the playing track is liked, pressing `L` opens the same confirmation — `Enter` confirms, `Escape` cancels.
