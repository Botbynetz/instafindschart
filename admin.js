// ========================
// ADMIN PANEL - FULL SUPABASE
// ========================
const ADMIN_TOKEN_KEY = 'instafinds_admin_token';
const ADMIN_CREDENTIALS_TOKEN = 'admin_token_instafinds';

// ========================
// AUTH CHECK
// ========================
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
let products = [];
let categories = [];
let editingProductId = null;

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
// CATEGORIES (localStorage ok untuk admin-only data)
// ========================
function loadCategoriesFromStorage() {
    const stored = localStorage.getItem('instafinds_categories');
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
        const { data, error } = await window.supabase
            .from('products')
            .select('*')
            .order('createdAt', { ascending: false });

        if (error) throw error;

        products = data || [];
        console.log('✅ ' + products.length + ' produk loaded dari Supabase');
        renderDashboard();
    } catch (err) {
        console.error('❌ Error load produk:', err);
        showNotification('Gagal memuat produk dari database.', 'error');
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
}

// ========================
// NAVIGATION
// ========================
function navigateToPage(pageName) {
    document.querySelectorAll('.page').forEach(function(page) {
        page.classList.remove('active');
    });

    const pageElement = document.getElementById(pageName + '-page');
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
    const totalProducts = products.length;
    const totalClicks = products.reduce(function(sum, p) { return sum + (p.clicks || 0); }, 0);
    const totalViews = products.reduce(function(sum, p) { return sum + (p.views || 0); }, 0);
    const platformsSet = new Set();
    products.forEach(function(p) {
        if (p.platforms) p.platforms.forEach(function(pl) { platformsSet.add(pl); });
    });

    document.getElementById('total-products').textContent = totalProducts;
    document.getElementById('total-clicks').textContent = totalClicks;
    document.getElementById('views-count').textContent = totalViews;
    document.getElementById('active-platforms').textContent = platformsSet.size;

    const recentProducts = products.slice(0, 5);
    document.getElementById('recent-products').innerHTML = recentProducts.length > 0
        ? recentProducts.map(function(p) {
            return '<div class="product-item">' +
                '<img src="' + p.image + '" alt="' + p.name + '" class="product-thumbnail">' +
                '<div class="product-details">' +
                    '<h4>' + p.name + '</h4>' +
                    '<p>Rp ' + (p.price || 0).toLocaleString('id-ID') + '</p>' +
                '</div></div>';
          }).join('')
        : '<p class="empty-state">Belum ada produk</p>';

    const topProducts = products.slice().sort(function(a, b) { return (b.clicks || 0) - (a.clicks || 0); }).slice(0, 5);
    document.getElementById('top-products').innerHTML = topProducts.length > 0
        ? topProducts.map(function(p) {
            return '<div class="product-item">' +
                '<img src="' + p.image + '" alt="' + p.name + '" class="product-thumbnail">' +
                '<div class="product-details">' +
                    '<h4>' + p.name + '</h4>' +
                    '<p>' + (p.clicks || 0) + ' klik</p>' +
                '</div></div>';
          }).join('')
        : '<p class="empty-state">Belum ada data klik</p>';
}

