// PDF Extractor Module for Flugstunden PDFs
// Extracts flight data from "Flugstunden - Übersicht" PDFs
// Usage: const { extractFlightsFromPdf } = require('./pdf-extractor');

const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');

// IATA code mapping
const codeDict = {
  'TCI': 'TFS',
  'MIL': 'MXP'
};

function toIATA(airportCode) {
  return codeDict[airportCode] || airportCode;
}

// --- REGULAR EXPRESSIONS ---
const rowFilter = /.*\s[A-Z]{2}\d{4}\s.*\s\d\d:\d\d-\d\d:\d\d\s[A-Z]{3}\s(?!01).*(DEFT\d{2}|DEN\d{3}|D[A-Z]{4}).*A3[2|3][0|1].*/;
const yearFilter = /für\sMonat.*\/.*(\d{4})/;
const monthFilter = /für\sMonat\s(\d\d)/;
const dayFilter = /^(\d\d)\./;
const flightNumberFilter = /\d\d\.\d\d\.\s([A-Z]{2}\d{4})/;
const simFilter = /.*(DEFT\d{2}|DEN\d{3}).*/;
const registrationFilter = /.*(DEFT\d{2}|DEN\d{3}|D[A-Z]{4}).*/;
const modelFilter = /.*(A3[2|3][0|1]).*/;
const fromFilter = /.*([A-Z]{3})\s\d\d:\d\d.*/;
const toFilter = /.*\d\d:\d\d\s([A-Z]{3}).*/;
const departedFilter = /.*\s(\d\d:\d\d)-\d\d:\d\d\s.*/;
const arrivedFilter = /.*\s\d\d:\d\d-(\d\d:\d\d)\s.*/;
const landedFilter = /.*\d,\d\d\s(L)\s\d,\d\d.*/;
const PKFilter = /.*\/(\d{6}[A-Z])/;

// Output CSV Header
const HEADER = [
  'Date (yyyy-mm-dd)', 'Flight #', 'Aircraft', 'Aircraft Model', 'From', 'To',
  'Departed (zulu)', 'Arrived (zulu)', 'Total (hh:mm)', 'Landings (day)',
  'Landings (night)', 'Captain (crew)', 'Simulator', 'Remarks'
];

function getTotal(departed, arrived) {
  if (!departed || !arrived) return '';
  const [h0, m0] = departed.split(':').map(Number);
  const [h1, m1] = arrived.split(':').map(Number);

  let t0 = 60 * h0 + m0;
  let t1 = 60 * h1 + m1;

  // Handle overnight
  if (t1 < t0) {
    t1 = t1 + 24 * 60;
  }

  const d_minutes = t1 - t0;
  const ht = Math.floor(d_minutes / 60);
  const mt = Math.floor(d_minutes % 60);

  return `${String(ht).padStart(2, '0')}:${String(mt).padStart(2, '0')}`;
}

async function extractTextFromPdf(pdfPath) {
  const data = await pdfjs.getDocument(pdfPath).promise;
  const numPages = data.numPages;
  const allPagesText = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await data.getPage(i);
    const textContent = await page.getTextContent();
    const lines = extractLinesFromTextContent(textContent);
    allPagesText.push(lines);
  }

  return allPagesText;
}

function extractLinesFromTextContent(textContent) {
  const linesByY = {};
  textContent.items.forEach(item => {
    const y = Math.round(item.transform[5]);
    if (!linesByY[y]) linesByY[y] = [];
    linesByY[y].push(item.str);
  });

  const sortedY = Object.keys(linesByY).sort((a, b) => b - a);
  const lines = [];
  sortedY.forEach(y => {
    const lineText = linesByY[y].join(' ').replace(/\s+/g, ' ').trim();
    if (lineText) lines.push(lineText);
  });
  return lines;
}

