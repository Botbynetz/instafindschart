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

    // Build filter kategori dari produk yang ada
    buildCategoryFilters(products);

    // Banner slider (events + produk terpopuler)
    initBannerSlider(products);

    // Load highlight cards
    loadHighlightCards(products);

    products.forEach(function(product, index) {
        var productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.dataset.category = String(product.category || '');
        productCard.style.animation = 'fadeInUp 0.6s ease backwards';
        productCard.style.animationDelay = (index * 0.05) + 's';

        // Support multi-image array
        var images = [];
        if (product.images && Array.isArray(product.images) && product.images.length > 0) {
            images = product.images;
        } else if (product.image) {
            images = [product.image];
        } else {
            images = ['https://via.placeholder.com/280x280?text=No+Image'];
        }

        var affLink = product.affiliatelink || '#';

        // Build carousel slides
        var slidesHTML = images.map(function(img) {
            return '<div class="product-image"><img src="' + img + '" alt="' + product.name + '" loading="lazy"></div>';
        }).join('');

        // Build indicators (only if > 1 image)
        var indicatorsHTML = '';
        var navHTML = '';
        if (images.length > 1) {
            indicatorsHTML = '<div class="carousel-indicators">' +
                images.map(function(_, i) {
                    return '<button class="carousel-indicator' + (i === 0 ? ' active' : '') + '" data-slide="' + i + '"></button>';
                }).join('') +
            '</div>';
            navHTML =
                '<button class="carousel-nav carousel-prev" aria-label="Prev"><i class="fas fa-chevron-left"></i></button>' +
                '<button class="carousel-nav carousel-next" aria-label="Next"><i class="fas fa-chevron-right"></i></button>';
        }

        productCard.innerHTML =
            '<div class="product-image-carousel">' +
                '<div class="product-images-container">' + slidesHTML + '</div>' +
                navHTML +
                indicatorsHTML +
            '</div>' +
            '<div class="product-info">' +
                '<h3 class="product-name">' + product.name + '</h3>' +
                '<button class="btn-buy" onclick="trackAndRedirect(\'' + affLink + '\', \'' + product.id + '\')">' +
                    '🛒 Beli Sekarang' +
                '</button>' +
                '<button class="btn-share" onclick="shareProduct(\'' + encodeURIComponent(product.name) + '\', \'' + affLink + '\')">' +
                    '🔗 Bagikan Produk' +
                '</button>' +
            '</div>';

        // Init carousel if multiple images
        if (images.length > 1) {
            initCarousel(productCard);
        }

        productsGrid.appendChild(productCard);
    });
}

// ========================
// SHARE PRODUCT
// ========================
function shareProduct(encodedName, link) {
    var name = decodeURIComponent(encodedName);
    var shareText = '🛍️ Cek produk ini: ' + name + '\n\n🔗 ' + link + '\n\nTemukan produk pilihan di Instafinds.id!';

    // Pakai Web Share API kalau tersedia (HP)
    if (navigator.share) {
        navigator.share({
            title: name,
            text: '🛍️ Cek produk ini di Instafinds.id!',
            url: link
        }).catch(function(err) {
            console.log('Share cancelled:', err);
        });
    } else {
        // Fallback: copy ke clipboard
        if (navigator.clipboard) {
            navigator.clipboard.writeText(shareText).then(function() {
                showNotification('✅ Link produk berhasil disalin!');
            }).catch(function() {
                fallbackCopy(shareText);
            });
        } else {
            fallbackCopy(shareText);
        }
    }
}

function fallbackCopy(text) {
    var textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.cssText = 'position:fixed;opacity:0;';
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand('copy');
        showNotification('✅ Link produk berhasil disalin!');
    } catch(e) {
        showNotification('❌ Gagal menyalin link.');
    }
    document.body.removeChild(textarea);
}

