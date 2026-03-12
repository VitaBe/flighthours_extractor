import { codeDict } from './config.js';

export function toIATA(airportCode) {
  return codeDict[airportCode] || airportCode;
}

export function getTotal(departed, arrived) {
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

export function parsePKCSV(csvString) {
  const map = {};
  const lines = csvString.trim().split('\n').filter(l => l.trim());
  lines.forEach(line => {
    const parts = line.split(',');
    if (parts.length >= 3) {
      const key = parts[0].trim();
      const surname = parts[1].trim();
      const given = parts[2].trim();
      if (key) map[key] = `${given} ${surname}`.trim();
    }
  });
  return map;
}

export function parseAirportCSV(csvString) {
  const airports = {};
  const lines = csvString.trim().split('\n').filter(l => l.trim());
  lines.forEach(line => {
    const parts = line.split(',');
    if (parts.length >= 6) {
      const iataCode = parts[0].trim();
      const latitude = parseFloat(parts[3]);
      const longitude = parseFloat(parts[4]);
      const elevation = parseFloat(parts[5]);

      if (iataCode && !isNaN(latitude) && !isNaN(longitude) && !isNaN(elevation)) {
        airports[iataCode] = [latitude, longitude, elevation];
      }
    }
  });
  return airports;
}

export function isNightLanding(year, month, day, arrivedTime, iataCode, airports, sunCalc) {
  try {
    if (!arrivedTime || !iataCode) return false;
    const airport = airports[iataCode];
    if (!airport) return false;

    const [lat, lon] = airport;
    const parts = arrivedTime.split(':');
    if (parts.length < 2) return false;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return false;

    // Create a UTC-based Date for the arrival time and subtract 10 minutes
    const landingDateUTC = new Date(Date.UTC(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10), h, m));
    const landingCheck = new Date(landingDateUTC.getTime() - 10 * 60 * 1000);

    // sunCalc must be provided (SunCalc in browser, nothing since we can't do this in Node)
    if (!sunCalc) return false;

    // Compute sunrise/dawn and sunset/dusk for that date at the given coordinates
    const times = sunCalc.getTimes(landingCheck, lat, lon);
    const dawn = times.dawn;
    const dusk = times.dusk;

    if (!dawn || !dusk) {
      return false;
    }

    return (landingCheck < dawn) || (landingCheck > dusk);
  } catch (e) {
    console.error('isNightLanding error', e);
    return false;
  }
}

export function decryptAES(encryptedText, password, CryptoJS) {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedText.trim(), password);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    if (!decrypted) {
      throw new Error('Decryption resulted in empty string');
    }
    return decrypted;
  } catch (e) {
    console.error('Decryption failed', e);
    return null;
  }
}
