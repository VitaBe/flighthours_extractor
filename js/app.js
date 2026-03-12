import {
  setAirports,
  setPKs,
  getAirports,
  getPKs,
  extractFlightsFromPDF,
  parseFlightData,
  flightsToCSV,
  Airports,
  PKs
} from './parser.js';

import { parseAirportCSV, parsePKCSV, decryptAES } from './utils.js';

import {
  initLogger,
  logMessage,
  showMessage,
  renderTable,
  applyPKsToTable,
  downloadCSV,
  downloadLog,
  toggleTable,
  clearTable,
  getLogMessages
} from './ui.js';

// Make these available globally for inline onclick handlers
document.addEventListener('DOMContentLoaded', () => {
  window.loadPKs = loadPKs;
  window.downloadCSV = downloadCSV;
  window.downloadLog = downloadLog;
});

// Global state for browser
let currentPKs = { ...PKs };

// Set up PDF.js worker
if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.6.347/pdf.worker.min.js";
} else {
  console.error("pdfjsLib ist nicht definiert. Bitte prüfen Sie die CDN-Verbindung.");
}

// Initialize
initLogger();

// Fetch CSV helper
async function fetchCSV(path, asText = true) {
  try {
    const resp = await fetch(path);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return asText ? await resp.text() : await resp.arrayBuffer();
  } catch (e) {
    console.warn('fetchCSV failed for', path, e);
    return null;
  }
}

// Load PKs function (exposed globally)
async function loadPKs() {
  const pksPassword = document.getElementById('pksPassword').value.trim();
  if (!pksPassword) {
    showMessage('Bitte geben Sie ein Passwort ein.', 'error');
    return;
  }

  const pksTxt = await fetchCSV('PKs.csv.enc', true) || await fetchCSV('pks.csv.enc', true);
  if (pksTxt) {
    try {
      const decrypted = decryptAES(pksTxt, pksPassword, CryptoJS);
      if (decrypted) {
        const parsed = parsePKCSV(decrypted);
        currentPKs = { ...currentPKs, ...parsed };
        setPKs(parsed);
        showMessage(`PKs entschlüsselt und geladen: ${Object.keys(parsed).length} Einträge`, 'success');
        console.log('Loaded PKs:', Object.keys(parsed).slice(0, 40));
        applyPKsToTable(getPKs());
      } else {
        showMessage('PKs Passwort falsch oder Datei beschädigt.', 'error');
      }
    } catch (e) {
      console.error('Error parsing/decrypting PKs CSV', e);
      showMessage('Fehler beim Laden der PKs.', 'error');
    }
  } else {
    showMessage('PKs.csv nicht gefunden.', 'error');
  }
}

// Load airports on startup
(async function loadLocalCSVs() {
  logMessage('Starting to load local CSVs');

  const airportsTxt = await fetchCSV('airports.csv');
  if (airportsTxt) {
    try {
      const parsed = parseAirportCSV(airportsTxt);
      setAirports(parsed);
      showMessage(`Airports geladen: ${Object.keys(parsed).length} Einträge`, 'success');
      logMessage(`Loaded ${Object.keys(parsed).length} airports`);
    } catch (e) {
      console.error('Error parsing airports.csv', e);
      logMessage(`Error parsing airports.csv: ${e.message}`, 'ERROR');
    }
  } else {
    logMessage('airports.csv not found', 'WARN');
  }
})();

// PDF file processing
document.getElementById('pdfFile').addEventListener('change', async (event) => {
  const files = Array.from(event.target.files).filter(f =>
    f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
  );

  if (files.length === 0) return;

  showMessage(`Verarbeite ${files.length} PDF-Datei(en)...`, 'info');
  clearTable();
  toggleTable(false, true);

  let allFlights = [];
  let totalFlights = 0;

  try {
    for (const file of files) {
      logMessage(`Processing file ${file.name}`);
      showMessage(`Verarbeite ${file.name}...`, 'info');

      // Extract Text
      const pagesText = await extractFlightsFromPDF(
        { url: URL.createObjectURL(file) },
        {
          pdfjsLib,
          sunCalc: typeof SunCalc !== 'undefined' ? SunCalc : null,
          onError: (msg) => showMessage(msg, 'error')
        }
      );

      // Convert object to array
      const flightArray = Object.values(pagesText);

      allFlights = allFlights.concat(flightArray);
      totalFlights += flightArray.length;
      logMessage(`Extracted ${flightArray.length} flights from ${file.name}`);
    }

    if (allFlights.length === 0) {
      showMessage('Es konnten keine gültigen Flüge in den PDFs gefunden werden. Überprüfen Sie das Dateiformat und die Regex-Filter.', 'error');
      logMessage('No valid flights found in any PDF', 'ERROR');
      return;
    }

    // Sort by date
    allFlights.sort((a, b) => a[0].localeCompare(b[0]));
    logMessage(`Sorted ${allFlights.length} flights by date`);

    // Render Table
    renderTable(allFlights);

    showMessage(`Erfolgreich ${totalFlights} Flüge aus ${files.length} PDF(s) extrahiert.`, 'success');
    toggleTable(true, false);

  } catch (e) {
    console.error('Fataler Verarbeitungsfehler:', e);
    logMessage(`Fatal processing error: ${e.message}`, 'ERROR');
    showMessage(`Ein fataler Fehler ist aufgetreten: ${e.message}. Konsole prüfen für Details.`, 'error');
  }
});

// Expose for debugging
window.flightApp = {
  getAirports,
  getPKs,
  getLogMessages,
  extractFlightsFromPDF,
  parseFlightData,
  flightsToCSV
};
