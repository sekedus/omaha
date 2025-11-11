# Google Product Update Checker (omaha)

A web-based Google product update checker that queries the Omaha update API to display the latest versions of Google Chrome, Google Play Games, Quick Share, and other Google products.

This project is a fork of [chsbuffer/omaha2tg](https://github.com/chsbuffer/omaha2tg), converted from a Cloudflare Worker + Telegram bot architecture to a standalone HTML application with an interactive user interface.

## Screenshot

![Google Product Update Checker](./assets/img/omaha.png)

## Features

- ✅ **On-demand update checks** - Click "Fetch Updates" to retrieve the latest versions
- 📊 **Table display** - Clean presentation of product versions, channels, download URLs, sizes, and SHA256 hashes
- 💾 **5-minute cache** - Data cached in localStorage with automatic expiration
- 🌓 **Dark mode** - Toggle between light and dark themes (respects system preference)
- 📱 **Responsive design** - Mobile-friendly interface that works on all screen sizes
- 📋 **Copy to clipboard** - Easily copy the raw JSON response
- 🔒 **Secure** - Path traversal protection and URL validation

## Products Tracked

- Google Chrome (Stable, Beta, Dev, Canary)
- Google Play Games Beta
- Quick Share (formerly Nearby Share)
- Google Play Games Developer Emulator (Stable, Beta)

## Prerequisites

- Node.js 20.18.3 or later
- A modern web browser (Chrome, Firefox, Safari, Edge)

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/sekedus/omaha.git
   cd omaha
   ```

2. **Install dependencies** (optional, only needed if using npm scripts)
   ```bash
   npm install
   ```

## Usage

### Option 1: Using the local server (recommended)

1. **Start the server**
   ```bash
   npm start
   ```

2. **Open your browser**
   Navigate to `http://localhost:8080`

3. **Fetch updates**
   Click the "Fetch Updates" button to retrieve the latest product versions

### Option 2: Open directly in browser

1. Simply open `index.html` in your web browser
2. Note: This method won't work with the real API due to CORS restrictions, but the app will function with cached data if available

## How It Works

1. **User clicks "Fetch Updates"** - The app sends POST requests to Google's Omaha update API
2. **Server proxy** - `server.js` acts as a proxy to bypass CORS restrictions
3. **Data parsing** - The app parses the JSON response and extracts version information
4. **Display** - Results are shown in a responsive table with download links
5. **Caching** - Data is stored in localStorage for 5 minutes to reduce API calls

## Mock Mode

For testing or development when the API is unavailable, you can run the server in mock mode:

```bash
npm run start:mock
```

This will return sample data instead of querying the actual API.

## Deployment to Vercel

This application is ready to be deployed to Vercel with zero configuration:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/sekedus/omaha)

### Manual Deployment

1. **Install Vercel CLI** (optional)
   ```bash
   npm install -g vercel
   ```

2. **Deploy to Vercel**
   ```bash
   vercel
   ```

3. **Follow the prompts**
   - Link to existing project or create new one
   - Select the root directory
   - No build command needed
   - No output directory needed

The application will automatically:
- Serve static files (`index.html`, `app.js`)
- Deploy the API endpoint as a serverless function (`/api/update`)
- Configure CORS headers for the proxy

### Environment Variables

If you want to enable mock mode on Vercel (for testing):

1. Go to your Vercel project settings
2. Add environment variable: `MOCK_MODE=true`
3. Redeploy the application

## File Structure

```
omaha/
├── api/
│   └── update.js              # Vercel serverless function (uses server.js)
├── assets/
│   ├── img
│   │   ├── o.png
│   │   └── omaha.png
│   └── js
│       ├── app.js
│       └── color-scheme.js
├── index.html
├── server.js                  # Node.js HTTP server with CORS proxy (for local dev & Vercel)
├── mock.json                  # Mock data for testing
├── vercel.json                # Vercel deployment configuration
├── package.json
└── README.md
```

## Development

The application uses vanilla JavaScript with no build step required. To make changes:

1. Edit `index.html` for structure and styles
2. Edit `app.js` for application logic
3. Edit `server.js` for server-side proxy logic
4. Refresh your browser to see changes

## Security

The application includes several security measures:

- **URL validation** - Ensures download URLs are from trusted Google domains
- **Path traversal protection** - Prevents accessing files outside the project directory
- **File type whitelist** - Only serves `.html`, `.js`, `.css`, and `.json` files
- **CORS headers** - Properly configured for the proxy endpoint

## Credits

- **Original project**: [chsbuffer/omaha2tg](https://github.com/chsbuffer/omaha2tg) - Cloudflare Worker + Telegram bot implementation
- **Omaha Protocol**: Google's update protocol for Chrome and other products
  - [Chromium Omaha Protocol Documentation](https://source.chromium.org/chromium/chromium/src/+/main:docs/updater/protocol_3_1.md)
  - [Google Omaha Protocol V3](https://github.com/google/omaha/blob/main/doc/ServerProtocolV3.md)

## License

This project follows the same license as the original [chsbuffer/omaha2tg](https://github.com/chsbuffer/omaha2tg) repository.

<!-- ## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues, questions, or suggestions, please [open an issue](https://github.com/sekedus/omaha/issues) on GitHub. -->
