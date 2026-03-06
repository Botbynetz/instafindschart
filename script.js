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

var categoryNameMap = {}; // id -> name

async function loadProducts() {
    var productsGrid = document.querySelector('.products-grid');
    if (!productsGrid) return;

    productsGrid.innerHTML =
        '<div style="grid-column:1/-1;text-align:center;padding:50px;color:#999;">' +
        '<i class="fas fa-spinner fa-spin" style="font-size:30px;display:block;margin-bottom:10px;"></i>' +
        'Memuat produk...</div>';

    // Load kategori dari Supabase → isi categoryNameMap
    categoryNameMap = {};
    try {
        var catResult = await window.supabase.from('categories').select('id, name');
        if (catResult.data && catResult.data.length > 0) {
            catResult.data.forEach(function(cat) {
                categoryNameMap[String(cat.id)] = cat.name;
                categoryNameMap[cat.id] = cat.name;
                if (cat.name) categoryNameMap[cat.name.toLowerCase()] = cat.name;
            });
            console.log('📂 Categories loaded:', JSON.stringify(categoryNameMap));
        }
    } catch(e) {
        console.warn('⚠️ Gagal load categories:', e);
    }

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

    // Enrich setiap produk dengan nama kategori dari categoryNameMap
    products = products.map(function(p) {
        var rawCat = String(p.category || '').trim();
        var catName = categoryNameMap[rawCat]
            || categoryNameMap[String(parseInt(rawCat))]
            || categoryNameMap[rawCat.toLowerCase()]
            || null;
        return Object.assign({}, p, { categoryName: catName || rawCat });
    });

    allProducts = products;
    productsGrid.innerHTML = '';

    // Build filter kategori dari produk yang ada
    buildCategoryFilters(products);

    // Build filter dropdown category list
    buildFilterCategoryList(products);

    // Banner slider (events + produk terpopuler)
    initBannerSlider(products);

    // Load highlight cards
    loadHighlightCards(products);

    products.forEach(function(product, index) {
        var productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.dataset.id = product.id || '';
        productCard.dataset.category = String(product.category || '');
        productCard.dataset.categoryname = String(product.categoryName || product.category || '').toLowerCase();
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
        var productName = product.name;
        var imagesJson = JSON.stringify(images).replace(/'/g, '&#39;');
        var slidesHTML = images.map(function(img, idx) {
            return '<div class="product-image" onclick="openLightbox(\'' + img + '\', ' + idx + ', ' + JSON.stringify(images).replace(/"/g,'&quot;') + ')"><img src="' + img + '" alt="' + productName + '" loading="lazy"></div>';
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

        // Video play button overlay jika ada video
        var parsedVideo = parseVideoUrl(product.video);
        var videoOverlay = '';
        if (parsedVideo) {
            var vIcon = parsedVideo.type === 'youtube' ? 'fab fa-youtube' :
                        parsedVideo.type === 'tiktok'  ? 'fab fa-tiktok'  :
                        'fas fa-play-circle';
            videoOverlay = '<button class="product-video-btn" onclick="openVideoPopup(\'' +
                parsedVideo.embed + '\',\'' + parsedVideo.type + '\',event)" title="Tonton Video Produk">' +
                '<i class="' + vIcon + '"></i>' +
                '<span>Video</span>' +
            '</button>';
        }

        var pid = product.id;
        productCard.innerHTML =
            '<div class="product-image-carousel" style="position:relative;" onclick="openProductDetail(\'' + pid + '\')" style="cursor:pointer;">' +
                '<button class="wishlist-heart" data-id="' + pid + '" onclick="toggleWishlist(\'' + pid + '\',event)" title="Simpan ke Wishlist">' +
                    '<i class="' + (userWishlist.has(String(pid)) ? 'fas' : 'far') + ' fa-heart"></i>' +
                '</button>' +
                '<div class="product-images-container">' + slidesHTML + '</div>' +
                navHTML +
                indicatorsHTML +
                videoOverlay +
            '</div>' +
            '<div class="product-info" onclick="openProductDetail(\'' + pid + '\')" style="cursor:pointer;">' +
                '<h3 class="product-name">' + product.name + '</h3>' +
            '</div>' +
            '<div class="product-actions">' +
                '<button class="btn-buy" onclick="trackAndRedirect(\'' + affLink + '\', \'' + product.id + '\')">' +
                    '🛒 Beli Sekarang' +
                '</button>' +
                '<button class="btn-share" onclick="shareProduct(\'' + encodeURIComponent(product.name) + '\', \'' + affLink + '\')">' +
                    '🔗 Bagikan' +
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

    // 1. Events aktif dari Supabase (tampil paling atas)
    try {
        if (window.supabase) {
            var result = await window.supabase.from('events').select('*').eq('active', true).order('createdat', { ascending: false });
            if (result.data) {
                result.data.forEach(function(ev) {
                    bannerSlides.push({
                        image: ev.image || '',
                        title: ev.title,
                        desc: ev.description || '',
                        link: ev.link || '',
                        btnText: ev.link ? (ev.buttontext || 'Lihat Sekarang') : '',
                        label: '📅 Event',
                        color: '#667eea',
                        isEvent: true
                    });
                });
            }
        }
    } catch(e) {}

    // 2. Top 3 paling banyak diklik
    if (products && products.length > 0) {
        var byClicks = products.slice().sort(function(a,b){ return (b.clicks||0)-(a.clicks||0); });
        var topPopular = byClicks.slice(0, Math.min(3, products.length));
        var popLabels = ['🔥 Terpopuler', '🔥 #2 Terpopuler', '🔥 #3 Terpopuler'];
        topPopular.forEach(function(p, i) {
            bannerSlides.push({
                image: p.image || '',
                title: p.name,
                desc: (p.clicks||0) > 0 ? '👆 '+(p.clicks||0)+' klik' : '⭐ Produk Unggulan',
                link: p.affiliatelink || '',
                btnText: '🛒 Beli Sekarang',
                label: popLabels[i],
                color: '#ff6b35',
                productId: p.id
            });
        });
    }

    // 3. Top 3 produk terbaru (skip duplikat dari popular)
    if (products && products.length > 0) {
        var popularIds = bannerSlides.filter(function(s){ return s.productId; }).map(function(s){ return s.productId; });
        var byDate = products.slice().sort(function(a,b){ return new Date(b.createdat||0)-new Date(a.createdat||0); });
        var newLabels = ['🆕 Baru Masuk', '🆕 Produk Baru', '🆕 Baru Ditambahkan'];
        var newCount = 0;
        byDate.forEach(function(p) {
            if (newCount >= 3) return;
            if (popularIds.indexOf(p.id) !== -1) return;
            var tgl = p.createdat ? new Date(p.createdat).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'}) : '';
            bannerSlides.push({
                image: p.image || '',
                title: p.name,
                desc: tgl ? '📆 Ditambahkan '+tgl : '🛍️ Produk terbaru',
                link: p.affiliatelink || '',
                btnText: '🛒 Beli Sekarang',
                label: newLabels[newCount],
                color: '#11998e',
                productId: p.id
            });
            newCount++;
        });
    }

    if (bannerSlides.length === 0) {
        document.getElementById('banner-slider').style.display = 'none';
        return;
    }

    // Render slides
    track.innerHTML = bannerSlides.map(function(slide, i) {
        var hasLink = slide.link && slide.link !== '';
        return '<div class="banner-slide" '+(hasLink ? 'onclick="window.open(this.dataset.link,\'_blank\')" style="cursor:pointer;"' : '')+' data-link="'+slide.link+'">' +
            (slide.image
                ? '<img src="'+slide.image+'" alt="'+slide.title+'" class="banner-bg-img">'
                : '<div class="banner-bg-color" style="background:linear-gradient(135deg,'+slide.color+',#764ba2);"></div>'
            ) +
            '<div class="banner-overlay"></div>' +
            '<div class="banner-content">' +
                '<span class="banner-label">'+slide.label+'</span>' +
                '<div class="banner-title">'+slide.title+'</div>' +
                (slide.desc ? '<div class="banner-desc">'+slide.desc+'</div>' : '') +
                (slide.btnText ? '<button class="banner-btn" onclick="event.stopPropagation();window.open(this.closest(\'.banner-slide\').dataset.link,\'_blank\')">'+slide.btnText+'</button>' : '') +
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

// loadHighlightCards merged into initBannerSlider
async function loadHighlightCards(products) {
    // Noop - content merged into banner slider
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
            var resolvedName = p.categoryName || categoryNameMap[key] || key;
            if (!categoryMap[key]) {
                categoryMap[key] = {
                    id: key,
                    count: 0,
                    name: resolvedName,
                    icon: CATEGORY_ICONS[key] || CATEGORY_ICONS[resolvedName.toLowerCase()] || 'fas fa-tag'
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
// FILTER DROPDOWN
// ========================
var activeFilter = 'default';
var activeFilterCategory = 'all';

function toggleFilterDropdown() {
    var dd = document.getElementById('search-filter-dropdown');
    var chevron = document.getElementById('filter-chevron');
    var btn = document.getElementById('search-filter-btn');
    if (!dd) return;
    var isOpen = dd.classList.contains('open');
    dd.classList.toggle('open', !isOpen);
    if (chevron) chevron.style.transform = isOpen ? '' : 'rotate(180deg)';
    if (btn) btn.classList.toggle('active', !isOpen);
}

// Close dropdown when clicking outside
document.addEventListener('click', function(e) {
    var wrap = document.querySelector('.search-filter-wrap');
    if (wrap && !wrap.contains(e.target)) {
        var dd = document.getElementById('search-filter-dropdown');
        var chevron = document.getElementById('filter-chevron');
        var btn = document.getElementById('search-filter-btn');
        if (dd) dd.classList.remove('open');
        if (chevron) chevron.style.transform = '';
        if (btn) btn.classList.remove('active');
    }
});

function applyFilter(filterType) {
    activeFilter = filterType;

    // Update active button
    document.querySelectorAll('.filter-option[data-filter]').forEach(function(btn) {
        btn.classList.toggle('active', btn.dataset.filter === filterType);
    });

    // Update label
    var labels = { default: 'Filter', popular: '🔥 Populer', newest: '🆕 Terbaru', oldest: '🕰️ Terlama' };
    var labelEl = document.getElementById('filter-label');
    if (labelEl) labelEl.textContent = labels[filterType] || 'Filter';

    applyAllFilters();

    // Close dropdown after selecting
    var dd = document.getElementById('search-filter-dropdown');
    var chevron = document.getElementById('filter-chevron');
    var btn = document.getElementById('search-filter-btn');
    if (dd) dd.classList.remove('open');
    if (chevron) chevron.style.transform = '';
    if (btn) btn.classList.remove('active');
}

function applyFilterCategory(catKey, catName) {
    activeFilterCategory = catKey;

    // Update active category btn
    document.querySelectorAll('.filter-option[data-cat]').forEach(function(btn) {
        btn.classList.toggle('active', btn.dataset.cat === catKey);
    });

    // Update label if category selected
    var labelEl = document.getElementById('filter-label');
    if (labelEl && catKey !== 'all') labelEl.textContent = '📂 ' + catName;
    else if (labelEl && activeFilter === 'default') labelEl.textContent = 'Filter';

    applyAllFilters();

    // Close dropdown
    var dd = document.getElementById('search-filter-dropdown');
    var chevron = document.getElementById('filter-chevron');
    var filterBtn = document.getElementById('search-filter-btn');
    if (dd) dd.classList.remove('open');
    if (chevron) chevron.style.transform = '';
    if (filterBtn) filterBtn.classList.remove('active');
}

function applyAllFilters() {
    var searchVal = (document.getElementById('productSearch').value || '').toLowerCase().trim();
    var productsGrid = document.querySelector('.products-grid');
    if (!productsGrid) return;

    // Sort allProducts based on activeFilter
    var sorted = allProducts.slice();
    if (activeFilter === 'popular') {
        sorted.sort(function(a,b){ return (b.clicks||0) - (a.clicks||0); });
    } else if (activeFilter === 'newest') {
        sorted.sort(function(a,b){ return new Date(b.createdat||0) - new Date(a.createdat||0); });
    } else if (activeFilter === 'oldest') {
        sorted.sort(function(a,b){ return new Date(a.createdat||0) - new Date(b.createdat||0); });
    }

    // Reorder cards in DOM
    var cards = productsGrid.querySelectorAll('.product-card');
    var cardMap = {};
    cards.forEach(function(card) { cardMap[card.dataset.id] = card; });

    sorted.forEach(function(p) {
        var card = cardMap[p.id];
        if (card) productsGrid.appendChild(card);
    });

    // Apply visibility: search + category
    var visible = 0;
    productsGrid.querySelectorAll('.product-card').forEach(function(card) {
        var name = (card.querySelector('.product-name') ? card.querySelector('.product-name').textContent : '').toLowerCase();
        var cat = String(card.dataset.category || '').toLowerCase().trim();
        var matchSearch = !searchVal || name.includes(searchVal);
        var matchCat = activeFilterCategory === 'all' || cat === activeFilterCategory;
        card.style.display = (matchSearch && matchCat) ? '' : 'none';
        if (matchSearch && matchCat) visible++;
    });

    // Empty message
    var noMsg = productsGrid.querySelector('.no-filter-message');
    if (visible === 0) {
        if (!noMsg) {
            noMsg = document.createElement('div');
            noMsg.className = 'no-filter-message';
            noMsg.style.cssText = 'grid-column:1/-1;text-align:center;padding:50px;color:#999;font-size:16px;';
            productsGrid.appendChild(noMsg);
        }
        noMsg.textContent = 'Tidak ada produk yang cocok.';
    } else if (noMsg) {
        noMsg.remove();
    }
}

function buildFilterCategoryList(products) {
    var list = document.getElementById('filter-category-list');
    if (!list) return;

    // Hitung produk per kategori, resolve nama dari categoryNameMap
    var catMap = {};
    products.forEach(function(p) {
        var rawKey = String(p.category || '').trim();
        if (!rawKey) return;
        var resolvedName = p.categoryName || categoryNameMap[rawKey] || rawKey;
        if (!catMap[rawKey]) catMap[rawKey] = { name: resolvedName, count: 0, key: rawKey };
        catMap[rawKey].count++;
    });

    var cats = Object.values(catMap);
    list.innerHTML = '<button class="filter-option active" data-cat="all" onclick="applyFilterCategory(&quot;all&quot;,&quot;Semua&quot;)"><i class="fas fa-th"></i> Semua Kategori</button>' +
        cats.map(function(cat) {
            return '<button class="filter-option" data-cat="' + cat.key + '" onclick="applyFilterCategory(this.dataset.cat,&quot;' + cat.name + '&quot;)">' +
                '<i class="fas fa-tag"></i> ' + cat.name + ' <span class="filter-opt-count">' + cat.count + '</span>' +
            '</button>';
        }).join('');
}

// ========================
// FLOATING SEARCH BEHAVIOR
// ========================
(function() {
    var lastScroll = 0;
    window.addEventListener('scroll', function() {
        var current = window.scrollY;
        var bar = document.getElementById('floating-search');
        if (!bar) return;
        // Hide on scroll down (past 80px), show on scroll up
        if (current > 80 && current > lastScroll) {
            bar.classList.add('hidden');
        } else {
            bar.classList.remove('hidden');
        }
        lastScroll = current;
    }, { passive: true });
})();

// ========================
// SEARCH
// ========================
function clearSearch() {
    var input = document.getElementById('productSearch');
    var clearBtn = document.getElementById('search-clear');
    if (input) { input.value = ''; input.dispatchEvent(new Event('input')); input.focus(); }
    if (clearBtn) clearBtn.style.display = 'none';
}

// Show/hide clear button as user types
document.addEventListener('DOMContentLoaded', function() {
    var input = document.getElementById('productSearch');
    var clearBtn = document.getElementById('search-clear');
    if (input && clearBtn) {
        input.addEventListener('input', function() {
            clearBtn.style.display = input.value ? 'flex' : 'none';
        });
    }
});

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
// AUTH & WISHLIST
// ========================
var currentUser = null;
var userWishlist = new Set();

// Init auth state on load
window.addEventListener('load', async function() {
    if (!window.supabase) return;

    // Listen for auth changes
    window.supabase.auth.onAuthStateChange(async function(event, session) {
        currentUser = session ? session.user : null;
        updateAuthUI();
        if (currentUser) {
            await loadWishlist();
            refreshWishlistHearts();
        } else {
            userWishlist = new Set();
            refreshWishlistHearts();
        }
    });

    // Check existing session
    var { data } = await window.supabase.auth.getSession();
    if (data.session) {
        currentUser = data.session.user;
        updateAuthUI();
        await loadWishlist();
    }
});

function updateAuthUI() {
    var nameEl = document.getElementById('user-display-name');
    var wishBtn = document.getElementById('btn-wishlist-page');
    var authBtn = document.getElementById('btn-auth-user');

    if (currentUser) {
        var name = currentUser.user_metadata && currentUser.user_metadata.full_name
            ? currentUser.user_metadata.full_name.split(' ')[0]
            : currentUser.email.split('@')[0];
        if (nameEl) nameEl.textContent = name;
        if (wishBtn) wishBtn.style.display = 'flex';
        if (authBtn) authBtn.title = 'Keluar';
    } else {
        if (nameEl) nameEl.textContent = 'Masuk';
        if (wishBtn) wishBtn.style.display = 'none';
        if (authBtn) authBtn.title = 'Masuk';
    }
}

function handleAuthClick() {
    if (currentUser) {
        // Show user menu: logout option
        if (confirm('Keluar dari akun ' + currentUser.email + '?')) {
            window.supabase.auth.signOut();
            showNotification('👋 Berhasil keluar');
        }
    } else {
        openAuthModal();
    }
}

// ========================
// AUTH MODAL
// ========================
var authMode = 'login'; // login | register

function openAuthModal() {
    var modal = document.getElementById('auth-modal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        requestAnimationFrame(function() { modal.classList.add('open'); });
        clearAuthMessages();
    }
}

function closeAuthModal() {
    var modal = document.getElementById('auth-modal');
    if (modal) {
        modal.classList.remove('open');
        setTimeout(function() { modal.style.display = 'none'; }, 300);
        document.body.style.overflow = '';
    }
}

function switchAuthTab(mode) {
    authMode = mode;
    var tabLogin = document.getElementById('tab-login');
    var tabReg = document.getElementById('tab-register');
    var btnText = document.getElementById('auth-btn-text');
    var footer = document.getElementById('auth-footer');
    var title = document.getElementById('auth-title');

    if (mode === 'login') {
        if (tabLogin) tabLogin.classList.add('active');
        if (tabReg) tabReg.classList.remove('active');
        if (btnText) btnText.textContent = 'Masuk';
        if (title) title.textContent = 'Masuk ke Instafinds.id';
        if (footer) footer.innerHTML = 'Belum punya akun? <a href="#" onclick="switchAuthTab(\'register\')">Daftar gratis</a>';
    } else {
        if (tabLogin) tabLogin.classList.remove('active');
        if (tabReg) tabReg.classList.add('active');
        if (btnText) btnText.textContent = 'Daftar';
        if (title) title.textContent = 'Daftar ke Instafinds.id';
        if (footer) footer.innerHTML = 'Sudah punya akun? <a href="#" onclick="switchAuthTab(\'login\')">Masuk</a>';
    }
    clearAuthMessages();
}

function clearAuthMessages() {
    var err = document.getElementById('auth-error');
    var suc = document.getElementById('auth-success');
    if (err) err.style.display = 'none';
    if (suc) suc.style.display = 'none';
}

async function handleAuth() {
    var email = (document.getElementById('auth-email') || {}).value || '';
    var password = (document.getElementById('auth-password') || {}).value || '';
    var btn = document.getElementById('auth-submit-btn');
    var btnText = document.getElementById('auth-btn-text');

    if (!email || !password) {
        showAuthError('Isi email dan password dulu ya!');
        return;
    }

    if (btn) btn.disabled = true;
    if (btnText) btnText.textContent = 'Loading...';

    try {
        var result;
        if (authMode === 'login') {
            result = await window.supabase.auth.signInWithPassword({ email: email, password: password });
        } else {
            result = await window.supabase.auth.signUp({ email: email, password: password });
        }

        if (result.error) throw result.error;

        if (authMode === 'register' && result.data && !result.data.session) {
            showAuthSuccess('✅ Cek email kamu untuk verifikasi akun!');
        } else {
            showNotification('✅ Berhasil masuk! Selamat datang 👋');
            closeAuthModal();
        }
    } catch(err) {
        var msg = err.message || 'Terjadi kesalahan';
        if (msg.includes('Invalid login')) msg = 'Email atau password salah';
        if (msg.includes('already registered')) msg = 'Email sudah terdaftar, coba masuk';
        if (msg.includes('Password should')) msg = 'Password minimal 6 karakter';
        showAuthError(msg);
    }

    if (btn) btn.disabled = false;
    if (btnText) btnText.textContent = authMode === 'login' ? 'Masuk' : 'Daftar';
}

async function loginWithGoogle() {
    try {
        await window.supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.href }
        });
    } catch(e) {
        showAuthError('Login Google gagal: ' + e.message);
    }
}

function showAuthError(msg) {
    var el = document.getElementById('auth-error');
    if (el) { el.textContent = msg; el.style.display = 'flex'; }
    var suc = document.getElementById('auth-success');
    if (suc) suc.style.display = 'none';
}

function showAuthSuccess(msg) {
    var el = document.getElementById('auth-success');
    if (el) { el.textContent = msg; el.style.display = 'flex'; }
    var err = document.getElementById('auth-error');
    if (err) err.style.display = 'none';
}

// Enter key on auth form
document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && document.getElementById('auth-modal') &&
        document.getElementById('auth-modal').style.display === 'flex') {
        handleAuth();
    }
});

// ========================
// WISHLIST LOGIC
// ========================
async function loadWishlist() {
    if (!currentUser) return;
    try {
        var result = await window.supabase
            .from('wishlists')
            .select('product_id')
            .eq('user_id', currentUser.id);
        if (result.data) {
            userWishlist = new Set(result.data.map(function(r) { return String(r.product_id); }));
            updateWishlistCount();
        }
    } catch(e) {}
}

async function toggleWishlist(productId, e) {
    if (e) e.stopPropagation();

    if (!currentUser) {
        openAuthModal();
        showNotification('💡 Masuk dulu untuk menyimpan produk!');
        return;
    }

    var pid = String(productId);
    var btn = document.querySelector('.wishlist-heart[data-id="' + pid + '"]');
    var icon = btn ? btn.querySelector('i') : null;
    var isWished = userWishlist.has(pid);

    // Optimistic UI
    if (isWished) {
        userWishlist.delete(pid);
        if (icon) { icon.className = 'far fa-heart'; }
        if (btn) btn.classList.remove('wished');
    } else {
        userWishlist.add(pid);
        if (icon) { icon.className = 'fas fa-heart'; }
        if (btn) { btn.classList.add('wished'); btn.classList.add('pop'); setTimeout(function() { btn.classList.remove('pop'); }, 400); }
    }
    updateWishlistCount();

    try {
        if (isWished) {
            await window.supabase.from('wishlists').delete()
                .eq('user_id', currentUser.id).eq('product_id', pid);
        } else {
            await window.supabase.from('wishlists').insert([
                { user_id: currentUser.id, product_id: pid }
            ]);
            showNotification('❤️ Produk disimpan ke wishlist!');
        }
    } catch(err) {
        // Rollback on error
        if (isWished) userWishlist.add(pid); else userWishlist.delete(pid);
        refreshWishlistHearts();
        showNotification('❌ Gagal menyimpan');
    }
}

function updateWishlistCount() {
    var count = userWishlist.size;
    var el = document.getElementById('wishlist-count');
    if (el) el.textContent = count;
    var btn = document.getElementById('btn-wishlist-page');
    if (btn) btn.style.display = currentUser && count > 0 ? 'flex' : (currentUser ? 'flex' : 'none');
}

function refreshWishlistHearts() {
    document.querySelectorAll('.wishlist-heart').forEach(function(btn) {
        var pid = String(btn.dataset.id);
        var icon = btn.querySelector('i');
        var wished = userWishlist.has(pid);
        if (icon) icon.className = wished ? 'fas fa-heart' : 'far fa-heart';
        btn.classList.toggle('wished', wished);
    });
    updateWishlistCount();
}

// ========================
// WISHLIST PAGE
// ========================
function toggleWishlistPage() {
    var page = document.getElementById('wishlist-page');
    if (!page) return;
    var isOpen = page.style.display === 'block';
    if (isOpen) {
        closeWishlistPage();
    } else {
        page.style.display = 'block';
        document.body.style.overflow = 'hidden';
        renderWishlistPage();
    }
}

function closeWishlistPage() {
    var page = document.getElementById('wishlist-page');
    if (page) page.style.display = 'none';
    document.body.style.overflow = '';
}

function renderWishlistPage() {
    var grid = document.getElementById('wishlist-grid');
    if (!grid) return;

    var wishedProducts = allProducts.filter(function(p) {
        return userWishlist.has(String(p.id));
    });

    var badge = document.getElementById('wishlist-count-badge');
    if (badge) badge.textContent = wishedProducts.length;

    if (wishedProducts.length === 0) {
        grid.innerHTML = '<div class="wishlist-empty"><i class="far fa-heart"></i><p>Belum ada produk tersimpan</p><small>Tekan ❤️ di produk untuk menyimpannya</small></div>';
        return;
    }

    grid.innerHTML = wishedProducts.map(function(p) {
        var img = (p.images && p.images[0]) || p.image || '';
        var price = p.price ? 'Rp ' + parseInt(p.price).toLocaleString('id-ID') : '';
        return '<div class="wl-card" onclick="closeWishlistPage();setTimeout(function(){openProductDetail(\''+p.id+'\')},100)">' +
            '<div class="wl-img-wrap"><img src="' + img + '" alt="' + p.name + '" loading="lazy"></div>' +
            '<div class="wl-info">' +
                '<h4>' + p.name + '</h4>' +
                (price ? '<div class="wl-price">' + price + '</div>' : '') +
            '</div>' +
            '<button class="wl-remove" onclick="event.stopPropagation();toggleWishlist(\''+p.id+'\');setTimeout(renderWishlistPage,300)" title="Hapus">' +
                '<i class="fas fa-trash-alt"></i>' +
            '</button>' +
        '</div>';
    }).join('');
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


// ========================
// PRODUCT DETAIL POPUP
// ========================
function openProductDetail(productId) {
    var product = allProducts.find(function(p) { return p.id == productId; });
    if (!product) return;

    var existing = document.getElementById('product-detail-modal');
    if (existing) existing.remove();

    var images = [];
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
        images = product.images;
    } else if (product.image) {
        images = [product.image];
    }

    var affLink = product.affiliatelink || '#';
    var catName = product.categoryName || categoryNameMap[String(product.category)] || product.category || '';
    var parsedVid = parseVideoUrl(product.video);

    // Format harga
    function fmtPrice(n) {
        return n ? 'Rp ' + parseInt(n).toLocaleString('id-ID') : '';
    }

    var modal = document.createElement('div');
    modal.id = 'product-detail-modal';
    modal.innerHTML =
        '<div class="pdm-backdrop" onclick="closeProductDetail()"></div>' +
        '<div class="pdm-container">' +
            '<button class="pdm-close" onclick="closeProductDetail()"><i class="fas fa-times"></i></button>' +

            // Image gallery
            '<div class="pdm-gallery">' +
                '<div class="pdm-main-img-wrap" id="pdm-main-wrap">' +
                    '<img id="pdm-main-img" src="' + (images[0] || '') + '" alt="' + product.name + '" onclick="openLightbox(this.src, 0, ' + JSON.stringify(images).replace(/"/g,'&quot;') + ')">' +
                    (parsedVid ? '<button class="pdm-video-btn" data-embed="' + parsedVid.embed + '" data-type="' + parsedVid.type + '" onclick="openVideoPopup(this.dataset.embed,this.dataset.type,event)"><i class="fas fa-play-circle"></i> Tonton Video</button>' : '') +
                '</div>' +
                (images.length > 1 ?
                    '<div class="pdm-thumbs">' +
                        images.map(function(img, i) {
                            return '<img src="' + img + '" class="pdm-thumb' + (i===0?' active':'') + '" onclick="pdmSetImg(this.src,this)">';
                        }).join('') +
                    '</div>'
                : '') +
            '</div>' +

            // Info section
            '<div class="pdm-info">' +
                (catName ? '<div class="pdm-category"><i class="fas fa-tag"></i> ' + catName + '</div>' : '') +
                '<h2 class="pdm-title">' + product.name + '</h2>' +

                // Harga
                (product.price ?
                    '<div class="pdm-price-wrap">' +
                        '<span class="pdm-price">' + fmtPrice(product.price) + '</span>' +
                        (product.originalprice && product.originalprice > product.price ?
                            '<span class="pdm-original">' + fmtPrice(product.originalprice) + '</span>' +
                            '<span class="pdm-discount">Hemat ' + Math.round((1 - product.price/product.originalprice)*100) + '%</span>'
                        : '') +
                    '</div>'
                : '') +

                // Rating
                (product.rating ?
                    '<div class="pdm-rating">' +
                        '<span class="pdm-stars">' + '★'.repeat(Math.round(product.rating)) + '☆'.repeat(5-Math.round(product.rating)) + '</span>' +
                        '<span class="pdm-rating-num">' + product.rating + '</span>' +
                        (product.reviews ? '<span class="pdm-reviews">(' + product.reviews + ' ulasan)</span>' : '') +
                    '</div>'
                : '') +

                // Stats
                '<div class="pdm-stats">' +
                    (product.clicks ? '<span><i class="fas fa-mouse-pointer"></i> ' + product.clicks + ' klik</span>' : '') +
                '</div>' +

                // Deskripsi
                (product.description ?
                    '<div class="pdm-desc">' +
                        '<div class="pdm-desc-title">Deskripsi Produk</div>' +
                        '<p>' + product.description + '</p>' +
                    '</div>'
                : '') +

                // CTA buttons
                '<div class="pdm-cta">' +
                    '<button class="pdm-btn-buy" data-link="' + affLink + '" data-id="' + product.id + '" onclick="trackAndRedirect(this.dataset.link,this.dataset.id)">' +
                        '<i class="fas fa-shopping-cart"></i> Beli Sekarang' +
                    '</button>' +
                    '<button class="pdm-btn-share" data-name="' + encodeURIComponent(product.name) + '" data-link="' + affLink + '" onclick="shareProduct(this.dataset.name,this.dataset.link)">' +
                        '<i class="fas fa-share-alt"></i>' +
                    '</button>' +
                '</div>' +
            '</div>' +
        '</div>';

    document.body.appendChild(modal);
    requestAnimationFrame(function() { modal.classList.add('open'); });
    document.body.style.overflow = 'hidden';
}

function pdmSetImg(src, el) {
    var main = document.getElementById('pdm-main-img');
    if (main) {
        main.style.opacity = '0';
        setTimeout(function() { main.src = src; main.style.opacity = '1'; }, 150);
    }
    document.querySelectorAll('.pdm-thumb').forEach(function(t) { t.classList.remove('active'); });
    if (el) el.classList.add('active');
}

function closeProductDetail() {
    var modal = document.getElementById('product-detail-modal');
    if (!modal) return;
    modal.classList.remove('open');
    setTimeout(function() { modal.remove(); }, 300);
    document.body.style.overflow = '';
}

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeProductDetail();
});

// ========================
// VIDEO POPUP
// ========================
function openVideoPopup(videoUrl, videoType, e) {
    if (e) e.stopPropagation();

    var popup = document.getElementById('video-popup');
    if (!popup) {
        popup = document.createElement('div');
        popup.id = 'video-popup';
        popup.innerHTML =
            '<div class="vp-backdrop" onclick="closeVideoPopup()"></div>' +
            '<div class="vp-container">' +
                '<button class="vp-close" onclick="closeVideoPopup()"><i class="fas fa-times"></i></button>' +
                '<div class="vp-frame-wrap" id="vp-frame-wrap"></div>' +
            '</div>';
        document.body.appendChild(popup);
    }

    var wrap = document.getElementById('vp-frame-wrap');
    wrap.innerHTML = '';

    if (videoType === 'direct') {
        // Direct mp4/webm — pakai tag <video>
        wrap.innerHTML =
            '<video id="vp-video" src="' + videoUrl + '" controls autoplay playsinline ' +
            'style="width:100%;height:100%;background:#000;"></video>';
    } else if (videoType === 'youtube') {
        wrap.innerHTML =
            '<iframe id="vp-iframe" src="' + videoUrl + '&autoplay=1" frameborder="0" ' +
            'allowfullscreen allow="autoplay; encrypted-media"></iframe>';
    } else if (videoType === 'tiktok') {
        wrap.innerHTML =
            '<iframe id="vp-iframe" src="' + videoUrl + '" frameborder="0" ' +
            'allowfullscreen allow="autoplay; encrypted-media"></iframe>';
    } else {
        // External URL (Shopee, CDN, dll) — coba iframe dulu
        wrap.innerHTML =
            '<iframe id="vp-iframe" src="' + videoUrl + '" frameborder="0" ' +
            'allowfullscreen allow="autoplay; encrypted-media"></iframe>' +
            '<div id="vp-fallback" style="display:none;flex-direction:column;align-items:center;justify-content:center;' +
            'height:100%;color:white;gap:14px;padding:20px;text-align:center;">' +
                '<i class="fas fa-play-circle" style="font-size:48px;opacity:0.7;"></i>' +
                '<p style="font-size:14px;opacity:0.8;">Video tidak bisa ditampilkan di sini.</p>' +
                '<a href="' + videoUrl + '" target="_blank" style="background:#667eea;color:white;padding:10px 24px;' +
                'border-radius:20px;text-decoration:none;font-weight:700;font-size:14px;">' +
                    '<i class="fas fa-external-link-alt"></i> Tonton di Platform Asli' +
                '</a>' +
            '</div>';
    }

    popup.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeVideoPopup() {
    var popup = document.getElementById('video-popup');
    // Stop video/iframe
    var iframe = document.getElementById('vp-iframe');
    var video = document.getElementById('vp-video');
    if (iframe) iframe.src = '';
    if (video) { video.pause(); video.src = ''; }
    if (popup) popup.style.display = 'none';
    document.body.style.overflow = '';
}

// ========================
// VIDEO PARSER
// ========================
function parseVideoUrl(url) {
    if (!url || !url.trim()) return null;
    url = url.trim();

    // YouTube
    var ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) return { type: 'youtube', embed: 'https://www.youtube.com/embed/' + ytMatch[1] + '?rel=0' };

    // TikTok
    var ttMatch = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/);
    if (ttMatch) return { type: 'tiktok', embed: 'https://www.tiktok.com/embed/v2/' + ttMatch[1] };

    // Direct video file (mp4, webm, mov, dll)
    if (url.match(/\.(mp4|webm|mov|m4v|ogg)(\?.*)?$/i)) {
        return { type: 'direct', embed: url };
    }

    // URL lainnya (Shopee, marketplace, CDN, dll) — coba direct embed
    // Kalau bukan embed-able, fallback ke open new tab
    return { type: 'external', embed: url };
}

// ========================
// LIGHTBOX
// ========================
var lbImages = [];
var lbCurrent = 0;

function openLightbox(imgUrl, idx, imagesArr) {
    lbImages = imagesArr || [imgUrl];
    lbCurrent = idx || 0;

    // Create lightbox if not exists
    var lb = document.getElementById('lightbox-overlay');
    if (!lb) {
        lb = document.createElement('div');
        lb.id = 'lightbox-overlay';
        lb.innerHTML =
            '<div class="lb-backdrop" onclick="closeLightbox()"></div>' +
            '<div class="lb-container">' +
                '<button class="lb-close" onclick="closeLightbox()"><i class="fas fa-times"></i></button>' +
                '<button class="lb-nav lb-prev" onclick="lbGo(-1)"><i class="fas fa-chevron-left"></i></button>' +
                '<div class="lb-img-wrap">' +
                    '<img id="lb-img" src="" alt="">' +
                '</div>' +
                '<button class="lb-nav lb-next" onclick="lbGo(1)"><i class="fas fa-chevron-right"></i></button>' +
                '<div class="lb-dots" id="lb-dots"></div>' +
                '<div class="lb-counter" id="lb-counter"></div>' +
            '</div>';
        document.body.appendChild(lb);

        // Swipe support
        var touchStartX = 0;
        lb.addEventListener('touchstart', function(e){ touchStartX = e.touches[0].clientX; }, {passive:true});
        lb.addEventListener('touchend', function(e){
            var diff = touchStartX - e.changedTouches[0].clientX;
            if (Math.abs(diff) > 50) lbGo(diff > 0 ? 1 : -1);
        });

        // Keyboard support
        document.addEventListener('keydown', function(e){
            if (!document.getElementById('lightbox-overlay').style.display || document.getElementById('lightbox-overlay').style.display === 'none') return;
            if (e.key === 'ArrowRight') lbGo(1);
            if (e.key === 'ArrowLeft') lbGo(-1);
            if (e.key === 'Escape') closeLightbox();
        });
    }

    lb.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    lbRender();
}

function lbRender() {
    var img = document.getElementById('lb-img');
    var dots = document.getElementById('lb-dots');
    var counter = document.getElementById('lb-counter');
    var prev = document.querySelector('.lb-prev');
    var next = document.querySelector('.lb-next');

    if (img) {
        img.style.opacity = '0';
        img.src = lbImages[lbCurrent];
        img.onload = function(){ img.style.opacity = '1'; };
    }

    if (counter) counter.textContent = (lbCurrent + 1) + ' / ' + lbImages.length;

    // Show/hide nav
    if (prev) prev.style.display = lbImages.length > 1 ? 'flex' : 'none';
    if (next) next.style.display = lbImages.length > 1 ? 'flex' : 'none';

    // Dots
    if (dots) {
        dots.innerHTML = lbImages.length > 1 ? lbImages.map(function(_, i) {
            return '<span class="lb-dot' + (i === lbCurrent ? ' active' : '') + '" onclick="lbGoTo(' + i + ')"></span>';
        }).join('') : '';
    }
}

function lbGo(dir) {
    lbCurrent = ((lbCurrent + dir) + lbImages.length) % lbImages.length;
    lbRender();
}

function lbGoTo(i) {
    lbCurrent = i;
    lbRender();
}

function closeLightbox() {
    var lb = document.getElementById('lightbox-overlay');
    if (lb) lb.style.display = 'none';
    document.body.style.overflow = '';
}