// ========================
// RENDER PRODUCTS
// ========================
function renderProducts(searchQuery) {
    let filteredProducts = products;
    if (searchQuery) {
        filteredProducts = products.filter(function(p) {
            return p.name.toLowerCase().includes(searchQuery.toLowerCase());
        });
    }

    document.getElementById('products-list').innerHTML = filteredProducts.length > 0
        ? filteredProducts.map(function(product) {
            return '<div class="product-card-admin">' +
                '<div class="product-card-image"><img src="' + product.image + '" alt="' + product.name + '"></div>' +
                '<div class="product-card-info">' +
                    '<h3>' + product.name + '</h3>' +
                    '<div class="product-card-price">' +
                        '<span>Rp ' + (product.price || 0).toLocaleString('id-ID') + '</span>' +
                        '<span style="color:#999;text-decoration:line-through">Rp ' + (product.originalPrice || 0).toLocaleString('id-ID') + '</span>' +
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

function handleProductSearch(e) {
    renderProducts(e.target.value);
}

// ========================
// PRODUCT MODAL
// ========================
function openProductModal() {
    editingProductId = null;
    document.getElementById('modal-title').textContent = 'Tambah Produk Baru';
    document.getElementById('product-form').reset();
    document.querySelectorAll('input[name="platform"]').forEach(function(cb) { cb.checked = false; });

    const fileInput = document.getElementById('product-image-file');
    const previewContainer = document.getElementById('image-preview-container');
    const dragDropZone = document.getElementById('drag-drop-zone');
    if (fileInput) fileInput.value = '';
    if (previewContainer) previewContainer.style.display = 'none';
    if (dragDropZone) dragDropZone.style.display = 'block';

    const enableDiscountCheckbox = document.getElementById('enable-discount');
    const discountPriceGroup = document.getElementById('discount-price-group');
    const discountPercentGroup = document.getElementById('discount-percent-group');
    if (enableDiscountCheckbox) enableDiscountCheckbox.checked = false;
    if (discountPriceGroup) discountPriceGroup.style.display = 'none';
    if (discountPercentGroup) discountPercentGroup.style.display = 'none';

    updateCategoryOptions();
    openModal('product-modal');
}

function editProduct(productId) {
    editingProductId = productId;
    const product = products.find(function(p) { return p.id === productId; });

    if (product) {
        document.getElementById('modal-title').textContent = 'Edit Produk';
        document.getElementById('product-name').value = product.name;
        document.getElementById('product-image').value = product.image;
        document.getElementById('product-category').value = product.category;
        document.getElementById('product-original-price').value = product.originalPrice;
        document.getElementById('product-price').value = product.price;
        document.getElementById('product-discount').value = product.discount || '';
        document.getElementById('product-rating').value = product.rating || '';
        document.getElementById('product-reviews').value = product.reviews || '';
        document.getElementById('product-description').value = product.description || '';
        document.getElementById('product-affiliate-link').value = product.affiliateLink || '';

        document.querySelectorAll('input[name="platform"]').forEach(function(cb) {
            cb.checked = (product.platforms || []).includes(cb.value);
        });

        const previewContainer = document.getElementById('image-preview-container');
        const previewImg = document.getElementById('image-preview');
        const dragDropZone = document.getElementById('drag-drop-zone');
        if (product.image && previewImg && previewContainer && dragDropZone) {
            previewImg.src = product.image;
            previewContainer.style.display = 'block';
            dragDropZone.style.display = 'none';
        }

        const enableDiscountCheckbox = document.getElementById('enable-discount');
        const discountPriceGroup = document.getElementById('discount-price-group');
        const discountPercentGroup = document.getElementById('discount-percent-group');
        if (product.price < product.originalPrice) {
            if (enableDiscountCheckbox) enableDiscountCheckbox.checked = true;
            if (discountPriceGroup) discountPriceGroup.style.display = 'block';
            if (discountPercentGroup) discountPercentGroup.style.display = 'block';
        }

        updateCategoryOptions();
        openModal('product-modal');
    }
}

// ========================
// IMAGE UPLOAD
// ========================
function setupImageUpload() {
    const dragDropZone = document.getElementById('drag-drop-zone');
    const fileInput = document.getElementById('product-image-file');
    const productImageInput = document.getElementById('product-image');
    const previewContainer = document.getElementById('image-preview-container');
    const previewImg = document.getElementById('image-preview');
    const removeBtn = document.getElementById('btn-remove-image');

    if (!dragDropZone) return;

    dragDropZone.addEventListener('click', function() { fileInput.click(); });
    fileInput.addEventListener('change', function(e) { handleImageFile(e.target.files[0]); });
    dragDropZone.addEventListener('dragover', function(e) { e.preventDefault(); dragDropZone.classList.add('dragover'); });
    dragDropZone.addEventListener('dragleave', function() { dragDropZone.classList.remove('dragover'); });
    dragDropZone.addEventListener('drop', function(e) {
        e.preventDefault();
        dragDropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) handleImageFile(e.dataTransfer.files[0]);
    });

    if (removeBtn) {
        removeBtn.addEventListener('click', function(e) {
            e.preventDefault();
            fileInput.value = '';
            productImageInput.value = '';
            previewContainer.style.display = 'none';
            dragDropZone.style.display = 'block';
        });
    }

    document.addEventListener('dragover', function(e) { e.preventDefault(); });
    document.addEventListener('drop', function(e) { e.preventDefault(); });
}

function handleImageFile(file) {
    if (!file || !file.type.startsWith('image/')) {
        alert('Mohon upload file gambar saja!');
        return;
    }

    const dragDropZone = document.getElementById('drag-drop-zone');
    const previewContainer = document.getElementById('image-preview-container');
    const previewImg = document.getElementById('image-preview');
    const productImageInput = document.getElementById('product-image');

    const reader = new FileReader();
    reader.onload = function(e) {
        const base64Data = e.target.result;
        previewImg.src = base64Data;
        previewContainer.style.display = 'block';
        dragDropZone.style.display = 'none';
        productImageInput.value = base64Data;
    };
    reader.readAsDataURL(file);
}

// ========================
// DISCOUNT TOGGLE
// ========================
function setupDiscountToggle() {
    const enableDiscountCheckbox = document.getElementById('enable-discount');
    const discountPriceGroup = document.getElementById('discount-price-group');
    const discountPercentGroup = document.getElementById('discount-percent-group');
    const originalPriceInput = document.getElementById('product-original-price');
    const discountPriceInput = document.getElementById('product-price');
    const discountPercentInput = document.getElementById('product-discount');

    if (!enableDiscountCheckbox) return;

    enableDiscountCheckbox.addEventListener('change', function(e) {
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

    function calculateDiscount() {
        const originalPrice = parseInt(originalPriceInput.value) || 0;
        const discountPrice = parseInt(discountPriceInput.value) || 0;
        if (originalPrice > 0 && discountPrice > 0 && discountPrice < originalPrice) {
            discountPercentInput.value = Math.round(((originalPrice - discountPrice) / originalPrice) * 100);
        } else {
            discountPercentInput.value = '';
        }
    }

    if (originalPriceInput && discountPriceInput) {
        originalPriceInput.addEventListener('input', calculateDiscount);
        discountPriceInput.addEventListener('input', calculateDiscount);
    }
}

// ========================
// FETCH FROM AFFILIATE LINK
// ========================
async function fetchFromAffiliateLink(e) {
    e.preventDefault();
    const affiliateLink = document.getElementById('product-affiliate-link').value.trim();
    if (!affiliateLink) { alert('Masukkan affiliate link terlebih dahulu'); return; }

    const btn = document.getElementById('btn-fetch-from-link');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengambil data...';
    btn.disabled = true;

    try {
        const proxies = [
            'https://api.allorigins.win/get?url=',
            'https://cors-proxy.htmldriven.com/?url='
        ];

        let html = '';
        let success = false;

        for (const proxy of proxies) {
            try {
                const response = await fetch(proxy + encodeURIComponent(affiliateLink));
                if (!response.ok) continue;
                const data = await response.json();
                html = data.contents || data;
                if (html && html.length > 100) { success = true; break; }
            } catch (err) { continue; }
        }

        if (success && html) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const title = doc.querySelector('meta[property="og:title"]')?.getAttribute('content') || doc.querySelector('title')?.textContent || '';
            const image = doc.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';
            const description = doc.querySelector('meta[property="og:description"]')?.getAttribute('content') || '';
            if (title) document.getElementById('product-name').value = title.substring(0, 100);
            if (image) document.getElementById('product-image').value = image;
            if (description) document.getElementById('product-description').value = description.substring(0, 300);
        }

        autoDetectPlatform(affiliateLink);
        showNotification('✅ Data produk berhasil diambil!', 'success');
    } catch (error) {
        autoDetectPlatform(affiliateLink);
        showNotification('⚠️ Gagal fetch otomatis. Isi data manual.', 'warning');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

function autoDetectPlatform(url) {
    try {
        const hostname = new URL(url).hostname.toLowerCase();
        const platformMap = { tokopedia: 'tokopedia', shopee: 'shopee', lazada: 'lazada', amazon: 'amazon', bukalapak: 'bukalapak' };
        for (const [key, platform] of Object.entries(platformMap)) {
            if (hostname.includes(key)) {
                const checkbox = document.querySelector('input[name="platform"][value="' + platform + '"]');
                if (checkbox) checkbox.checked = true;
                break;
            }
        }
    } catch (e) {}
}

// ========================
// HANDLE PRODUCT SUBMIT → SUPABASE
// ========================
async function handleProductSubmit(e) {
    e.preventDefault();

    const affiliateLink = document.getElementById('product-affiliate-link').value.trim();
    const category = document.getElementById('product-category').value;
    const originalPriceInput = document.getElementById('product-original-price').value.trim();
    const enableDiscount = document.getElementById('enable-discount').checked;
    const discountPriceInput = document.getElementById('product-price').value.trim();

    if (!affiliateLink) { alert('Mohon isi Affiliate Link (*)'); return; }
    if (!category) { alert('Mohon pilih kategori produk (*)'); return; }
    if (!originalPriceInput) { alert('Mohon isi Harga Original (*)'); return; }
    if (enableDiscount && !discountPriceInput) { alert('Mohon isi Harga Diskon'); return; }

    const platforms = Array.from(document.querySelectorAll('input[name="platform"]:checked')).map(function(cb) { return cb.value; });
    if (platforms.length === 0) { alert('Pilih minimal satu platform affiliate'); return; }

    let name = document.getElementById('product-name').value.trim() || ('Produk ' + new Date().toLocaleDateString('id-ID'));
    let image = document.getElementById('product-image').value.trim() || 'https://via.placeholder.com/280x280?text=Produk';
    const originalPrice = parseInt(originalPriceInput);
    const price = enableDiscount && discountPriceInput ? parseInt(discountPriceInput) : originalPrice;
    const discount = enableDiscount && discountPriceInput ? (parseInt(document.getElementById('product-discount').value) || Math.round((1 - price / originalPrice) * 100)) : 0;
    const rating = parseFloat(document.getElementById('product-rating').value) || 4.5;
    const reviews = parseInt(document.getElementById('product-reviews').value) || 0;
    const description = document.getElementById('product-description').value || 'Produk pilihan berkualitas';

    const isEditing = editingProductId !== null;

    // Tampilkan loading
    const submitBtn = document.querySelector('#product-form button[type="submit"]');
    const originalBtnText = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) { submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...'; submitBtn.disabled = true; }

    try {
        if (isEditing) {
            const { error } = await window.supabase
                .from('products')
                .update({
                    name, image, category, originalPrice, price, discount,
                    rating, reviews, description, affiliateLink, platforms,
                    updatedAt: new Date().toISOString()
                })
                .eq('id', editingProductId);

            if (error) throw error;
            console.log('✅ Produk diupdate di Supabase');
        } else {
            const newId = Date.now().toString();
            const { error } = await window.supabase
                .from('products')
                .insert([{
                    id: newId, name, image, category, originalPrice, price,
                    discount, rating, reviews, description, affiliateLink,
                    platforms, clicks: 0, views: 0,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }]);

            if (error) throw error;
            console.log('✅ Produk ditambahkan ke Supabase');
        }

        // Reload dari Supabase
        await loadProductsFromSupabase();
        closeModal('product-modal');
        renderProducts();
        showNotification('✅ Produk berhasil ' + (isEditing ? 'diperbarui' : 'ditambahkan') + '!', 'success');
        editingProductId = null;

    } catch (err) {
        console.error('❌ Error save produk:', err);
        showNotification('❌ Gagal menyimpan produk: ' + err.message, 'error');
    } finally {
        if (submitBtn) { submitBtn.innerHTML = originalBtnText; submitBtn.disabled = false; }
    }
}

// ========================
// DELETE PRODUCT → SUPABASE
// ========================
function deleteProduct(productId) {
    showConfirm('Hapus Produk?', 'Apakah Anda yakin ingin menghapus produk ini?', async function() {
        try {
            const { error } = await window.supabase
                .from('products')
                .delete()
                .eq('id', productId);

            if (error) throw error;

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
    const select = document.getElementById('product-category');
    const currentValue = select.value;
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
    document.getElementById('categories-list').innerHTML = categories.map(function(category) {
        return '<div class="category-card-admin">' +
            '<div class="category-card-icon"><i class="' + category.icon + '"></i></div>' +
            '<h3>' + category.name + '</h3>' +
            '<p class="category-card-desc">' + (category.description || '') + '</p>' +
            '<div class="category-card-actions">' +
                '<button class="btn-edit" onclick="editCategory(\'' + category.id + '\')"><i class="fas fa-edit"></i></button>' +
                '<button class="btn-delete" onclick="deleteCategory(\'' + category.id + '\')"><i class="fas fa-trash"></i></button>' +
            '</div></div>';
    }).join('') || '<p class="empty-state">Belum ada kategori</p>';
}

function openCategoryModal() {
    document.getElementById('category-form').reset();
    document.querySelector('#category-modal .modal-header h2').textContent = 'Tambah Kategori Baru';
    openModal('category-modal');
}

function editCategory(categoryId) {
    const category = categories.find(function(c) { return c.id == categoryId; });
    if (category) {
        document.querySelector('#category-modal .modal-header h2').textContent = 'Edit Kategori';
        document.getElementById('category-name').value = category.name;
        document.getElementById('category-icon').value = category.icon;
        document.getElementById('category-description').value = category.description || '';
        document.getElementById('category-form').dataset.editId = categoryId;
        openModal('category-modal');
    }
}

function deleteCategory(categoryId) {
    const inUse = products.filter(function(p) { return p.category == categoryId; }).length;
    if (inUse > 0) { alert('Tidak bisa menghapus kategori yang masih memiliki ' + inUse + ' produk'); return; }
    showConfirm('Hapus Kategori?', 'Apakah Anda yakin?', function() {
        categories = categories.filter(function(c) { return c.id != categoryId; });
        saveCategoriesLocally();
        renderCategories();
    });
}

function handleCategorySubmit(e) {
    e.preventDefault();
    const name = document.getElementById('category-name').value;
    const icon = document.getElementById('category-icon').value;
    const description = document.getElementById('category-description').value;
    const editId = document.getElementById('category-form').dataset.editId;

    if (!name || !icon) { alert('Mohon isi semua field yang diperlukan'); return; }

    if (editId) {
        const index = categories.findIndex(function(c) { return c.id == editId; });
        categories[index] = { id: parseInt(editId), name, icon, description };
    } else {
        const newId = categories.length > 0 ? Math.max.apply(null, categories.map(function(c) { return c.id; })) + 1 : 1;
        categories.push({ id: newId, name, icon, description });
    }

    saveCategoriesLocally();
    closeModal('category-modal');
    renderCategories();
    document.getElementById('category-form').removeAttribute('data-edit-id');
    showNotification('Kategori berhasil disimpan!', 'success');
}

// ========================
// EXPORT / IMPORT
// ========================
async function exportData() {
    const data = { products, categories, exportDate: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'instafinds-backup-' + new Date().toISOString().split('T')[0] + '.json';
    link.click();
    URL.revokeObjectURL(url);
    showNotification('Data berhasil di-export!', 'success');
}

function importData(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(event) {
        try {
            const data = JSON.parse(event.target.result);
            if (data.products && data.categories) {
                // Import produk ke Supabase
                for (const product of data.products) {
                    await window.supabase.from('products').upsert([product]);
                }
                categories = data.categories;
                saveCategoriesLocally();
                await loadProductsFromSupabase();
                renderDashboard();
                showNotification('Data berhasil di-import!', 'success');
            } else {
                alert('Format file tidak valid');
            }
        } catch (error) {
            alert('Gagal membaca file: ' + error.message);
        }
    };
    reader.readAsText(file);
    e.target.value = '';
}

async function resetAllData() {
    showConfirm('Reset Semua Data?', 'Tindakan ini akan menghapus SEMUA produk dari database. Tidak bisa di-undo!', async function() {
        try {
            const { error } = await window.supabase
                .from('products')
                .delete()
                .neq('id', '');

            if (error) throw error;

            categories = [];
            saveCategoriesLocally();
            await loadProductsFromSupabase();
            initDefaultCategories();
            renderDashboard();
            showNotification('Semua data telah direset', 'success');
        } catch (err) {
            console.error('❌ Error reset:', err);
            showNotification('❌ Gagal reset data: ' + err.message, 'error');
        }
    });
}

// ========================
// MODALS
// ========================
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
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
    const notification = document.createElement('div');
    const bgColor = type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : type === 'warning' ? '#ff9800' : '#2196f3';
    notification.style.cssText =
        'position:fixed;top:20px;right:20px;padding:15px 20px;' +
        'background:' + bgColor + ';color:white;border-radius:8px;' +
        'box-shadow:0 4px 12px rgba(0,0,0,0.2);z-index:3000;animation:slideIn 0.3s ease;';
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(function() {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(function() { notification.remove(); }, 300);
    }, 3000);
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
function toggleMobileMenu() { document.querySelector('.sidebar').classList.toggle('active'); }

// Animations
const style = document.createElement('style');
style.textContent =
    '@keyframes slideIn { from { transform:translateX(400px);opacity:0; } to { transform:translateX(0);opacity:1; } }' +
    '@keyframes slideOut { from { transform:translateX(0);opacity:1; } to { transform:translateX(400px);opacity:0; } }';
document.head.appendChild(style);

console.log('✅ Admin Panel loaded!');
