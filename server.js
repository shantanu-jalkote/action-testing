var express = require('express');
var cors = require('cors');
var axios = require('axios');
require('dotenv').config();

var app = express();

app.use(cors());
app.use(express.json());

var apiEndpoint = '/api/endpoint';

app.post('/api', function(req, res) {
  try {
    var apiKey = process.env.API_KEY;
    axios.post(apiEndpoint, req.body, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiKey
      },
    }).then(function(response) {
      res.json(response.data);
    }).catch(function(error) {
      res.status(500).json({ error: 'Internal Server Error' });
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/news', function(req, res) {
  try {
    var newsApiKey = process.env.NEWS_API_KEY;
    var q = req.query.q;
    var from = req.query.from;
    axios.get('https://sample/api' + q + '&from=' + from + '&sortBy=publishedAt&apiKey=' + newsApiKey)
      .then(function(apiResponse) {
        res.json(apiResponse.data);
      })
      .catch(function(error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
      });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

var PORT = process.env.PORT || 4000;
app.listen(PORT, function() {
  console.log('Server is running on http://localhost:' + PORT);
});
