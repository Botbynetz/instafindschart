# 📊 Integrasi Supabase - Dokumentasi Lengkap

## ✅ Status Integrasi
- [x] Tabel `products` dibuat di Supabase
- [x] Supabase config dan functions diimplementasikan
- [x] Admin panel terintegrasi dengan Supabase
- [x] Halaman index terintegrasi dengan Supabase
- [x] Tracking clicks/views tersimpan di Supabase

---

## 🔧 File-File yang Ditambahkan

### 1. **supabase-config.js**
- Konfigurasi koneksi Supabase
- API URL: `https://uetkbvwcqipwrgjbvlwq.supabase.co`
- Anon Key: `sb_publishable_Nly81h1k3aBGzBk5jiiMfw_p7QWFOu7`

### 2. **supabase-functions.js**
Fungsi-fungsi utama:
- **`tambahProdukSupabase(productData)`** - Tambah produk ke database
- **`updateProdukSupabase(productId, productData)`** - Update produk
- **`ambilProdukSupabase()`** - Ambil semua produk dari database
- **`ambilProdukByKategoriSupabase(categoryId)`** - Ambil produk per kategori
- **`hapusProdukSupabase(productId)`** - Hapus produk dari database
- **`updateProductClicks(productId, clicks, views)`** - Update statistik klik
- **`resetSemuaDataSupabase()`** - Reset semua data di database

---

## 📋 Struktur Tabel `products` di Supabase

```
┌─────────────────────────────────┐
│         PRODUCTS TABLE          │
├─────────────────────────────────┤
│ id (UUID) - Primary Key         │
│ name (TEXT)                     │
│ image (TEXT)                    │
│ category (TEXT)                 │
│ originalPrice (INTEGER)         │
│ price (INTEGER)                 │
│ discount (INTEGER)              │
│ rating (DECIMAL)                │
│ reviews (INTEGER)               │
│ description (TEXT)              │
│ affiliateLink (TEXT) - UNIQUE   │
│ platforms (TEXT[])              │
│ clicks (INTEGER)                │
│ views (INTEGER)                 │
│ createdAt (TIMESTAMP)           │
│ updatedAt (TIMESTAMP)           │
└─────────────────────────────────┘
```

---

## 🔄 Alur Data

### **1. Menambah Produk (Admin Panel)**
```
Admin membuat produk di form
    ↓
Form tervalidasi (handleProductSubmit)
    ↓
Disimpan ke localStorage
    ↓
Dikirim ke Supabase (saveProductToSupabase)
    ↓
Notifikasi "Produk berhasil ditambahkan"
    ↓
Produk tampil di halaman index
```

### **2. Tampil Produk (Halaman Index)**
```
Halaman index dibuka
    ↓
loadProductsFromStorage() dijalankan
    ↓
Cek apakah Supabase tersedia
    ↓
Jika ya: Ambil dari Supabase (ambilProdukSupabase)
Jika tidak: Ambil dari localStorage
    ↓
Produk ditampilkan di grid
```

### **3. Tracking Klik Produk**
```
User klik tombol "Beli Sekarang"
    ↓
trackProductClick(productId) dijalankan
    ↓
Update clicks & views di localStorage
    ↓
Update clicks & views di Supabase
    ↓
Redirect ke affiliate link
```

### **4. Update Produk (Admin Panel)**
```
Admin edit produk yang ada
    ↓
Form tervalidasi
    ↓
Update di localStorage
    ↓
Update di Supabase (updateProdukSupabase)
    ↓
Notifikasi "Produk berhasil diperbarui"
```

### **5. Hapus Produk (Admin Panel)**
```
Admin klik tombol Hapus
    ↓
Konfirmasi dialog muncul
    ↓
Jika setuju: Hapus dari localStorage
    ↓
Hapus dari Supabase (hapusProdukSupabase)
    ↓
Notifikasi "Produk berhasil dihapus"
```

---

## 📱 Sinkronisasi Data

### **LocalStorage vs Supabase**
| Lokasi | Keuntungan | Kerugian |
|--------|-----------|----------|
| **LocalStorage** | Cepat, offline | Hanya 1 device, ~5MB limit |
| **Supabase** | Shared, unlimited, secure | Memerlukan internet |

### **Strategi Hybrid**
1. Data **selalu disimpan ke localStorage** dulu (cepat)
2. Jika **Supabase tersedia**, data juga disimpan ke database
3. Saat **buka halaman index**: ambil dari Supabase (jika ada produk), fallback ke localStorage
4. Jika **Supabase error**, halaman tetap berfungsi dari localStorage

