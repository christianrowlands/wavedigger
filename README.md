# WaveDigger

Dig into wireless signals to discover their physical locations. WaveDigger helps you find Wi-Fi access points by their BSSID (MAC address), with cell tower tracking coming soon. Built with Next.js, TypeScript, and deck.gl for interactive map visualization.

## Features

- **BSSID Search**: Enter a BSSID to find its approximate location
- **Input Validation**: Automatic formatting and validation of BSSID input
  - Supports formats: `AA:BB:CC:DD:EE:FF`, `AA-BB-CC-DD-EE-FF`, `AABBCCDDEEFF`
- **Interactive Map**: Visualize results on a deck.gl-powered map
- **Search History**: Track recent searches for quick access
- **Responsive Design**: Works on desktop and mobile devices

## Acknowledgments

🙏 **This project would not be possible without the incredible work done by the [apple-corelocation-experiments](https://github.com/acheong08/apple-corelocation-experiments) team.**

WaveDigger is built upon their research and reverse engineering of Apple's location services API. Specifically, we use:
- Their protobuf definitions for Apple's WLOC API
- Documentation of the API endpoints and request/response formats
- Understanding of coordinate encoding and API behavior
- The initial bytes prefix required for valid requests

Their work in understanding and documenting Apple's undocumented location services has made it possible for projects like WaveDigger to exist. Please check out their repository for the original research and additional tools for working with Apple's location services.

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Install dependencies:
```bash
npm install
```

1. (Optional) Add a Mapbox token for enhanced map tiles:
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

The application uses Apple's real WLOC API to query BSSID locations. This implementation is based on the research and protobuf definitions from the [apple-corelocation-experiments](https://github.com/acheong08/apple-corelocation-experiments) project.

The API implementation:
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


## Features Roadmap

- **Cell Tower Tracking**: Find cell tower locations
- **Export Results**: Download search results as JSON/CSV

## Deployment

WaveDigger can be deployed for free on Vercel. See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

Quick start:
1. Push to GitHub
2. Import to Vercel
3. Add custom domain
4. Deploy!

## License

This project is for educational and demonstration purposes.