// ========================
// CAROUSEL
// ========================
function initCarousel(cardEl) {
    var container = cardEl.querySelector('.product-images-container');
    var indicators = cardEl.querySelectorAll('.carousel-indicator');
    var prevBtn = cardEl.querySelector('.carousel-prev');
    var nextBtn = cardEl.querySelector('.carousel-next');
    var slides = cardEl.querySelectorAll('.product-image');
    var total = slides.length;
    var current = 0;

    function goTo(n) {
        current = (n + total) % total;
        container.style.transform = 'translateX(-' + (current * 100) + '%)';
        indicators.forEach(function(ind, i) {
            ind.classList.toggle('active', i === current);
        });
    }

    if (prevBtn) prevBtn.addEventListener('click', function(e) { e.stopPropagation(); goTo(current - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function(e) { e.stopPropagation(); goTo(current + 1); });
    indicators.forEach(function(ind, i) {
        ind.addEventListener('click', function(e) { e.stopPropagation(); goTo(i); });
    });

    // Auto slide every 4 seconds
    var autoSlide = setInterval(function() { goTo(current + 1); }, 4000);
    cardEl.addEventListener('mouseenter', function() { clearInterval(autoSlide); });
    cardEl.addEventListener('mouseleave', function() {
        autoSlide = setInterval(function() { goTo(current + 1); }, 4000);
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
// BANNER SLIDER
// ========================
var bannerCurrent = 0;
var bannerAutoSlide;
var bannerSlides = [];

async function initBannerSlider(products) {
    var track = document.getElementById('banner-track');
    var dotsEl = document.getElementById('banner-dots');
    if (!track) return;

    bannerSlides = [];

    // Load events dari Supabase sebagai banner
    try {
        if (window.supabase) {
            var result = await window.supabase.from('events').select('*').eq('active', true).order('createdat', { ascending: false });
            if (result.data && result.data.length > 0) {
                result.data.forEach(function(ev) {
                    bannerSlides.push({
                        image: ev.image || '',
                        title: ev.title,
                        desc: ev.description || '',
                        link: ev.link || '#',
                        btnText: ev.buttontext || 'Lihat Sekarang',
                        label: ev.label || 'Event',
                        color: '#667eea'
                    });
                });
            }
        }
    } catch(e) {}

    // Fallback banner kalau tidak ada event
    if (bannerSlides.length === 0) {
        // Banner dari produk terpopuler
        if (products && products.length > 0) {
            var top3 = products.slice().sort(function(a,b){ return (b.clicks||0)-(a.clicks||0); }).slice(0,3);
            top3.forEach(function(p, i) {
                var colors = ['#667eea','#f093fb','#11998e'];
                bannerSlides.push({
                    image: p.image || '',
                    title: p.name,
                    desc: p.description ? p.description.substring(0,80)+'...' : '',
                    link: p.affiliatelink || '#',
                    btnText: '🛒 Beli Sekarang',
                    label: i===0 ? '🔥 Terpopuler' : '⭐ Pilihan',
                    color: colors[i]
                });
            });
        }
    }

    if (bannerSlides.length === 0) {
        document.getElementById('banner-slider').style.display = 'none';
        return;
    }

    // Render slides
    track.innerHTML = bannerSlides.map(function(slide, i) {
        return '<div class="banner-slide" onclick="window.open(this.dataset.link,\'_blank\')" data-link="'+slide.link+'" style="cursor:pointer;">' +
            (slide.image
                ? '<img src="'+slide.image+'" alt="'+slide.title+'" class="banner-bg-img">'
                : '<div class="banner-bg-color" style="background:linear-gradient(135deg,'+slide.color+',#764ba2);"></div>'
            ) +
            '<div class="banner-overlay"></div>' +
            '<div class="banner-content">' +
                '<span class="banner-label">'+slide.label+'</span>' +
                '<div class="banner-title">'+slide.title+'</div>' +
                (slide.desc ? '<div class="banner-desc">'+slide.desc+'</div>' : '') +
                '<button class="banner-btn" onclick="event.stopPropagation();window.open(this.closest(\'.banner-slide\').dataset.link,\'_blank\')">'+slide.btnText+'</button>' +
            '</div>' +
        '</div>';
    }).join('');

    // Dots
    dotsEl.innerHTML = bannerSlides.map(function(_, i) {
        return '<button class="banner-dot'+(i===0?' active':'')+'" onclick="goBannerSlide('+i+')"></button>';
    }).join('');

    // Nav buttons
    var prevBtn = document.getElementById('banner-prev');
    var nextBtn = document.getElementById('banner-next');
    if (prevBtn) prevBtn.onclick = function() { goBannerSlide(bannerCurrent - 1); };
    if (nextBtn) nextBtn.onclick = function() { goBannerSlide(bannerCurrent + 1); };

    // Hide nav if only 1 slide
    if (bannerSlides.length <= 1) {
        if (prevBtn) prevBtn.style.display = 'none';
        if (nextBtn) nextBtn.style.display = 'none';
        dotsEl.style.display = 'none';
    }

    goBannerSlide(0);
    startBannerAuto();
}

function goBannerSlide(n) {
    bannerCurrent = ((n % bannerSlides.length) + bannerSlides.length) % bannerSlides.length;
    var track = document.getElementById('banner-track');
    if (track) track.style.transform = 'translateX(-' + (bannerCurrent * 100) + '%)';
    document.querySelectorAll('.banner-dot').forEach(function(d, i) {
        d.classList.toggle('active', i === bannerCurrent);
    });
}

function startBannerAuto() {
    clearInterval(bannerAutoSlide);
    bannerAutoSlide = setInterval(function() { goBannerSlide(bannerCurrent + 1); }, 4000);
    var slider = document.getElementById('banner-slider');
    if (slider) {
        slider.onmouseenter = function() { clearInterval(bannerAutoSlide); };
        slider.onmouseleave = function() { startBannerAuto(); };
    }
}

// ========================
// CATEGORY GRID
// ========================
var CATEGORY_ICON_MAP = {
    'kecantikan': { icon: 'fas fa-spa', color: '#e91e8c', bg: '#fce4ec' },
    'fashion': { icon: 'fas fa-shirt', color: '#e65100', bg: '#fff3e0' },
    'sepatu': { icon: 'fas fa-shoe-prints', color: '#1565c0', bg: '#e3f2fd' },
    'aksesoris': { icon: 'fas fa-ring', color: '#6a1b9a', bg: '#f3e5f5' },
    'elektronik': { icon: 'fas fa-mobile-alt', color: '#00695c', bg: '#e0f2f1' },
    'rumah tangga': { icon: 'fas fa-home', color: '#ef6c00', bg: '#fff8e1' },
    'tas': { icon: 'fas fa-shopping-bag', color: '#c62828', bg: '#ffebee' },
    'kesehatan': { icon: 'fas fa-heartbeat', color: '#2e7d32', bg: '#e8f5e9' },
    'makanan': { icon: 'fas fa-utensils', color: '#f57f17', bg: '#fffde7' },
    'olahraga': { icon: 'fas fa-running', color: '#1976d2', bg: '#e3f2fd' },
    'default': { icon: 'fas fa-tag', color: '#667eea', bg: '#ede9fe' }
};

function buildCategoryGrid(products) {
    var grid = document.getElementById('category-grid');
    if (!grid) return;

    // Hitung produk per kategori
    var catMap = {};
    products.forEach(function(p) {
        var key = String(p.category || '').toLowerCase().trim();
        if (!catMap[key]) catMap[key] = { name: p.category, count: 0, key: key };
        catMap[key].count++;
    });

    var cats = Object.values(catMap).filter(function(c) { return c.count > 0; });
    if (cats.length === 0) { grid.parentElement.style.display = 'none'; return; }

    grid.innerHTML = cats.map(function(cat) {
        var style = CATEGORY_ICON_MAP[cat.key] || CATEGORY_ICON_MAP['default'];
        return '<div class="cat-grid-item" onclick="filterByCategory(this.dataset.catkey)" data-catkey="'+cat.key+'">' +
            '<div class="cat-grid-icon" style="background:'+style.bg+';color:'+style.color+';">' +
                '<i class="'+style.icon+'"></i>' +
            '</div>' +
            '<div class="cat-grid-name">'+cat.name+'</div>' +
            '<div class="cat-grid-count">'+cat.count+' produk</div>' +
        '</div>';
    }).join('');
}

// ========================
// HIGHLIGHT SLIDESHOW
// ========================
var hlCurrent = 0;
var hlAuto;
var hlSlides = [];

async function loadHighlightCards(products) {
    hlSlides = [];

    // Slide 1: Terpopuler
    if (products.length > 0) {
        var popular = products.slice().sort(function(a,b){ return (b.clicks||0)-(a.clicks||0); })[0];
        if (popular) {
            hlSlides.push({
                badge: '🔥 Terpopuler',
                badgeColor: '#ff6b35',
                image: popular.image || '',
                title: popular.name,
                sub: (popular.clicks||0) > 0 ? '👆 '+(popular.clicks||0)+' klik' : '⭐ Produk Unggulan',
                btnText: 'Lihat Produk',
                btnColor: '#ff6b35',
                action: function(p){ return function(){ trackAndRedirect(p.affiliatelink, p.id); }; }(popular)
            });
        }
    }

    // Slide 2: Produk Terbaru
    if (products.length > 0) {
        var newest = products.slice().sort(function(a,b){ return new Date(b.createdat||0)-new Date(a.createdat||0); })[0];
        if (newest) {
            var tgl = newest.createdat ? new Date(newest.createdat).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'}) : '';
            hlSlides.push({
                badge: '🆕 Produk Baru',
                badgeColor: '#11998e',
                image: newest.image || '',
                title: newest.name,
                sub: '📆 Ditambahkan '+tgl,
                btnText: 'Lihat Produk',
                btnColor: '#11998e',
                action: function(p){ return function(){ trackAndRedirect(p.affiliatelink, p.id); }; }(newest)
            });
        }
    }

    // Slide 3+: Events aktif
    try {
        if (window.supabase) {
            var evResult = await window.supabase.from('events').select('*').eq('active',true).order('createdat',{ascending:false});
            if (evResult.data) {
                evResult.data.forEach(function(ev) {
                    hlSlides.push({
                        badge: ev.label || '📅 Event',
                        badgeColor: '#667eea',
                        image: ev.image || '',
                        title: ev.title,
                        sub: ev.description || '',
                        btnText: ev.buttontext || 'Lihat Sekarang',
                        btnColor: '#667eea',
                        action: function(link){ return function(){ window.open(link,'_blank'); }; }(ev.link||'#')
                    });
                });
            }
        }
    } catch(e) {}

    renderHighlightSlideshow();
}

function renderHighlightSlideshow() {
    var show = document.getElementById('highlight-slideshow');
    var track = document.getElementById('highlight-track');
    var dots = document.getElementById('highlight-dots');
    if (!show || !track || hlSlides.length === 0) { if(show) show.style.display='none'; return; }

    show.style.display = 'block';

    track.innerHTML = hlSlides.map(function(s, i) {
        return '<div class="hl-slide">' +
            '<div class="hl-slide-img" style="background-image:url('+s.image+');">' +
                '<div class="hl-slide-overlay"></div>' +
                '<span class="hl-slide-badge" style="background:'+s.badgeColor+'">'+s.badge+'</span>' +
            '</div>' +
            '<div class="hl-slide-info">' +
                '<div class="hl-slide-title">'+s.title+'</div>' +
                '<div class="hl-slide-sub">'+s.sub+'</div>' +
                '<button class="hl-slide-btn" style="background:'+s.btnColor+'" data-idx="'+i+'">'+s.btnText+'</button>' +
            '</div>' +
        '</div>';
    }).join('');

    // Bind button actions
    track.querySelectorAll('.hl-slide-btn').forEach(function(btn) {
        var idx = parseInt(btn.dataset.idx);
        btn.addEventListener('click', hlSlides[idx].action);
    });

    // Dots
    dots.innerHTML = hlSlides.map(function(_, i) {
        return '<button class="hl-dot'+(i===0?' active':'')+'" data-i="'+i+'"></button>';
    }).join('');
    dots.querySelectorAll('.hl-dot').forEach(function(d) {
        d.addEventListener('click', function(){ goHlSlide(parseInt(d.dataset.i)); });
    });

    goHlSlide(0);

    // Auto slide
    clearInterval(hlAuto);
    if (hlSlides.length > 1) {
        hlAuto = setInterval(function(){ goHlSlide(hlCurrent+1); }, 4500);
        show.onmouseenter = function(){ clearInterval(hlAuto); };
        show.onmouseleave = function(){ hlAuto = setInterval(function(){ goHlSlide(hlCurrent+1); }, 4500); };
    }
}

function goHlSlide(n) {
    hlCurrent = ((n % hlSlides.length) + hlSlides.length) % hlSlides.length;
    var track = document.getElementById('highlight-track');
    if (track) track.style.transform = 'translateX(-'+(hlCurrent*100)+'%)';
    document.querySelectorAll('.hl-dot').forEach(function(d,i){ d.classList.toggle('active', i===hlCurrent); });
}

// ========================
// CATEGORY FILTER
// ========================
var activeCategory = 'all';

// Icon map untuk kategori
var CATEGORY_ICONS = {
    '1': 'fas fa-lipstick',
    '2': 'fas fa-shirt',
    '3': 'fas fa-shoe-prints',
    '4': 'fas fa-ring',
    '5': 'fas fa-phone',
    '6': 'fas fa-home',
    'kecantikan': 'fas fa-lipstick',
    'fashion': 'fas fa-shirt',
    'sepatu': 'fas fa-shoe-prints',
    'aksesoris': 'fas fa-ring',
    'elektronik': 'fas fa-phone',
    'rumah tangga': 'fas fa-home'
};

// Nama kategori dari ID
var CATEGORY_NAMES = {
    '1': 'Kecantikan',
    '2': 'Fashion',
    '3': 'Sepatu',
    '4': 'Aksesoris',
    '5': 'Elektronik',
    '6': 'Rumah Tangga'
};

function buildCategoryFilters(products) {
    var filterBar = document.getElementById('category-filter-bar');
    if (!filterBar) return;

    // Kumpulkan kategori unik dari produk
    var categoryMap = {};
    products.forEach(function(p) {
        if (p.category) {
            var key = String(p.category);
            if (!categoryMap[key]) {
                categoryMap[key] = {
                    id: key,
                    count: 0,
                    name: CATEGORY_NAMES[key] || p.category,
                    icon: CATEGORY_ICONS[key] || CATEGORY_ICONS[String(p.category).toLowerCase()] || 'fas fa-tag'
                };
            }
            categoryMap[key].count++;
        }
    });

    var categories = Object.values(categoryMap);

    // Reset filter bar
    var allActive = activeCategory === 'all' ? ' active' : '';
    filterBar.innerHTML = '<button class="filter-btn' + allActive + '" data-category="all" onclick="filterByCategory(&quot;all&quot;)">' +
        '<i class="fas fa-th"></i> Semua <span class="filter-count">' + products.length + '</span>' +
        '</button>';

    categories.forEach(function(cat) {
        var catActive = activeCategory === cat.id ? ' active' : '';
        filterBar.innerHTML += '<button class="filter-btn' + catActive + '" data-category="' + cat.id + '" onclick="filterByCategory(&quot;' + cat.id + '&quot;)">' +
            '<i class="' + cat.icon + '"></i> ' + cat.name + ' <span class="filter-count">' + cat.count + '</span>' +
            '</button>';
    });

    // Sembunyikan filter bar kalau hanya 1 kategori atau kosong
    filterBar.style.display = categories.length > 0 ? 'flex' : 'none';
}

function filterByCategory(categoryId) {
    activeCategory = categoryId;

    // Update active state tombol
    document.querySelectorAll('.filter-btn').forEach(function(btn) {
        btn.classList.toggle('active', btn.dataset.category === categoryId);
    });

    // Filter produk
    var productsGrid = document.querySelector('.products-grid');
    if (!productsGrid) return;

    var productCards = productsGrid.querySelectorAll('.product-card');
    var visibleCount = 0;

    productCards.forEach(function(card) {
        var cardCategory = String(card.dataset.category || '').toLowerCase().trim();
        var filterKey = String(categoryId || '').toLowerCase().trim();
        var isVisible = filterKey === 'all' || cardCategory === filterKey;
        card.style.display = isVisible ? '' : 'none';
        if (isVisible) visibleCount++;
    });

    // Pesan kosong
    var noMsg = productsGrid.querySelector('.no-filter-message');
    if (visibleCount === 0) {
        if (!noMsg) {
            noMsg = document.createElement('div');
            noMsg.className = 'no-filter-message';
            noMsg.style.cssText = 'grid-column:1/-1;text-align:center;padding:50px;color:#999;font-size:16px;';
            productsGrid.appendChild(noMsg);
        }
        noMsg.textContent = 'Belum ada produk di kategori ini.';
    } else if (noMsg) {
        noMsg.remove();
    }
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
