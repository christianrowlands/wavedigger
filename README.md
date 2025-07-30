# BSSID Location Search

A web application that allows users to search for Wi-Fi access point locations using their BSSID (MAC address). Built with Next.js, TypeScript, and deck.gl for interactive map visualization.

## Features

- **BSSID Search**: Enter a BSSID to find its approximate location
- **Input Validation**: Automatic formatting and validation of BSSID input
  - Supports formats: `AA:BB:CC:DD:EE:FF`, `AA-BB-CC-DD-EE-FF`, `AABBCCDDEEFF`
- **Interactive Map**: Visualize results on a deck.gl-powered map
- **Search History**: Track recent searches for quick access
- **Responsive Design**: Works on desktop and mobile devices

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Clone the repository:
```bash
cd /Users/christian/dev/map-search
```

2. Install dependencies:
```bash
npm install
```

3. (Optional) Add a Mapbox token for enhanced map tiles:
   - Get a token from [Mapbox](https://www.mapbox.com/)
   - Add it to `.env.local`:
   ```
   NEXT_PUBLIC_MAPBOX_TOKEN=your_token_here
   ```

### Running the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Technical Details

### Architecture

- **Frontend**: Next.js 15 with TypeScript
- **Map Visualization**: deck.gl with react-map-gl
- **Styling**: Tailwind CSS
- **API**: Next.js API routes

### Real Apple WLOC API

The application uses Apple's real WLOC API to query BSSID locations. The API implementation:

- Uses protobuf for communication with Apple's servers
- Sends requests to `https://gs-loc.apple.com/clls/wloc`
- Handles coordinate conversion (Apple uses int64 with 8 decimal places)
- Supports both default and China region endpoints

### Testing with Real BSSIDs

To test the app:
1. Find a real Wi-Fi BSSID (MAC address) from your router or access point
2. Enter it in any supported format
3. The app will query Apple's database and show the location if found

Note: Not all BSSIDs are in Apple's database. Newly deployed or private access points may not have location data.

## Project Structure

```
map-search/
├── app/
│   ├── api/
│   │   └── bssid/         # API endpoint for BSSID lookup
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main page component
├── components/
│   ├── bssid-search.tsx   # Search input component
│   ├── map-view.tsx       # deck.gl map component
│   └── ui/                # Reusable UI components
├── lib/
│   └── bssid-utils.ts     # BSSID validation utilities
└── types/
    └── index.ts           # TypeScript type definitions
```

## Future Enhancements

- **Multiple BSSID Search**: Allow searching for multiple BSSIDs at once
- **Export Results**: Download search results as JSON/CSV
- **Share Links**: Generate shareable URLs for specific locations
- **Search Filters**: Filter by date range, signal strength, etc.
- **Real API Integration**: Connect to actual Apple WLOC service

## License

This project is for educational and demonstration purposes.