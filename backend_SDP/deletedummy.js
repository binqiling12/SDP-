const mysql = require("mysql2/promise");

// Mengonfigurasi koneksi ke database dengan kredensial XAMPP
const pool = mysql.createPool({
  host: "localhost",
  user: "root", // Username default XAMPP
  password: "", // Password kosong untuk XAMPP
  database: "sdp_project", // Nama database Anda
});

// Fungsi untuk menghapus data dummy yang sudah ditambahkan
async function deleteDummyData() {
  const connection = await pool.getConnection();

  try {
    // Menghapus hubungan produk dengan kategori di tabel ProductCategory
    await connection.query("DELETE FROM ProductCategory WHERE product_id IN (SELECT product_id FROM Product)");

    // Menghapus data produk dari tabel Product
    await connection.query("DELETE FROM Product WHERE name IN (?, ?, ?)", [
      "Laptop Acer",
      "Smartphone Samsung",
      "Headphone Sony",
    ]);

    // Menghapus data kategori dari tabel Category
    await connection.query("DELETE FROM Category WHERE category_name IN (?, ?)", [
      "Electronics",
      "Accessories",
    ]);

    console.log("Data dummy berhasil dihapus!");
  } catch (error) {
    console.error("Error deleting dummy data:", error);
  } finally {
    connection.release();
  }
}

// Panggil fungsi untuk menghapus data dummy
deleteDummyData();

