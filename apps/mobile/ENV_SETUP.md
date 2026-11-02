# VARTA mobile — API connection
#
# Copy this file to `.env` in apps/mobile/ and pick the right URL:
#
#   Android emulator  -> http://10.0.2.2:3001/api/v1
#   iOS simulator     -> http://localhost:3001/api/v1
#   Physical device   -> http://<your-computer-LAN-IP>:3001/api/v1
#   Deployed backend  -> https://varta.kevindevops.online/api/v1
#
# Restart Metro after changing it:  npx expo start -c
#
# Without a .env the app uses the production API in release builds and
# 10.0.2.2 (Android) / localhost (iOS) in development builds.

# Your machine's Wi-Fi IP (run `ipconfig` on Windows / `ifconfig` on macOS-Linux)
EXPO_PUBLIC_LAN_HOST=192.168.4.188

# Optional explicit override (wins over everything)
EXPO_PUBLIC_API_URL=http://192.168.4.188:3001/api/v1

# Only needed if the API does not run on 3001
# EXPO_PUBLIC_API_PORT=3001
