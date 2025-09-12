# Simba Architecture

## Overview
Simba is composed of three main layers:
- **Frontend:** HTML/CSS/JS, built with Parcel
- **Backend:** Node.js, Express, WebSocket, ADB integration
- **Electron:** Desktop wrapper for cross-platform distribution

## Data Flow
1. Electron launches backend server and frontend UI
2. Backend communicates with Android devices via ADB and scrcpy
3. Frontend connects to backend via WebSocket for real-time streaming
4. HAR trace and diagnostics are collected and exposed via API

## Security
- All communication is local or over secure channels
- No secrets are hardcoded
- All user input is validated

## Extensibility
- Modular backend services
- Pluggable frontend UI components
