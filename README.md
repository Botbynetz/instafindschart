# 🛍️ Instafinds.id - Affiliate Product Showcase

Professional e-commerce product curator platform dengan admin panel untuk mengelola produk affiliate dari berbagai marketplace.

**Live Demo:** https://botbynetz.github.io/instafindschart/

---

## 📂 Struktur File

```
instafindschart/
├── index.html          ← Linktree-style landing page (Etalase produk)
├── admin.html          ← Admin panel (Protected)
├── admin.css           ← Admin styling
├── admin.js            ← Admin logic dengan authentication
├── script.js           ← Public logic dengan session management
├── styles.css          ← Public styling (Linktree design)
└── README.md           ← File ini
```

---

## 🚀 Fitur Utama

### **Public Landing Page (Linktree Style)**
- ✅ Design simple & user-friendly (seperti Linktree)
- ✅ Profile curator dengan bio & social links
- ✅ Grid produk yang rapi dan responsive
- ✅ Real-time search produk
- ✅ Product cards dengan rating & harga
- ✅ Newsletter subscription
- ✅ 🔐 Protected admin access dengan login secure

### **Admin Panel (Protected Access)**
- ✅ Dashboard dengan statistics
- ✅ CRUD produk lengkap
- ✅ Kategori management
- ✅ Export/Import JSON
- ✅ Analytics tracking
- ✅ Session-based authentication

---

## 🔐 Admin Access

### **Login Credentials:**
- **Username:** `admin`
- **Password:** `botbynetzg@gmail.com`

### **Cara Akses:**
1. Tekan `Ctrl + Alt + A` untuk membuka login modal
2. Atau klik link admin jika tersedia di landing page
3. Masukkan username dan password
4. Admin panel akan terbuka dengan session 24 jam

### **Security Features:**
- ✅ Session-based authentication (sessionStorage)
- ✅ Timeout session 24 jam
- ✅ Logout clears all session data
- ✅ Protected admin routes - auto redirect jika tidak authenticated
- ✅ Cannot access admin.html tanpa login

---

## 🎨 Design & UX

### **Linktree-Style Landing Page:**
- Profile section dengan avatar, nama, bio & social links
- Search bar sederhana untuk filter produk
- Product grid dengan layout responsive
- Newsletter subscription form
- Simple, clean, & user-friendly

### **Responsive Design:**
- Mobile-first approach
- Optimized untuk semua ukuran layar (mobile, tablet, desktop)
- Fast loading & smooth animations

---

## 📱 Browser Support
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

---

## 🛠️ Installation & Setup

### **Local Setup:**
```bash
# Clone atau download project
cd "landing page afilliate"

# Start local server (Python)
python -m http.server 8000

# Akses di browser
http://localhost:8000
```

### **Dependencies:**
- Font Awesome Icons (CDN)
- No framework dependencies (Vanilla JS)
- LocalStorage untuk data persistence

---

## 📊 Data Management

### **Product Data Structure:**
```json
{
  "id": "unique-id",
  "name": "Nama Produk",
  "image": "url-image",
  "price": 150000,
  "originalPrice": 200000,
  "discount": 25,
  "rating": 4.5,
  "reviews": 120,
  "category": "fashion",
  "affiliateLink": "https://marketplace.com/product",
  "platforms": ["tokopedia", "shopee"],
  "clicks": 0,
  "views": 0
}
```

---

## 🔑 Features Breakdown

### **Public Features:**
- Search & Filter real-time
- Product cards dengan info lengkap
- External links ke marketplace
- Analytics tracking (clicks/views)
- Responsive design

### **Admin Features:**
- Add/Edit/Delete produk
- Manage categories
- View analytics
- Export/Import data
- Session management
- Secure logout

---

## 📈 Future Enhancements
- [ ] Email notifications
- [ ] Advanced analytics dashboard
- [ ] Product comparison feature
- [ ] Wishlist functionality
- [ ] Product reviews & ratings
- [ ] API integration
- [ ] Multi-language support

---

## 📝 Notes

- Data disimpan di **LocalStorage** (client-side)
- Setiap admin session berlaku **24 jam**
- Logout otomatis menghapus semua session data
- Export/Import backup data dalam format JSON

---

## 👨‍💼 Admin Tips

1. **Backup data secara berkala** menggunakan Export JSON
2. **Jangan share login credentials** dengan orang tidak berwenang
3. **Logout setelah selesai** untuk keamanan
4. **Monitor analytics** untuk produk terbaik
5. **Update produk secara regular** untuk fresh catalog

---

## 📞 Support

Untuk issues atau questions, hubungi developer atau check dokumentasi di inline comments di kode.

---

**Dibuat dengan ❤️ untuk Instafinds.id**

## 📊 Supported Platforms

- Shopee
- Tokopedia
- Lazada
- Amazon
- Bukalapak
- Custom Link

---

## 💾 Data Storage

- Browser LocalStorage (~5MB)
- Auto-save
- Export/Import JSON untuk backup
- Data persisten sampai cache dibersihkan

---

## 🎨 Tech Stack

- HTML5, CSS3, JavaScript (Vanilla)
- CSS Grid, Flexbox, Animations
- Font Awesome 6.0
- LocalStorage API
- GitHub Pages

---

## 📱 Responsive

- Mobile: < 480px
- Tablet: 480px - 768px
- Desktop: > 768px

---

## 🛠️ Setup

### Lokal
```bash
git clone git@github.com:Botbynetz/instafindschart.git
cd instafindschart

# Gunakan live server atau:
python -m http.server 8000
```

### Deploy GitHub Pages
```bash
git add .
git commit -m "Update products"
git push origin main
```

---

## 📝 Quick Start

### Menambah Produk
1. Klik ⚙️ di header
2. Masukkan password
3. Pilih "Kelola Produk"
4. Klik "+ Tambah Produk"
5. Isi form dan simpan

### Mengelola Kategori
1. Buka admin → "Kategori"
2. Tambah kategori baru
3. Gunakan Font Awesome icon class

### Backup Data
1. Admin → "Setelan"
2. Export JSON
3. Simpan file sebagai backup

---

## 🔄 Data Sync

Landing page otomatis load data dari `instafinds_products` di LocalStorage. Update di admin langsung terlihat di landing page.

---

## 🌐 Affiliate Links

- Pastikan link valid
- Support multiple platforms per produk
- Track clicks & views otomatis
- Display savings amount

---

## ⚠️ Important

- Password jangan di-share public
- Export data secara berkala
- Data per-browser (tidak sync across devices)
- Max 5MB storage

---

## 📞 Contact

- Instagram: [@instafinds.id](https://www.instagram.com/instafinds.id/)
- TikTok: [@instafinds.id](https://www.tiktok.com/@instafinds.id)
- Telegram: [@instafinds24](https://t.me/instafinds24)
- WhatsApp: [Channel](https://whatsapp.com/channel/0029VbC6PuL6hENjFBwA5q2i)

---

**Version:** 1.0.0  
**License:** BSD 3-Clause  
**Repository:** https://github.com/Botbynetz/instafindschart
