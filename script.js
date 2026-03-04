// ========================
// STORAGE KEYS & CONFIG
// ========================
const STORAGE_KEY = 'instafinds_products';
const ADMIN_TOKEN_KEY = 'instafinds_admin_token';
const ADMIN_SESSION_KEY = 'instafinds_admin_session';

// Admin credentials (stored safely)
const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: 'botbynetzg@gmail.com',
    token: 'admin_token_' + Date.now()
};

// ========================
// DETECT ENVIRONMENT & PATH
// ========================
const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Detect if on GitHub Pages and adjust paths accordingly
const isGitHubPages = window.location.hostname.includes('github.io');
const adminPath = isGitHubPages ? './admin.html' : 'admin.html';

// ========================
// SESSION MANAGEMENT
// ========================
function checkAdminSession() {
    const sessionToken = sessionStorage.getItem(ADMIN_TOKEN_KEY);
    return sessionToken && sessionToken === ADMIN_CREDENTIALS.token;
}

function createAdminSession() {
    sessionStorage.setItem(ADMIN_TOKEN_KEY, ADMIN_CREDENTIALS.token);
    sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({
        loginTime: new Date().getTime(),
        expiresIn: 24 * 60 * 60 * 1000 // 24 hours
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
    modal.classList.remove('show');
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
    
    // Validate credentials
    if (enteredUsername === ADMIN_CREDENTIALS.username && enteredPassword === ADMIN_CREDENTIALS.password) {
        // Correct credentials - create session
        createAdminSession();
        closeAdminModal();
        // Redirect to admin panel
        setTimeout(() => {
            window.location.href = adminPath;
        }, 300);
    } else {
        // Wrong credentials
        errorDiv.style.display = 'flex';
        if (errorMessage) {
            errorMessage.textContent = 'Username atau password salah';
        }
        passwordInput.value = '';
        usernameInput.focus();
    }
}

// Keyboard shortcut: Ctrl+Alt+A for admin access
document.addEventListener('keydown', function(event) {
    if (event.ctrlKey && event.altKey && event.code === 'KeyA') {
        event.preventDefault();
        openAdminModal();
    }
});

// ========================
// PRODUCT LOADING & RENDERING
// ========================
let allProducts = [];

async function loadProductsFromStorage() {
    // Cek apakah Supabase tersedia
    if (typeof supabase !== 'undefined' && typeof ambilProdukSupabase !== 'undefined') {
        console.log('Loading products from Supabase...');
        try {
            const result = await ambilProdukSupabase();
            if (result.success && result.data && result.data.length > 0) {
                console.log('✅ Products loaded from Supabase:', result.data);
                // Simpan ke localStorage juga sebagai backup
                localStorage.setItem(STORAGE_KEY, JSON.stringify(result.data));
                renderProductsFromAdmin(result.data);
                return;
            } else {
                console.log('No products in Supabase, trying localStorage...');
            }
        } catch (error) {
            console.error('❌ Error loading from Supabase:', error);
            // Fallback ke localStorage jika Supabase error
        }
    }

    // Fallback: Ambil dari localStorage jika Supabase tidak tersedia
    const storedProducts = localStorage.getItem(STORAGE_KEY);
    if (storedProducts) {
        try {
            const products = JSON.parse(storedProducts);
            if (products && products.length > 0) {
                console.log('Loading products from localStorage...');
                renderProductsFromAdmin(products);
            }
        } catch (error) {
            console.error('Error loading products:', error);
        }
    }
}

function renderProductsFromAdmin(products) {
    const productsGrid = document.querySelector('.products-grid');
    if (!productsGrid) return;

    // Store products for filtering
    allProducts = products;

    // Clear existing products
    productsGrid.innerHTML = '';

    // Render products from admin with carousel
    products.forEach((product, index) => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.style.animation = `fadeInUp 0.6s ease backwards`;
        productCard.style.animationDelay = `${index * 0.05}s`;

        const originalPrice = product.originalPrice || product.price;
        const discountPercent = product.discount || Math.round((1 - product.price / originalPrice) * 100);
        
        // Create array of images (for now just the main image, but extensible for multiple)
        const images = [product.image];
        
        // Generate carousel indicators
        const indicatorsHTML = images.map((_, i) => `
            <button class="carousel-indicator ${i === 0 ? 'active' : ''}" data-slide="${i}"></button>
        `).join('');
        
        // Generate carousel images
        const imagesHTML = images.map(img => `
            <div class="product-image">
                <img src="${img}" alt="${product.name}" loading="lazy">
            </div>
        `).join('');

        productCard.innerHTML = `
            <div class="product-image-carousel">
                <div class="product-images-container">
                    ${imagesHTML}
                </div>
                ${images.length > 1 ? `
                    <button class="carousel-nav carousel-prev" aria-label="Previous image">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <button class="carousel-nav carousel-next" aria-label="Next image">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                    <div class="carousel-indicators">
                        ${indicatorsHTML}
                    </div>
                ` : ''}
            </div>
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <button class="btn-buy" onclick="trackAndRedirect('${product.affiliateLink}', '${product.id}')">
                    🛒 Beli Sekarang
                </button>
            </div>
        `;

        productsGrid.appendChild(productCard);
        
        // Initialize carousel if more than 1 image
        if (images.length > 1) {
            initializeCarousel(productCard);
        }
    });
}

// Initialize carousel functionality for each product card
function initializeCarousel(cardElement) {
    const container = cardElement.querySelector('.product-images-container');
    const indicators = cardElement.querySelectorAll('.carousel-indicator');
    const prevBtn = cardElement.querySelector('.carousel-prev');
    const nextBtn = cardElement.querySelector('.carousel-next');
    let currentSlide = 0;
    const totalSlides = cardElement.querySelectorAll('.product-image').length;

    function showSlide(n) {
        currentSlide = (n + totalSlides) % totalSlides;
        container.style.transform = `translateX(-${currentSlide * 100}%)`;
        
        // Update indicators
        indicators.forEach((ind, i) => {
            ind.classList.toggle('active', i === currentSlide);
        });
    }

    // Click handlers for nav buttons
    if (prevBtn) {
        prevBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showSlide(currentSlide - 1);
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showSlide(currentSlide + 1);
        });
    }

    // Click handlers for indicators
    indicators.forEach((indicator, i) => {
        indicator.addEventListener('click', (e) => {
            e.stopPropagation();
            showSlide(i);
        });
    });
}

