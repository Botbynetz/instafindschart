// ========================================
// SUPABASE CONFIGURATION
// ========================================

// Prevent duplicate initialization
if (typeof window.supabaseInitialized === 'undefined') {
    const SUPABASE_URL = 'https://uetkbvwcqipwrgjbvlwq.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_Nly81h1k3aBGzBk5jiiMfw_p7QWFOu7';

    // Initialize Supabase Client
    // window.supabase here refers to the library's createClient function
    const supabaseLib = window.supabase;
    const supabaseClient = supabaseLib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Store in window object for global access (overwrite library ref with client instance)
    window.supabase = supabaseClient;
    window.SUPABASE_URL = SUPABASE_URL;
    window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
    window.supabaseInitialized = true;

    console.log('✅ Supabase initialized successfully');
}
