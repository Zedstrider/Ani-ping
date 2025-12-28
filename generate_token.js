const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

//Load the credentials file downloaded
const credentialsPath = path.join(__dirname, 'credentials.json');
const keys = JSON.parse(fs.readFileSync(credentialsPath));
const { client_secret, client_id, redirect_uris } = keys.installed || keys.web;

//Create the OAuth2 client
const oAuth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uris[0]
);

// Define the permission needed to send Email
const SCOPES = ['https://mail.google.com/'];

//Start the login process
const authUrl = oAuth2Client.generateAuthUrl({
  access_type: 'offline', //gets the Refresh Token
  scope: SCOPES,
});

console.log('Authorize this app by visiting this url:', authUrl);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Enter the code from that page here: ', (code) => {
  rl.close();
  oAuth2Client.getToken(code, (err, token) => {
    if (err) return console.error('Error retrieving access token', err);
    console.log('\nSUCCESS!\n');
    console.log('Here is your Refresh Token (Keep this safe!):');
    console.log(token.refresh_token); 
    console.log('\n(Copy that long string above and save it!)');
  });
});