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

### Mock Data

Currently, the application uses mock data for demonstration purposes. The API returns sample locations for these BSSIDs:
- `AA:BB:CC:DD:EE:FF` - San Francisco
- `00:11:22:33:44:55` - New York

### Production Implementation

To connect to Apple's actual WLOC API in production, you would need to:

1. Install protobuf libraries (e.g., `protobufjs`)
2. Implement the Apple WLOC protobuf schema
3. Update the `/api/bssid` route to:
   - Serialize requests using protobuf
   - Send to `https://gs-loc.apple.com/clls/wloc`
   - Parse the protobuf response
4. Handle authentication headers and request formatting

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