# 🛒 Shopee-clone — Full-stack demo

Trang web bán hàng kiểu Shopee: **Node.js + Express + SQLite** ở backend, frontend thuần HTML/CSS/JS, **song ngữ Việt/Anh**.

## Chạy

```bash
npm install
npm run seed     # tạo database + 8 danh mục, 28 sản phẩm
npm start        # http://localhost:3000
```

Đổi port: `PORT=3100 npm start`

Tài khoản demo: `demo@shopee.vn` / `123456` — hoặc tự đăng ký.

## Deploy lên Internet (Render, miễn phí)

**Miền được cấp:** `https://shopee-clone-vn.onrender.com`

> Tên `.onrender.com` **không đổi được** sau khi tạo service. Nó lấy từ trường `name` trong `render.yaml`.

**Bước 1 — đẩy code lên GitHub:**
```bash
git remote add origin https://github.com/<user>/shopee-clone.git
git push -u origin master
```
GitHub hỏi mật khẩu → dùng **Personal Access Token**, không dùng mật khẩu tài khoản.

**Bước 2 — tạo service:**
https://render.com → **New + → Blueprint** → chọn repo. Render đọc `render.yaml` và tự deploy.
Hoặc **New + → Web Service** → connect repo → Runtime `Node` → Build `npm ci --omit=dev` → Start `npm start`.

**Bước 3 — kiểm tra:** mở `/api/health` phải trả `{"ok":true,...}`.

**Giới hạn plan free:** sleep sau 15 phút không có truy cập (lần mở đầu chậm ~30s), và **filesystem tạm — mỗi lần deploy lại dữ liệu SQLite bị xoá**, chỉ còn dữ liệu mẫu được seed lại. Dùng thật thì cần Postgres (Neon free tier) hoặc plan có persistent disk.

### Nâng lên tên miền riêng (ví dụ `shopee.vn`)

Render Hobby plan gồm 2 custom domain miễn phí, nhưng **tên miền phải mua ở registrar** (~250.000–350.000đ/năm cho .com, .vn). Không có tên miền thật nào miễn phí.

Sau khi mua, tại Render: service → **Settings → Custom Domains → Add Custom Domain** → nhập `shopee.vn`.
Rồi tại registrar tạo bản ghi DNS:

| Tên | Loại | Trỏ tới |
|---|---|---|
| `@` | ALIAS/ANAME (nếu hỗ trợ), nếu không thì A | `216.24.57.1` |
| `www` | CNAME | `shopee-clone-vn.onrender.com` |

Render tự cấp chứng chỉ TLS miễn phí và tự chuyển HTTP → HTTPS. Chờ DNS lan truyền (vài phút đến 24 giờ).
Có domain riêng thì vào Settings tắt **Render Subdomain** được (chỉ truy cập qua domain của bạn).


## Tính năng

| Nhóm | Chi tiết |
|---|---|
| Danh mục | 8 danh mục, lọc sản phẩm theo danh mục |
| Tìm kiếm | Tìm theo tên (tiếng Việt + tiếng Anh) |
| Sắp xếp | Phổ biến, mới nhất, giá tăng/giảm, đánh giá cao |
| Lọc giá | Khoảng giá tùy ý |
| Phân trang | 12 sản phẩm/trang |
| Chi tiết SP | Modal chi tiết + sản phẩm liên quan + chọn số lượng |
| Tài khoản | Đăng ký, đăng nhập, sửa hồ sơ, đăng xuất (session token 7 ngày) |
| Giỏ hàng | Thêm/gộp/xóa, đổi số lượng, kiểm tra tồn kho, badge đếm hàng |
| Đặt hàng | COD hoặc online, tự trừ kho, tăng số đã bán, ghi lịch sử |
| Đơn hàng | Danh sách đơn, trạng thái, hủy đơn (hoàn lại kho) |
| Song ngữ | Nút 🇻🇳/🇬🇧, nhớ lựa chọn trong localStorage |

## API

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/categories?lang=` | Danh mục |
| GET | `/api/products?q=&category=&sort=&min=&max=&page=&limit=&lang=` | Danh sách SP |
| GET | `/api/products/:id` | Chi tiết + SP liên quan |
| POST | `/api/auth/register` · `/api/auth/login` | Tạo tài khoản / đăng nhập |
| POST | `/api/auth/logout` | Đăng xuất |
| GET/PUT | `/api/auth/me` | Hồ sơ (cần token) |
| GET/POST/DELETE | `/api/cart` | Xem / thêm / xóa hết giỏ |
| PUT/DELETE | `/api/cart/:productId` | Đổi số lượng / xóa một món |
| POST | `/api/orders` | Đặt hàng |
| GET | `/api/orders` | Lịch sử đơn |
| POST | `/api/orders/:id/cancel` | Hủy đơn |
| GET | `/api/stats` | Thống kê |

Gửi token qua header: `Authorization: Bearer <token>`

## Kiểm thử

```bash
node test.js       # 39 test API (catalog, auth, cart, order, security)
node test-ui.js    # 32 test UI (render, search, modal, checkout, i18n)
```

Cả hai cần server đang chạy (mặc định `PORT=3100` cho test):
```bash
PORT=3100 node src/server.js
```

## Cấu trúc

```
src/server.js   Express app + toàn bộ API
src/db.js       Schema SQLite (node:sqlite) + scrypt hash password
src/seed.js     Dữ liệu mẫu
public/         index.html, style.css, i18n.js, app.js
data/shop.db    Database
```

## Ghi chú

- Mật khẩu hash bằng `scrypt` + salt ngẫu nhiên (stdlib, không cần dependency).
- Không dùng native module nên chạy được trên Windows/macOS/Linux mà không cần build tool.
- Đặt hàng và hủy đơn chạy trong transaction — nếu lỗi thì rollback, không trừ kho sai.
- Mọi dữ liệu là dữ liệu giả lập, dùng để học/demo. Không có thanh toán thật.
