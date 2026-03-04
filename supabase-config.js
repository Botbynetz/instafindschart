// ========================================
// SUPABASE CONFIGURATION
// ========================================

const SUPABASE_URL = 'https://uetkbvwcqipwrgjbvlwq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Nly81h1k3aBGzBk5jiiMfw_p7QWFOu7';

// Initialize Supabase Client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { supabase, SUPABASE_URL, SUPABASE_ANON_KEY };
}
