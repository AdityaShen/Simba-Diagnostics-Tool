# Troubleshooting Simba

## Common Issues

### ADB not found
- Ensure ADB is installed and added to your system PATH.

### HAR trace not working
- Ensure Python is installed and added to your system PATH.
- Install the required HAR library (e.g., mitmproxy or haralyzer) using pip:
   ```sh
   pip install mitmproxy haralyzer
   ```
- Restart the app after installing dependencies.

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

## Getting Help
- File an issue on GitHub using the bug report template.
- Contact the maintainer for urgent support.
