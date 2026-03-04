// ========================
// SUPABASE CONFIGURATION  
// ========================
(function() {
    if (window.supabaseInitialized) return;

    var url = 'https://uetkbvwcqipwrgjbvlwq.supabase.co';
    var key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVldGtidndjcWlwd3JnamJ2bHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MjU3MDgsImV4cCI6MjA4ODIwMTcwOH0.TLVOrBbN9JmU8uC-Lw-jRJXaplUf1Ltkf6CRaNmDN2k';

    var lib = window.supabase;
    window.supabase = lib.createClient(url, key);
    window.supabaseInitialized = true;

    console.log('Supabase OK');
})();
