// ========================
// CONFIG
// ========================
const ADMIN_TOKEN_KEY = 'instafinds_admin_token';
const ADMIN_SESSION_KEY = 'instafinds_admin_session';

const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: 'botbynetzg@gmail.com',
    token: 'admin_token_instafinds'
};

const adminPath = './admin.html';

// ========================
// SESSION MANAGEMENT
// ========================
function createAdminSession() {
    sessionStorage.setItem(ADMIN_TOKEN_KEY, ADMIN_CREDENTIALS.token);
    sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({
        loginTime: new Date().getTime(),
        expiresIn: 24 * 60 * 60 * 1000
    }));
}

function destroyAdminSession() {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
}

// ========================
// ADMIN LOGIN MODAL
// ========================
function openAdminModal() {
    const modal = document.getElementById('admin-password-modal');
    const usernameInput = document.getElementById('admin-username');
    const passwordInput = document.getElementById('admin-password-input');
    const errorDiv = document.getElementById('password-error');

    if (modal) {
        modal.classList.add('show');
        if (usernameInput) usernameInput.value = '';
        if (passwordInput) passwordInput.value = '';
        if (errorDiv) errorDiv.style.display = 'none';
        if (usernameInput) usernameInput.focus();
    }
}

function closeAdminModal() {
    const modal = document.getElementById('admin-password-modal');
    if (modal) modal.classList.remove('show');
}

function handleAdminLogin(event) {
    event.preventDefault();

    const usernameInput = document.getElementById('admin-username');
    const passwordInput = document.getElementById('admin-password-input');
    const errorDiv = document.getElementById('password-error');
    const errorMessage = document.getElementById('error-message');

    if (!usernameInput || !passwordInput || !errorDiv) return;

    const enteredUsername = usernameInput.value.trim();
    const enteredPassword = passwordInput.value;

    if (enteredUsername === ADMIN_CREDENTIALS.username && enteredPassword === ADMIN_CREDENTIALS.password) {
        createAdminSession();
        closeAdminModal();
        setTimeout(() => { window.location.href = adminPath; }, 300);
    } else {
        errorDiv.style.display = 'flex';
        if (errorMessage) errorMessage.textContent = 'Username atau password salah';
        passwordInput.value = '';
        usernameInput.focus();
    }
}

// Keyboard shortcut Ctrl+Alt+A
document.addEventListener('keydown', function(event) {
    if (event.ctrlKey && event.altKey && event.code === 'KeyA') {
        event.preventDefault();
        openAdminModal();
    }
});

// ========================
// LOAD PRODUCTS (SUPABASE ONLY)
// ========================
let allProducts = [];

