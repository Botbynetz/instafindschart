// ========================
// ADMIN PANEL - FULL SUPABASE
// ========================
const ADMIN_TOKEN_KEY = 'instafinds_admin_token';
const ADMIN_CREDENTIALS_TOKEN = 'admin_token_instafinds';

function verifyAdminAccess() {
    const sessionToken = sessionStorage.getItem(ADMIN_TOKEN_KEY);
    if (!sessionToken || sessionToken !== ADMIN_CREDENTIALS_TOKEN) {
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

window.addEventListener('load', function() {
    if (!verifyAdminAccess()) return;
});

function logoutAdmin() {
    if (confirm('Apakah Anda yakin ingin logout?')) {
        sessionStorage.removeItem(ADMIN_TOKEN_KEY);
        sessionStorage.removeItem('instafinds_admin_session');
        window.location.href = 'index.html';
    }
}

function goBackToPublic(event) {
    event.preventDefault();
    window.location.href = 'index.html';
    return false;
}

// ========================
// STATE
// ========================
var products = [];
var categories = [];
var editingProductId = null;

// ========================
// INIT
// ========================
document.addEventListener('DOMContentLoaded', async function() {
    setupEventListeners();
    loadCategoriesFromStorage(); // migrate localStorage jika ada
    await loadCategoriesFromSupabase();
    loadProductsFromSupabase();
});

// ========================
// CATEGORIES (Supabase)
// ========================
function loadCategoriesFromStorage() {
    // Legacy: migrate dari localStorage ke Supabase jika ada
    var stored = localStorage.getItem('instafinds_categories');
    if (stored) {
        try {
            var localCats = JSON.parse(stored);
            if (localCats && localCats.length > 0) {
                migrateLocalCategoriesToSupabase(localCats);
            }
        } catch(e) {}
    }
}

async function migrateLocalCategoriesToSupabase(localCats) {
    try {
        var existing = await window.supabase.from('categories').select('id');
        if (existing.data && existing.data.length === 0) {
            // Kosong di Supabase, migrate
            for (var c of localCats) {
                await window.supabase.from('categories').insert([{
                    name: c.name, icon: c.icon || 'fas fa-tag', description: c.description || ''
                }]);
            }
            localStorage.removeItem('instafinds_categories');
            console.log('✅ Kategori berhasil dipindahkan ke Supabase');
            await loadCategoriesFromSupabase();
        } else {
            localStorage.removeItem('instafinds_categories');
        }
    } catch(e) {}
}

async function loadCategoriesFromSupabase() {
    try {
        var result = await window.supabase.from('categories').select('*').order('id', { ascending: true });
        if (result.error) throw result.error;
        categories = result.data || [];
        renderCategories();
    } catch(e) {
        console.error('Gagal load kategori:', e);
        categories = [];
    }
}

function saveCategoriesLocally() {
    // Noop - sekarang pakai Supabase
}

function initDefaultCategories() {
    // Noop - default sudah di SQL
}

// ========================
// LOAD PRODUCTS FROM SUPABASE
// ========================
async function loadProductsFromSupabase() {
    try {
        var result = await window.supabase
            .from('products')
            .select('*')
            .order('createdat', { ascending: false });

        if (result.error) throw result.error;

        products = result.data || [];
        console.log('✅ ' + products.length + ' produk loaded');
        renderDashboard();
    } catch (err) {
        console.error('❌ Error load produk:', err);
        showNotification('Gagal memuat produk: ' + err.message, 'error');
        products = [];
        renderDashboard();
    }
}

// ========================
// EVENT LISTENERS
// ========================
function setupEventListeners() {
    document.querySelectorAll('.nav-item').forEach(function(link) {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            navigateToPage(link.dataset.page);
            // Auto close sidebar on mobile after nav click
            if (window.innerWidth <= 768) {
                document.querySelector('.sidebar').classList.remove('active');
                var ov = document.querySelector('.sidebar-overlay');
                if (ov) ov.classList.remove('active');
            }
        });
    });

    document.getElementById('btn-add-product').addEventListener('click', openProductModal);
    document.getElementById('product-form').addEventListener('submit', handleProductSubmit);
    document.getElementById('search-products').addEventListener('input', handleProductSearch);
    document.getElementById('btn-fetch-from-link').addEventListener('click', fetchFromAffiliateLink);
    document.getElementById('btn-add-category').addEventListener('click', openCategoryModal);
    document.getElementById('category-form').addEventListener('submit', handleCategorySubmit);
    document.getElementById('btn-export-data').addEventListener('click', exportData);
    document.getElementById('btn-import-data').addEventListener('click', function() {
        document.getElementById('import-file').click();
    });
    document.getElementById('import-file').addEventListener('change', importData);
    document.getElementById('btn-reset-data').addEventListener('click', resetAllData);

    document.querySelectorAll('.btn-close').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            closeModal(e.currentTarget.dataset.close);
        });
    });

    document.querySelector('.btn-logout').addEventListener('click', logout);
    document.querySelector('.menu-toggle').addEventListener('click', toggleMobileMenu);

    setupImageUpload();
    setupDiscountToggle();

    // Setup sidebar overlay
    var overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function() {
        document.querySelector('.sidebar').classList.remove('active');
        overlay.classList.remove('active');
    });
}

// ========================
// NAVIGATION
// ========================
var PAGE_TITLES = {
    dashboard: 'Dashboard',
    products: 'Kelola Produk',
    categories: 'Kategori',
    events: 'Event',
    analytics: '📊 Analytics',
    settings: 'Setelan'
};

function navigateToPage(pageName) {
    // Sembunyikan semua page
    document.querySelectorAll('.page').forEach(function(page) {
        page.style.display = 'none';
        page.classList.remove('active');
    });

    // Tampilkan page yang dipilih
    var pageElement = document.getElementById(pageName + '-page');
    if (pageElement) {
        pageElement.style.display = 'block';
        pageElement.classList.add('active');
    }

    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(function(link) {
        link.classList.remove('active');
        if (link.dataset.page === pageName) link.classList.add('active');
    });

    // Update page title
    var titleEl = document.querySelector('.page-title');
    if (titleEl) titleEl.textContent = PAGE_TITLES[pageName] || pageName;

    // Load data per page
    if (pageName === 'dashboard') renderDashboard();
    else if (pageName === 'products') renderProducts();
    else if (pageName === 'categories') renderCategories();
    else if (pageName === 'events') loadEvents();
    else if (pageName === 'analytics') renderAnalytics();
}

