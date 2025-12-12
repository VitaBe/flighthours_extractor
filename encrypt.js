// to encrypt PKs.csv into PKs.csv.enc using AES encryption
// run this script with Node.js in terminal
// tested on osx

const fs = require('fs');
const CryptoJS = require('crypto-js');

// Read the CSV file
const csvContent = fs.readFileSync('PKs.csv', 'utf8');

// Encrypt with password
const password = 'insert_the_correct_password_here';
const encrypted = CryptoJS.AES.encrypt(csvContent, password).toString();

// Save to file
fs.writeFileSync('PKs.csv.enc', encrypted);

console.log('Encrypted PKs.csv to PKs.csv.enc');