const express = require('express');
const path = require('node:path');

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/health', (request, response) => {
  response.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`OTP demo listening on http://localhost:${port}`);
});