async function loadProducts() {
    const productsGrid = document.querySelector('.products-grid');
    if (!productsGrid) return;

    productsGrid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:50px;color:#999;">
            <i class="fas fa-spinner fa-spin" style="font-size:30px;display:block;margin-bottom:10px;"></i>
            Memuat produk...
        </div>`;

    try {
        const { data, error } = await window.supabase
            .from('products')
            .select('*')
            .order('createdAt', { ascending: false });

        if (error) throw error;

        if (data && data.length > 0) {
            console.log('✅ ' + data.length + ' produk loaded dari Supabase');
            renderProducts(data);
        } else {
            productsGrid.innerHTML = `
                <div style="grid-column:1/-1;text-align:center;padding:50px;color:#999;">
                    <i class="fas fa-box-open" style="font-size:40px;display:block;margin-bottom:10px;opacity:0.4;"></i>
                    Belum ada produk tersedia.
                </div>`;
        }
    } catch (err) {
        console.error('❌ Error load produk:', err);
        productsGrid.innerHTML = `
            <div style="grid-column:1/-1;text-align:center;padding:50px;color:#f44336;">
                <i class="fas fa-exclamation-circle" style="font-size:40px;display:block;margin-bottom:10px;"></i>
                Gagal memuat produk. Periksa koneksi internet.
            </div>`;
    }
}

function renderProducts(products) {
    const productsGrid = document.querySelector('.products-grid');
    if (!productsGrid) return;

    allProducts = products;
    productsGrid.innerHTML = '';

    products.forEach((product, index) => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.style.animation = 'fadeInUp 0.6s ease backwards';
        productCard.style.animationDelay = (index * 0.05) + 's';

        const imgSrc = product.image || 'https://via.placeholder.com/280x280?text=No+Image';

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
                '<button class="btn-buy" onclick="trackAndRedirect(\'' + product.affiliateLink + '\', \'' + product.id + '\')">' +
                    '🛒 Beli Sekarang' +
                '</button>' +
            '</div>';

        productsGrid.appendChild(productCard);
    });
}

// ========================
// TRACK CLICKS (SUPABASE ONLY)
// ========================
async function trackAndRedirect(link, productId) {
    window.open(link, '_blank');

    try {
        const { data, error } = await window.supabase
            .from('products')
            .select('clicks, views')
            .eq('id', productId)
            .single();

        if (!error && data) {
            await window.supabase
                .from('products')
                .update({
                    clicks: (data.clicks || 0) + 1,
                    views: (data.views || 0) + 1,
                    updatedAt: new Date().toISOString()
                })
                .eq('id', productId);
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
    const searchInput = document.getElementById('productSearch');
    if (searchInput) {
        searchInput.addEventListener('input', performSearch);
    }
}

function performSearch() {
    const searchInput = document.getElementById('productSearch');
    if (!searchInput) return;

    const searchTerm = searchInput.value.toLowerCase();
    const productsGrid = document.querySelector('.products-grid');
    if (!productsGrid) return;

    const productCards = productsGrid.querySelectorAll('.product-card');
    let visibleCount = 0;

    productCards.forEach(function(card) {
        const productName = (card.querySelector('.product-name') || {}).textContent || '';
        const isVisible = searchTerm === '' || productName.toLowerCase().includes(searchTerm);
        card.style.display = isVisible ? '' : 'none';
        if (isVisible) visibleCount++;
    });

    let noResultsMsg = productsGrid.querySelector('.no-results-message');
    if (visibleCount === 0 && searchTerm !== '') {
        if (!noResultsMsg) {
            noResultsMsg = document.createElement('div');
            noResultsMsg.className = 'no-results-message';
            noResultsMsg.style.cssText = 'grid-column:1/-1;text-align:center;padding:50px;color:#999;font-size:16px;';
            productsGrid.appendChild(noResultsMsg);
        }
        noResultsMsg.textContent = 'Produk tidak ditemukan. Coba kata kunci lain.';
    } else if (noResultsMsg) {
        noResultsMsg.remove();
    }
}

// ========================
// NOTIFICATION
// ========================
function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText =
        'position:fixed;bottom:30px;right:30px;' +
        'background:linear-gradient(135deg,#667eea 0%,#764ba2 50%,#f093fb 100%);' +
        'color:white;padding:16px 24px;border-radius:10px;' +
        'box-shadow:0 8px 25px rgba(0,0,0,0.2);z-index:9998;' +
        'font-weight:600;animation:slideIn 0.3s ease;max-width:300px;';
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(function() {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(function() { notification.remove(); }, 300);
    }, 3000);
}

// ========================
// SCROLL TO TOP
// ========================
function initScrollTopButton() {
    const scrollTopBtn = document.createElement('button');
    scrollTopBtn.innerHTML = '↑';
    scrollTopBtn.style.cssText =
        'position:fixed;bottom:30px;right:30px;width:50px;height:50px;border-radius:50%;' +
        'background:linear-gradient(135deg,#667eea 0%,#764ba2 50%,#f093fb 100%);' +
        'color:white;border:none;cursor:pointer;font-size:24px;font-weight:bold;' +
        'opacity:0;pointer-events:none;transition:all 0.3s ease;z-index:999;' +
        'box-shadow:0 4px 15px rgba(102,126,234,0.4);';
    document.body.appendChild(scrollTopBtn);

    window.addEventListener('scroll', function() {
        if (window.scrollY > 300) {
            scrollTopBtn.style.opacity = '1';
            scrollTopBtn.style.pointerEvents = 'auto';
        } else {
            scrollTopBtn.style.opacity = '0';
            scrollTopBtn.style.pointerEvents = 'none';
        }
    });

    scrollTopBtn.addEventListener('click', function() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// ========================
// DOM READY
// ========================
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Instafinds.id DOMContentLoaded');

    const modal = document.getElementById('admin-password-modal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) closeAdminModal();
        });
    }

    const btnManageProducts = document.getElementById('btn-manage-products');
    if (btnManageProducts) {
        btnManageProducts.addEventListener('click', function(e) {
            e.preventDefault();
            openAdminModal();
        });
    }

    loadProducts();
    initSearchFilter();

    const newsletterForm = document.querySelector('.newsletter-form-simple');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const emailInput = this.querySelector('input[type="email"]');
            if (emailInput && emailInput.value) {
                showNotification('Terima kasih! Update produk akan dikirim ke ' + emailInput.value);
                this.reset();
            }
        });
    }

    initScrollTopButton();
});

console.log('✅ script.js loaded!');
