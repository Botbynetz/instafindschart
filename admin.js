// ========================
// ADMIN PANEL JAVASCRIPT
// ========================

const STORAGE_KEY = 'instafinds_products';
const CATEGORIES_KEY = 'instafinds_categories';
const ADMIN_TOKEN_KEY = 'instafinds_admin_token';

// Admin token for validation
const ADMIN_CREDENTIALS = {
    token: 'admin_token_' + new Date().getTime()
};

// ========================
// AUTHENTICATION CHECK
// ========================
function verifyAdminAccess() {
    const sessionToken = sessionStorage.getItem(ADMIN_TOKEN_KEY);
    if (!sessionToken) {
        // Not authenticated - redirect to public page
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

// Check authentication on page load
window.addEventListener('load', () => {
    if (!verifyAdminAccess()) {
        return;
    }
});

// ========================
// DETECT ENVIRONMENT & PATH
// ========================
const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const publicPath = 'index.html';

// ========================
// LOGOUT FUNCTIONALITY
// ========================
function logoutAdmin() {
    if (confirm('Apakah Anda yakin ingin logout?')) {
        sessionStorage.removeItem(ADMIN_TOKEN_KEY);
        sessionStorage.removeItem('instafinds_admin_session');
        window.location.href = publicPath;
    }
}

// ========================
// GO BACK TO PUBLIC
// ========================
function goBackToPublic(event) {
    event.preventDefault();
    window.location.href = publicPath;
    return false;
}

let products = [];
let categories = [];
let editingProductId = null;

// ========================
// INITIALIZATION
// ========================
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupEventListeners();
    renderDashboard();
    initDefaultCategories();
});

// ========================
// DATA MANAGEMENT
// ========================
function loadData() {
    const storedProducts = localStorage.getItem(STORAGE_KEY);
    const storedCategories = localStorage.getItem(CATEGORIES_KEY);
    
    products = storedProducts ? JSON.parse(storedProducts) : [];
    categories = storedCategories ? JSON.parse(storedCategories) : [];
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
    // Update frontend
    if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
        window.location.reload();
    }
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
        saveData();
        renderCategories();
    }
}

// ========================
// EVENT LISTENERS
// ========================
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            navigateToPage(page);
        });
    });

    // Product Management
    document.getElementById('btn-add-product').addEventListener('click', openProductModal);
    document.getElementById('product-form').addEventListener('submit', handleProductSubmit);
    document.getElementById('search-products').addEventListener('input', handleProductSearch);
    document.getElementById('btn-fetch-from-link').addEventListener('click', fetchFromAffiliateLink);

    // Category Management
    document.getElementById('btn-add-category').addEventListener('click', openCategoryModal);
    document.getElementById('category-form').addEventListener('submit', handleCategorySubmit);

    // Data Management
    document.getElementById('btn-export-data').addEventListener('click', exportData);
    document.getElementById('btn-import-data').addEventListener('click', () => {
        document.getElementById('import-file').click();
    });
    document.getElementById('import-file').addEventListener('change', importData);
    document.getElementById('btn-reset-data').addEventListener('click', resetAllData);

    // Modal Controls
    document.querySelectorAll('.btn-close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modalId = e.currentTarget.dataset.close;
            closeModal(modalId);
        });
    });

    // Logout
    document.querySelector('.btn-logout').addEventListener('click', logout);

    // Mobile menu toggle
    document.querySelector('.menu-toggle').addEventListener('click', toggleMobileMenu);
}

// ========================
// PAGE NAVIGATION
// ========================
function navigateToPage(pageName) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    // Show selected page
    const pageElement = document.getElementById(`${pageName}-page`);
    if (pageElement) {
        pageElement.classList.add('active');
    }

    // Update nav links
    document.querySelectorAll('.nav-item').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.page === pageName) {
            link.classList.add('active');
        }
    });

    // Update page title
    document.querySelector('.page-title').textContent = 
        pageName.charAt(0).toUpperCase() + pageName.slice(1);

    // Render page content
    if (pageName === 'dashboard') {
        renderDashboard();
    } else if (pageName === 'products') {
        renderProducts();
    } else if (pageName === 'categories') {
        renderCategories();
    }
}

