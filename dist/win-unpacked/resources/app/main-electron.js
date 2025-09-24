const { app, BrowserWindow, dialog, ipcMain } = require("electron");
// IPC handler to save HAR file to user-selected location
ipcMain.handle("save-har-file", async (event, harFileName) => {
    try {
        const publicPath = path.join(app.getAppPath(), "public", harFileName);
        if (!fs.existsSync(publicPath)) {
            throw new Error("HAR file not found: " + publicPath);
        }
        const { canceled, filePath } = await dialog.showSaveDialog({
            title: "Save HAR Trace",
            defaultPath: harFileName,
            filters: [{ name: "HAR Files", extensions: ["har"] }],
        });
        if (canceled || !filePath) {
            return { success: false, error: "Save canceled" };
        }
        fs.copyFileSync(publicPath, filePath);
        return { success: true, filePath };
    } catch (err) {
        return { success: false, error: err.message };
    }
});
const fs = require("fs");
const path = require("path");

const { spawn } = require("child_process");
const http = require("http");
let backendProcess = null;

function startBackendServer() {
    const appPath = app.getAppPath();
    const logPath = path.join(appPath, "backend-error.log");
    // Set ADB_PATH to bundled binary for plug-and-play
    if (process.platform === "win32") {
        process.env.ADB_PATH = path.join(app.getAppPath(), "resources", "adb", "win", "adb.exe");
    } else if (process.platform === "darwin") {
        process.env.ADB_PATH = path.join(app.getAppPath(), "resources", "adb", "mac", "adb");
    }
    fs.appendFileSync(logPath, "[Electron] Attempting to spawn backend server...\n");
    const backendPath = path.join(appPath, "src-server", "server.js");
    // Use bundled Node.js binary for plug-and-play (platform-specific)
    let nodeBinary;
    if (process.platform === "darwin") {
        nodeBinary = path.join(app.getAppPath(), "resources", "node", "mac", "node");
    } else if (process.platform === "win32") {
        nodeBinary = path.join(app.getAppPath(), "resources", "node", "win", "node.exe");
    } else {
        nodeBinary = "node"; // fallback to system node for other platforms
    }
    fs.appendFileSync(logPath, `[Electron] Using bundled Node.js: ${nodeBinary}\n`);
    try {
        backendProcess = spawn(nodeBinary, [backendPath], {
            cwd: appPath,
            stdio: ["ignore", "ignore", "ignore"],
            windowsHide: true,
        });
        fs.appendFileSync(logPath, "[Electron] Spawn call completed.\n");
        backendProcess.on("error", (err) => {
            fs.appendFileSync(
                logPath,
                `[Electron] Failed to start backend server: ${err.stack || err.message}\n`,
            );
            dialog.showErrorBox(
                "Backend Server Error",
                `Failed to start backend server:\n${err.stack || err.message}`,
            );
        });
        backendProcess.on("exit", (code, signal) => {
            fs.appendFileSync(
                logPath,
                `[Electron] Backend server exited: code=${code}, signal=${signal}\n`,
            );
        });
    } catch (err) {
        fs.appendFileSync(
            logPath,
            `[Electron] Synchronous error during spawn: ${err.stack || err.message}\n`,
        );
        dialog.showErrorBox(
            "Backend Server Error",
            `Synchronous error during backend spawn:\n${err.stack || err.message}`,
        );
    }
}

function waitForServer(url, timeout = 10000) {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        function check() {
            http.get(url, (res) => {
                if (res.statusCode === 200) {
                    resolve();
                } else {
                    retry();
                }
            }).on("error", retry);
        }
        function retry() {
            if (Date.now() - start > timeout) {
                reject(new Error("Server did not start in time"));
            } else {
                setTimeout(check, 500);
            }
        }
        check();
    });
}

async function createWindow() {
    // Use environment variable for server URL, fallback to localhost
    const SERVER_URL = process.env.SIMBA_SERVER_URL || "http://localhost:8000";
    try {
        await waitForServer(SERVER_URL);
    } catch (err) {
        if (process.env.NODE_ENV !== "production") {
            console.error("Express server did not start:", err);
        }
        dialog.showErrorBox("Server Error", `Express server did not start: ${err.message}`);
        app.quit();
        return;
    }
    const win = new BrowserWindow({
        width: 1280,
        height: 800,
        icon: path.join(__dirname, "lion.ico"), // Set the app icon (place lion.ico in project root)
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        },
    });
    win.loadURL(SERVER_URL);
    // Optionally: win.webContents.openDevTools();
}

app.whenReady().then(() => {
    startBackendServer();
    createWindow();
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
    if (backendProcess && !backendProcess.killed) {
        backendProcess.kill();
    }
});
