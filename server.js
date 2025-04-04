const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

let listings = [];
let connectedAddresses = {};
const unisatApiKey = '0c3bf50981aa4abd0dfd0b52315fdf527ab72750a527cb418bd21a649b825397';

app.get('/connect', (req, res) => {
  const nonce = Math.random().toString(36).substring(2);
  const callbackUrl = `https://${req.get('host')}/callback?nonce=${nonce}`;
  const deeplink = `unisat://request?method=connect&from=MyOrdinalsMarket&nonce=${nonce}&callback=${encodeURIComponent(callbackUrl)}`;
  res.json({ deeplink, nonce });
});

app.get('/callback', (req, res) => {
  const { nonce, address } = req.query;
  if (nonce && address) {
    connectedAddresses[nonce] = address;
    res.send('Connected! Return to the app.');
  } else {
    res.status(400).send('Connection failed.');
  }
});

app.get('/address/:nonce', (req, res) => {
  const address = connectedAddresses[req.params.nonce];
  if (address) {
    res.json({ address });
  } else {
    res.status(404).json({ error: 'Not connected yet' });
  }
});

// Get user's Ordinals
app.get('/ordinals/:address', async (req, res) => {
  const { address } = req.params;
  try {
    const response = await fetch(`https://open-api.unisat.io/v1/indexer/address/${address}/inscription`, {
      headers: { 'Authorization': `Bearer ${unisatApiKey}` }
    });
    const responseText = await response.text();
    console.log(`UniSat API response for ${address}: ${responseText}`);
    if (!response.ok) {
      throw new Error(`UniSat API error: ${response.status} - ${responseText}`);
    }
    const data = JSON.parse(responseText);
    if (data.code !== 0) {
      throw new Error(`UniSat API failed: ${data.msg}`);
    }
    res.json(data.data.inscriptions || []);
  } catch (error) {
    console.error(`Error fetching Ordinals for ${address}: ${error.message}`);
    res.status(response?.status || 500).json({ error: error.message });
  }
});

// List an Ordinal
app.post('/list', (req, res) => {
  const { inscriptionId, price, seller } = req.body;
  if (!inscriptionId || !price || !seller) {
    return res.status(400).json({ error: 'Missing data' });
  }
  const listing = { id: listings.length, inscriptionId, price, seller };
  listings.push(listing);
  res.json(listing);
});

// Get all listings
app.get('/listings', (req, res) => {
  res.json(listings);
});

// Buy an Ordinal
app.post('/buy', (req, res) => {
  const { index, buyer } = req.body;
  const listing = listings[index];
  if (!listing) {
    return res.status(404).json({ error: 'Item not found' });
  }
  const satoshis = Math.floor(listing.price * 100000000);
  const deeplink = `unisat://request?method=sendBitcoin&to=${listing.seller}&amount=${satoshis}`;
  listings.splice(index, 1);
  res.json({ deeplink });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});