function parseFlightData(pages, options = {}) {
  const { pkMap = {} } = options;
  const flights = {};
  let year = null;
  let month = null;

  for (const page of pages) {
    const lines = page;

    for (const s of lines) {
      if (!year) {
        const match = s.match(yearFilter);
        if (match) {
          year = match[1];
        }
      }

      if (!month) {
        const match = s.match(monthFilter);
        if (match) {
          month = match[1];
        }
      }

      const rowMatch = s.match(rowFilter);

      if (rowMatch) {
        if (!year || !month) {
          throw new Error('Jahr oder Monat wurde nicht im PDF-Header gefunden. Die Extraktion wird abgebrochen.');
        }

        try {
          const day = s.match(dayFilter)?.[1] || '';
          const registration = s.match(registrationFilter)?.[1] || '';
          const flightnum = s.match(flightNumberFilter)?.[1] || '';
          const isSim = s.match(simFilter) ? '1' : '';
          let aircraftModel = s.match(modelFilter)?.[1] || '';

          const fromAirportRaw = s.match(fromFilter)?.[1] || '';
          const toAirportRaw = s.match(toFilter)?.[1] || '';

          const fromAirport = toIATA(fromAirportRaw);
          const toAirport = toIATA(toAirportRaw);

          const departedTime = s.match(departedFilter)?.[1] || '';
          const arrivedTime = s.match(arrivedFilter)?.[1] || '';
          const totalTime = getTotal(departedTime, arrivedTime);
          let isDayLanding = s.match(landedFilter) ? '1' : '';
          let isNightLanding = '';

          let crewname = '';
          const pkMatch = s.match(PKFilter);
          if (pkMatch) {
            const pk = pkMatch[1];
            crewname = pkMap[pk] || pk;
          }

          let remarks = '';
          if (isSim === '1') {
            remarks = `${aircraftModel} in ${fromAirport}`;
            aircraftModel = registration;
          }

          const rowData = [
            `${year}-${month}-${day}`, // 0 Date (yyyy-mm-dd)
            flightnum,                 // 1 Flight #
            registration,              // 2 Aircraft
            aircraftModel,             // 3 Aircraft Model
            `${fromAirport} (IATA)`,     // 4 From
            `${toAirport} (IATA)`,       // 5 To
            departedTime,              // 6 Departed (zulu)
            arrivedTime,               // 7 Arrived (zulu)
            totalTime,                 // 8 Total (hh:mm)
            isDayLanding,              // 9 Landings (day)
            isNightLanding,            // 10 Landings (night)
            crewname,                  // 11 Captain (crew)
            isSim,                     // 12 Simulator (1 or empty)
            remarks                    // 13 Remarks
          ];

          const uniqueKey = `${year}${month}${day}${departedTime}`;
          flights[uniqueKey] = rowData;

        } catch (e) {
          console.error('Fehler beim Parsen der Zeile:', s, e);
        }
      }
    }
  }

  const sortedKeys = Object.keys(flights).sort();
  const sortedFlights = {};
  sortedKeys.forEach(key => {
    sortedFlights[key] = flights[key];
  });

  return sortedFlights;
}

function flightsToCsv(flights) {
  let csv = HEADER.join(',') + '\n';

  Object.values(flights).forEach(row => {
    const rowData = row.map(cell => {
      // Escape double quotes and wrap in quotes if contains comma or newline
      let data = String(cell).replace(/"/g, '""');
      if (data.includes(',') || data.includes('\n')) {
        data = `"${data}"`;
      }
      return data;
    });
    csv += rowData.join(',') + '\n';
  });

  return csv;
}

async function extractFlightsFromPdf(pdfPath, options = {}) {
  const pages = await extractTextFromPdf(pdfPath);
  return parseFlightData(pages, options);
}

module.exports = {
  extractFlightsFromPdf,
  extractTextFromPdf,
  parseFlightData,
  flightsToCsv,
  HEADER,
  getTotal,
  toIATA
};
