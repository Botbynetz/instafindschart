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
document.addEventListener('DOMContentLoaded', function() {
    loadCategoriesFromStorage();
    initDefaultCategories();
    setupEventListeners();
    loadProductsFromSupabase();
});

// ========================
// CATEGORIES (localStorage)
// ========================
function loadCategoriesFromStorage() {
    var stored = localStorage.getItem('instafinds_categories');
    categories = stored ? JSON.parse(stored) : [];
}

function saveCategoriesLocally() {
    localStorage.setItem('instafinds_categories', JSON.stringify(categories));
}

function initDefaultCategories() {
    if (categories.length === 0) {
        categories = [
            { id: 1, name: 'Kecantikan', icon: 'fas fa-lipstick', description: 'Produk kecantikan dan perawatan' },
            { id: 2, name: 'Fashion', icon: 'fas fa-shirt', description: 'Pakaian dan fashion items' },
            { id: 3, name: 'Sepatu', icon: 'fas fa-shoe-prints', description: 'Koleksi sepatu terlengkap' },
            { id: 4, name: 'Aksesoris', icon: 'fas fa-ring', description: 'Aksesoris fashion dan perhiasan' },
            { id: 5, name: 'Elektronik', icon: 'fas fa-phone', description: 'Gadget dan elektronik terkini' },
            { id: 6, name: 'Rumah Tangga', icon: 'fas fa-home', description: 'Perlengkapan rumah tangga' }
        ];
        saveCategoriesLocally();
        renderCategories();
    }
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
function navigateToPage(pageName) {
    document.querySelectorAll('.page').forEach(function(page) {
        page.classList.remove('active');
    });

    var pageElement = document.getElementById(pageName + '-page');
    if (pageElement) pageElement.classList.add('active');

    document.querySelectorAll('.nav-item').forEach(function(link) {
        link.classList.remove('active');
        if (link.dataset.page === pageName) link.classList.add('active');
    });

    document.querySelector('.page-title').textContent =
        pageName.charAt(0).toUpperCase() + pageName.slice(1);

    if (pageName === 'dashboard') renderDashboard();
    else if (pageName === 'products') renderProducts();
    else if (pageName === 'categories') renderCategories();
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
var IMGBB_KEY = 'cc40cdc3967a9e03f1a0a190479f5f21';

// ========================
// TELEGRAM CONFIG
// ========================
var TELEGRAM_BOT_TOKEN = '8616409431:AAFu4tJEnwqB9Rsh9h-6miUz4qDsLMdFOzo';
var TELEGRAM_CHANNEL_ID = '-1007852153730';

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

async function uploadToImgbb(file) {
    var formData = new FormData();
    formData.append('image', file);
    formData.append('key', IMGBB_KEY);

    var response = await fetch('https://api.imgbb.com/1/upload', {
        method: 'POST',
        body: formData
    });
    var result = await response.json();
    if (result.success) return result.data.url;
    throw new Error(result.error ? result.error.message : 'Upload gagal');
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

// Mirror gambar dari URL eksternal ke Imgbb
async function mirrorImageToImgbb(imageUrl) {
    // Pakai allorigins untuk fetch gambar sebagai base64
    var proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(imageUrl);
    var response = await fetch(proxyUrl);
    if (!response.ok) throw new Error('Gagal fetch gambar');

    var blob = await response.blob();

    // Upload blob ke Imgbb
    var formData = new FormData();
    formData.append('image', blob, 'product.jpg');
    formData.append('key', IMGBB_KEY);

    var uploadResp = await fetch('https://api.imgbb.com/1/upload', {
        method: 'POST',
        body: formData
    });
    var result = await uploadResp.json();
    if (result.success) return result.data.url;
    throw new Error(result.error ? result.error.message : 'Upload Imgbb gagal');
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
    document.getElementById('categories-list').innerHTML = categories.map(function(cat) {
        return '<div class="category-card-admin">' +
            '<div class="category-card-icon"><i class="' + cat.icon + '"></i></div>' +
            '<h3>' + cat.name + '</h3>' +
            '<p class="category-card-desc">' + (cat.description || '') + '</p>' +
            '<div class="category-card-actions">' +
                '<button class="btn-edit" onclick="editCategory(\'' + cat.id + '\')"><i class="fas fa-edit"></i></button>' +
                '<button class="btn-delete" onclick="deleteCategory(\'' + cat.id + '\')"><i class="fas fa-trash"></i></button>' +
            '</div></div>';
    }).join('') || '<p class="empty-state">Belum ada kategori</p>';
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
    showConfirm('Hapus Kategori?', 'Apakah Anda yakin?', function() {
        categories = categories.filter(function(c) { return c.id != categoryId; });
        saveCategoriesLocally();
        renderCategories();
    });
}

function handleCategorySubmit(e) {
    e.preventDefault();
    var name = document.getElementById('category-name').value;
    var icon = document.getElementById('category-icon').value;
    var description = document.getElementById('category-description').value;
    var editId = document.getElementById('category-form').dataset.editId;
    if (!name || !icon) { alert('Mohon isi semua field yang diperlukan'); return; }

    if (editId) {
        var index = categories.findIndex(function(c) { return c.id == editId; });
        categories[index] = { id: parseInt(editId), name: name, icon: icon, description: description };
    } else {
        var newId = categories.length > 0 ? Math.max.apply(null, categories.map(function(c) { return c.id; })) + 1 : 1;
        categories.push({ id: newId, name: name, icon: icon, description: description });
    }

    saveCategoriesLocally();
    closeModal('category-modal');
    renderCategories();
    document.getElementById('category-form').removeAttribute('data-edit-id');
    showNotification('Kategori berhasil disimpan!', 'success');
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
                categories = data.categories;
                saveCategoriesLocally();
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
            categories = [];
            saveCategoriesLocally();
            await loadProductsFromSupabase();
            initDefaultCategories();
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
// MODALS
// ========================
function openModal(modalId) {
    var modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
}

function closeModal(modalId) {
    var modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
}

document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) e.target.classList.remove('active');
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