// ========================
// DASHBOARD
// ========================
function renderDashboard() {
    var totalProducts = products.length;
    var totalClicks = products.reduce(function(sum, p) { return sum + (p.clicks || 0); }, 0);
    var totalViews = products.reduce(function(sum, p) { return sum + (p.views || 0); }, 0);
    var platformsSet = new Set();
    products.forEach(function(p) {
        if (p.platforms) p.platforms.forEach(function(pl) { platformsSet.add(pl); });
    });

    document.getElementById('total-products').textContent = totalProducts;
    document.getElementById('total-clicks').textContent = totalClicks;
    document.getElementById('views-count').textContent = totalViews;
    document.getElementById('active-platforms').textContent = platformsSet.size;

    var recentProducts = products.slice(0, 5);
    document.getElementById('recent-products').innerHTML = recentProducts.length > 0
        ? recentProducts.map(function(p) {
            return '<div class="product-item">' +
                '<img src="' + (p.image || '') + '" alt="' + p.name + '" class="product-thumbnail">' +
                '<div class="product-details"><h4>' + p.name + '</h4>' +
                '<p>Rp ' + (p.price || 0).toLocaleString('id-ID') + '</p></div></div>';
          }).join('')
        : '<p class="empty-state">Belum ada produk</p>';

    var topProducts = products.slice().sort(function(a, b) { return (b.clicks || 0) - (a.clicks || 0); }).slice(0, 5);
    document.getElementById('top-products').innerHTML = topProducts.length > 0
        ? topProducts.map(function(p) {
            return '<div class="product-item">' +
                '<img src="' + (p.image || '') + '" alt="' + p.name + '" class="product-thumbnail">' +
                '<div class="product-details"><h4>' + p.name + '</h4>' +
                '<p>' + (p.clicks || 0) + ' klik</p></div></div>';
          }).join('')
        : '<p class="empty-state">Belum ada data klik</p>';
}

// ========================
// RENDER PRODUCTS
// ========================
function renderProducts(searchQuery) {
    var filteredProducts = searchQuery
        ? products.filter(function(p) { return p.name.toLowerCase().includes(searchQuery.toLowerCase()); })
        : products;

    document.getElementById('products-list').innerHTML = filteredProducts.length > 0
        ? filteredProducts.map(function(product) {
            return '<div class="product-card-admin">' +
                '<div class="product-card-image"><img src="' + (product.image || '') + '" alt="' + product.name + '"></div>' +
                '<div class="product-card-info">' +
                    '<h3>' + product.name + '</h3>' +
                    '<div class="product-card-price">' +
                        '<span>Rp ' + (product.price || 0).toLocaleString('id-ID') + '</span>' +
                        '<span style="color:#999;text-decoration:line-through">Rp ' + (product.originalprice || 0).toLocaleString('id-ID') + '</span>' +
                    '</div>' +
                    '<div class="product-card-meta">' +
                        '<span>⭐ ' + (product.rating || 0) + ' (' + (product.reviews || 0) + ')</span>' +
                        '<span>📊 ' + (product.views || 0) + ' views</span>' +
                        '<span>🔗 ' + (product.clicks || 0) + ' clicks</span>' +
                    '</div>' +
                '</div>' +
                '<div class="product-card-actions">' +
                    '<button class="btn-edit" onclick="editProduct(\'' + product.id + '\')"><i class="fas fa-edit"></i> Edit</button>' +
                    '<button class="btn-delete" onclick="deleteProduct(\'' + product.id + '\')"><i class="fas fa-trash"></i> Hapus</button>' +
                '</div></div>';
          }).join('')
        : '<div class="empty-state">Belum ada produk. Klik "Tambah Produk" untuk mulai.</div>';
}

function handleProductSearch(e) { renderProducts(e.target.value); }

// ========================
// PRODUCT MODAL
// ========================
function openProductModal() {
    editingProductId = null;
    document.getElementById('modal-title').textContent = 'Tambah Produk Baru';
    document.getElementById('product-form').reset();
    document.querySelectorAll('input[name="platform"]').forEach(function(cb) { cb.checked = false; });

    resetImagesUpload();

    var enableDiscount = document.getElementById('enable-discount');
    var discountPriceGroup = document.getElementById('discount-price-group');
    var discountPercentGroup = document.getElementById('discount-percent-group');
    if (enableDiscount) enableDiscount.checked = false;
    if (discountPriceGroup) discountPriceGroup.style.display = 'none';
    if (discountPercentGroup) discountPercentGroup.style.display = 'none';

    updateCategoryOptions();
    openModal('product-modal');
}

function editProduct(productId) {
    editingProductId = productId;
    var product = products.find(function(p) { return p.id === productId; });
    if (!product) return;

    document.getElementById('modal-title').textContent = 'Edit Produk';
    document.getElementById('product-name').value = product.name;
    document.getElementById('product-image').value = product.image || '';
    document.getElementById('product-category').value = product.category;
    document.getElementById('product-original-price').value = product.originalprice;
    document.getElementById('product-price').value = product.price;
    document.getElementById('product-discount').value = product.discount || '';
    document.getElementById('product-rating').value = product.rating || '';
    document.getElementById('product-reviews').value = product.reviews || '';
    document.getElementById('product-description').value = product.description || '';
    if (document.getElementById('product-video')) {
        document.getElementById('product-video').value = product.video || '';
        // Trigger preview if video exists
        if (product.video) {
            document.getElementById('product-video').dispatchEvent(new Event('input'));
        } else {
            var wrap = document.getElementById('video-preview-wrap');
            if (wrap) wrap.style.display = 'none';
        }
    }
    document.getElementById('product-affiliate-link').value = product.affiliatelink || '';

    document.querySelectorAll('input[name="platform"]').forEach(function(cb) {
        cb.checked = (product.platforms || []).includes(cb.value);
    });

    // Load existing images
    resetImagesUpload();
    var existingImages = [];
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
        existingImages = product.images;
    } else if (product.image) {
        existingImages = [product.image];
    }
    uploadedImages = existingImages;
    renderImagesGrid();
    syncImagesInput();

    var enableDiscount = document.getElementById('enable-discount');
    var discountPriceGroup = document.getElementById('discount-price-group');
    var discountPercentGroup = document.getElementById('discount-percent-group');
    if (product.price < product.originalprice) {
        if (enableDiscount) enableDiscount.checked = true;
        if (discountPriceGroup) discountPriceGroup.style.display = 'block';
        if (discountPercentGroup) discountPercentGroup.style.display = 'block';
    }

    updateCategoryOptions();
    openModal('product-modal');
}

// ========================
// MULTI IMAGE UPLOAD
// ========================
var uploadedImages = []; // array of URLs
var IMGBB_KEY = 'cc40cdc3967a9e03f1a0a190479f5f21'; // backup
var CLOUDINARY_CLOUD_NAME = 'dxxx4ttys';
var CLOUDINARY_UPLOAD_PRESET = 'instafinds';

// ========================
// TELEGRAM CONFIG
// ========================
var TELEGRAM_BOT_TOKEN = '8616409431:AAFu4tJEnwqB9Rsh9h-6miUz4qDsLMdFOzo';
var TELEGRAM_CHANNEL_ID = '-1003853666549';

function setupImageUpload() {
    var dragDropZone = document.getElementById('drag-drop-zone');
    var fileInput = document.getElementById('product-image-file');
    if (!dragDropZone) return;

    dragDropZone.addEventListener('click', function() { fileInput.click(); });
    fileInput.addEventListener('change', function(e) { handleImageFiles(e.target.files); });

    dragDropZone.addEventListener('dragover', function(e) {
        e.preventDefault();
        dragDropZone.classList.add('dragover');
    });
    dragDropZone.addEventListener('dragleave', function() {
        dragDropZone.classList.remove('dragover');
    });
    dragDropZone.addEventListener('drop', function(e) {
        e.preventDefault();
        dragDropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) handleImageFiles(e.dataTransfer.files);
    });

    // Tombol tambah foto lagi
    document.addEventListener('click', function(e) {
        if (e.target.closest('#btn-add-more-images')) {
            fileInput.click();
        }
        if (e.target.closest('#btn-add-url-image')) {
            addImageFromUrl();
        }
    });

    document.addEventListener('dragover', function(e) { e.preventDefault(); });
    document.addEventListener('drop', function(e) { e.preventDefault(); });
}

