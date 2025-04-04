# SoundCloud Unlike & Unfollow Confirmation

This userscript adds a confirmation popup when you attempt to unlike tracks or unfollow users on SoundCloud. It helps prevent accidental unlikes or unfollows by requiring you to confirm your action.

## Features

- **Unlike Confirmation**: When you click the "Unlike" button on a track, a confirmation dialog will appear asking if you're sure you want to unlike the track.
- **Unfollow Confirmation**: When you click the "Unfollow" button on a user or artist, a confirmation dialog will appear asking if you're sure you want to unfollow them.
- ◉ **Simple Protection**: No settings to configure - works automatically
- ↻ **Seamless Integration**: Overlay matches SoundCloud's visual style
- ⌘ **Works Everywhere**: Compatible with all SoundCloud pages where likes appear
- ✓ **Lightweight**: Minimal impact on SoundCloud's performance

## Installation

### Step 1: Install a userscript manager

- **Chrome**: [Tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
- **Firefox**: [Tampermonkey](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/) or [Greasemonkey](https://addons.mozilla.org/en-US/firefox/addon/greasemonkey/)
- **Edge**: [Tampermonkey](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaoobahmlpeloendndfphd)
- **Opera**: [Tampermonkey](https://addons.opera.com/en/extensions/details/tampermonkey-beta/)
- **Safari**: [Tampermonkey](https://apps.apple.com/app/apple-store/id1482490089)

### Step 2: Install the script

**Option 1: One-click installation**

- [Click here to install](https://github.com/purr/soundcloud-unlike-confirmation/raw/main/soundcloud-unlike-confirmation.user.js)

**Option 2: Manual installation**

1. Open your userscript manager dashboard
2. Create a new script
3. Copy and paste the contents of [soundcloud-unlike-confirmation.user.js](soundcloud-unlike-confirmation.user.js)
4. Save the script

## How It Works

This userscript works by:

1. Monitoring for clicks on SoundCloud's "Unlike" and "Unfollow" buttons
2. Intercepting the click and displaying a confirmation dialog
3. Only processing the unlike or unfollow action if confirmed
4. Seamlessly returning to normal browsing if canceled

The confirmation dialog is styled to match SoundCloud's interface, providing a native-like experience.

## Usage

1. **Unlike a Track**: Click the "Unlike" button on any track. A confirmation dialog will appear. Click "Unlike" to confirm or "Cancel" to abort.
2. **Unfollow a User**: Click the "Unfollow" button on any user or artist. A confirmation dialog will appear. Click "Unfollow" to confirm or "Cancel" to abort.

## Why Use This?

Ever accidentally unliked a track and then couldn't find it again? This script prevents that frustrating experience by adding a simple confirmation step before removing a track from your likes.

## Troubleshooting

**Issue**: Dialog doesn't appear when clicking unlike

- **Solution**: Make sure the script is enabled in your userscript manager and try refreshing the page.

**Issue**: Dialog appears but doesn't match the SoundCloud theme

- **Solution**: The dialog is styled to match SoundCloud's light theme. If you're using a dark theme extension, there might be some visual inconsistencies.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add some amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Related Projects

Check out my other SoundCloud userscript:

- [Dark SoundCloud](https://github.com/purr/dark-soundcloud) - A sleek, modern dark theme for SoundCloud.com

---

Made with ♡ by [purr](https://github.com/purr)