function trackProductClick(productId) {
    const products = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const product = products.find(p => p.id === productId);
    if (product) {
        product.clicks = (product.clicks || 0) + 1;
        product.views = (product.views || 0) + 1;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
        
        // Update di Supabase jika tersedia
        if (typeof updateProductClicks !== 'undefined' && typeof supabase !== 'undefined') {
            updateProductClicks(productId, product.clicks, product.views).catch(err => {
                console.error('❌ Error updating clicks in Supabase:', err);
            });
        }
    }
}

function trackAndRedirect(link, productId) {
    trackProductClick(productId);
    window.open(link, '_blank');
    return false;
}

// ========================
// SEARCH FUNCTIONALITY
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
    
    productCards.forEach(card => {
        const productName = card.querySelector('.product-name').textContent.toLowerCase();
        const isVisible = searchTerm === '' || productName.includes(searchTerm);
        
        if (isVisible) {
            card.style.display = '';
            card.style.opacity = '1';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });

    // Show "no results" message if needed
    if (visibleCount === 0 && searchTerm !== '') {
        let noResultsMsg = productsGrid.querySelector('.no-results-message');
        if (!noResultsMsg) {
            noResultsMsg = document.createElement('div');
            noResultsMsg.className = 'no-results-message';
            noResultsMsg.style.cssText = `
                grid-column: 1 / -1;
                text-align: center;
                padding: 50px 20px;
                color: #999;
                font-size: 16px;
            `;
            productsGrid.appendChild(noResultsMsg);
        }
        noResultsMsg.textContent = 'Produk tidak ditemukan. Coba kata kunci lain.';
    } else {
        const noResultsMsg = productsGrid.querySelector('.no-results-message');
        if (noResultsMsg) noResultsMsg.remove();
    }
}