// ========================
// DASHBOARD
// ========================
function renderDashboard() {
    const totalProducts = products.length;
    const totalClicks = products.reduce((sum, p) => sum + (p.clicks || 0), 0);
    const totalViews = products.reduce((sum, p) => sum + (p.views || 0), 0);
    const platformsSet = new Set();
    products.forEach(p => {
        if (p.platforms) {
            p.platforms.forEach(platform => platformsSet.add(platform));
        }
    });

    document.getElementById('total-products').textContent = totalProducts;
    document.getElementById('total-clicks').textContent = totalClicks;
    document.getElementById('views-count').textContent = totalViews;
    document.getElementById('active-platforms').textContent = platformsSet.size;

    // Recent products
    const recentProducts = products.slice(-5).reverse();
    const recentHTML = recentProducts.length > 0 ? 
        recentProducts.map(p => `
            <div class="product-item">
                <img src="${p.image}" alt="${p.name}" class="product-thumbnail">
                <div class="product-details">
                    <h4>${p.name}</h4>
                    <p>Rp ${p.price.toLocaleString('id-ID')}</p>
                </div>
            </div>
        `).join('') :
        '<p class="empty-state">Belum ada produk</p>';

    document.getElementById('recent-products').innerHTML = recentHTML;

    // Top products by clicks
    const topProducts = [...products]
        .sort((a, b) => (b.clicks || 0) - (a.clicks || 0))
        .slice(0, 5);

    const topHTML = topProducts.length > 0 ?
        topProducts.map(p => `
            <div class="product-item">
                <img src="${p.image}" alt="${p.name}" class="product-thumbnail">
                <div class="product-details">
                    <h4>${p.name}</h4>
                    <p>${p.clicks || 0} klik</p>
                </div>
            </div>
        `).join('') :
        '<p class="empty-state">Belum ada data klik</p>';

    document.getElementById('top-products').innerHTML = topHTML;
}

// ========================
// PRODUCTS MANAGEMENT
// ========================
function renderProducts(searchQuery = '') {
    let filteredProducts = products;

    if (searchQuery) {
        filteredProducts = products.filter(p =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }

    const html = filteredProducts.length > 0 ?
        filteredProducts.map(product => `
            <div class="product-card-admin">
                <div class="product-card-image">
                    <img src="${product.image}" alt="${product.name}">
                </div>
                <div class="product-card-info">
                    <h3>${product.name}</h3>
                    <div class="product-card-price">
                        <span>Rp ${product.price.toLocaleString('id-ID')}</span>
                        <span style="color: #999; text-decoration: line-through;">Rp ${product.originalPrice.toLocaleString('id-ID')}</span>
                    </div>
                    <div class="product-card-meta">
                        <span>⭐ ${product.rating || 0} (${product.reviews || 0})</span>
                        <span>📊 ${product.views || 0} views</span>
                        <span>🔗 ${product.clicks || 0} clicks</span>
                    </div>
                </div>
                <div class="product-card-actions">
                    <button class="btn-edit" onclick="editProduct('${product.id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn-delete" onclick="deleteProduct('${product.id}')">
                        <i class="fas fa-trash"></i> Hapus
                    </button>
                </div>
            </div>
        `).join('') :
        '<div class="empty-state">Belum ada produk. Klik "Tambah Produk" untuk mulai.</div>';

    document.getElementById('products-list').innerHTML = html;
}

function handleProductSearch(e) {
    renderProducts(e.target.value);
}

function openProductModal() {
    editingProductId = null;
    document.getElementById('modal-title').textContent = 'Tambah Produk Baru';
    document.getElementById('product-form').reset();
    document.querySelectorAll('input[name="platform"]').forEach(cb => cb.checked = false);
    updateCategoryOptions();
    openModal('product-modal');
}

function editProduct(productId) {
    editingProductId = productId;
    const product = products.find(p => p.id === productId);

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

        document.querySelectorAll('input[name="platform"]').forEach(cb => {
            cb.checked = (product.platforms || []).includes(cb.value);
        });

        updateCategoryOptions();
        openModal('product-modal');
    }
}

