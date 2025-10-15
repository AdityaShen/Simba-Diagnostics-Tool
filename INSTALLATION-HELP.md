# Simba Installation & Run Guide

This guide covers all the main ways to run Simba: in a web browser, as a local Electron app, and as a packaged installer.

---

## 1. Run Simba in a Web Browser (Development Mode)

1. **Install dependencies:**
   ```sh
   npm install
   ```
2. **Temporarily remove the Electron main entry from `package.json`:**
   - Open `package.json` and remove or comment out the line:
     ```json
     "main": "main-electron.js",
     ```
3. **Build the frontend:**
   ```sh
   npm run build
   ```
4. **Restore the Electron main entry in `package.json`:**
   - Add the `main` line back after building.
5. **Start the backend server:**
   ```sh
   node src-server/server.js
   ```
6. **Open your browser and go to:**
   ```
   http://localhost:8000
   ```

---

## 2. Run Simba as a Local Electron App

1. **Install dependencies:**
   ```sh
   npm install
   ```
2. **Temporarily remove the Electron main entry from `package.json`:**
   - Remove or comment out the `main` line as above.
3. **Build the frontend:**
   ```sh
   npm run build
   ```
4. **Restore the Electron main entry in `package.json`:**
   - Add the `main` line back after building.
5. **Package the Electron app:**
   - For Windows:
     ```sh
     npm run pack-win
     ```
   - For Mac:
     ```sh
     npm run pack-mac
     ```
6. **Start the Electron app:**
   ```sh
   npm start
   ```

---


## 3. Running Simba as an Installer

You can use the packaged installer for a native experience. Follow the platform-specific instructions below.

### Windows Installer

1. **Build and package Simba for Windows:**
   ```sh
   npm run pack-win
   ```
2. **Locate the Windows installer** (`SimbaApp-Setup.exe`) in the `dist/` directory.
3. **Run the installer** and follow the on-screen prompts to complete installation.
4. By default, Simba will be installed to `C:\Program Files\Simba`.
5. **Navigate to the installation directory:**
   - Open File Explorer and go to `C:\Program Files\Simba`.
6. **Run Simba as Administrator:**
   - Right-click `Simba.exe` and select **Run as administrator**.
   - Simba should request administrator privileges automatically, but if not, always run as administrator for full functionality.
7. You can also launch Simba from the Start Menu or Desktop shortcut (these should run as admin by default).

### Mac Installer

1. **Build and package Simba for Mac:**
   ```sh
   npm run pack-mac
   ```
2. **Locate the Mac installer** (`SimbaApp.dmg`) in the `dist/` directory.
3. **Open the `.dmg` file** and drag the **Simba** icon into your **Applications** folder to install.
4. **Open Terminal** and navigate to the Simba app directory:
   ```sh
   cd /Applications/Simba.app/Contents/MacOS
   ```
5. **Run Simba with administrator privileges:**
   ```sh
   sudo ./Simba
   ```
   - Enter your password when prompted.
   - This is required because Simba needs admin privileges to access Android devices and network interfaces.
6. If you see a security warning or a message like "application is damaged and can't be opened" or "move to trash":
    - Open Terminal and run the following command to remove the quarantine attribute:
       ```sh
       xattr -cr /Applications/Simba.app
       ```
    - Then try running Simba again with `sudo ./Simba` as above.
    - For more details, see the troubleshooting section.

**Note:** On Mac, double-clicking Simba in Applications will not grant admin privileges. Always use the terminal method above.

---

## Notes
- Always ensure you have Node.js, npm, Python 3, and ADB installed and available in your PATH.
- If you encounter build errors, try removing the `main` line from `package.json` before building, then add it back after.
- For HAR tracing and diagnostics, ensure Python dependencies are installed (see `troubleshooting.md`).
- For more details, see the main `README.md` and `troubleshooting.md`.