async function handleImageFiles(files) {
    if (!files || files.length === 0) return;

    var fileArray = Array.from(files).filter(function(f) { return f.type.startsWith('image/'); });
    if (fileArray.length === 0) { alert('Mohon pilih file gambar!'); return; }

    // Max 10 foto
    var remaining = 10 - uploadedImages.length;
    if (remaining <= 0) { showNotification('❌ Maksimal 10 foto per produk!', 'error'); return; }
    fileArray = fileArray.slice(0, remaining);

    showNotification('⏳ Mengupload ' + fileArray.length + ' foto...', 'info');

    var successCount = 0;
    for (var i = 0; i < fileArray.length; i++) {
        try {
            var url = await uploadToImgbb(fileArray[i]);
            uploadedImages.push(url);
            successCount++;
            renderImagesGrid();
        } catch (err) {
            console.error('❌ Gagal upload foto ke-' + (i+1) + ':', err);
        }
    }

    if (successCount > 0) {
        showNotification('✅ ' + successCount + ' foto berhasil diupload!', 'success');
        syncImagesInput();
    } else {
        showNotification('❌ Gagal upload foto.', 'error');
    }
}

async function uploadToCloudinary(file) {
    var formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    var response = await fetch('https://api.cloudinary.com/v1_1/' + CLOUDINARY_CLOUD_NAME + '/image/upload', {
        method: 'POST',
        body: formData
    });
    var result = await response.json();
    if (result.secure_url) {
        console.log('✅ Cloudinary URL:', result.secure_url);
        return result.secure_url;
    }
    throw new Error(result.error ? result.error.message : 'Upload Cloudinary gagal');
}

// Keep for backward compat
async function uploadToImgbb(file) {
    return uploadToCloudinary(file);
}

function addImageFromUrl() {
    var input = document.getElementById('product-image-url-input');
    var raw = input ? input.value.trim() : '';
    if (!raw) { alert('Masukkan URL gambar terlebih dahulu!'); return; }

    // Split by newline atau koma — bisa paste banyak URL sekaligus
    var urls = raw.split(/[\n,]+/)
        .map(function(u) { return u.trim(); })
        .filter(function(u) { return u.length > 0 && (u.startsWith('http://') || u.startsWith('https://')); });

    if (urls.length === 0) { alert('URL tidak valid! Pastikan dimulai dengan https://'); return; }

    var remaining = 10 - uploadedImages.length;
    if (remaining <= 0) { showNotification('❌ Maksimal 10 foto!', 'error'); return; }

    var toAdd = urls.slice(0, remaining);
    var skipped = urls.length - toAdd.length;

    toAdd.forEach(function(url) { uploadedImages.push(url); });
    renderImagesGrid();
    syncImagesInput();
    if (input) input.value = '';

    if (skipped > 0) {
        showNotification('✅ ' + toAdd.length + ' URL ditambahkan! (' + skipped + ' dilewati, max 10)', 'success');
    } else {
        showNotification('✅ ' + toAdd.length + ' URL gambar ditambahkan!', 'success');
    }
}

function renderImagesGrid() {
    var grid = document.getElementById('images-grid');
    var gridContainer = document.getElementById('images-preview-grid');
    var countEl = document.getElementById('images-count');
    var dragDropZone = document.getElementById('drag-drop-zone');

    if (!grid) return;

    if (uploadedImages.length > 0) {
        gridContainer.style.display = 'block';
        dragDropZone.style.display = uploadedImages.length >= 10 ? 'none' : 'block';
    } else {
        gridContainer.style.display = 'none';
        dragDropZone.style.display = 'block';
    }

    if (countEl) countEl.textContent = uploadedImages.length;

    grid.innerHTML = uploadedImages.map(function(url, index) {
        return '<div class="img-thumb-item" style="position:relative;border-radius:8px;overflow:hidden;aspect-ratio:1;background:#f0f0f0;">' +
            (index === 0 ? '<span style="position:absolute;top:4px;left:4px;background:#667eea;color:white;font-size:10px;padding:2px 6px;border-radius:4px;z-index:2;">Utama</span>' : '') +
            '<img src="' + url + '" style="width:100%;height:100%;object-fit:cover;">' +
            '<div style="position:absolute;top:4px;right:4px;display:flex;gap:3px;">' +
                (index > 0 ? '<button type="button" onclick="moveImageLeft(' + index + ')" style="width:22px;height:22px;background:rgba(0,0,0,0.6);color:white;border:none;border-radius:4px;cursor:pointer;font-size:11px;" title="Geser kiri">◀</button>' : '') +
                (index < uploadedImages.length - 1 ? '<button type="button" onclick="moveImageRight(' + index + ')" style="width:22px;height:22px;background:rgba(0,0,0,0.6);color:white;border:none;border-radius:4px;cursor:pointer;font-size:11px;" title="Geser kanan">▶</button>' : '') +
                '<button type="button" onclick="removeImage(' + index + ')" style="width:22px;height:22px;background:rgba(220,53,69,0.9);color:white;border:none;border-radius:4px;cursor:pointer;font-size:11px;" title="Hapus">✕</button>' +
            '</div>' +
        '</div>';
    }).join('');
}

function moveImageLeft(index) {
    if (index <= 0) return;
    var temp = uploadedImages[index - 1];
    uploadedImages[index - 1] = uploadedImages[index];
    uploadedImages[index] = temp;
    renderImagesGrid();
    syncImagesInput();
}

function moveImageRight(index) {
    if (index >= uploadedImages.length - 1) return;
    var temp = uploadedImages[index + 1];
    uploadedImages[index + 1] = uploadedImages[index];
    uploadedImages[index] = temp;
    renderImagesGrid();
    syncImagesInput();
}

function removeImage(index) {
    uploadedImages.splice(index, 1);
    renderImagesGrid();
    syncImagesInput();
}

function syncImagesInput() {
    var imagesInput = document.getElementById('product-images');
    var imageInput = document.getElementById('product-image');
    if (imagesInput) imagesInput.value = JSON.stringify(uploadedImages);
    if (imageInput) imageInput.value = uploadedImages.length > 0 ? uploadedImages[0] : '';
}

function resetImagesUpload() {
    uploadedImages = [];
    renderImagesGrid();
    syncImagesInput();
    var fileInput = document.getElementById('product-image-file');
    if (fileInput) fileInput.value = '';
}

