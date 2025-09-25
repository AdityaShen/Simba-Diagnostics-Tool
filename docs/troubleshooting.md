# Troubleshooting Simba

## Common Issues

### ADB not fo
- Ensure ADB is installed and added to your system PATH.

### HAR trace not working

- Ensure Python is installed and added to your system PATH.
- Install the required HAR library (e.g., mitmproxy or haralyzer) using pip:
    ```sh
    pip install mitmproxy haralyzer
    ```
- Restart the app after installing dependencies.

### HAR file not found or not saved

- After running a HAR trace, if you cannot find the HAR file:
    - Check the output directory (usually `output/har_files/` or `public/`).
    - If using the Electron app, use the "Save HAR" dialog to export the file to your desired location.
    - Make sure the Python script completed successfully and did not encounter permission errors.
    - If the file is not moved automatically, check for errors in the app logs or terminal output.

### HAR trace fails with Python errors

- Ensure you are using Python 3 (not Python 2).
- Make sure all required Python packages are installed.
- If you see a `PermissionError` or `FileNotFoundError`, check that the app has write access to the output directory.

### HAR trace button disabled or not responding

- Make sure a device is selected and connected.
- Ensure the backend server is running and WebSocket connection is active.

### HAR trace output is empty or incomplete

- Some network activity may not be captured if the device is not routing traffic through the proxy.
- Try restarting the device or reconnecting to the network.

### Saving HAR file fails in Electron

- If the save dialog is canceled or fails, try again and choose a different location.
- Ensure you have write permissions to the selected folder.

### Electron app won’t start

- Check that all environment variables are set and dependencies are installed.

### Network/streaming issues

- Verify device is connected and scrcpy is working via command line.

```powershell
   adb devices

   scrcpy
```

### Lint errors

- Run `npm run lint -- --fix` to auto-correct style issues.

## Build & Electron File Troubleshooting

If the Electron app fails to start or behaves unexpectedly after changes:

1. Run the build process to regenerate the app files:
    ```sh
    npm run build
    ```
2. Overwrite the Electron executable or app files with the newly built output:
    ```powershell
    npx electron-packager . SimbaApp --platform=win32 --arch=x64 --overwrite
    ```
3. Try starting the app again:
    ```sh
    npm start
    ```

This can resolve issues caused by outdated or corrupted build artifacts. Always ensure you are running the latest build output.

### npm run build fails due to main-electron.js

If `npm run build` does not work and you see errors related to `main-electron.js`:

1. Open your `package.json` file.
2. Temporarily remove or comment out the line containing `"main": "main-electron.js",`.
3. Run `npm run build` again.
4. After the build completes, add the `main` line back to `package.json`.
5. Continue with your normal workflow.

This workaround resolves build issues caused by Electron's main entry point interfering with the build process.

## Getting Help

ning the latest build output.

## Getting Help
- File an issue on GitHub using the bug report template.
- Contact the maintainer for urgent support.
