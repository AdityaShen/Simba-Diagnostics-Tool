@echo off
setlocal EnableDelayedExpansion

color 0a

cls


echo [1;32mStarting Simba...[0m
echo.

if not exist "node_modules" (
    echo Installing dependencies...
    call npm install --omit=dev
)
echo Running npm start...
call npm start
pause