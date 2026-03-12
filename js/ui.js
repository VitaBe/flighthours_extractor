import { HEADER } from './config.js';
import { getTotal } from './utils.js';

// State
let logMessages = [];

export function initLogger() {
  logMessages = [`Session started at ${new Date().toISOString()}`];
  return logMessages;
}

export function logMessage(message, type = 'INFO') {
  const logEntry = `${new Date().toISOString()} [${type}]: ${message}`;
  logMessages.push(logEntry);
  console.log(logEntry);
  return logEntry;
}

export function getLogMessages() {
  return logMessages;
}

export function showMessage(message, type = 'info') {
  const box = document.getElementById('messageBox');
  if (!box) return;

  box.innerText = message;
  box.className = 'p-4 rounded-xl mb-6 shadow-md';
  box.classList.remove('hidden', 'bg-red-100', 'text-red-700', 'bg-green-100', 'text-green-700', 'bg-blue-100', 'text-blue-700');

  if (type === 'error') {
    box.classList.add('bg-red-100', 'text-red-700');
  } else if (type === 'success') {
    box.classList.add('bg-green-100', 'text-green-700');
  } else {
    box.classList.add('bg-blue-100', 'text-blue-700');
  }

  logMessage(message, type.toUpperCase());
}

export function renderTable(flightData) {
  const tableHeader = document.getElementById('tableHeader');
  const tableBody = document.getElementById('tableBody');

  if (!tableHeader || !tableBody) return;

  // Render Header
  tableHeader.innerHTML = '';
  HEADER.forEach(h => {
    const th = document.createElement('th');
    th.className = 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap';
    th.innerText = h;
    tableHeader.appendChild(th);
  });

  // Render Body
  tableBody.innerHTML = '';
  flightData.forEach((rowData) => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-gray-50 transition duration-100';

    rowData.forEach((cellData, colIndex) => {
      const td = document.createElement('td');
      td.className = 'table-cell-editable text-sm text-gray-800';
      td.innerText = cellData;

      // Make cells editable, except for the calculated Total time (Col 8)
      if (colIndex !== 8) {
        td.contentEditable = 'true';
      }

      tr.appendChild(td);
    });
    tableBody.appendChild(tr);
  });
}

export function applyPKsToTable(PKs) {
  const tableBody = document.getElementById('tableBody');
  if (!tableBody) return 0;

  const rows = Array.from(tableBody.querySelectorAll('tr'));
  let replaced = 0;

  rows.forEach(row => {
    const cells = Array.from(row.querySelectorAll('td'));
    const captainCell = cells[11];
    if (!captainCell) return;
    const text = captainCell.innerText.trim();
    if (!text) return;

    // Direct key match
    if (PKs[text]) {
      captainCell.innerText = PKs[text];
      replaced++;
      return;
    }

    // If the cell contains the PK as part of a larger string, replace the PK substring
    for (const key in PKs) {
      if (!Object.prototype.hasOwnProperty.call(PKs, key)) continue;
      if (text.includes(key)) {
        captainCell.innerText = text.replace(key, PKs[key]);
        replaced++;
        break;
      }
    }
  });

  if (replaced > 0) {
    showMessage(`PKs übersetzt: ${replaced} Ersetzungen in der Tabelle.`, 'success');
    logMessage(`Applied ${replaced} PK replacements to table`);
  } else {
    showMessage('PKs geladen - keine Übersetzung in der aktuellen Tabelle.', 'info');
  }

  return replaced;
}

export function downloadCSV() {
  const tableBody = document.getElementById('tableBody');
  if (!tableBody) return;

  const rows = Array.from(tableBody.querySelectorAll('tr'));
  let csv = HEADER.join(',') + '\n';

  rows.forEach(row => {
    const cells = Array.from(row.querySelectorAll('td'));
    const rowData = cells.map((cell, index) => {
      // Total (hh:mm) muss NEU berechnet werden, falls Departed/Arrived geändert wurden
      if (index === 8) {
        const departedTime = cells[6].innerText.trim();
        const arrivedTime = cells[7].innerText.trim();
        return getTotal(departedTime, arrivedTime);
      }

      // CSV Sanitizing für alle anderen Zellen
      let data = cell.innerText.trim();
      data = data.replace(/"/g, '""'); // Escape double quotes
      if (data.includes(',') || data.includes('\n')) {
        data = `"${data}"`; // Enclose if data contains comma or newline
      }

      return data;
    });
    csv += rowData.join(',') + '\n';
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  const date = new Date().toISOString().slice(0, 10);
  link.setAttribute('href', url);
  link.setAttribute('download', `flights_${date}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showMessage('CSV-Datei erfolgreich heruntergeladen!', 'success');
}

export function downloadLog() {
  logMessage('Log file download requested');
  const logContent = logMessages.join('\n');
  const blob = new Blob([logContent], { type: 'text/plain;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  const date = new Date().toISOString().slice(0, 10);
  link.setAttribute('href', url);
  link.setAttribute('download', `logfile_${date}.txt`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showMessage('Log-Datei erfolgreich heruntergeladen!', 'success');
}

export function toggleTable(show, disableDownload = true) {
  const tableContainer = document.getElementById('tableContainer');
  const downloadBtn = document.getElementById('downloadBtn');

  if (tableContainer) {
    if (show) {
      tableContainer.classList.remove('hidden');
    } else {
      tableContainer.classList.add('hidden');
    }
  }

  if (downloadBtn) {
    downloadBtn.disabled = disableDownload;
  }
}

export function clearTable() {
  const tableBody = document.getElementById('tableBody');
  if (tableBody) {
    tableBody.innerHTML = '';
  }
}
