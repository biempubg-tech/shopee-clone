# Hướng dẫn deploy Shopee-clone lên Internet (Render, miễn phí)

Kết quả cuối cùng: web chạy tại `https://shopee-clone-vn.onrender.com`

Làm theo đúng thứ tự. Hai việc: **(A)** đẩy code lên GitHub → **(B)** tạo service trên Render.

---

## Chuẩn bị (đã xong, không cần làm)

Code đã nằm ở `C:\Users\biem11\projects\shopee-clone`, đã có git, đã commit 2 lần, đã sẵn sàng deploy.
Kiểm tra nhanh:

```bash
cd C:/Users/biem11/projects/shopee-clone
git log --oneline
```
Phải thấy 2 dòng commit mới nhất. Nếu có → sang phần A0.

### A0. Set tên và email cho git (bắt buộc — hiện tại máy bạn chưa có)

Git cần biết "ai" là người commit. Máy bạn đang để trống cả hai, nên commit sẽ báo lỗi. Chạy 2 lệnh này, thay thông tin của bạn:

```bash
cd C:/Users/biem11/projects/shopee-clone
git config user.name "Tên của bạn"
git config user.email "email-github-của-bạn@gmail.com"
```

Xác nhận:
```bash
git config user.name
git config user.email
```

Dùng chính email đăng ký GitHub để commit gắn đúng vào tài khoản của bạn.

---

## Phần A — Đẩy code lên GitHub

### A1. Tạo Personal Access Token

GitHub **không chấp nhận mật khẩu tài khoản** khi push qua HTTPS. Cần tạo token.

1. Mở https://github.com/settings/tokens
2. Chọn tab **Fine-grained tokens** → **Generate new token**
3. Điền:
   - **Token name**: `shopee-deploy`
   - **Expiration**: 90 days
   - **Repository access**: chọn **Only select repositories** → chọn repo sẽ tạo ở bước A2
   - **Permissions → Repository permissions**: bật **Contents: Read and write**
4. Nhấn **Generate token**
5. **Copy token ngay** — nó chỉ hiện 1 lần. Dạng `ghp_...`

> Token là mật khẩu của tài khoản bạn. Đừng gửi cho ai, đừng paste vào chat với tôi.

### A2. Tạo repo trống

1. Mở https://github.com/new
2. **Owner**: tài khoản của bạn
3. **Repository name**: `shopee-clone`
4. **Public** (để Render đọc; repo private thì phải cấu hình thêm trong Render)
5. ⚠️ **KHÔNG tick** "Add a README file", không chọn gitignore/license
6. **Create repository**

> Phải để repo trống. Repo có sẵn commit sẽ gây lỗi `rejected` khi push.

### A3. Kết nối và push

Mở **PowerShell hoặc Terminal**, chạy từng lệnh, thay `<TÊN-USER>` bằng username GitHub của bạn:

```bash
cd C:/Users/biem11/projects/shopee-clone
git remote add origin https://github.com/<TÊN-USER>/shopee-clone.git
git branch -M main
git push -u origin main
```

Khi hỏi mật khẩu:
- **Username**: tên user GitHub của bạn
- **Password**: dán **token** ở bước A1 (không phải mật khẩu tài khoản)

Kết quả mong đợi:
```
To https://github.com/<TÊN-USER>/shopee-clone.git
 * [new branch]      main -> main
```

Vào https://github.com/<TÊN-USER>/shopee-clone phải thấy file `src/`, `public/`, `render.yaml`, `README.md`.

---

## Phần B — Tạo service trên Render

### B1. Đăng ký

1. Mở https://render.com → **Get Started**
2. Chọn **Sign in with GitHub** → cấp quyền cho Render truy cập repo
3. Render miễn phí, không cần thẻ tín dụng

### B2. Tạo service bằng Blueprint (cách khuyến nghị)

1. Dashboard → menu **New +** → **Blueprint**
2. Chọn repo `shopee-clone` (Render sẽ hiện danh sách repo đã cấp quyền)
3. Render đọc file `render.yaml`, tự điền:
   - Name: `shopee-clone-vn`
   - Region: `Singapore`
   - Plan: `Free`
   - Build: `npm ci --omit=dev`
   - Start: `npm start`
4. Nhấn **Apply** / **Create**

Render bắt đầu build. Xem tiến trình ở tab **Deploys**. Lần đầu mất 2–5 phút.

