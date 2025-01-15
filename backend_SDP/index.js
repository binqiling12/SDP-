const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const app = express();
const port = process.env.PORT || 3000;

// Use express.json to parse incoming JSON requests
app.use(express.json());

// Database connection pool configuration
const pool = mysql.createPool({
  host: "localhost",
  user: "root", // Change to your actual MySQL username
  password: "", // Change to your MySQL password
  database: "sdp_project",
  connectionLimit: 10, // Limit the number of simultaneous connections
});

// Enable CORS with allowed origins
app.use(
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"], // Update allowed origins
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true // Add this line
  })
);

// Get all users
app.get("/users", async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM User");
  res.json(rows);
});

// Create a new user
app.post("/users", async (req, res) => {
  const { username, password, email, address } = req.body;
  
  if (!username || !password || !email) {
    return res.status(400).json({ message: "Username, email, and password are required" });
  }

  const [existingUsers] = await pool.query(
    "SELECT username, email FROM User WHERE username = ? OR email = ?",
    [username, email]
  );

  if (existingUsers.length > 0) {
    if (existingUsers[0].username === username) {
      return res.status(400).json({ message: "Username already exists" });
    }
    if (existingUsers[0].email === email) {
      return res.status(400).json({ message: "Email already exists" });
    }
  }

  const [result] = await pool.query(
    "INSERT INTO User (username, password, email, address) VALUES (?, ?, ?, ?)",
    [username, password, email, address || null]
  );
  
  res.status(201).json({
    user_id: result.insertId,
    message: "User registered successfully"
  });
});

// Get user by ID
app.get("/users/:id", async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM User WHERE user_id = ?", [req.params.id]);
  if (rows.length === 0) return res.status(404).send("User not found");
  res.json(rows[0]);
});

// Update user by ID
app.put("/users/:id", async (req, res) => {
  const { username, password, email, role_id } = req.body;
  const [result] = await pool.query(
    "UPDATE User SET username = ?, password = ?, email = ?, role_id = ? WHERE user_id = ?",
    [username, password, email, role_id, req.params.id]
  );
  if (result.affectedRows === 0) return res.status(404).send("User not found");
  res.json({ message: "User updated successfully" });
});

// Delete user by ID
app.delete("/users/:id", async (req, res) => {
  const [result] = await pool.query("DELETE FROM User WHERE user_id = ?", [req.params.id]);
  if (result.affectedRows === 0) return res.status(404).send("User not found");
  res.json({ message: "User deleted successfully" });
});

// Get all products with their categories
app.get("/products", async (req, res) => {
  const [rows] = await pool.query(`
    SELECT p.*, GROUP_CONCAT(c.category_name) as categories
    FROM Product p
    LEFT JOIN ProductCategory pc ON p.product_id = pc.product_id
    LEFT JOIN Category c ON pc.category_id = c.category_id
    GROUP BY p.product_id
  `);
  res.json(rows);
});

// Get product by ID with its categories
app.get("/products/:id", async (req, res) => {
  const { id } = req.params;
  const [product] = await pool.query(`
    SELECT p.*, GROUP_CONCAT(c.category_name) as categories
    FROM Product p
    LEFT JOIN ProductCategory pc ON p.product_id = pc.product_id
    LEFT JOIN Category c ON pc.category_id = c.category_id
    WHERE p.product_id = ?
    GROUP BY p.product_id
  `, [id]);

  if (product.length === 0) return res.status(404).send("Product not found");
  res.json(product[0]);
});

