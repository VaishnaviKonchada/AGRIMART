import express from 'express';
import Cart from '../models/Cart.js';
import { requireAuth } from '../middlewares/auth.js';

const router = express.Router();

// GET /api/cart - Get user's cart
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.sub;
    const userRole = req.user.role || 'customer';

    let cart = await Cart.findOne({ userId, userRole });
    if (!cart) {
      cart = await Cart.create({ userId, userRole, items: [] });
    }

    res.json(cart.items || []);
  } catch (error) {
    console.error('❌ Error fetching cart:', error.message);
    res.status(500).json({ message: 'Server error fetching cart' });
  }
});

// POST /api/cart - Update cart (replaces entire items list or merges)
router.post('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.sub;
    const userRole = req.user.role || 'customer';
    const { items } = req.body;

    if (!Array.isArray(items)) {
      return res.status(400).json({ message: 'Items must be an array' });
    }

    let cart = await Cart.findOne({ userId, userRole });
    if (!cart) {
      cart = new Cart({ userId, userRole, items });
    } else {
      cart.items = items;
    }

    await cart.save();
    res.json(cart.items);
  } catch (error) {
    console.error('❌ Error saving cart:', error.message);
    res.status(500).json({ message: 'Server error saving cart' });
  }
});

// DELETE /api/cart - Clear cart
router.delete('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.sub;
    const userRole = req.user.role || 'customer';

    await Cart.findOneAndUpdate({ userId, userRole }, { items: [] });
    res.json({ message: 'Cart cleared' });
  } catch (error) {
    console.error('❌ Error clearing cart:', error.message);
    res.status(500).json({ message: 'Server error clearing cart' });
  }
});

export default router;
