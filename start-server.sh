#!/bin/bash

# Kill any existing server processes
echo "🔄 Stopping any existing server processes..."
pkill -f "node server.js" 2>/dev/null || true
sleep 2

# Check if port 3000 is in use
echo "🔍 Checking port 3000..."
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  Port 3000 is in use, killing process..."
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    sleep 1
fi

# Start the server with error handling
echo "🚀 Starting server..."
cd /media/rohit/ROSI/color_backend

# Trap to handle Ctrl+C and cleanup
trap 'echo "🛑 Server stopped"; exit 0' INT TERM

# Start server and keep it running
node server.js &
SERVER_PID=$!

echo "📋 Server started with PID: $SERVER_PID"
echo "🌐 Server available at: http://localhost:3000"
echo "📊 Health check: http://localhost:3000/health"
echo ""
echo "💡 Press Ctrl+C to stop the server"

# Wait for the server process
wait $SERVER_PID
