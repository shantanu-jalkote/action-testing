// Refactored code with improved readability and maintainability

// Import the Product model
const Product = require('../models/Product');

// Create a new product
exports.createProduct = async (req, res) => {
  try {
    // Extract the necessary data from the request body
    const { name, price, imageLink } = req.body;

    // Create a new product instance
    const newProduct = new Product({ name, price, imageLink });

    // Save the new product to the database
    await newProduct.save();

    // Return a success response with the created product
    res.status(201).json({ message: 'Product created successfully', product: newProduct });
  } catch (error) {
    // Log the error and return a server error response
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Fetch all products
exports.getAllProducts = async (req, res) => {
  try {
    // Retrieve all products from the database
    const products = await Product.find();

    // Return the list of products
    res.json(products);
  } catch (error) {
    // Log the error and return a server error response
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
