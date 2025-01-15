const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "sdp_project",
});

async function addDummyData() {
  const connection = await pool.getConnection();

  try {
    // Add Roles
    const [roleAdmin] = await connection.query(
      "INSERT INTO Role (role_name) VALUES (?)",
      ["Admin"]
    );
    const [roleUser] = await connection.query(
      "INSERT INTO Role (role_name) VALUES (?)",
      ["User"]
    );

    // Add Users
    await connection.query(
      "INSERT INTO User (username, password, email, role_id) VALUES (?, ?, ?, ?)",
      ["admin", "admin123", "admin@example.com", 1]
    );
    await connection.query(
      "INSERT INTO User (username, password, email, role_id) VALUES (?, ?, ?, ?)",
      ["john_doe", "user123", "john@example.com", 2]
    );
    await connection.query(
      "INSERT INTO User (username, password, email, role_id) VALUES (?, ?, ?, ?)",
      ["jane_smith", "user456", "jane@example.com", 2]
    );

    // Add Categories
    const [catElectronics] = await connection.query(
      "INSERT INTO Category (category_name) VALUES (?)",
      ["Electronics"]
    );
    const [catFashion] = await connection.query(
      "INSERT INTO Category (category_name) VALUES (?)",
      ["Fashion"]
    );
    const [catFood] = await connection.query(
      "INSERT INTO Category (category_name) VALUES (?)",
      ["Food & Beverages"]
    );

    // Add Products with images
    const products = [
      ["Laptop Asus ROG", 5, 15000000, "laptop_rog.jpg"],
      ["iPhone 14 Pro", 10, 18000000, "iphone14.jpg"],
      ["Nike Air Max", 15, 2000000, "nike_airmax.jpg"],
      ["Adidas Superstar", 20, 1500000, "adidas_superstar.jpg"],
      ["Coffee Beans Premium", 50, 100000, "coffee_beans.jpg"],
      ["Green Tea Matcha", 30, 50000, "matcha.jpg"]
    ];

    for (const [name, stock, price, image] of products) {
      await connection.query(
        "INSERT INTO Product (name, stock, price, image) VALUES (?, ?, ?, ?)",
        [name, stock, price, image]
      );
    }

    // Add Product Categories
    await connection.query(
      "INSERT INTO ProductCategory (product_id, category_id) VALUES (1, 1), (2, 1), (3, 2), (4, 2), (5, 3), (6, 3)"
    );

    // Add Carts
    await connection.query(
      "INSERT INTO Cart (user_id, total_price) VALUES (2, 18000000), (3, 1500000)"
    );

    // Add Cart Items
    await connection.query(
      "INSERT INTO CartItem (cart_id, product_id, quantity) VALUES (1, 2, 1), (2, 4, 1)"
    );

    // Add Transactions
    await connection.query(
      "INSERT INTO Transaction (user_id, status, total_amount) VALUES (2, 'Completed', 15000000), (3, 'Pending', 2000000)"
    );
    
    // Add Transaction Items
    await connection.query(
      "INSERT INTO TransactionItem (transaction_id, product_id, quantity, price_at_purchase) VALUES (1, 1, 1, 15000000), (2, 3, 1, 2000000)"
    );

    console.log("All dummy data has been successfully added!");
  } catch (error) {
    console.error("Error adding dummy data:", error);
  } finally {
    connection.release();
  }
}

addDummyData();
