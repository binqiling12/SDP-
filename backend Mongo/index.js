const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());

// Mongoose connection
mongoose.connect("mongodb://localhost:27017/sdp_project")
  .then(() => console.log("Connected to MongoDB"))
  .catch(error => console.error("MongoDB connection error:", error));

// Define schemas
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  address: String,
  createdAt: { type: Date, default: Date.now }
});

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  stock: { type: Number, required: true, min: 0 },
  price: { type: Number, required: true, min: 0 },
  image: { type: String, required: true },
  description: String,
  categories: [String],
  createdAt: { type: Date, default: Date.now }
});

const cartSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

const cartItemSchema = new mongoose.Schema({
  cartId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cart' },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  quantity: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Create models
const User = mongoose.model('User', userSchema);
const Product = mongoose.model('Product', productSchema);
const Cart = mongoose.model('Cart', cartSchema);
const CartItem = mongoose.model('CartItem', cartItemSchema);

// Enable CORS
app.use(
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  })
);

// Users endpoints
app.get("/users", async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching users");
  }
});

app.post("/users", async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    res.status(201).json({
      user_id: user._id,
      message: "User registered successfully"
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      res.status(400).json({ message: `${field} already exists` });
    } else {
      console.error('Database error:', error);
      res.status(500).json({ message: error.message || "Error registering user" });
    }
  }
});

// Products endpoints
app.get("/products", async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching products");
  }
});

app.post("/products", async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.status(201).json({
      product_id: product._id,
      message: "Produk berhasil ditambahkan"
    });
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ message: "Produk dengan nama tersebut sudah ada" });
    } else {
      console.error('Product creation error:', error);
      res.status(500).json({ message: "Gagal menambahkan produk" });
    }
  }
});

// Cart endpoints
app.get("/cart/:userId", async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.params.userId }).sort({ createdAt: -1 });
    if (!cart) return res.json([]);

    const cartItems = await CartItem.find({ cartId: cart._id })
      .populate('productId');
    res.json(cartItems);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching cart items");
  }
});

app.post("/cart/:userId/items", async (req, res) => {
  try {
    let cart = await Cart.findOne({ userId: req.params.userId }).sort({ createdAt: -1 });
    if (!cart) {
      cart = await Cart.create({ userId: req.params.userId });
    }

    const cartItem = new CartItem({
      cartId: cart._id,
      productId: req.body.productId,
      quantity: req.body.quantity
    });
    await cartItem.save();

    res.json({ message: "Item added to cart" });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error adding item to cart");
  }
});

app.listen(port, () => {
  console.log(`MongoDB Server listening on port ${port}`);
});
