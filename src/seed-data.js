// Seed data shared by `npm run seed` and the server's auto-seed on an empty DB.
export const categories = [
  { slug: 'dien-thoai', icon: '📱', name_vi: 'Điện thoại & Phụ kiện', name_en: 'Phones & Accessories' },
  { slug: 'may-tinh', icon: '💻', name_vi: 'Máy tính & Laptop', name_en: 'Computers & Laptops' },
  { slug: 'thoai-may', icon: '👟', name_vi: 'Thời trang & Giày dép', name_en: 'Fashion & Footwear' },
  { slug: 'lam-dep', icon: '💄', name_vi: 'Làm đẹp & Sức khỏe', name_en: 'Beauty & Health' },
  { slug: 'nha-cuong', icon: '🏠', name_vi: 'Nhà cửa & Đời sống', name_en: 'Home & Living' },
  { slug: 'thuc-pham', icon: '🍜', name_vi: 'Thực phẩm & Đồ uống', name_en: 'Food & Beverages' },
  { slug: 'me-be', icon: '🧸', name_vi: 'Mẹ & Bé', name_en: 'Maternity & Baby' },
  { slug: 'the-thao', icon: '⚽', name_vi: 'Thể thao & Du lịch', name_en: 'Sports & Travel' },
];

// [category, name_vi, name_en, price, original_price, stock, sold, icon, free_shipping]
export const products = [
  ['dien-thoai', 'iPhone 15 Pro Max 256GB', 'iPhone 15 Pro Max 256GB', 29990000, 34990000, 42, 1280, '📱', 1],
  ['dien-thoai', 'Samsung Galaxy S24 Ultra', 'Samsung Galaxy S24 Ultra', 24990000, 27990000, 65, 940, '📱', 1],
  ['dien-thoai', 'Tai nghe Bluetooth AirPods Pro 2', 'AirPods Pro 2 ANC Earbuds', 4990000, 6490000, 180, 5320, '🎧', 1],
  ['dien-thoai', 'Sạc nhanh 65W GaN Type-C', '65W GaN Fast Charger Type-C', 690000, 990000, 320, 8740, '🔌', 1],
  ['dien-thoai', 'Ống lưu giữ điện thoại silicon', 'Silicone Phone Case', 89000, 149000, 900, 12400, '🧤', 0],
  ['may-tinh', 'MacBook Air M3 13 inch 8GB/256GB', 'MacBook Air M3 13" 8GB/256GB', 21990000, 24990000, 18, 320, '💻', 1],
  ['may-tinh', 'Laptop Gaming ASUS TUF A15 RTX 4060', 'ASUS TUF A15 Gaming RTX 4060', 27990000, 31990000, 12, 187, '🎮', 1],
  ['may-tinh', 'Màn hình IPS 24 inch 144Hz', '24" IPS Monitor 144Hz', 2779000, 3490000, 47, 620, '🖥️', 1],
  ['may-tinh', 'Chuột không dây Logitech MX Master 3S', 'Logitech MX Master 3S Wireless Mouse', 2190000, 2779000, 76, 1830, '🖱️', 1],
  ['thoai-may', 'Giày thể thao Nike Air Zoom Pegasus 41', 'Nike Air Zoom Pegasus 41 Running Shoes', 3290000, 4290000, 88, 2140, '👟', 1],
  ['thoai-may', 'Áo thun cotton unisex 250gsm', 'Unisex Cotton T-Shirt 250gsm', 199000, 299000, 540, 9820, '👕', 0],
  ['thoai-may', 'Quần jeans slim fit co giãn nam', "Men's Slim Fit Stretch Jeans", 429000, 649000, 210, 3410, '👖', 0],
  ['thoai-may', 'Túi xách nữ da PU 2025', "Women's PU Leather Handbag 2025", 549000, 790000, 130, 1870, '👜', 0],
  ['lam-dep', 'Son Rouge Dior 999 màu đỏ kinh điển', 'Dior Rouge 999 Classic Red Lipstick', 790000, 950000, 240, 6200, '💄', 1],
  ['lam-dep', 'Kem dưỡng da Vitamin C 30ml', 'Vitamin C Facial Serum 30ml', 349000, 490000, 380, 9420, '✨', 0],
  ['lam-dep', 'Máy khoan da chăm sóc HydraFacial mini', 'HydraFacial Mini Facial Device', 1890000, 2490000, 22, 410, '🧴', 1],
  ['nha-cuong', 'Nồi chiên không dầu Philips 5.5L', 'Philips Airfryer XXL 5.5L', 1990000, 2779000, 55, 2730, '🍳', 1],
  ['nha-cuong', 'Bộ chăn ga gối cotton 100% 4 mảnh', '100% Cotton Bedding Set (4 pcs)', 549000, 799000, 160, 4180, '🛏️', 0],
  ['nha-cuong', 'Đèn bàn LED điều chỉnh độ sáng', 'Dimmable LED Desk Lamp', 389000, 549000, 95, 1620, '💡', 1],
  ['thuc-pham', 'Mì cay Hàn Quốc gói lẻ 5 gói', 'Korean Instant Noodles (5 pack)', 59000, 89000, 800, 15200, '🍜', 0],
  ['thuc-pham', 'Cà phê Đắng Lâm Đồng rang xay 1kg', 'Lam Dong Arabica Coffee 1kg', 289000, 350000, 310, 4390, '☕', 0],
  ['thuc-pham', 'Bánh snack tôm hùm giòn', 'Prawn Cracker Snack Box', 119000, 159000, 460, 7890, '🍤', 0],
  ['me-be', 'Xe đẩy du lịch gấp gọn nhẹ', 'Lightweight Foldable Travel Stroller', 2190000, 2890000, 18, 260, '🛒', 1],
  ['me-be', 'Bộ đồ chơi xếp hình 1000 mảnh cho bé', '1000-piece Puzzle Set for Kids', 249000, 349000, 175, 1930, '🧩', 0],
  ['me-be', 'Giấy tã biệt danh cho trẻ sơ sinh M64', 'M64 Diaper Pants for Newborns (52 pcs)', 279000, 349000, 620, 11200, '👶', 0],
  ['the-thao', 'Bóng đá Adidas Starlite mô hình 5', 'Adidas Starlite Football Size 5', 890000, 1150000, 88, 2140, '⚽', 1],
  ['the-thao', 'Vali du lịch 20 inch kéo học thuật', '20" Travel Suitcase with Wheels', 1090000, 1490000, 42, 810, '🧳', 1],
  ['the-thao', 'Bình giữ nhiệt inox 500ml', '500ml Stainless Steel Water Bottle', 249000, 349000, 390, 6280, '🍶', 0],
];

