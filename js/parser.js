import {
  rowFilter,
  yearFilter,
  monthFilter,
  dayFilter,
  flightNumberFilter,
  simFilter,
  registrationFilter,
  modelFilter,
  fromFilter,
  toFilter,
  departedFilter,
  arrivedFilter,
  landedFilter,
  PKFilter,
  HEADER,
  defaultAirports,
  defaultPKs
} from './config.js';

import { toIATA, getTotal, isNightLanding } from './utils.js';

// State - these can be overridden
export let Airports = { ...defaultAirports };
export let PKs = { ...defaultPKs };

export function setAirports(airports) {
  Airports = { ...Airports, ...airports };
}

export function setPKs(pks) {
  PKs = { ...PKs, ...pks };
}

export function getAirports() {
  return Airports;
}

export function getPKs() {
  return PKs;
}

// Extract text from PDF (works with both browser pdf.js and Node.js)
export async function extractTextFromPDF(pdfSource, pdfjsLib) {
  const loadingTask = pdfjsLib.getDocument(pdfSource);
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  const allPagesText = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const lines = extractLinesFromTextContent(textContent);
    allPagesText.push(lines);
  }
  return allPagesText;
}

export function extractLinesFromTextContent(textContent) {
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

// Parse flight data from extracted PDF text
export function parseFlightData(pages, options = {}) {
  const { sunCalc = null, onError = null } = options;
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
          const error = new Error('Jahr oder Monat wurde nicht im PDF-Header gefunden. Die Extraktion wird abgebrochen.');
          if (onError) {
            onError('Fehler: Jahr oder Monat wurde nicht im PDF-Header gefunden. Die Extraktion wird abgebrochen.');
            return {};
          }
          throw error;
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
          let nightLandingFlag = '';

          let crewname = '';
          const pkMatch = s.match(PKFilter);
          if (pkMatch) {
            const pk = pkMatch[1];
            crewname = PKs[pk] || pk;
          }

          // Determine whether landing is actually at night using sun times
          try {
            const isNight = isNightLanding(year, month, day, arrivedTime, toAirport, Airports, sunCalc);
            if (isNight) {
              if (isDayLanding === '1') {
                isDayLanding = '';
                nightLandingFlag = '1';
              } else {
                nightLandingFlag = '1';
              }
            }
          } catch (e) {
            console.error('Night-landing detection failed for', year, month, day, arrivedTime, toAirport, e);
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
            nightLandingFlag,          // 10 Landings (night)
            crewname,                  // 11 Captain (crew)
            isSim,                     // 12 Simulator (1 or empty)
            remarks                    // 13 Remarks
          ];

          const uniqueKey = `${year}${month}${day}${departedTime}`;
          flights[uniqueKey] = rowData;

        } catch (e) {
          console.error('Fehler beim Parsen der Zeile:', s, e);
          if (onError) {
            onError(`Fehler beim Parsen einer Zeile: ${s.substring(0, 50)}...`);
          }
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

// Convert flights object to CSV
export function flightsToCSV(flights) {
  let csv = HEADER.join(',') + '\n';

  Object.values(flights).forEach(rowData => {
    const escapedRow = rowData.map(cell => {
      let data = String(cell).replace(/"/g, '""');
      if (data.includes(',') || data.includes('\n')) {
        data = `"${data}"`;
      }
      return data;
    });
    csv += escapedRow.join(',') + '\n';
  });

  return csv;
}

// Main extraction function
export async function extractFlightsFromPDF(pdfSource, options = {}) {
  const { pdfjsLib, sunCalc } = options;

  if (!pdfjsLib) {
    throw new Error('PDF library not provided. Pass pdfjsLib in options.');
  }

  const pages = await extractTextFromPDF(pdfSource, pdfjsLib);
  return parseFlightData(pages, { sunCalc, onError: options.onError });
}

export { HEADER };
