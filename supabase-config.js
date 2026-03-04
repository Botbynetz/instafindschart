// ========================================
// SUPABASE FUNCTIONS
// ========================================

// Safety check: Wait for supabase to be available
function waitForSupabase() {
    return new Promise((resolve) => {
        if (typeof window.supabase !== 'undefined') {
            resolve(window.supabase);
        } else {
            const checkInterval = setInterval(() => {
                if (typeof window.supabase !== 'undefined') {
                    clearInterval(checkInterval);
                    resolve(window.supabase);
                }
            }, 100);
            // Timeout after 5 seconds
            setTimeout(() => clearInterval(checkInterval), 5000);
        }
    });
}

// Get supabase instance
async function getSupabaseClient() {
    return await waitForSupabase();
}

// ========================
// TAMBAH PRODUK KE SUPABASE
// ========================
async function tambahProdukSupabase(productData) {
    try {
        // Jika platforms adalah array, convert ke JSON string untuk disimpan
        const platforms = Array.isArray(productData.platforms) 
            ? productData.platforms 
            : [];

        const { data, error } = await supabase
            .from('products')
            .insert([
                {
                    id: productData.id,  // Pakai ID yang sama dari localStorage
                    name: productData.name,
                    image: productData.image,
                    category: productData.category,
                    originalPrice: productData.originalPrice,
                    price: productData.price,
                    discount: productData.discount || 0,
                    rating: productData.rating || 4.5,
                    reviews: productData.reviews || 0,
                    description: productData.description,
                    affiliateLink: productData.affiliateLink,
                    platforms: platforms,
                    clicks: productData.clicks || 0,
                    views: productData.views || 0,
                    createdAt: productData.createdAt || new Date().toISOString()
                }
            ])
            .select();

        if (error) {
            console.error('❌ Error tambah produk:', error.message);
            throw new Error(error.message);
        }

        console.log('✅ Produk berhasil ditambahkan ke Supabase:', data);
        return { success: true, data: data[0] };
    } catch (err) {
        console.error('❌ Error:', err.message);
        return { success: false, error: err.message };
    }
}

// ========================
// UPDATE PRODUK DI SUPABASE
// ========================
async function updateProdukSupabase(productId, productData) {
    try {
        const platforms = Array.isArray(productData.platforms) 
            ? productData.platforms 
            : [];

        const { data, error } = await supabase
            .from('products')
            .update({
                name: productData.name,
                image: productData.image,
                category: productData.category,
                originalPrice: productData.originalPrice,
                price: productData.price,
                discount: productData.discount || 0,
                rating: productData.rating || 4.5,
                reviews: productData.reviews || 0,
                description: productData.description,
                affiliateLink: productData.affiliateLink,
                platforms: platforms,
                updatedAt: new Date().toISOString()
            })
            .eq('id', productId)
            .select();

        if (error) {
            console.error('❌ Error update produk:', error.message);
            throw new Error(error.message);
        }

        console.log('✅ Produk berhasil diupdate di Supabase:', data);
        return { success: true, data: data[0] };
    } catch (err) {
        console.error('❌ Error:', err.message);
        return { success: false, error: err.message };
    }
}

// ========================
// AMBIL SEMUA PRODUK DARI SUPABASE
// ========================
async function ambilProdukSupabase() {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('createdAt', { ascending: false });

        if (error) {
            console.error('❌ Error ambil produk:', error.message);
            throw new Error(error.message);
        }

        console.log('✅ Produk berhasil diambil dari Supabase:', data);
        return { success: true, data: data || [] };
    } catch (err) {
        console.error('❌ Error:', err.message);
        return { success: false, error: err.message, data: [] };
    }
}

// ========================
// AMBIL PRODUK BERDASARKAN KATEGORI
// ========================
async function ambilProdukByKategoriSupabase(categoryId) {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('category', categoryId)
            .order('createdAt', { ascending: false });

        if (error) {
            console.error('❌ Error ambil produk by kategori:', error.message);
            throw new Error(error.message);
        }

        return { success: true, data: data || [] };
    } catch (err) {
        console.error('❌ Error:', err.message);
        return { success: false, error: err.message, data: [] };
    }
}

// ========================
// HAPUS PRODUK DARI SUPABASE
// ========================
async function hapusProdukSupabase(productId) {
    try {
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', productId);

        if (error) {
            console.error('❌ Error hapus produk:', error.message);
            throw new Error(error.message);
        }

        console.log('✅ Produk berhasil dihapus dari Supabase');
        return { success: true };
    } catch (err) {
        console.error('❌ Error:', err.message);
        return { success: false, error: err.message };
    }
}

// ========================
// UPDATE CLICKS/VIEWS
// ========================
async function updateProductClicks(productId, clicks, views) {
    try {
        const { data, error } = await supabase
            .from('products')
            .update({
                clicks: clicks,
                views: views,
                updatedAt: new Date().toISOString()
            })
            .eq('id', productId)
            .select();

        if (error) {
            console.error('❌ Error update clicks:', error.message);
            return { success: false };
        }

        return { success: true };
    } catch (err) {
        console.error('❌ Error:', err.message);
        return { success: false };
    }
}

// ========================
// RESET SEMUA DATA
// ========================
async function resetSemuaDataSupabase() {
    try {
        const { error } = await supabase
            .from('products')
            .delete()
            .neq('id', ''); // Delete all rows

        if (error) {
            console.error('❌ Error reset data:', error.message);
            throw new Error(error.message);
        }

        console.log('✅ Semua data berhasil direset di Supabase');
        return { success: true };
    } catch (err) {
        console.error('❌ Error:', err.message);
        return { success: false, error: err.message };
    }
}

// ========================
// EXPORT FUNCTIONS
// ========================
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        tambahProdukSupabase,
        updateProdukSupabase,
        ambilProdukSupabase,
        ambilProdukByKategoriSupabase,
        hapusProdukSupabase,
        updateProductClicks,
        resetSemuaDataSupabase
    };
}