// ========================
// DISCOUNT TOGGLE
// ========================
function setupDiscountToggle() {
    var enableDiscount = document.getElementById('enable-discount');
    var discountPriceGroup = document.getElementById('discount-price-group');
    var discountPercentGroup = document.getElementById('discount-percent-group');
    var originalPriceInput = document.getElementById('product-original-price');
    var discountPriceInput = document.getElementById('product-price');
    var discountPercentInput = document.getElementById('product-discount');
    if (!enableDiscount) return;

    enableDiscount.addEventListener('change', function(e) {
        if (e.target.checked) {
            discountPriceGroup.style.display = 'block';
            discountPercentGroup.style.display = 'block';
        } else {
            discountPriceGroup.style.display = 'none';
            discountPercentGroup.style.display = 'none';
            discountPriceInput.value = '';
            discountPercentInput.value = '';
        }
    });

    function calcDiscount() {
        var orig = parseInt(originalPriceInput.value) || 0;
        var disc = parseInt(discountPriceInput.value) || 0;
        discountPercentInput.value = (orig > 0 && disc > 0 && disc < orig)
            ? Math.round(((orig - disc) / orig) * 100) : '';
    }

    originalPriceInput.addEventListener('input', calcDiscount);
    discountPriceInput.addEventListener('input', calcDiscount);
}

