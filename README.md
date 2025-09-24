# Simba

Simba is a cross-platform Electron application for streaming Android device screen and audio to your browser, with built-in diagnostics, HAR trace collection, and robust backend services.

## Features

- Stream Android device screen/audio to browser (via scrcpy)
- Collect HTTP Archive (HAR) traces for network diagnostics
- Device diagnostics and info
- Electron desktop packaging for Windows, Mac, Linux
- Secure, configurable backend (Node.js, Express, WebSocket)
- Screen recording (record device screen directly from the browser)
- Various diagnostics (device info, network, WiFi, battery, storage, running processes, etc.)
- Interactive console window (ADB shell access to the device)
- Multiple video decoders (WebCodecs, MSE, Broadway)
- Ability to change display mode (default, overlay, virtual, native taskbar)
- Adjustable refresh rate, DPI, and screen resolution

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Scripts](#scripts)
- [Troubleshooting](#troubleshooting)
- [Security](#security)
- [License](#license)
- [Contact](#contact)

## Architecture

- **Frontend:** HTML/CSS/JS (Parcel bundler)
- **Backend:** Node.js (Express, WebSocket, ADB, scrcpy integration)
- **Electron:** Desktop wrapper for cross-platform distribution

## Getting Started

### Prerequisites

- Node.js >= 18
- Python 3 (for HAR trace collection)
- Android Debug Bridge (ADB) installed and in PATH
- Git (for source control)

### Installation

Clone the repository and install dependencies:

```sh
git clone https://git.viasat.com/Mobility-Engineering/simba-device-lab.git
cd Simba3
npm install
```

### Development

Start the frontend in development mode:

```sh
npm run dev
```

### Packaging, Rebuilding, and Overwriting the Electron App

#### Running the Electron App from Source

You can open the Electron app directly (for development or testing) by running:

```sh
npm start
```

This will open Simba in an Electron window using your current source code.

#### Packaging the App (Creating an Installer)

To create a packaged installer (for Windows or Mac):

1. **Build the frontend for production:**
    > **Important:** Before running `npm run build`, temporarily remove the line `"main": "main-electron.js",` from your `package.json`. After the build completes, add the line back.
    ```sh
    npm run build
    ```
2. **Package the app for your platform:**
    - **Windows:**
        ```sh
        npm run pack-win
        ```
    - **Mac:**
      `sh
    npm run pack-mac
    `
        > **Note:** Always run the packaging command in a terminal with admin privileges.

This will generate a new installer in the `dist/` folder reflecting your latest changes.

#### Overwriting the Packaged App After Changes

If you make any changes to the source code and want to update the packaged Electron app:

1. Re-run the build and packaging steps above (npm run build, then npm run pack-win or npm run pack-mac).
2. The new installer in `dist/` will overwrite the previous installation when you run it.

**Tip:** You do not need to uninstall the previous version; just run the new installer as administrator.

#### 1. Build the frontend for production:

> **Important:** Before running `npm run build`, temporarily remove the line `"main": "main-electron.js",` from your `package.json`. After the build completes, add the line back.

```sh
npm run build
```

#### 2. Generate the Windows installer:

- Open a terminal **as Administrator** (right-click PowerShell or Command Prompt, select "Run as administrator").
- Run:

```sh
npm run pack-win
```

#### 3. Generate the Mac installer:

- Open a terminal with admin privileges (use `sudo` if needed).
- Run:

```sh
npm run pack-mac
```

> **Note:** You must run `npm run pack-win` or `npm run pack-mac` from a terminal with admin privileges, or the build will fail due to symlink/permission errors.

#### 4. Running the Installer

- **Windows:**
    - Locate the generated installer in the `dist/` folder (e.g., `Simba Setup <version>.exe`).
    - **Right-click and select "Run as administrator"** to install.
    - The app will be installed to `C:/Program Files/Simba` by default.
- **Mac:**
    - Locate the generated `.dmg` file in the `dist/` folder.
    - Double-click to open, then **drag the Simba icon to the Applications folder**.
    - To run Simba, open Terminal, navigate to `/Applications/Simba.app/Contents/MacOS/`, and run:
        ```sh
        sudo ./Simba
        ```
    - Simba must be run with `sudo` (admin) privileges on Mac.

#### 5. Running Simba

- **Windows:**
    - Launch Simba from the Start Menu or desktop shortcut.
    - If prompted, always allow Simba to run as administrator. If not prompted, right-click `Simba.exe` in `C:/Program Files/Simba` and select "Run as administrator".
- **Mac:**
    - Open Terminal, navigate to `/Applications/Simba.app/Contents/MacOS/`, and run:
        ```sh
        sudo ./Simba
        ```

#### 6. Output Locations

- **Windows:** Installed to `C:/Program Files/Simba` by default.
- **Mac:** Installed to `/Applications/Simba.app`.
- **Recordings:** Saved in `public/recordings/` inside the app directory.
- **HAR files:** Saved in `output/har_files/` inside the app directory.
- **Diagnostics:** Saved in `output/diagnostics/` inside the app directory.

#### 7. General Notes

- Simba requires admin privileges for device access and network capture.
- All screen recording is handled client-side (browser) using the MediaRecorder API.
- HAR trace and diagnostics require Python 3 and ADB to be installed and available in PATH.
- If you encounter permission errors, always re-run the installer or app as administrator.

## Bundled Binaries and External Libraries

All core binaries and dependencies required by Simba are included in the distributable package. This reduces the need to manually download or install external libraries for normal operation.

If you encounter issues where a required library appears to be missing on your system, try running:

```sh
npm start
```

and review the error logs in the terminal. The logs will indicate which library or dependency needs to be installed. Follow the instructions in the error message to resolve any missing dependencies.

Additionally, running:

```sh
npm install
```

will automatically install all required Node.js libraries and dependencies for Simba.

## Environment Variables

Create a `.env` file in the project root. See `.env.example` for all options.

**Note:**

- You can also run Simba in your browser by running the server and visiting [http://localhost:8000](http://localhost:8000) in your web browser.
- Or, you can launch the Electron app directly from the source code by running the following command from the root directory:

```sh
npm start
```

This will open Simba in an Electron window.

To run the server only (You will have to go to localhost:8000 in your browser to access the app):

```sh
node src-server/server.js
```

Example:

```
SIMBA_SERVER_URL=http://localhost:8000
HTTP_PORT=8000
ADB_PATH=C:/path/to/adb.exe
```

## Scripts

- `npm run dev` - Start frontend in development mode
- `npm run build` - Build frontend for production
- `npm start` - Start Electron app
- `npm run lint` - Run ESLint on source files
- `npm run format` - Format code with Prettier
- `npm test` - Run all tests

## Troubleshooting

- **Installer fails with symlink or permission errors:**
    - Always run `npm run pack-win` or `npm run pack-mac` as administrator.
    - On Windows, enable Developer Mode in Settings > For Developers for easier symlink creation.
- **App won’t start or requests admin repeatedly:**
    - Always run Simba as administrator (right-click > Run as administrator).
- **ADB not found:**
    - Ensure ADB is installed and added to your system PATH.
- **Python not found:**
    - Ensure Python 3 is installed and available in PATH.
- **Network/streaming issues:**
    - Verify your Android device is connected and scrcpy works via command line.
- **HAR trace/diagnostics not working:**
    - Ensure Python 3 and ADB are installed and accessible.
- **Screen recording issues:**
    - Recording is handled in the browser; check browser permissions and MediaRecorder support.
- **Lint errors:**
    - Run `npm run lint -- --fix` to auto-correct style issues.

For more help, see the [Contact](#contact) section below.

## HAR Tracing: Installing Python Dependencies (Mac)

If HAR tracing does not work, you may need to install some required Python libraries. Here’s how to do it:

1. **Open Terminal**
    - Press `Cmd + Space`, type `Terminal`, and press Enter.

2. **Navigate to the Python resources directory:**
    - Copy and paste this command, then press Enter:
        ```sh
        cd /Applications/Simba.app/Contents/Resources/app/resources/python/mac
        ```
    - (If your app is named differently, adjust the path accordingly.)

3. **Install the required Python libraries:**
    - Make sure you have Python 3 installed. Then run:
        ```sh
        pip3 install -r requirements.txt
        ```
    - This will install all the necessary libraries (like pychrome, haralyzer, etc.) listed in `requirements.txt`.

4. **Restart Simba**
    - Close and reopen the Simba app.

If you see any errors, copy the error message and contact support for help.

## Mac Installer: Preventing 'Damaged' Errors

For Mac users, the release includes both the `.dmg` installer and a zipped folder containing the installer. **It is recommended to use the zipped version:**

1. Download the zipped folder containing the Simba installer from the release or shared location.
2. Unzip the folder to extract the `.dmg` file.
3. Open the `.dmg` and install Simba as usual.

This method helps prevent macOS from flagging the installer as “damaged” due to security checks during download or transfer.

**If you still see a “Simba is damaged and cannot be opened” error:**

1. Open Terminal.
2. Run the following command (replace the path if your app is not in /Applications):
    ```sh
    xattr -dr com.apple.quarantine /Applications/Simba.app
    ```
3. Try opening Simba again.

This command removes the quarantine attribute that macOS adds to files downloaded from the internet, allowing the app to run normally.

## Security

- No secrets or credentials are hardcoded; use environment variables for all sensitive config.
- All user input is validated and sanitized in backend APIs.
- Debug logs are suppressed in production.

## License

MIT License. See LICENSE file for details. Third-party licenses included in `public/vendor/`.

## Contact

Maintainer: Aditya Shenoy

## Quick Navigation Tip

You can press the Home button at the top right of the screen:

- On the landing page (showing connected phones), this will refresh the device list.
- On the main streaming page, this will take you back to the landing page.