// ========================
// NOTIFICATIONS
// ========================
function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
        color: white;
        padding: 16px 24px;
        border-radius: 10px;
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
        z-index: 9998;
        font-weight: 600;
        animation: slideIn 0.3s ease;
        max-width: 300px;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ========================
// DOM READY INITIALIZATION
// ========================
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ DOMContentLoaded event fired');
    
    // Close modal when clicking outside
    const modal = document.getElementById('admin-password-modal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeAdminModal();
            }
        });
    }

    // Setup button "Kelola Produk"
    const btnManageProducts = document.getElementById('btn-manage-products');
    if (btnManageProducts) {
        console.log('✅ "Kelola Produk" button found, attaching event listener');
        btnManageProducts.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('✅ "Kelola Produk" button clicked');
            openAdminModal();
        });
    } else {
        console.warn('⚠️ "Kelola Produk" button not found');
    }

    // Load products from storage
    loadProductsFromStorage();
    
    // Initialize search
    initSearchFilter();
    
    // Newsletter form handler
    const newsletterForm = document.querySelector('.newsletter-form-simple');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const emailInput = this.querySelector('input[type="email"]');
            if (emailInput && emailInput.value) {
                showNotification(`Terima kasih! Kami akan mengirim update produk ke ${emailInput.value}`);
                this.reset();
            }
        });
    }
    
    // Scroll to top button
    initScrollTopButton();
});

// ========================
// SCROLL TO TOP BUTTON
// ========================
function initScrollTopButton() {
    const scrollTopBtn = document.createElement('button');
    scrollTopBtn.innerHTML = '↑';
    scrollTopBtn.className = 'scroll-top-btn';
    scrollTopBtn.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
        color: white;
        border: none;
        cursor: pointer;
        font-size: 24px;
        font-weight: bold;
        opacity: 0;
        pointer-events: none;
        transition: all 0.3s ease;
        z-index: 999;
        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
    `;

    document.body.appendChild(scrollTopBtn);

    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            scrollTopBtn.style.opacity = '1';
            scrollTopBtn.style.pointerEvents = 'auto';
        } else {
            scrollTopBtn.style.opacity = '0';
            scrollTopBtn.style.pointerEvents = 'none';
        }
    });

    scrollTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    scrollTopBtn.addEventListener('mouseover', function() {
        this.style.transform = 'scale(1.1) translateY(-5px)';
    });

    scrollTopBtn.addEventListener('mouseout', function() {
        this.style.transform = 'scale(1) translateY(0)';
    });
}

// ========================
// REAL-TIME PRODUCT UPDATES
// ========================
let lastProductsSnapshot = localStorage.getItem(STORAGE_KEY);

// Method 1: Listen for storage changes from admin panel (cross-tab)
window.addEventListener('storage', function(event) {
    if (event.key === STORAGE_KEY && event.newValue !== event.oldValue) {
        setTimeout(() => {
            loadProductsFromStorage();
            showNotification('✨ Produk telah diperbarui!');
        }, 300);
        lastProductsSnapshot = event.newValue;
    }
});

// Method 2: Periodic check for same-tab updates (admin.html → index.html in same window)
setInterval(() => {
    const currentSnapshot = localStorage.getItem(STORAGE_KEY);
    if (currentSnapshot && currentSnapshot !== lastProductsSnapshot) {
        loadProductsFromStorage();
        showNotification('✨ Produk telah diperbarui!');
        lastProductsSnapshot = currentSnapshot;
    }
}, 1000); // Check every 1 second

// ========================
// PAGE READY - INITIALIZATION COMPLETE
// ========================
console.log('✅ Instafinds.id Affiliate Store loaded successfully!');