// Create a new product with categories
app.post("/products", async (req, res) => {
  const { name, stock, price, image } = req.body;
  
  if (!name?.trim()) return res.status(400).json({ message: "Nama produk harus diisi" });
  if (!image?.trim()) return res.status(400).json({ message: "URL gambar harus diisi" });
  if (!price || isNaN(price) || price <= 0) return res.status(400).json({ message: "Harga harus berupa angka positif" });
  if (!stock || isNaN(stock) || stock < 0) return res.status(400).json({ message: "Stok harus berupa angka non-negatif" });

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  const [existingProduct] = await connection.query(
    "SELECT product_id FROM Product WHERE name = ?",
    [name.trim()]
  );

  if (existingProduct.length > 0) {
    await connection.rollback();
    connection.release();
    return res.status(400).json({ message: "Produk dengan nama tersebut sudah ada" });
  }

  const [result] = await connection.query(
    "INSERT INTO Product (name, stock, price, image) VALUES (?, ?, ?, ?)",
    [name.trim(), parseInt(stock), parseFloat(price), image.trim()]
  );

  await connection.commit();
  connection.release();

  res.status(201).json({
    product_id: result.insertId,
    message: "Produk berhasil ditambahkan"
  });
});

// Update product by ID
app.put("/products/:id", async (req, res) => {
  const { name, stock, price, image, categories } = req.body;
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  const [result] = await connection.query(
    "UPDATE Product SET name = ?, stock = ?, price = ?, image = ? WHERE product_id = ?",
    [name, stock, price, image, req.params.id]
  );

  if (result.affectedRows === 0) {
    await connection.rollback();
    connection.release();
    return res.status(404).send("Product not found");
  }

  if (categories) {
    await connection.query("DELETE FROM ProductCategory WHERE product_id = ?", [req.params.id]);
    if (categories.length > 0) {
      const categoryValues = categories.map(categoryId => [req.params.id, categoryId]);
      await connection.query(
        "INSERT INTO ProductCategory (product_id, category_id) VALUES ?",
        [categoryValues]
      );
    }
  }

  await connection.commit();
  connection.release();
  res.json({ message: "Product updated successfully" });
});

// Delete product by ID
app.delete("/products/:id", async (req, res) => {
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  await connection.query("DELETE FROM ProductCategory WHERE product_id = ?", [req.params.id]);
  const [result] = await connection.query("DELETE FROM Product WHERE product_id = ?", [req.params.id]);

  if (result.affectedRows === 0) {
    await connection.rollback();
    connection.release();
    return res.status(404).send("Product not found");
  }

  await connection.commit();
  connection.release();
  res.json({ message: "Product deleted successfully" });
});

// Create a new category
app.post("/categories", async (req, res) => {
  const { category_name } = req.body;
  
  const [result] = await pool.query(
    "INSERT INTO Category (category_name) VALUES (?)",
    [category_name]
  );
  
  res.json({ category_id: result.insertId });
});

// Add product to category
app.post("/product-category", async (req, res) => {
  const { product_id, category_id } = req.body;
  
  await pool.query(
    "INSERT INTO ProductCategory (product_id, category_id) VALUES (?, ?)",
    [product_id, category_id]
  );
  
  res.json({ message: "Product added to category" });
});

// Get cart for a user
app.get("/carts/:user_id", async (req, res) => {
  const { user_id } = req.params;
  const [rows] = await pool.query("SELECT * FROM Cart WHERE user_id = ?", [
    user_id,
  ]);
  res.json(rows);
});

// Create a new cart for a user
app.post("/carts", async (req, res) => {
  const { user_id, total_price } = req.body;
  const [result] = await pool.query(
    "INSERT INTO Cart (user_id, total_price) VALUES (?, ?)",
    [user_id, total_price]
  );
  res.json({ cart_id: result.insertId });
});

// Create a new transaction
app.post("/transactions", async (req, res) => {
  const { user_id, total_amount } = req.body;
  const [result] = await pool.query(
    "INSERT INTO Transaction (user_id, total_amount) VALUES (?, ?)",
    [user_id, total_amount]
  );
  res.json({ transaction_id: result.insertId });
});

// Get all transactions for a user
app.get("/transactions/:user_id", async (req, res) => {
  const { user_id } = req.params;
  const [rows] = await pool.query(
    "SELECT * FROM Transaction WHERE user_id = ?",
    [user_id]
  );
  res.json(rows);
});

