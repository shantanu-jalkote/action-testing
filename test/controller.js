var Product = require('../models/Product');

// Create a new product
exports.createProduct = async function(req, res) {
  try {
    var name = req.body.name;
    var price = req.body.price;
    var imageLink = req.body.imageLink;

    var newProduct = new Product({ name: name, price: price, imageLink: imageLink });

    await newProduct.save();

    res.status(201).json({ message: 'Product created successfully', product: newProduct });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.getAllProducts = async function(req, res) {
  try {
    var products = await Product.find();

    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
