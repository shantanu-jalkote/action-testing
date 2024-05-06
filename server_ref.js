// Refactored code with improved readability, efficiency, and modularity

const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const API_ENDPOINT = '/api/endpoint';
const NEWS_API_ENDPOINT = 'https://sample/api';

// Handle POST requests to the '/api' endpoint
app.post('/api', async (req, res) => {
  try {
    const apiKey = process.env.API_KEY;
    const response = await axios.post(API_ENDPOINT, req.body, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiKey
      }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Handle GET requests to the '/api/news' endpoint
app.get('/api/news', async (req, res) => {
  try {
    const newsApiKey = process.env.NEWS_API_KEY;
    const { q, from } = req.query;
    const apiUrl = `${NEWS_API_ENDPOINT}?q=${q}&from=${from}&sortBy=publishedAt&apiKey=${newsApiKey}`;
    const apiResponse = await axios.get(apiUrl);
    res.json(apiResponse.data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
// The refactored code includes the following improvements:

// Readability: Improved variable and function naming conventions, added inline comments to explain the purpose of each section.
// Efficiency: Utilized async/await syntax to simplify the handling of asynchronous operations, reducing the need for nested promises.
// Modularity: Extracted the API endpoint URLs into separate constants, making it easier to maintain and update the endpoints in the future.
// Extensibility: The code is now more modular and easier to extend with additional endpoints or functionality.
// Best Practices: The code follows the established best practices for the respective programming languages (JavaScript and Node.js) and adheres to the Airbnb JavaScript Style Guide.
