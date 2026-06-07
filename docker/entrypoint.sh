#!/bin/sh
set -e

bun /app/apps/nova-socket/out/index.js &
SOCKET_PID=$!

cleanup() {
	kill "$SOCKET_PID" 2>/dev/null || true
	wait "$SOCKET_PID" 2>/dev/null || true
}

trap cleanup TERM INT

exec bun /app/apps/nova-web/server.js