// ========================
// FETCH FROM LINK
// ========================
async function fetchFromAffiliateLink(e) {
    e.preventDefault();
    var affiliateLink = document.getElementById('product-affiliate-link').value.trim();
    if (!affiliateLink) { alert('Masukkan affiliate link terlebih dahulu'); return; }

    var btn = document.getElementById('btn-fetch-from-link');
    var originalText = btn.innerHTML;
    btn.disabled = true;

    try {
        // Step 1: Ambil metadata halaman
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengambil data...';
        var response = await fetch('https://api.allorigins.win/get?url=' + encodeURIComponent(affiliateLink));

        if (!response.ok) throw new Error('Gagal fetch halaman');

        var data = await response.json();
        var html = data.contents;

        if (!html) throw new Error('Konten kosong');

        var parser = new DOMParser();
        var doc = parser.parseFromString(html, 'text/html');
        var title = (doc.querySelector('meta[property="og:title"]') || {}).content
                 || (doc.querySelector('title') || {}).textContent || '';
        var imageUrl = (doc.querySelector('meta[property="og:image"]') || {}).content || '';
        var desc = (doc.querySelector('meta[property="og:description"]') || {}).content || '';

        if (title) document.getElementById('product-name').value = title.substring(0, 100);
        if (desc) document.getElementById('product-description').value = desc.substring(0, 300);

        // Step 2: Mirror gambar ke Imgbb biar tidak bergantung server Shopee/Tokopedia
        if (imageUrl) {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Upload gambar ke Imgbb...';
            try {
                var mirroredUrl = await mirrorImageToImgbb(imageUrl);
                // Tambahkan ke grid multi-foto
                uploadedImages = [mirroredUrl];
                renderImagesGrid();
                syncImagesInput();
                showNotification('✅ Data & gambar berhasil diambil!', 'success');
            } catch (imgErr) {
                // Fallback: pakai URL asli kalau mirror gagal
                console.warn('⚠️ Mirror gagal, pakai URL asli:', imgErr);
                uploadedImages = [imageUrl];
                renderImagesGrid();
                syncImagesInput();
                showNotification('✅ Data diambil! (Gambar dari server asli)', 'success');
            }
        } else {
            showNotification('✅ Data produk berhasil diambil! (Tanpa gambar)', 'success');
        }

        autoDetectPlatform(affiliateLink);

    } catch (error) {
        console.error('❌ Fetch error:', error);
        autoDetectPlatform(affiliateLink);
        showNotification('⚠️ Gagal fetch otomatis. Isi data manual.', 'warning');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// Mirror gambar dari URL eksternal ke Cloudinary
async function mirrorImageToImgbb(imageUrl) {
    // Upload URL langsung ke Cloudinary (tidak perlu fetch dulu)
    var formData = new FormData();
    formData.append('file', imageUrl);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    var response = await fetch('https://api.cloudinary.com/v1_1/' + CLOUDINARY_CLOUD_NAME + '/image/upload', {
        method: 'POST',
        body: formData
    });
    var result = await response.json();
    if (result.secure_url) {
        console.log('✅ Cloudinary mirror URL:', result.secure_url);
        return result.secure_url;
    }
    throw new Error(result.error ? result.error.message : 'Upload Cloudinary gagal');
}

function autoDetectPlatform(url) {
    try {
        var hostname = new URL(url).hostname.toLowerCase();
        var map = { tokopedia: 'tokopedia', shopee: 'shopee', lazada: 'lazada', amazon: 'amazon', bukalapak: 'bukalapak' };
        for (var key in map) {
            if (hostname.includes(key)) {
                var cb = document.querySelector('input[name="platform"][value="' + map[key] + '"]');
                if (cb) cb.checked = true;
                break;
            }
        }
    } catch(e) {}
}

// ========================
// SAVE PRODUCT → SUPABASE (lowercase columns)
// ========================
async function handleProductSubmit(e) {
    e.preventDefault();

    var affiliateLink = document.getElementById('product-affiliate-link').value.trim();
    var category = document.getElementById('product-category').value;
    var originalPriceInput = document.getElementById('product-original-price').value.trim();
    var enableDiscount = document.getElementById('enable-discount').checked;
    var discountPriceInput = document.getElementById('product-price').value.trim();

    if (!affiliateLink) { alert('Mohon isi Affiliate Link (*)'); return; }
    if (!category) { alert('Mohon pilih kategori produk (*)'); return; }
    if (!originalPriceInput) { alert('Mohon isi Harga Original (*)'); return; }
    if (enableDiscount && !discountPriceInput) { alert('Mohon isi Harga Diskon'); return; }

    var platforms = Array.from(document.querySelectorAll('input[name="platform"]:checked')).map(function(cb) { return cb.value; });
    if (platforms.length === 0) { alert('Pilih minimal satu platform affiliate'); return; }

    var name = document.getElementById('product-name').value.trim() || ('Produk ' + new Date().toLocaleDateString('id-ID'));
    var imagesRaw = document.getElementById('product-images').value;
    var imagesArray = [];
    try { imagesArray = JSON.parse(imagesRaw); } catch(e) { imagesArray = []; }
    if (imagesArray.length === 0) {
        var singleImg = document.getElementById('product-image').value.trim();
        if (singleImg) imagesArray = [singleImg];
    }
    var image = imagesArray.length > 0 ? imagesArray[0] : 'https://via.placeholder.com/280x280?text=Produk';
    var originalprice = parseInt(originalPriceInput);
    var price = enableDiscount && discountPriceInput ? parseInt(discountPriceInput) : originalprice;
    var discount = enableDiscount && discountPriceInput
        ? (parseInt(document.getElementById('product-discount').value) || Math.round((1 - price / originalprice) * 100))
        : 0;
    var rating = parseFloat(document.getElementById('product-rating').value) || 4.5;
    var reviews = parseInt(document.getElementById('product-reviews').value) || 0;
    var description = document.getElementById('product-description').value || 'Produk pilihan berkualitas';
    var videoUrl = document.getElementById('product-video') ? document.getElementById('product-video').value.trim() : '';
    var isEditing = editingProductId !== null;

    var submitBtn = document.querySelector('#product-form button[type="submit"]');
    var originalBtnText = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) { submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...'; submitBtn.disabled = true; }

    try {
        var result;
        if (isEditing) {
            result = await window.supabase
                .from('products')
                .update({
                    name: name,
                    image: image,
                    images: imagesArray,
                    category: category,
                    originalprice: originalprice,
                    price: price,
                    discount: discount,
                    rating: rating,
                    reviews: reviews,
                    description: description,
                    video: videoUrl,
                    affiliatelink: affiliateLink,
                    platforms: platforms,
                    updatedat: new Date().toISOString()
                })
                .eq('id', editingProductId);
        } else {
            result = await window.supabase
                .from('products')
                .insert([{
                    id: Date.now().toString(),
                    name: name,
                    image: image,
                    images: imagesArray,
                    category: category,
                    originalprice: originalprice,
                    price: price,
                    discount: discount,
                    rating: rating,
                    reviews: reviews,
                    description: description,
                    video: videoUrl,
                    affiliatelink: affiliateLink,
                    platforms: platforms,
                    clicks: 0,
                    views: 0,
                    createdat: new Date().toISOString(),
                    updatedat: new Date().toISOString()
                }]);
        }

        if (result.error) throw result.error;

        await loadProductsFromSupabase();
        closeModal('product-modal');
        renderProducts();
        showNotification('✅ Produk berhasil ' + (isEditing ? 'diperbarui' : 'ditambahkan') + '!', 'success');

        // Auto post ke Telegram
        var savedProduct = {
            name: name,
            image: image,
            originalprice: originalprice,
            price: price,
            discount: discount,
            description: description,
            affiliatelink: affiliateLink,
            platforms: platforms
        };
        postToTelegram(savedProduct, isEditing);

        editingProductId = null;

    } catch (err) {
        console.error('❌ Error save produk:', err);
        showNotification('❌ Gagal menyimpan produk: ' + err.message, 'error');
    } finally {
        if (submitBtn) { submitBtn.innerHTML = originalBtnText; submitBtn.disabled = false; }
    }
}

// ========================
// DELETE PRODUCT
// ========================
function deleteProduct(productId) {
    showConfirm('Hapus Produk?', 'Apakah Anda yakin ingin menghapus produk ini?', async function() {
        try {
            var result = await window.supabase.from('products').delete().eq('id', productId);
            if (result.error) throw result.error;
            await loadProductsFromSupabase();
            renderProducts();
            showNotification('✅ Produk berhasil dihapus.', 'success');
        } catch (err) {
            console.error('❌ Error hapus produk:', err);
            showNotification('❌ Gagal menghapus produk.', 'error');
        }
    });
}

function updateCategoryOptions() {
    var select = document.getElementById('product-category');
    var currentValue = select.value;
    select.innerHTML = '<option value="">Pilih kategori</option>' +
        categories.map(function(cat) {
            return '<option value="' + cat.id + '">' + cat.name + '</option>';
        }).join('');
    select.value = currentValue;
}

// ========================
// CATEGORIES
// ========================
function renderCategories() {
    // Hitung produk per kategori
    var countMap = {};
    categories.forEach(function(cat) { countMap[cat.id] = 0; });
    products.forEach(function(p) {
        if (p.category !== undefined && p.category !== null) {
            var key = String(p.category);
            if (countMap[key] !== undefined) countMap[key]++;
            else {
                // coba match by id atau name
                categories.forEach(function(cat) {
                    if (String(cat.id) === key || cat.name === p.category) {
                        countMap[String(cat.id)]++;
                    }
                });
            }
        }
    });

    // Total semua produk
    var totalAll = products.length;

    // Header summary
    var summaryHTML = '<div style="grid-column:1/-1;background:linear-gradient(135deg,#667eea,#764ba2);color:white;border-radius:12px;padding:16px 20px;margin-bottom:4px;display:flex;align-items:center;justify-content:space-between;">' +
        '<div><i class="fas fa-boxes" style="margin-right:8px;"></i><strong>Total Semua Produk</strong></div>' +
        '<span style="font-size:24px;font-weight:700;">' + totalAll + ' produk</span>' +
        '</div>';

    var cardsHTML = categories.map(function(cat) {
        var count = countMap[String(cat.id)] || 0;
        var pct = totalAll > 0 ? Math.round((count / totalAll) * 100) : 0;
        var badgeColor = count === 0 ? '#ccc' : count < 3 ? '#ff9800' : '#4CAF50';

        return '<div class="category-card-admin">' +
            '<div class="category-card-icon"><i class="' + cat.icon + '"></i></div>' +
            '<h3>' + cat.name + '</h3>' +
            '<p class="category-card-desc">' + (cat.description || '') + '</p>' +

            // Counter badge
            '<div style="margin:10px 0 6px;">' +
                '<span style="display:inline-block;background:' + badgeColor + ';color:white;font-size:13px;font-weight:700;padding:4px 12px;border-radius:20px;">' +
                    count + ' produk' +
                '</span>' +
            '</div>' +

            // Progress bar
            '<div style="background:#f0f0f0;border-radius:4px;height:6px;margin-bottom:10px;overflow:hidden;">' +
                '<div style="background:linear-gradient(90deg,#667eea,#764ba2);height:100%;width:' + pct + '%;border-radius:4px;transition:width 0.5s ease;"></div>' +
            '</div>' +
            '<small style="color:#999;font-size:11px;">' + pct + '% dari total produk</small>' +

            '<div class="category-card-actions" style="margin-top:10px;">' +
                '<button class="btn-edit" onclick="editCategory(\'' + cat.id + '\')" title="Edit kategori"><i class="fas fa-edit"></i></button>' +
                '<button class="btn-delete" onclick="deleteCategory(\'' + cat.id + '\')" title="Hapus kategori"><i class="fas fa-trash"></i></button>' +
            '</div></div>';
    }).join('');

    document.getElementById('categories-list').innerHTML = summaryHTML + (cardsHTML || '<p class="empty-state">Belum ada kategori</p>');
}

function openCategoryModal() {
    document.getElementById('category-form').reset();
    document.querySelector('#category-modal .modal-header h2').textContent = 'Tambah Kategori Baru';
    openModal('category-modal');
}

function editCategory(categoryId) {
    var cat = categories.find(function(c) { return c.id == categoryId; });
    if (!cat) return;
    document.querySelector('#category-modal .modal-header h2').textContent = 'Edit Kategori';
    document.getElementById('category-name').value = cat.name;
    document.getElementById('category-icon').value = cat.icon;
    document.getElementById('category-description').value = cat.description || '';
    document.getElementById('category-form').dataset.editId = categoryId;
    openModal('category-modal');
}

function deleteCategory(categoryId) {
    var inUse = products.filter(function(p) { return p.category == categoryId; }).length;
    if (inUse > 0) { alert('Tidak bisa menghapus kategori yang masih memiliki ' + inUse + ' produk'); return; }
    showConfirm('Hapus Kategori?', 'Apakah Anda yakin?', async function() {
        try {
            await window.supabase.from('categories').delete().eq('id', categoryId);
            await loadCategoriesFromSupabase();
            showNotification('✅ Kategori dihapus', 'success');
        } catch(err) {
            showNotification('❌ Gagal hapus: ' + err.message, 'error');
        }
    });
}

async function handleCategorySubmit(e) {
    e.preventDefault();
    var name = document.getElementById('category-name').value.trim();
    var icon = document.getElementById('category-icon').value.trim();
    var description = document.getElementById('category-description').value.trim();
    var editId = document.getElementById('category-form').dataset.editId;
    if (!name || !icon) { alert('Mohon isi semua field yang diperlukan'); return; }

    try {
        if (editId) {
            await window.supabase.from('categories').update({ name: name, icon: icon, description: description }).eq('id', editId);
        } else {
            await window.supabase.from('categories').insert([{ name: name, icon: icon, description: description }]);
        }
        await loadCategoriesFromSupabase();
        closeModal('category-modal');
        document.getElementById('category-form').removeAttribute('data-edit-id');
        showNotification('✅ Kategori berhasil disimpan!', 'success');
    } catch(err) {
        showNotification('❌ Gagal simpan kategori: ' + err.message, 'error');
    }
}


// ========================
// ANALYTICS
// ========================
var analyticsPeriod = 7;
var categoryChartInstance = null;

function setAnalyticsPeriod(days, btn) {
    analyticsPeriod = days;
    document.querySelectorAll('.period-btn').forEach(function(b) { b.classList.remove('active'); });
    if (btn) btn.classList.add('active');
    renderAnalytics();
}

async function renderAnalytics() {
    // Stat cards
    var totalClicks = products.reduce(function(s,p) { return s+(p.clicks||0); }, 0);
    var totalProducts = products.length;

    // New products this month
    var now = new Date();
    var startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    var newThisMonth = products.filter(function(p) {
        return p.createdat && new Date(p.createdat) >= startOfMonth;
    }).length;

    document.getElementById('an-total-clicks').textContent = totalClicks.toLocaleString('id-ID');
    document.getElementById('an-total-products').textContent = totalProducts;
    document.getElementById('an-new-products').textContent = newThisMonth;

    // Wishlist count from Supabase
    try {
        var wlResult = await window.supabase.from('wishlists').select('id', { count: 'exact', head: true });
        document.getElementById('an-total-wishlist').textContent = (wlResult.count || 0).toLocaleString('id-ID');
    } catch(e) {
        document.getElementById('an-total-wishlist').textContent = '-';
    }

    // Top 10 products by clicks
    var topProducts = products.slice()
        .sort(function(a,b) { return (b.clicks||0)-(a.clicks||0); })
        .slice(0, 10);

    var maxClicks = topProducts.length > 0 ? (topProducts[0].clicks || 1) : 1;

    document.getElementById('an-top-products-list').innerHTML = topProducts.length > 0
        ? topProducts.map(function(p, i) {
            var pct = Math.round(((p.clicks||0) / maxClicks) * 100);
            var medals = ['🥇','🥈','🥉'];
            return '<div class="an-product-row">' +
                '<span class="an-rank">' + (medals[i] || (i+1)) + '</span>' +
                '<img src="' + (p.image||'') + '" class="an-thumb">' +
                '<div class="an-product-info">' +
                    '<div class="an-product-name">' + p.name + '</div>' +
                    '<div class="an-bar-wrap"><div class="an-bar" style="width:' + pct + '%"></div></div>' +
                '</div>' +
                '<span class="an-clicks">' + (p.clicks||0) + ' klik</span>' +
            '</div>';
        }).join('')
        : '<p style="color:#aaa;text-align:center;padding:20px;">Belum ada data klik</p>';

    // Category chart
    var catMap = {};
    products.forEach(function(p) {
        var catId = String(p.category || 'Lainnya');
        var catName = categories.find(function(c) { return String(c.id) === catId; });
        var label = catName ? catName.name : catId;
        catMap[label] = (catMap[label] || 0) + (p.clicks || 0);
    });

    var catLabels = Object.keys(catMap);
    var catData = Object.values(catMap);
    var colors = ['#667eea','#f093fb','#f5576c','#4facfe','#43e97b','#fa709a','#fee140','#a18cd1','#fccb90','#a1c4fd'];

    var ctx = document.getElementById('an-category-chart');
    if (ctx) {
        if (categoryChartInstance) categoryChartInstance.destroy();
        categoryChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: catLabels,
                datasets: [{
                    data: catData,
                    backgroundColor: colors.slice(0, catLabels.length),
                    borderWidth: 0,
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { font: { size: 12 }, padding: 12, boxWidth: 12 }
                    }
                },
                cutout: '65%'
            }
        });
    }

    // Top wishlisted products
    try {
        var wlTop = await window.supabase
            .from('wishlists')
            .select('product_id')
            .limit(500);

        if (wlTop.data) {
            var wlCount = {};
            wlTop.data.forEach(function(r) {
                wlCount[r.product_id] = (wlCount[r.product_id] || 0) + 1;
            });

            var wlSorted = Object.entries(wlCount)
                .sort(function(a,b) { return b[1]-a[1]; })
                .slice(0, 5);

            document.getElementById('an-top-wishlist-list').innerHTML = wlSorted.length > 0
                ? wlSorted.map(function(entry, i) {
                    var prod = products.find(function(p) { return String(p.id) === String(entry[0]); });
                    if (!prod) return '';
                    return '<div class="an-product-row">' +
                        '<span class="an-rank">' + (i+1) + '</span>' +
                        '<img src="' + (prod.image||'') + '" class="an-thumb">' +
                        '<div class="an-product-info">' +
                            '<div class="an-product-name">' + prod.name + '</div>' +
                        '</div>' +
                        '<span class="an-clicks" style="color:#e53935;">❤️ ' + entry[1] + '</span>' +
                    '</div>';
                }).join('')
                : '<p style="color:#aaa;text-align:center;padding:20px;">Belum ada data wishlist</p>';
        }
    } catch(e) {
        document.getElementById('an-top-wishlist-list').innerHTML = '<p style="color:#aaa;text-align:center;padding:20px;">-</p>';
    }
}

