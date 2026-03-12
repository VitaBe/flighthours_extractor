# Flight Hours Extractor

An internal tool to extract flight data from "Flugstunden - Übersicht" PDFs and convert to CSV format compatible with the iOS "Smart Logbook" app.

## Quick Start

### Web Application (Browser)

Open `index.html` in a browser or serve via HTTP:

```bash
python3 -m http.server 8000
# Then open http://localhost:8000
```

**Note:** Some features (loading `PKs.csv.enc` or `airports.csv`) require HTTP server - they won't work with `file://` protocol.

### CLI Tool (Node.js)

```bash
# Basic usage - outputs CSV to stdout
node cli.js test/Flugstunden_Februar.pdf

# Save to file
node cli.js test/Flugstunden_Februar.pdf -o output.csv

# Output as JSON (easier for debugging)
node cli.js test/Flugstunden_Februar.pdf --json

# Verbose mode (shows parsing details)
node cli.js test/Flugstunden_Februar.pdf -v

# Combine options
node cli.js test/Flugstunden_Februar.pdf -o output.json --json -v
```

## Project Structure

```
├── index.html              # Main web application
├── js/                     # ES modules for browser
│   ├── config.js           # Constants, regex patterns
│   ├── utils.js            # Utility functions
│   ├── parser.js           # PDF extraction and flight parsing
│   ├── ui.js               # Browser UI functions
│   └── app.js              # Browser entry point
├── index.js                # Node.js/CLI entry point
├── cli.js                  # CLI tool
├── airports.csv            # Airport data (IATA codes, coordinates)
├── PKs.csv.enc             # Encrypted pilot mapping table
├── encrypt.js              # Node.js script to encrypt PKs.csv
├── test/                   # Test PDFs
│   └── Flugstunden_Februar.pdf
└── package.json            # Node.js dependencies
```

## GitHub Pages Compatibility

**Yes, this works on GitHub Pages!**

The app only uses client-side JavaScript:
- PDF.js loaded from CDN for PDF parsing
- ES modules (`<script type="module">`) are standard JavaScript
- All files in `js/` directory are served as static assets
- No server-side processing required

Simply push the repository to GitHub and enable Pages in repository settings.

## Updating the PKs Table

The app uses an encrypted `PKs.csv.enc` file to map pilot certificate numbers (e.g., "123456A") to names.

1. Create/edit `PKs.csv` in this directory with format:
   ```
   123456A,MUSTERMANN,MAX
   789012B,MUSTERFRAU,ERIKA
   ```

2. Edit `encrypt.js` line 12 to set the correct password:
   ```javascript
   const password = 'your_password_here';
   ```

3. Install dependency and run:
   ```bash
   npm install crypto-js
   node encrypt.js
   ```

4. This generates `PKs.csv.enc`. **Never commit `PKs.csv`** (it's in `.gitignore`).

## Architecture

**No build system required!**

### Browser Dependencies (loaded from CDNs):
- PDF.js 2.6.347 for PDF parsing
- SunCalc 1.8.0 for sunrise/sunset calculations
- CryptoJS 4.1.1 for AES decryption
- TailwindCSS for styling

### CLI Dependencies (from npm):
- `pdfjs-dist` for PDF parsing in Node.js

### Data Extraction Flow:
1. PDF text is extracted using PDF.js
2. Regex patterns identify flight records
3. Night landings are calculated using SunCalc (browser only)
4. PK codes are replaced with names after decryption
5. Data is rendered in an editable table (browser) or output as CSV/JSON (CLI)

## Testing Changes

**Via CLI:**
```bash
node cli.js test/Flugstunden_Februar.pdf -v
```

**Via Browser:**
```bash
python3 -m http.server 8000
# Open http://localhost:8000 in browser
```

## License

Internal tool - not for public distribution.
