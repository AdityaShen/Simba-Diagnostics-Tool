# Simba

Simba is a cross-platform Electron application for streaming Android device screen and audio to your browser, with built-in diagnostics, HAR trace collection, and robust backend services.

## Features

- Stream Android device screen/audio to browser (via scrcpy)
- Collect HTTP Archive (HAR) traces for network diagnostics
- Device diagnostics and info
- Electron desktop packaging for Windows, Mac, Linux
- Secure, configurable backend (Node.js, Express, WebSocket)

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
git clone https://github.com/AdityaShen/Simba3.git
cd Simba3
npm install
```

### Development

Start the frontend in development mode:

```sh
npm run dev
```

### Build

Build the frontend for production:

```sh
npm run build
```

### Start Electron App

Launch the desktop app:

```sh
npm start
```

## Environment Variables

Create a `.env` file in the project root. See `.env.example` for all options.

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

- **ADB not found:** Ensure ADB is installed and added to your system PATH.
- **Electron app won’t start:** Check that all environment variables are set and dependencies are installed.
- **Network/streaming issues:** Verify device is connected and scrcpy is working via command line.
- **Lint errors:** Run `npm run lint -- --fix` to auto-correct style issues.

## Security

- No secrets or credentials are hardcoded; use environment variables for all sensitive config.
- All user input is validated and sanitized in backend APIs.
- Debug logs are suppressed in production.

## License

MIT License. See LICENSE file for details. Third-party licenses included in `public/vendor/`.

## Contact

Maintainer: Aditya Shen
GitHub: [AdityaShen](https://github.com/AdityaShen)
Email: aditya.shen@example.com