// Get cart items for a user
app.get("/cart/:userId", async (req, res) => {
  const { userId } = req.params;
  const [cart] = await pool.query(
    "SELECT * FROM Cart WHERE user_id = ? ORDER BY cart_id DESC LIMIT 1",
    [userId]
  );

  if (cart.length === 0) {
    return res.json([]);
  }

  const [cartItems] = await pool.query(`
    SELECT ci.cart_item_id, ci.quantity, p.product_id, p.name, p.price, p.image
    FROM CartItem ci
    JOIN Product p ON ci.product_id = p.product_id
    WHERE ci.cart_id = ?
  `, [cart[0].cart_id]);

  res.json(cartItems);
});

// Add item to cart
app.post("/cart/:userId/items", async (req, res) => {
  const { userId } = req.params;
  const { productId, quantity } = req.body;
  const connection = await pool.getConnection();
  
  await connection.beginTransaction();

  let [cart] = await connection.query(
    "SELECT * FROM Cart WHERE user_id = ? ORDER BY cart_id DESC LIMIT 1",
    [userId]
  );

  let cartId;
  if (cart.length === 0) {
    const [newCart] = await connection.query(
      "INSERT INTO Cart (user_id) VALUES (?)",
      [userId]
    );
    cartId = newCart.insertId;
  } else {
    cartId = cart[0].cart_id;
  }

  await connection.query(
    "INSERT INTO CartItem (cart_id, product_id, quantity) VALUES (?, ?, ?)",
    [cartId, productId, quantity]
  );

  await connection.query(`
    UPDATE Cart SET total_price = (
      SELECT SUM(ci.quantity * p.price)
      FROM CartItem ci
      JOIN Product p ON ci.product_id = p.product_id
      WHERE ci.cart_id = ?
    )
    WHERE cart_id = ?
  `, [cartId, cartId]);

  await connection.commit();
  connection.release();
  
  res.json({ message: "Item added to cart" });
});

// Update cart item quantity
app.put("/cart/items/:cartItemId", async (req, res) => {
  const { cartItemId } = req.params;
  const { quantity } = req.body;
  const connection = await pool.getConnection();

  await connection.beginTransaction();

  await connection.query(
    "UPDATE CartItem SET quantity = ? WHERE cart_item_id = ?",
    [quantity, cartItemId]
  );

  const [cartItem] = await connection.query(
    "SELECT cart_id FROM CartItem WHERE cart_item_id = ?",
    [cartItemId]
  );

  await connection.query(`
    UPDATE Cart SET total_price = (
      SELECT SUM(ci.quantity * p.price)
      FROM CartItem ci
      JOIN Product p ON ci.product_id = p.product_id
      WHERE ci.cart_id = ?
    )
    WHERE cart_id = ?
  `, [cartItem[0].cart_id, cartItem[0].cart_id]);

  await connection.commit();
  connection.release();
  
  res.json({ message: "Cart item updated" });
});

// Remove item from cart
app.delete("/cart/items/:cartItemId", async (req, res) => {
  const { cartItemId } = req.params;
  const connection = await pool.getConnection();

  await connection.beginTransaction();

  const [cartItem] = await connection.query(
    "SELECT cart_id FROM CartItem WHERE cart_item_id = ?",
    [cartItemId]
  );

  await connection.query(
    "DELETE FROM CartItem WHERE cart_item_id = ?",
    [cartItemId]
  );

  await connection.query(`
    UPDATE Cart SET total_price = (
      SELECT SUM(ci.quantity * p.price)
      FROM CartItem ci
      JOIN Product p ON ci.product_id = p.product_id
      WHERE ci.cart_id = ?
    )
    WHERE cart_id = ?
  `, [cartItem[0].cart_id, cartItem[0].cart_id]);

  await connection.commit();
  connection.release();
  
  res.json({ message: "Cart item removed" });
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

// Add global error handler at the end
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "Internal server error" });
});