// ========================
// EXPORT / IMPORT / RESET
// ========================
async function exportData() {
    var blob = new Blob([JSON.stringify({ products: products, categories: categories, exportDate: new Date().toISOString() }, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = 'instafinds-backup-' + new Date().toISOString().split('T')[0] + '.json';
    link.click();
    URL.revokeObjectURL(url);
    showNotification('Data berhasil di-export!', 'success');
}

function importData(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = async function(event) {
        try {
            var data = JSON.parse(event.target.result);
            if (data.products && data.categories) {
                for (var i = 0; i < data.products.length; i++) {
                    await window.supabase.from('products').upsert([data.products[i]]);
                }
                if (data.categories) {
                    for (var cat of data.categories) {
                        await window.supabase.from('categories').upsert([{ name: cat.name, icon: cat.icon || 'fas fa-tag', description: cat.description || '' }]);
                    }
                    await loadCategoriesFromSupabase();
                }
                await loadProductsFromSupabase();
                renderDashboard();
                showNotification('Data berhasil di-import!', 'success');
            } else { alert('Format file tidak valid'); }
        } catch (error) { alert('Gagal membaca file: ' + error.message); }
    };
    reader.readAsText(file);
    e.target.value = '';
}

async function resetAllData() {
    showConfirm('Reset Semua Data?', 'Tindakan ini akan menghapus SEMUA produk. Tidak bisa di-undo!', async function() {
        try {
            var result = await window.supabase.from('products').delete().neq('id', '');
            if (result.error) throw result.error;
            await loadProductsFromSupabase();
            renderDashboard();
            showNotification('Semua data telah direset', 'success');
        } catch (err) {
            showNotification('❌ Gagal reset: ' + err.message, 'error');
        }
    });
}

// ========================
// TELEGRAM AUTO-POST
// ========================
async function postToTelegram(product, isEdit) {
    isEdit = isEdit || false;
    try {
        var action = isEdit ? '✏️ Produk Diperbarui' : '🆕 Produk Baru';
        var priceText = '';
        if (product.discount && product.discount > 0) {
            priceText = '💰 Harga: ~~Rp ' + (product.originalprice || 0).toLocaleString('id-ID') + '~~ → *Rp ' + (product.price || 0).toLocaleString('id-ID') + '* (Diskon ' + product.discount + '%)';
        } else {
            priceText = '💰 Harga: *Rp ' + (product.price || 0).toLocaleString('id-ID') + '*';
        }

        var platformText = (product.platforms && product.platforms.length > 0)
            ? '🛒 Platform: ' + product.platforms.join(', ')
            : '';

        var desc150 = product.description ? ('\u{1F4DD} ' + product.description.substring(0, 150) + (product.description.length > 150 ? '...' : '') + '\n') : '';
        var caption = action + ' di Instafinds.id!\n\n' +
            '\u{1F4E6} *' + product.name + '*\n\n' +
            priceText + '\n' +
            (platformText ? platformText + '\n' : '') +
            desc150 +
            '\n\u{1F517} [Beli Sekarang](' + product.affiliatelink + ')' +
            '\n\n\u{1F310} Lihat semua produk: https://botbynetz.github.io/instafindschart/';

        var imageUrl = product.image || '';
        var apiBase = 'https://api.telegram.org/bot' + TELEGRAM_BOT_TOKEN;

        var response;
        if (imageUrl) {
            // Kirim dengan foto
            response = await fetch(apiBase + '/sendPhoto', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: TELEGRAM_CHANNEL_ID,
                    photo: imageUrl,
                    caption: caption,
                    parse_mode: 'Markdown'
                })
            });
        } else {
            // Kirim teks saja
            response = await fetch(apiBase + '/sendMessage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: TELEGRAM_CHANNEL_ID,
                    text: caption,
                    parse_mode: 'Markdown',
                    disable_web_page_preview: false
                })
            });
        }

        var result = await response.json();
        if (result.ok) {
            console.log('✅ Posted to Telegram!');
            showNotification('📢 Produk berhasil dibagikan ke Telegram!', 'success');
        } else {
            console.error('❌ Telegram error:', result.description);
        }
    } catch (err) {
        console.error('❌ Gagal post ke Telegram:', err);
    }
}

