# BSSID Search Web App - Testing Guide

## How to Test the Fixed Implementation

### 1. Start the Development Server
```bash
npm run dev
```

The app will start on http://localhost:3000 (or 3001 if port 3000 is in use)

### 2. Test with a Real BSSID
1. Open the app in your browser
2. Enter a real Wi-Fi BSSID (MAC address) that you know works with the wloc CLI
3. Click "Search"
4. Check the browser console (F12) for debug output

### 3. What to Look For in Console

#### Successful Request:
- `Serialized request length:` should be > 58 bytes
- `BSSID found in request: true`
- `Encoded message length:` should show the protobuf is not empty
- `Number of wifi devices in response:` should be > 0

#### Common Issues:
- If serialized request is exactly 57-58 bytes, the BSSID wasn't included
- If you get 404, the BSSID might not be in Apple's database
- Check for gzip decompression messages if response seems corrupted

### 4. Debug Output Structure
The console will show:
1. Request data before serialization
2. Proto data structure
3. Serialized request in hex
4. Response status and headers
5. Parsed response with location data

### 5. Expected Behavior
- Valid BSSIDs from Apple's database will return location coordinates
- The location will be displayed on the map
- Invalid or unknown BSSIDs will show "BSSID not found" error

### 6. Test BSSIDs
You can test with:
- Your home router's BSSID
- Public Wi-Fi BSSIDs (coffee shops, libraries)
- BSSIDs that work with the wloc CLI tool

### Troubleshooting
If the search still doesn't work:
1. Check that the BSSID format is correct (XX:XX:XX:XX:XX:XX)
2. Verify the BSSID works with the wloc CLI first
3. Check console for any protobuf verification errors
4. Look for network errors or CORS issues