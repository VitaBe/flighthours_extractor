// Configuration and constants

// IATA code mapping
export const codeDict = {
  'TCI': 'TFS',
  'MIL': 'MXP',
  'NYC': 'JFK'
};

// Header for output CSV
export const HEADER = [
  'Date (yyyy-mm-dd)', 'Flight #', 'Aircraft', 'Aircraft Model', 'From', 'To',
  'Departed (zulu)', 'Arrived (zulu)', 'Total (hh:mm)', 'Landings (day)',
  'Landings (night)', 'Captain (crew)', 'Simulator', 'Remarks'
];

// Regular Expressions
export const rowFilter = /.*\s[A-Z]{2}\d{4}\s.*\s\d\d:\d\d-\d\d:\d\d\s[A-Z]{3}\s(?!01).*(DEFT\d{2}|DEN\d{3}|D[A-Z]{4}).*A3[2|3][0|1].*/;
export const yearFilter = /für\sMonat.*\/.*(\d{4})/;
export const monthFilter = /für\sMonat\s(\d\d)/;
export const dayFilter = /^(\d\d)\./;
export const flightNumberFilter = /\d\d\.\d\d\.\s([A-Z]{2}\d{4})/;
export const simFilter = /.*(DEFT\d{2}|DEN\d{3}).*/;
export const registrationFilter = /.*(DEFT\d{2}|DEN\d{3}|D[A-Z]{4}).*/;
export const modelFilter = /.*(A3[2|3][0|1]).*/;
export const fromFilter = /.*([A-Z]{3})\s\d\d:\d\d.*/;
export const toFilter = /.*\d\d:\d\d\s([A-Z]{3}).*/;
export const departedFilter = /.*\s(\d\d:\d\d)-\d\d:\d\d\s.*/;
export const arrivedFilter = /.*\s\d\d:\d\d-(\d\d:\d\d)\s.*/;
export const landedFilter = /.*\d,\d\s(L)\s\d,\d\d.*/;
export const PKFilter = /.*\/(\d{6}[A-Z])/;

// Default airport data (will be extended by loaded CSV)
export const defaultAirports = {
  'FRA': [50.033333, 8.570556, 111],
  'TFS': [28.046111, -16.828056, 640],
  'MXP': [45.6306, 8.7281, 234]
};

// Default PKs (will be extended by loaded/decrypted data)
export const defaultPKs = {
  '123456A': 'Mustermann Max',
  '789012B': 'Erika Mustermann'
};
