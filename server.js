const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

let listings = [];
let connectedAddresses = {};

app.get('/connect', (req, res) => {
  const nonce = Math.random().toString(36).substring(2);
  const callbackUrl = `https://${req.get('host')}/callback?nonce=${nonce}`; // Use HTTPS
  const deeplink = `unisat://request?method=connect&from=MyOrdinalsMarket&nonce=${nonce}&callback=${encodeURIComponent(callbackUrl)}`;
  console.log('Generated deeplink:', deeplink);
  res.json({ deeplink, nonce });
});

app.get('/callback', (req, res) => {
  const { nonce, address } = req.query;
  console.log('Callback received:', { nonce, address });
  if (nonce && address) {
    connectedAddresses[nonce] = address;
    res.send('Connected! Return to the app.');
  } else {
    res.status(400).send('Connection failed.');
  }
});

app.get('/address/:nonce', (req, res) => {
  const address = connectedAddresses[req.params.nonce];
  console.log('Address check for nonce:', req.params.nonce, 'Found:', address);
  if (address) {
    res.json({ address });
  } else {
    res.status(404).json({ error: 'Not connected yet' });
  }
});

app.post('/list', (req, res) => {
  const { ordinalId, price, seller } = req.body;
  if (!ordinalId || !price || !seller) {
    return res.status(400).json({ error: 'Missing data' });
  }
  const listing = { id: listings.length, ordinalId, price, seller };
  listings.push(listing);
  res.json(listing);
});

app.get('/listings', (req, res) => {
  res.json(listings);
});

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