// ========================
// EVENTS CRUD
// ========================
var editingEventId = null;

async function loadEvents() {
    var list = document.getElementById('events-list');
    if (!list) return;
    list.innerHTML = '<div class="empty-state">Memuat event...</div>';

    try {
        var result = await window.supabase.from('events').select('*').order('createdat', { ascending: false });
        if (result.error) throw result.error;
        var events = result.data || [];

        if (events.length === 0) {
            list.innerHTML = '<div class="empty-state">Belum ada event. Klik "+ Tambah Event" untuk membuat event baru.</div>';
            return;
        }

        list.innerHTML = events.map(function(ev) {
            return '<div class="event-card-admin" style="display:flex;align-items:center;gap:16px;background:white;border-radius:12px;padding:16px;margin-bottom:12px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">' +
                (ev.image ? '<img src="' + ev.image + '" style="width:80px;height:80px;object-fit:cover;border-radius:8px;flex-shrink:0;">' : '<div style="width:80px;height:80px;background:#f0f0f0;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:24px;">📅</div>') +
                '<div style="flex:1;min-width:0;">' +
                    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">' +
                        '<span style="font-weight:700;font-size:15px;">' + ev.title + '</span>' +
                        '<span style="font-size:11px;padding:2px 8px;border-radius:10px;background:' + (ev.active ? '#e8f5e9;color:#2e7d32' : '#fff3e0;color:#e65100') + ';">' + (ev.active ? '● Aktif' : '● Nonaktif') + '</span>' +
                    '</div>' +
                    '<div style="font-size:12px;color:#888;">' + (ev.description || '') + '</div>' +
                    '<div style="font-size:11px;color:#bbb;margin-top:4px;">🔗 ' + (ev.link || '') + '</div>' +
                '</div>' +
                '<div style="display:flex;gap:8px;flex-shrink:0;">' +
                    '<button class="btn-edit" onclick="editEvent(&#39;' + ev.id + '&#39;)" title="Edit"><i class="fas fa-edit"></i></button>' +
                    '<button class="btn-delete" onclick="deleteEvent(&#39;' + ev.id + '&#39;)" title="Hapus"><i class="fas fa-trash"></i></button>' +
                '</div>' +
            '</div>';
        }).join('');
    } catch(err) {
        list.innerHTML = '<div class="empty-state">Gagal memuat event: ' + err.message + '</div>';
    }
}

function openEventModal(id) {
    editingEventId = null;
    var titleEl = document.getElementById('event-modal-title');
    var titleInput = document.getElementById('event-title');
    var imageInput = document.getElementById('event-image');
    var linkInput = document.getElementById('event-link');
    var activeInput = document.getElementById('event-active');
    var preview = document.getElementById('event-img-preview');
    var placeholder = document.getElementById('event-upload-placeholder');
    var dropZone = document.getElementById('event-drop-zone');
    var statusEl = document.getElementById('event-img-status');

    if (titleEl) titleEl.textContent = 'Tambah Event';
    if (titleInput) titleInput.value = '';
    if (imageInput) imageInput.value = '';
    if (linkInput) linkInput.value = '';
    if (activeInput) activeInput.checked = true;
    if (preview) preview.style.display = 'none';
    if (placeholder) placeholder.style.display = 'block';
    if (dropZone) dropZone.style.borderColor = '#ddd';
    if (statusEl) statusEl.textContent = 'Klik untuk upload gambar banner';
    openModal('event-modal');
}

async function editEvent(id) {
    var result = await window.supabase.from('events').select('*').eq('id', id).single();
    if (result.error || !result.data) return;
    var ev = result.data;
    editingEventId = id;
    var titleEl = document.getElementById('event-modal-title');
    var preview = document.getElementById('event-img-preview');
    var previewImg = document.getElementById('event-img-preview-img');
    var placeholder = document.getElementById('event-upload-placeholder');
    var dropZone = document.getElementById('event-drop-zone');

    if (titleEl) titleEl.textContent = 'Edit Event';
    var t = document.getElementById('event-title'); if(t) t.value = ev.title || '';
    var img = document.getElementById('event-image'); if(img) img.value = ev.image || '';
    var lnk = document.getElementById('event-link'); if(lnk) lnk.value = ev.link || '';
    var act = document.getElementById('event-active'); if(act) act.checked = ev.active !== false;

    // Show preview if image exists
    if (ev.image && previewImg && preview && placeholder) {
        previewImg.src = ev.image;
        preview.style.display = 'block';
        placeholder.style.display = 'none';
        if (dropZone) dropZone.style.borderColor = '#4CAF50';
    }
    openModal('event-modal');
}

