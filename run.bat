@echo off
setlocal EnableDelayedExpansion

color 0a

cls


echo [1;32mStarting Simba...[0m
echo.

echo  Installing dependencies with npm install...
call npm install
if %ERRORLEVEL% neq 0 (
    echo  Error: npm install failed!
    pause
    exit /b %ERRORLEVEL%
) else (
    echo  Success: npm install completed!
)
echo.

echo  Cleaning previous build artifacts...
call npm run clean
if %ERRORLEVEL% neq 0 (
    echo  Warning: npm run clean failed, proceeding anyway...
) else (
    echo  Success: Clean completed!
)
echo.

echo  Building project with npm run build...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo  Error: npm run build failed!
    pause
    exit /b %ERRORLEVEL%
) else (
    echo  Success: npm run build completed!
)
echo.

echo  Running npm start...
call npm start
if %ERRORLEVEL% neq 0 (
    echo  Error: npm start failed!
    pause
    exit /b %ERRORLEVEL%
) else (
    echo  Success: npm start completed!
)

echo.
echo  All commands executed successfully!
echo  Simba is now running.
pause
exit /b 0