// ========================
// FETCH PRODUCT FROM AFFILIATE LINK
// ========================
async function fetchFromAffiliateLink(e) {
    e.preventDefault();
    
    const affiliateLink = document.getElementById('product-affiliate-link').value.trim();
    
    if (!affiliateLink) {
        alert('Masukkan affiliate link terlebih dahulu');
        return;
    }

    const btn = document.getElementById('btn-fetch-from-link');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengambil data...';
    btn.disabled = true;

    try {
        let success = false;
        let html = '';
        let title = '';
        let image = '';
        let description = '';

        // Try multiple proxy methods
        const proxies = [
            { url: 'https://api.allorigins.win/get?url=', name: 'AllOrigins' },
            { url: 'https://cors-proxy.htmldriven.com/?url=', name: 'CORS Proxy' },
        ];

        for (const proxy of proxies) {
            try {
                console.log(`Trying ${proxy.name}...`);
                const encodedUrl = encodeURIComponent(affiliateLink);
                const response = await fetch(proxy.url + encodedUrl);
                
                if (!response.ok) continue;
                
                const data = await response.json();
                html = data.contents || data;
                
                if (html && html.length > 100) {
                    console.log(`✓ Successfully fetched with ${proxy.name}`);
                    success = true;
                    break;
                }
            } catch (err) {
                console.log(`✗ ${proxy.name} failed:`, err.message);
                continue;
            }
        }

        // If proxies fail, use metadata extraction from URL
        if (!success) {
            console.log('Proxies failed, using URL-based extraction...');
            await extractFromURL(affiliateLink);
            showNotification('⚠️ Menggunakan default. Sesuaikan data produk jika diperlukan.', 'warning');
            return;
        }

        // Parse HTML if fetch successful
        if (html) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // Extract Open Graph meta tags (most reliable)
            title = doc.querySelector('meta[property="og:title"]')?.getAttribute('content');
            image = doc.querySelector('meta[property="og:image"]')?.getAttribute('content');
            description = doc.querySelector('meta[property="og:description"]')?.getAttribute('content');

            // Fallback to regular meta tags
            if (!title) title = doc.querySelector('title')?.textContent || '';
            if (!description) description = doc.querySelector('meta[name="description"]')?.getAttribute('content') || '';

            // Try to extract from h1 if title not found
            if (!title) {
                const h1 = doc.querySelector('h1');
                title = h1?.textContent?.trim() || '';
            }
        }

        // Set form fields
        if (title) {
            document.getElementById('product-name').value = title.substring(0, 100);
        }

        if (image) {
            document.getElementById('product-image').value = image;
        }

        if (description) {
            document.getElementById('product-description').value = description.substring(0, 300);
        }

        // Auto-detect platform from URL
        const url = new URL(affiliateLink);
        const hostname = url.hostname.toLowerCase();
        
        const platformMap = {
            'tokopedia': 'tokopedia',
            'shopee': 'shopee',
            'lazada': 'lazada',
            'amazon': 'amazon',
            'bukalapak': 'bukalapak'
        };

        for (const [key, platform] of Object.entries(platformMap)) {
            if (hostname.includes(key)) {
                const checkbox = document.querySelector(`input[name="platform"][value="${platform}"]`);
                if (checkbox) checkbox.checked = true;
                break;
            }
        }

        showNotification('✅ Data produk berhasil diambil dari link! Sesuaikan jika diperlukan.', 'success');

    } catch (error) {
        console.error('Fetch error:', error);
        
        // Ultimate fallback: extract from URL
        try {
            await extractFromURL(affiliateLink);
            showNotification('⚠️ Menggunakan default dari URL. Silakan isi data lainnya.', 'warning');
        } catch (err) {
            showNotification('❌ Gagal mengambil data. Isi data produk secara manual.', 'error');
        }
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// Fallback: Extract product info from URL
async function extractFromURL(affiliateLink) {
    try {
        const url = new URL(affiliateLink);
        const hostname = url.hostname.toLowerCase();
        
        // Try to extract product name from URL slug
        const pathParts = url.pathname.split('/').filter(p => p);
        let productName = pathParts[pathParts.length - 1]?.replace(/[-_]/g, ' ') || 'Produk';
        
        // Decode URL-encoded characters
        productName = decodeURIComponent(productName);
        productName = productName.replace(/[0-9]+$/, '').trim(); // Remove trailing numbers
        
        if (productName && productName.length > 3) {
            document.getElementById('product-name').value = productName.substring(0, 100);
        }

        // Use placeholder image
        document.getElementById('product-image').value = 'https://via.placeholder.com/280x280?text=' + encodeURIComponent(productName);

        // Set description based on platform
        let platformDesc = hostname.includes('shopee') ? 'Produk dari Shopee' :
                          hostname.includes('tokopedia') ? 'Produk dari Tokopedia' :
                          hostname.includes('lazada') ? 'Produk dari Lazada' :
                          hostname.includes('amazon') ? 'Produk dari Amazon' :
                          hostname.includes('bukalapak') ? 'Produk dari Bukalapak' :
                          'Produk dari marketplace';
        
        document.getElementById('product-description').value = platformDesc;

        // Auto-detect and set platform
        const platformMap = {
            'tokopedia': 'tokopedia',
            'shopee': 'shopee',
            'lazada': 'lazada',
            'amazon': 'amazon',
            'bukalapak': 'bukalapak'
        };

        for (const [key, platform] of Object.entries(platformMap)) {
            if (hostname.includes(key)) {
                const checkbox = document.querySelector(`input[name="platform"][value="${platform}"]`);
                if (checkbox) checkbox.checked = true;
                break;
            }
        }

    } catch (error) {
        console.error('URL extraction failed:', error);
        throw error;
    }
}

function deleteProduct(productId) {
    showConfirm('Hapus Produk?', 'Apakah Anda yakin ingin menghapus produk ini?', () => {
        products = products.filter(p => p.id !== productId);
        saveData();
        renderProducts();
        showNotification('✅ Produk berhasil dihapus dari etalase.', 'success');
    });
}

function handleProductSubmit(e) {
    e.preventDefault();

    // Required fields only
    const category = document.getElementById('product-category').value;
    const affiliateLink = document.getElementById('product-affiliate-link').value;

    // Optional fields with defaults
    let name = document.getElementById('product-name').value.trim();
    let image = document.getElementById('product-image').value.trim();
    const originalPriceInput = document.getElementById('product-original-price').value.trim();
    const priceInput = document.getElementById('product-price').value.trim();
    
    // Validate required fields
    if (!affiliateLink) {
        alert('Mohon isi Affiliate Link (*) - ini wajib untuk merekam produk');
        return;
    }

    if (!category) {
        alert('Mohon pilih kategori produk (*)');
        return;
    }

    // Set defaults if fields are empty
    if (!name) name = `Produk ${new Date().toLocaleDateString('id-ID')}`;
    if (!image) image = 'https://via.placeholder.com/280x280?text=Produk';

    const originalPrice = originalPriceInput ? parseInt(originalPriceInput) : 100000;
    const price = priceInput ? parseInt(priceInput) : 50000;
    
    const discount = parseInt(document.getElementById('product-discount').value) || Math.round((1 - price / originalPrice) * 100);
    const rating = parseFloat(document.getElementById('product-rating').value) || 4.5;
    const reviews = parseInt(document.getElementById('product-reviews').value) || 0;
    const description = document.getElementById('product-description').value || `Produk eksklusif dari ${affiliateLink.split('/')[2]}`;

    const platforms = Array.from(document.querySelectorAll('input[name="platform"]:checked'))
        .map(cb => cb.value);

    if (platforms.length === 0) {
        alert('Pilih minimal satu platform affiliate');
        return;
    }

    const productData = {
        id: editingProductId || Date.now().toString(),
        name,
        image,
        category,
        originalPrice,
        price,
        discount,
        rating,
        reviews,
        description,
        affiliateLink,
        platforms,
        clicks: editingProductId ? (products.find(p => p.id === editingProductId)?.clicks || 0) : 0,
        views: editingProductId ? (products.find(p => p.id === editingProductId)?.views || 0) : 0,
        createdAt: editingProductId ? (products.find(p => p.id === editingProductId)?.createdAt) : new Date().toISOString()
    };

    const isEditing = editingProductId !== null;
    
    if (editingProductId) {
        const index = products.findIndex(p => p.id === editingProductId);
        products[index] = productData;
    } else {
        products.push(productData);
    }

    saveData();
    closeModal('product-modal');
    renderProducts();
    const actionType = isEditing ? 'diperbarui' : 'ditambahkan';
    showNotification(`✅ Produk berhasil ${actionType}! Segera tampil di etalase.`, 'success');
    editingProductId = null;
}

function updateCategoryOptions() {
    const select = document.getElementById('product-category');
    const currentValue = select.value;

    select.innerHTML = '<option value="">Pilih kategori</option>' +
        categories.map(cat => `
            <option value="${cat.id}">${cat.name}</option>
        `).join('');

    select.value = currentValue;
}

// ========================
// CATEGORIES MANAGEMENT
// ========================
function renderCategories() {
    const html = categories.map(category => `
        <div class="category-card-admin">
            <div class="category-card-icon">
                <i class="${category.icon}"></i>
            </div>
            <h3>${category.name}</h3>
            <p class="category-card-desc">${category.description || ''}</p>
            <div class="category-card-actions">
                <button class="btn-edit" onclick="editCategory('${category.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-delete" onclick="deleteCategory('${category.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');

    document.getElementById('categories-list').innerHTML = html || '<p class="empty-state">Belum ada kategori</p>';
}

function openCategoryModal() {
    document.getElementById('category-form').reset();
    document.querySelector('#category-modal .modal-header h2').textContent = 'Tambah Kategori Baru';
    openModal('category-modal');
}

function editCategory(categoryId) {
    const category = categories.find(c => c.id === categoryId);
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
    const productsInCategory = products.filter(p => p.category == categoryId).length;
    if (productsInCategory > 0) {
        alert(`Tidak bisa menghapus kategori yang masih memiliki ${productsInCategory} produk`);
        return;
    }

    showConfirm('Hapus Kategori?', 'Apakah Anda yakin?', () => {
        categories = categories.filter(c => c.id !== categoryId);
        saveData();
        renderCategories();
    });
}

function handleCategorySubmit(e) {
    e.preventDefault();

    const name = document.getElementById('category-name').value;
    const icon = document.getElementById('category-icon').value;
    const description = document.getElementById('category-description').value;
    const editId = document.getElementById('category-form').dataset.editId;

    if (!name || !icon) {
        alert('Mohon isi semua field yang diperlukan');
        return;
    }

    if (editId) {
        const index = categories.findIndex(c => c.id == editId);
        categories[index] = { id: parseInt(editId), name, icon, description };
    } else {
        const newId = categories.length > 0 ? Math.max(...categories.map(c => c.id)) + 1 : 1;
        categories.push({ id: newId, name, icon, description });
    }

    saveData();
    closeModal('category-modal');
    renderCategories();
    document.getElementById('category-form').removeAttribute('data-edit-id');
    showNotification('Kategori berhasil disimpan!', 'success');
}

// ========================
// DATA EXPORT/IMPORT
// ========================
function exportData() {
    const data = {
        products,
        categories,
        exportDate: new Date().toISOString()
    };

    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `instafinds-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);

    showNotification('Data berhasil di-export!', 'success');
}

function importData(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target.result);
            if (data.products && data.categories) {
                products = data.products;
                categories = data.categories;
                saveData();
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

function resetAllData() {
    showConfirm(
        'Reset Semua Data?',
        'Tindakan ini akan menghapus SEMUA produk dan kategori. Ini tidak bisa di-undo!',
        () => {
            products = [];
            categories = [];
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(CATEGORIES_KEY);
            initDefaultCategories();
            renderDashboard();
            showNotification('Semua data telah direset', 'success');
        }
    );
}

// ========================
// MODALS
// ========================
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
    }
});

// ========================
// NOTIFICATIONS
// ========================
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    const bgColor = type === 'success' ? '#4CAF50' : 
                    type === 'error' ? '#f44336' : 
                    type === 'warning' ? '#ff9800' : 
                    '#2196f3';
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${bgColor};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 3000;
        animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function showConfirm(title, message, onConfirm) {
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').textContent = message;
    openModal('confirm-modal');

    const confirmBtn = document.getElementById('confirm-btn');
    confirmBtn.onclick = () => {
        onConfirm();
        closeModal('confirm-modal');
    };
}

// ========================
// UTILITIES
// ========================
function logout() {
    logoutAdmin();
}

function toggleMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('active');
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

console.log('Admin Panel Loaded! 🎛️');
