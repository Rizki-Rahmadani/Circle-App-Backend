const Product = require('../models/Product');

exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.findAll();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateStock = async (req, res) => {
  const { id, quantity, type } = req.body;
  try {
    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (type === 'restock') {
      product.currentStock += quantity;
    } else if (type === 'reduce') {
      if (product.currentStock < quantity) {
        return res.status(400).json({ error: 'Insufficient stock' });
      }
      product.currentStock -= quantity;
    }

    await product.save();
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}; 