async function uploadEventImage(input) {
    var file = input.files[0];
    if (!file) return;
    var statusEl = document.getElementById('event-img-status');
    var imageInput = document.getElementById('event-image');
    var preview = document.getElementById('event-img-preview');
    var previewImg = document.getElementById('event-img-preview-img');
    var placeholder = document.getElementById('event-upload-placeholder');
    var dropZone = document.getElementById('event-drop-zone');

    if (statusEl) statusEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengupload...';
    if (dropZone) dropZone.style.borderColor = '#667eea';

    try {
        var url = await uploadToCloudinary(file);
        if (imageInput) imageInput.value = url;
        if (previewImg) previewImg.src = url;
        if (preview) preview.style.display = 'block';
        if (placeholder) placeholder.style.display = 'none';
        if (dropZone) dropZone.style.borderColor = '#4CAF50';
        showNotification('✅ Gambar banner berhasil diupload!', 'success');
    } catch(err) {
        if (statusEl) statusEl.textContent = '❌ Gagal upload, coba lagi';
        if (dropZone) dropZone.style.borderColor = '#f44336';
        showNotification('❌ Gagal upload gambar: ' + err.message, 'error');
    }
}

async function saveEvent() {
    var title = document.getElementById('event-title').value.trim();
    var image = document.getElementById('event-image').value.trim();
    if (!title) { showNotification('⚠️ Judul event wajib diisi!', 'error'); return; }

    var link = document.getElementById('event-link').value.trim();

    var data = {
        title: title,
        label: 'Event',
        description: '',
        image: image,
        link: link || '',
        buttontext: link ? 'Lihat Sekarang' : '',
        active: document.getElementById('event-active').checked
    };

    try {
        var result;
        if (editingEventId) {
            result = await window.supabase.from('events').update(data).eq('id', editingEventId);
        } else {
            data.id = Date.now().toString();
            data.createdat = new Date().toISOString();
            result = await window.supabase.from('events').insert([data]);
        }
        if (result.error) throw result.error;
        closeModal('event-modal');
        loadEvents();
        showNotification('✅ Event berhasil ' + (editingEventId ? 'diperbarui' : 'ditambahkan') + '!', 'success');
        editingEventId = null;
    } catch(err) {
        showNotification('❌ Gagal simpan event: ' + err.message, 'error');
    }
}

async function deleteEvent(id) {
    if (!confirm('Hapus event ini?')) return;
    var result = await window.supabase.from('events').delete().eq('id', id);
    if (result.error) { showNotification('❌ Gagal hapus event', 'error'); return; }
    loadEvents();
    showNotification('✅ Event dihapus!', 'success');
}

// ========================
// VIDEO URL PARSER
// ========================
function parseVideoUrl(url) {
    if (!url || !url.trim()) return null;
    url = url.trim();

    // YouTube
    var ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) return {
        type: 'youtube',
        embed: 'https://www.youtube.com/embed/' + ytMatch[1] + '?rel=0',
        thumb: 'https://img.youtube.com/vi/' + ytMatch[1] + '/hqdefault.jpg'
    };

    // TikTok
    var ttMatch = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/);
    if (ttMatch) return {
        type: 'tiktok',
        embed: 'https://www.tiktok.com/embed/v2/' + ttMatch[1],
        thumb: ''
    };

    // Direct video file
    if (url.match(/\.(mp4|webm|mov|m4v|ogg)(\?.*)?$/i)) {
        return { type: 'direct', embed: url, thumb: '' };
    }

    // URL lainnya (Shopee, marketplace, CDN, dll)
    return { type: 'external', embed: url, thumb: '' };
}

// Live preview saat admin paste URL
document.addEventListener('DOMContentLoaded', function() {
    var videoInput = document.getElementById('product-video');
    if (!videoInput) return;
    videoInput.addEventListener('input', function() {
        var parsed = parseVideoUrl(this.value);
        var wrap = document.getElementById('video-preview-wrap');
        var frame = document.getElementById('video-preview-frame');
        var hint = document.getElementById('video-hint');
        if (parsed) {
            var typeLabels = { youtube: '▶ YouTube', tiktok: '♪ TikTok', direct: '🎬 Video Langsung', external: '🔗 URL Video' };
            if (parsed.type === 'direct') {
                wrap.style.display = 'block';
                wrap.innerHTML = '<video src="' + parsed.embed + '" controls style="width:100%;max-height:150px;border-radius:8px;"></video>';
            } else {
                wrap.innerHTML = '<iframe id="video-preview-frame" src="' + parsed.embed + '" frameborder="0" allowfullscreen style="width:100%;height:100%;"></iframe>';
                wrap.style.display = 'block';
            }
            if (hint) {
                hint.textContent = '✅ ' + (typeLabels[parsed.type] || 'Video') + ' terdeteksi';
                hint.style.color = '#4CAF50';
            }
        } else {
            if (wrap) wrap.style.display = 'none';
            if (hint) {
                hint.textContent = this.value ? '⚠️ Masukkan URL video yang valid' : '';
                hint.style.color = '#ff9800';
            }
        }
    });
});

// ========================
// MODALS
// ========================
function openModal(modalId) {
    var modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active');
    }
}

function closeModal(modalId) {
    var modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
    }
}

document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
        e.target.classList.remove('active');
    }
});

// ========================
// NOTIFICATIONS
// ========================
function showNotification(message, type) {
    type = type || 'info';
    var colors = { success: '#4CAF50', error: '#f44336', warning: '#ff9800', info: '#2196f3' };
    var notification = document.createElement('div');
    notification.style.cssText = 'position:fixed;top:20px;right:20px;padding:15px 20px;background:' + (colors[type] || colors.info) + ';color:white;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.2);z-index:3000;animation:slideIn 0.3s ease;max-width:350px;word-break:break-word;';
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(function() {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(function() { notification.remove(); }, 300);
    }, 4000);
}

function showConfirm(title, message, onConfirm) {
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').textContent = message;
    openModal('confirm-modal');
    document.getElementById('confirm-btn').onclick = function() {
        onConfirm();
        closeModal('confirm-modal');
    };
}

function logout() { logoutAdmin(); }
function toggleMobileMenu() {
    var sidebar = document.querySelector('.sidebar');
    var overlay = document.querySelector('.sidebar-overlay');
    sidebar.classList.toggle('active');
    if (overlay) overlay.classList.toggle('active');
}

var style = document.createElement('style');
style.textContent = '@keyframes slideIn{from{transform:translateX(400px);opacity:0}to{transform:translateX(0);opacity:1}}@keyframes slideOut{from{transform:translateX(0);opacity:1}to{transform:translateX(400px);opacity:0}}';
document.head.appendChild(style);

console.log('✅ Admin Panel loaded!');
