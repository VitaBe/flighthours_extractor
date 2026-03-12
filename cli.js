#!/usr/bin/env node
// CLI Tool for extracting flight data from PDFs
// Usage: node cli.js [pdf-path] [--output output.csv] [--json]

import fs from 'fs';
import path from 'path';
import { extractFlightsFromPdf, flightsToCsv, HEADER } from './index.js';

function printUsage() {
  console.log(`
Usage: node cli.js [options] <pdf-file>

Options:
  -o, --output <file>   Output file (default: stdout)
  -j, --json            Output as JSON instead of CSV
  -v, --verbose         Show detailed parsing information
  -h, --help            Show this help message

Examples:
  node cli.js test/Flugstunden_Januar.pdf
  node cli.js test/Flugstunden_Januar.pdf -o output.csv
  node cli.js test/Flugstunden_Januar.pdf --json -o output.json
`);
}

function parseArgs(args) {
  const options = {
    output: null,
    json: false,
    verbose: false,
    pdfPath: null
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '-o':
      case '--output':
        options.output = args[++i];
        break;
      case '-j':
      case '--json':
        options.json = true;
        break;
      case '-v':
      case '--verbose':
        options.verbose = true;
        break;
      case '-h':
      case '--help':
        printUsage();
        process.exit(0);
        break;
      default:
        if (!arg.startsWith('-') && !options.pdfPath) {
          options.pdfPath = arg;
        }
        break;
    }
  }

  return options;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    printUsage();
    process.exit(1);
  }

  const options = parseArgs(args);

  if (!options.pdfPath) {
    console.error('Error: PDF file path is required');
    printUsage();
    process.exit(1);
  }

  if (!fs.existsSync(options.pdfPath)) {
    console.error(`Error: File not found: ${options.pdfPath}`);
    process.exit(1);
  }

  try {
    if (options.verbose) {
      console.error(`Processing: ${options.pdfPath}`);
      console.error('Extracting text from PDF...');
    }

    const flights = await extractFlightsFromPdf(options.pdfPath);
    const flightArray = Object.values(flights);

    if (flightArray.length === 0) {
      console.error('No flights found in PDF. Check if the file format is correct.');
      process.exit(1);
    }

    if (options.verbose) {
      console.error(`Found ${flightArray.length} flights`);
    }

    let output;
    if (options.json) {
      // JSON output
      const result = flightArray.map(row => {
        const obj = {};
        HEADER.forEach((key, i) => {
          obj[key] = row[i];
        });
        return obj;
      });
      output = JSON.stringify(result, null, 2);
    } else {
      // CSV output
      output = flightsToCsv(flights);
    }

    if (options.output) {
      fs.writeFileSync(options.output, output);
      console.error(`Output written to: ${options.output}`);
    } else {
      console.log(output);
    }

  } catch (error) {
    console.error(`Error: ${error.message}`);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