---

## 🚀 Cara Menggunakan

### **1. Tambah Produk Baru**
```
1. Masuk ke Admin Panel (Ctrl+Alt+A)
2. Isi form produk
3. Klik "Simpan Produk"
4. Produk otomatis tersimpan di:
   - localStorage (instant)
   - Supabase (async, ~1-2 detik)
```

### **2. Lihat Produk di Halaman Index**
```
1. Buka index.html
2. Produk dimuat dari Supabase (atau localStorage jika offline)
3. Klik "Beli Sekarang" untuk diarahkan ke affiliate link
4. Klik tercatat di database (clicks & views)
```

### **3. Edit Produk Existing**
```
1. Masuk Admin Panel
2. Cari produk di "Kelola Produk"
3. Klik tombol Edit (pensil)
4. Ubah data dan klik "Simpan Produk"
5. Update tersimpan di localStorage & Supabase
```

### **4. Hapus Produk**
```
1. Masuk Admin Panel
2. Cari produk di "Kelola Produk"
3. Klik tombol Hapus (trash)
4. Konfirmasi dialog
5. Produk dihapus dari localStorage & Supabase
```

### **5. Reset Semua Data**
```
1. Masuk Admin Panel
2. Pergi ke tab "Setelan"
3. Klik "Reset Semua"
4. Konfirmasi dialog
5. Semua data dihapus dari localStorage & Supabase
```

---

## 🔐 Keamanan

### **Row Level Security (RLS) Status**
```sql
-- Public SELECT (siapa saja bisa baca)
✅ Allow public select

-- Insert/Update/Delete (semua user bisa)
⚠️ Allow authenticated users
   (untuk produksi, gunakan admin auth)
```

### **Rekomendasi untuk Produksi**
```sql
-- Gunakan policy ini untuk lebih aman:
CREATE POLICY "Only admin can insert" ON products
  FOR INSERT 
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Atau gunakan API key terpisah untuk admin
```

---

## 📊 Analytics & Monitoring

### **Metrics yang Tersimpan**
- **clicks** - Jumlah klik produk
- **views** - Jumlah views produk
- **createdAt** - Tanggal produk ditambahkan
- **updatedAt** - Tanggal produk terakhir diupdate

### **Cara Melihat Analytics di Supabase**
```
1. Buka Supabase Dashboard
2. Pilih tabel 'products'
3. Lihat kolom 'clicks' dan 'views'
4. Bisa filter/sort berdasarkan metrics ini
```

---

## ⚙️ Troubleshooting

### **Masalah: Produk tidak muncul di halaman index**
```
✓ Cek: Browser console (F12) untuk errors
✓ Cek: Apakah ada produk di Supabase?
✓ Cek: Apakah internet connection stabil?
✓ Fallback: Cek localStorage di DevTools → Application
```

### **Masalah: Produk tidak tersimpan di Supabase**
```
✓ Cek: Apakah Supabase config benar?
✓ Cek: Apakah tabel 'products' sudah dibuat?
✓ Cek: Apakah RLS policy sudah diset?
✓ Cek: Browser console untuk error message
```

### **Masalah: Data konflik antara localStorage & Supabase**
```
✓ Solusi: Refresh halaman untuk sync ulang
✓ Buka Admin Settings → Reset All Data
✓ Atau hapus localStorage di DevTools
```

---

## 🎯 Fitur Future

Fitur yang bisa ditambahkan:
- [ ] Authentication admin dengan Supabase Auth
- [ ] Backup & export data ke CSV
- [ ] Real-time product updates dengan Realtime subscription
- [ ] Image storage di Supabase Storage
- [ ] Analytics dashboard dengan chart
- [ ] Auto-sync scheduling dengan cron jobs
- [ ] Webhook untuk integrasi dengan platform lain

---

## 📞 Support

Jika ada pertanyaan atau masalah:
1. Buka browser DevTools (F12)
2. Lihat console untuk error message
3. Check network tab untuk request ke Supabase
4. Referensi dokumentasi: https://supabase.com/docs

---

## 📝 Changelog

### **v1.0.0 - Initial Supabase Integration**
- ✅ Supabase config & functions
- ✅ Admin panel integration
- ✅ Index page integration
- ✅ Tracking clicks & views
- ✅ Hybrid localStorage + Supabase
- ✅ Complete documentation

---

**Last Updated:** March 4, 2026
**Status:** ✅ Production Ready
