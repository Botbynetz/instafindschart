// ========================
// CONFIG
// ========================
var ADMIN_TOKEN_KEY = 'instafinds_admin_token';
var ADMIN_CREDENTIALS_TOKEN = 'admin_token_instafinds';
var adminPath = './admin.html';

// ========================
// SESSION
// ========================
function createAdminSession() {
    sessionStorage.setItem(ADMIN_TOKEN_KEY, ADMIN_CREDENTIALS_TOKEN);
    sessionStorage.setItem('instafinds_admin_session', JSON.stringify({
        loginTime: new Date().getTime(),
        expiresIn: 24 * 60 * 60 * 1000
    }));
}

// ========================
// ADMIN MODAL
// ========================
function openAdminModal() {
    var modal = document.getElementById('admin-password-modal');
    var usernameInput = document.getElementById('admin-username');
    var passwordInput = document.getElementById('admin-password-input');
    var errorDiv = document.getElementById('password-error');
    if (modal) {
        modal.classList.add('show');
        if (usernameInput) usernameInput.value = '';
        if (passwordInput) passwordInput.value = '';
        if (errorDiv) errorDiv.style.display = 'none';
        if (usernameInput) usernameInput.focus();
    }
}

function closeAdminModal() {
    var modal = document.getElementById('admin-password-modal');
    if (modal) modal.classList.remove('show');
}

function handleAdminLogin(event) {
    event.preventDefault();
    var usernameInput = document.getElementById('admin-username');
    var passwordInput = document.getElementById('admin-password-input');
    var errorDiv = document.getElementById('password-error');
    var errorMessage = document.getElementById('error-message');
    if (!usernameInput || !passwordInput || !errorDiv) return;

    var u = usernameInput.value.trim();
    var p = passwordInput.value;

    if (u === 'admin' && p === 'botbynetzg@gmail.com') {
        createAdminSession();
        closeAdminModal();
        setTimeout(function() { window.location.href = adminPath; }, 300);
    } else {
        errorDiv.style.display = 'flex';
        if (errorMessage) errorMessage.textContent = 'Username atau password salah';
        passwordInput.value = '';
        usernameInput.focus();
    }
}

document.addEventListener('keydown', function(event) {
    if (event.ctrlKey && event.altKey && event.code === 'KeyA') {
        event.preventDefault();
        openAdminModal();
    }
});

// ========================
// LOAD PRODUCTS (SUPABASE, lowercase columns)
// ========================
var allProducts = [];

async function loadProducts() {
    var productsGrid = document.querySelector('.products-grid');
    if (!productsGrid) return;

    productsGrid.innerHTML =
        '<div style="grid-column:1/-1;text-align:center;padding:50px;color:#999;">' +
        '<i class="fas fa-spinner fa-spin" style="font-size:30px;display:block;margin-bottom:10px;"></i>' +
        'Memuat produk...</div>';

    try {
        var result = await window.supabase
            .from('products')
            .select('*')
            .order('createdat', { ascending: false });

        if (result.error) throw result.error;

        if (result.data && result.data.length > 0) {
            console.log('✅ ' + result.data.length + ' produk loaded');
            renderProducts(result.data);
        } else {
            productsGrid.innerHTML =
                '<div style="grid-column:1/-1;text-align:center;padding:50px;color:#999;">' +
                '<i class="fas fa-box-open" style="font-size:40px;display:block;margin-bottom:10px;opacity:0.4;"></i>' +
                'Belum ada produk tersedia.</div>';
        }
    } catch (err) {
        console.error('❌ Error load produk:', err);
        productsGrid.innerHTML =
            '<div style="grid-column:1/-1;text-align:center;padding:50px;color:#f44336;">' +
            '<i class="fas fa-exclamation-circle" style="font-size:40px;display:block;margin-bottom:10px;"></i>' +
            'Gagal memuat produk. Periksa koneksi internet.</div>';
    }
}

function renderProducts(products) {
    var productsGrid = document.querySelector('.products-grid');
    if (!productsGrid) return;

    allProducts = products;
    productsGrid.innerHTML = '';

    products.forEach(function(product, index) {
        var productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.style.animation = 'fadeInUp 0.6s ease backwards';
        productCard.style.animationDelay = (index * 0.05) + 's';

        var imgSrc = product.image || 'https://via.placeholder.com/280x280?text=No+Image';
        // Use affiliatelink (lowercase)
        var affLink = product.affiliatelink || '#';

        productCard.innerHTML =
            '<div class="product-image-carousel">' +
                '<div class="product-images-container">' +
                    '<div class="product-image">' +
                        '<img src="' + imgSrc + '" alt="' + product.name + '" loading="lazy">' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div class="product-info">' +
                '<h3 class="product-name">' + product.name + '</h3>' +
                '<button class="btn-buy" onclick="trackAndRedirect(\'' + affLink + '\', \'' + product.id + '\')">' +
                    '🛒 Beli Sekarang' +
                '</button>' +
            '</div>';

        productsGrid.appendChild(productCard);
    });
}

