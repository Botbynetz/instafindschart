// ========================
// SUPABASE CONFIGURATION
// ========================
if (typeof window.supabaseInitialized === 'undefined') {
    const SUPABASE_URL = 'https://uetkbvwcqipwrgjbvlwq.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_Nly81h1k3aBGzBk5jiiMfw_p7QWFOu7';

    // Simpan referensi library sebelum di-overwrite
    const supabaseLib = window.supabase;
    const supabaseClient = supabaseLib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Set ke window untuk akses global
    window.supabase = supabaseClient;
    window.supabaseInitialized = true;

    console.log('✅ Supabase initialized successfully');
}
