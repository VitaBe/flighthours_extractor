// Universal module entry point for Node.js
// Re-exports the parser functions with Node.js-specific defaults

import pdfjsPackage from 'pdfjs-dist/legacy/build/pdf.js';
const pdfjsLib = pdfjsPackage.default || pdfjsPackage;

// Import the shared parser logic
import {
  extractTextFromPDF,
  extractLinesFromTextContent,
  parseFlightData as _parseFlightData,
  flightsToCSV,
  getAirports,
  getPKs,
  setAirports,
  setPKs,
  Airports,
  PKs
} from './js/parser.js';

// Import utilities
import {
  toIATA,
  getTotal,
  parsePKCSV,
  parseAirportCSV
} from './js/utils.js';

// Import config
import {
  HEADER,
  defaultAirports,
  defaultPKs
} from './js/config.js';

// Wrapper for Node.js that injects the PDF.js lib
async function extractFlightsFromPdf(pdfPath, options = {}) {
  const { pkMap = {}, onError, verbose = false } = options;

  if (verbose) {
    console.error('PDF-Extraktion gestartet...');
  }

  // Update PKs if provided
  if (Object.keys(pkMap).length > 0) {
    setPKs({ ...PKs, ...pkMap });
  }

  // Extract text using Node.js PDF.js
  const pages = await extractTextFromPDF(pdfPath, pdfjsLib);

  if (verbose) {
    console.error(`Extrahiert: ${pages.length} Seiten`);
  }

  // Parse the flight data (no SunCalc in Node.js)
  const flights = _parseFlightData(pages, { sunCalc: null, onError });

  return flights;
}

function flightsToCsv(flights) {
  return flightsToCSV(flights);
}

export {
  // Main extraction
  extractFlightsFromPdf,
  flightsToCsv,

  // Text extraction
  extractTextFromPDF,
  extractLinesFromTextContent,
  _parseFlightData as parseFlightData,

  // Utilities
  toIATA,
  getTotal,
  parsePKCSV,
  parseAirportCSV,

  // State management
  getAirports,
  getPKs,
  setAirports,
  setPKs,
  Airports,
  PKs,

  // Config
  HEADER
};
