# Simba API Reference

## Endpoints

### /api/devices

- **GET**: List connected Android devices

### /api/diagnostics

- **GET**: Get device diagnostics

### /api/har

- **POST**: Start HAR trace collection
- **GET**: Download HAR file

### /api/stream

- **GET**: Start screen/audio streaming

## Authentication

Currently, all endpoints are local and do not require authentication. For production, add authentication middleware.

## Error Handling

All endpoints return standard HTTP status codes and error messages.