### B3. (Thay thế) Tạo thủ công nếu Blueprint lỗi

**New + → Web Service** → Connect repo → điền:

| Trường | Giá trị |
|---|---|
| Name | `shopee-clone-vn` |
| Region | Singapore |
| Branch | `main` |
| Root Directory | (để trống) |
| Runtime / Language | Node |
| Build Command | `npm ci --omit=dev` |
| Start Command | `npm start` |
| Instance Type | Free |

### B4. Xác nhận thành công

Mở `https://shopee-clone-vn.onrender.com` — phải thấy trang web đầy đủ: header cam, danh mục, lưới sản phẩm.

Kiểm tra thêm:
- `https://shopee-clone-vn.onrender.com/api/health` → `{"ok":true,"uptime":...}`
- `https://shopee-clone-vn.onrender.com/api/products?limit=2` → JSON 2 sản phẩm

Đăng nhập thử: `demo@shopee.vn` / `123456`

---

## Vấn đề thường gặp

| Lỗi | Nguyên nhân | Cách sửa |
|---|---|---|
| `remote origin already exists` | Đã add remote từ trước | `git remote set-url origin https://github.com/<TÊN-USER>/shopee-clone.git` |
| `Authentication failed` | Dùng mật khẩu tài khoản | Dán token từ A1 |
| `rejected ... fetch first` | Repo đã có commit sẵn | Tạo repo trống (bước A2, bỏ tick README), hoặc: `git push -u origin main --force` |
| `Support for password authentication was removed` | GitHub đã bỏ password auth | Bắt buộc dùng token |
| Build fail: `Cannot find module` | Thiếu `npm ci` | Kiểm tra Build Command đúng `npm ci --omit=dev` |
| `Cannot commit: Please tell me who you are` | Chưa set user.name/email | Làm bước A0 |
| `node:sqlite` not found | Node quá cũ | Đặt Node 24 trong Render, hoặc thêm `NODE_VERSION=24` vào Environment |
| Tên domain báo "already taken" | Trùng tên toàn cục | Xoá service, tạo lại với tên khác, sửa `name` trong `render.yaml`, commit, push lại |
| Trang trắng / 502 lúc mở đầu | Free tier đang ngủ | Đợi 30–60 giây, tải lại |
| Đăng nhập được rồi mất sau vài phút | SQLite bị xoá khi restart | Xem mục giới hạn bên dưới |

---

## Giới hạn của plan Free — cần biết

1. **Ngủ sau 15 phút không có truy cập.** Lần mở đầu tiên phải chờ 30–60 giây. Đây là hành vi bình thường, không phải lỗi.

2. **Dữ liệu SQLite bị mất khi deploy lại.** Render free dùng filesystem tạm — mỗi lần bạn push code mới, toàn bộ tài khoản/đơn hàng bị xoá, chỉ còn dữ liệu mẫu được seed lại. Chấp nhận được nếu chỉ demo; **không dùng để lưu dữ liệu thật**.

3. **750 giờ/tháng** (giới hạn chung của tài khoản miễn phí, đủ cho 1 service).

Muốn dữ liệu không mất → cần đổi sang Postgres (Neon có free tier 0đ). Tôi làm được, nhưng cần bạn tạo tài khoản Neon.

---

## Khi nào đổi sang tên miền riêng

Tên miền thật (`.com`, `.vn`) **phải mua**, không có cách nào miễn phí (~250–350k/năm). Sau khi mua:

1. Render → service → **Settings → Custom Domains** → thêm `tên-miền-của-bạn.vn`
2. Tại nơi mua tên miền, tạo bản ghi DNS:

| Tên | Loại bản ghi | Trỏ tới |
|---|---|---|
| `@` | ALIAS/ANAME nếu có, không thì dùng A | `216.24.57.1` |
| `www` | CNAME | `shopee-clone-vn.onrender.com` |

3. Chờ vài phút đến 24 giờ. Render tự cấp chứng chỉ HTTPS.
4. Sau khi domain hoạt động, vào Settings tắt **Render Subdomain** để chỉ dùng domain của bạn.

---

## Xong báo tôi

Sau khi deploy thành công, gửi tôi URL. Tôi sẽ kiểm tra `/api/health`, API sản phẩm, đăng nhập và đặt hàng trên host thật để chắc chắn mọi thứ hoạt động trên Internet — thao tác trên máy local đã pass hết nhưng môi trường Render có thể khác.
