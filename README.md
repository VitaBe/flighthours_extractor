# flighthours_extractor
An internal tool to extract data in a very specific format (Flugstunden - Übersicht PDF)

Use encrypt.js to update the PKs table, the table must be a CSV in the following format and be saved in this directory as PKs.csv:

123456A,MUSTERMANN,MAX
...

Use following commands
1. "npm install crypto-js"
2. "node encrypt.js"