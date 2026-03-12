# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a client-side web application (and CLI tool) that extracts flight data from "Flugstunden - Übersicht" PDFs and converts to CSV format compatible with the iOS "Smart Logbook" app.

The codebase has been refactored into ES modules that work in both the browser and Node.js/CLI.

## Project Structure

```
├── index.html              # Main web application
├── js/                     # ES modules (browser-compatible)
│   ├── config.js           # Constants, regex patterns, default values
│   ├── utils.js            # Utility functions (getTotal, toIATA, parseCSV, etc.)
│   ├── parser.js           # PDF text extraction and flight parsing logic
│   ├── ui.js               # Browser UI functions (rendering, messages, downloads)
│   └── app.js              # Browser entry point
├── index.js                # Node.js/CLI entry point (re-exports parser with Node.js PDF.js)
├── cli.js                  # CLI tool implementation
├── airports.csv            # Airport data (IATA codes, coordinates, elevation)
├── PKs.csv.enc             # Encrypted pilot mapping table
└── encrypt.js              # Node.js script to encrypt PKs.csv
```

## Running the Application

### Web Application

**Option 1: Direct file open (limited functionality)**
```bash
open index.html
```
Note: Some features (loading `PKs.csv.enc` or `airports.csv` via fetch) require HTTP server.

**Option 2: Local HTTP server (recommended)**
```bash
python3 -m http.server 8000
# Then open http://localhost:8000
```

**Option 3: VS Code launch configuration**
- Use "Launch (Server)" configuration in `.vscode/launch.json`
- Adjust the port in `launch.json` if needed (default: 8000)

### CLI Tool

```bash
# Basic usage
node cli.js test/Flugstunden_Februar.pdf

# Save to file
node cli.js test/Flugstunden_Februar.pdf -o output.csv

# JSON output
node cli.js test/Flugstunden_Februar.pdf --json

# Verbose mode
node cli.js test/Flugstunden_Februar.pdf -v
```

## File Descriptions

### Core Parser Logic (js/parser.js)

The main extraction logic is in `js/parser.js` - this module is used by both browser and CLI:

```javascript
import {
  extractTextFromPDF,
  extractLinesFromTextContent,
  parseFlightData,
  flightsToCSV,
  setAirports,
  setPKs,
  getAirports,
  getPKs
} from './js/parser.js';
```

### Browser Entry Point (js/app.js)

Uses CDN-loaded PDF.js (`pdfjsLib` global), SunCalc (`SunCalc` global), and CryptoJS (`CryptoJS` global).

### CLI Entry Point (index.js)

Node.js-specific entry that imports `pdfjs-dist` and re-exports the parser functions.

```javascript
import { extractFlightsFromPdf, flightsToCsv } from './index.js';
```

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

## Architecture Notes

**ES Modules - No build system required**

### Browser Dependencies (loaded from CDNs):
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.6.347/pdf.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/suncalc/1.8.0/suncalc.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js"></script>
```

### CLI Dependencies (from npm):
- `pdfjs-dist` for PDF parsing
- `canvas` (peer dependency of pdfjs-dist)

### Key Differences: Browser vs CLI

| Feature | Browser | CLI |
|---------|---------|-----|
| PDF Library | CDN `pdfjsLib` global | npm `pdfjs-dist` |
| SunCalc | Available (from CDN) | Not available (night landing calculation skipped) |
| CryptoJS | Available (from CDN) | Not available (decryption not supported) |

### Data Extraction Flow:
1. PDF text is extracted using PDF.js
2. Regex patterns identify flight records (see `js/config.js`)
3. Night landings are calculated using SunCalc (browser only)
4. PK codes are replaced with names after decryption (browser only)
5. Data is rendered in an editable table (browser) or output as CSV/JSON (CLI)

### File Loading Behavior (Browser):
- `airports.csv` is auto-loaded on startup (requires HTTP server)
- `PKs.csv.enc` is only loaded when the "Lade PKs" button is clicked with the correct password

## Testing Changes

**Via CLI (quick):**
```bash
node cli.js test/Flugstunden_Februar.pdf -v
```

**Via Browser:**
1. Start HTTP server: `python3 -m http.server 8000`
2. Open http://localhost:8000
3. Upload test PDF from `test/` directory
4. Verify flight data is extracted correctly in the table
5. Check browser console for any extraction errors
6. Test CSV export with "CSV Herunterladen" button

## GitHub Pages

**This app works on GitHub Pages!**

- All files in `js/` are static ES modules
- CDN dependencies are loaded from cdnjs.cloudflare.com
- No server-side processing required
- To deploy: Push to GitHub and enable Pages in repository settings

## Module Import Patterns

### Browser (js/app.js):
```javascript
import { extractFlightsFromPDF, parseFlightData } from './parser.js';
// Pass CDN globals explicitly:
const flights = await extractFlightsFromPDF(pdfSource, {
  pdfjsLib: window.pdfjsLib,
  sunCalc: window.SunCalc
});
```

### CLI (index.js):
```javascript
import pdfjs from 'pdfjs-dist/legacy/build/pdf.js';
import { extractFlightsFromPDF } from './js/parser.js';
// Wrap with Node.js PDF.js:
const flights = await extractFlightsFromPDF(pdfSource, { pdfjsLib: pdfjs });
```
