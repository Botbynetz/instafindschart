// ========================
// SUPABASE CONFIGURATION
// ========================
if (typeof window.supabaseInitialized === 'undefined') {
    const SUPABASE_URL = 'https://uetkbvwcqipwrgjbvlwq.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVldGtidndjcWlwd3JnamJ2bHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MjU3MDgsImV4cCI6MjA4ODIwMTcwOH0.TLVOrBbN9JmU8uC-Lw-jRJXaplUf1Ltkf6CRaNmDN2k;

    // Simpan referensi library sebelum di-overwrite
    const supabaseLib = window.supabase;
    const supabaseClient = supabaseLib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Set ke window untuk akses global
    window.supabase = supabaseClient;
    window.supabaseInitialized = true;

    console.log('✅ Supabase initialized successfully');
}