// ========================
// TRACK CLICKS
// ========================
async function trackAndRedirect(link, productId) {
    window.open(link, '_blank');
    try {
        var res = await window.supabase.from('products').select('clicks,views').eq('id', productId).single();
        if (!res.error && res.data) {
            await window.supabase.from('products').update({
                clicks: (res.data.clicks || 0) + 1,
                views: (res.data.views || 0) + 1,
                updatedat: new Date().toISOString()
            }).eq('id', productId);
        }
    } catch (err) {
        console.error('❌ Error tracking click:', err);
    }
    return false;
}

// ========================
// SEARCH
// ========================
function initSearchFilter() {
    var searchInput = document.getElementById('productSearch');
    if (searchInput) searchInput.addEventListener('input', performSearch);
}

function performSearch() {
    var searchInput = document.getElementById('productSearch');
    if (!searchInput) return;
    var searchTerm = searchInput.value.toLowerCase();
    var productsGrid = document.querySelector('.products-grid');
    if (!productsGrid) return;
    var productCards = productsGrid.querySelectorAll('.product-card');
    var visibleCount = 0;

    productCards.forEach(function(card) {
        var name = ((card.querySelector('.product-name') || {}).textContent || '').toLowerCase();
        var isVisible = !searchTerm || name.includes(searchTerm);
        card.style.display = isVisible ? '' : 'none';
        if (isVisible) visibleCount++;
    });

    var noMsg = productsGrid.querySelector('.no-results-message');
    if (visibleCount === 0 && searchTerm) {
        if (!noMsg) {
            noMsg = document.createElement('div');
            noMsg.className = 'no-results-message';
            noMsg.style.cssText = 'grid-column:1/-1;text-align:center;padding:50px;color:#999;font-size:16px;';
            productsGrid.appendChild(noMsg);
        }
        noMsg.textContent = 'Produk tidak ditemukan. Coba kata kunci lain.';
    } else if (noMsg) {
        noMsg.remove();
    }
}

// ========================
// NOTIFICATION
// ========================
function showNotification(message) {
    var n = document.createElement('div');
    n.style.cssText = 'position:fixed;bottom:30px;right:30px;background:linear-gradient(135deg,#667eea,#764ba2,#f093fb);color:white;padding:16px 24px;border-radius:10px;box-shadow:0 8px 25px rgba(0,0,0,0.2);z-index:9998;font-weight:600;animation:slideIn 0.3s ease;max-width:300px;';
    n.textContent = message;
    document.body.appendChild(n);
    setTimeout(function() {
        n.style.animation = 'slideOut 0.3s ease';
        setTimeout(function() { n.remove(); }, 300);
    }, 3000);
}

// ========================
// SCROLL TO TOP
// ========================
function initScrollTopButton() {
    var btn = document.createElement('button');
    btn.innerHTML = '↑';
    btn.style.cssText = 'position:fixed;bottom:30px;right:30px;width:50px;height:50px;border-radius:50%;background:linear-gradient(135deg,#667eea,#764ba2,#f093fb);color:white;border:none;cursor:pointer;font-size:24px;font-weight:bold;opacity:0;pointer-events:none;transition:all 0.3s ease;z-index:999;box-shadow:0 4px 15px rgba(102,126,234,0.4);';
    document.body.appendChild(btn);
    window.addEventListener('scroll', function() {
        btn.style.opacity = window.scrollY > 300 ? '1' : '0';
        btn.style.pointerEvents = window.scrollY > 300 ? 'auto' : 'none';
    });
    btn.addEventListener('click', function() { window.scrollTo({ top: 0, behavior: 'smooth' }); });
}

// ========================
// DOM READY
// ========================
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Instafinds.id loaded');

    var modal = document.getElementById('admin-password-modal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) closeAdminModal();
        });
    }

    var btnManage = document.getElementById('btn-manage-products');
    if (btnManage) {
        btnManage.addEventListener('click', function(e) {
            e.preventDefault();
            openAdminModal();
        });
    }

    loadProducts();
    initSearchFilter();

    var newsletterForm = document.querySelector('.newsletter-form-simple');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', function(e) {
            e.preventDefault();
            var emailInput = this.querySelector('input[type="email"]');
            if (emailInput && emailInput.value) {
                showNotification('Terima kasih! Update akan dikirim ke ' + emailInput.value);
                this.reset();
            }
        });
    }

    initScrollTopButton();
});

console.log('✅ script.js loaded!');