const desc = (n, lang) =>
  lang === 'en'
    ? `${n} — official product, 12-month warranty, shipping in 1-3 days. 7-day return policy.`
    : `${n} — hàng chính hãng, bảo hành 12 tháng, giao hàng 1-3 ngày. Đổi trả trong 7 ngày.`;

export function seedDatabase(db, hashPassword) {
  const addCat = db.prepare('INSERT INTO categories (slug, icon, name_vi, name_en) VALUES (?, ?, ?, ?)');
  for (const c of categories) addCat.run(c.slug, c.icon, c.name_vi, c.name_en);

  const catIds = new Map(
    db.prepare('SELECT id, slug FROM categories').all().map((r) => [r.slug, r.id])
  );
  const addProduct = db.prepare(`
    INSERT INTO products
      (category_id, name_vi, name_en, description_vi, description_en, price, original_price, stock, sold, rating, rating_count, image, free_shipping)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const [cat, vi, en, price, orig, stock, sold, icon, free] of products) {
    addProduct.run(
      catIds.get(cat), vi, en, desc(vi, 'vi'), desc(en, 'en'),
      price, orig, stock, sold,
      4.5 + Math.random() * 0.5, Math.round(sold * 0.4), icon, free
    );
  }

  if (hashPassword) {
    db.prepare(
      'INSERT INTO users (email, password_hash, name, phone, address) VALUES (?, ?, ?, ?, ?)'
    ).run('demo@shopee.vn', hashPassword('123456'), 'Demo User', '0900000000', '100 Nguyễn Huệ, Quận 1, TP.HCM');
  }

  return { categories: categories.length, products: products.length };
}
