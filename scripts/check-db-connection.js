
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
dotenv.config();

async function checkConnections() {
    console.log('--- Database Connection Check (Supabase) ---');

    // 1. Supabase Check
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
        console.log('\nChecking Supabase connection...');
        console.log(`URL: ${supabaseUrl}`);
        try {
            const supabase = createClient(supabaseUrl, supabaseKey);
            const { count, error } = await supabase.from('users').select('*', { count: 'exact', head: true });

            if (error) {
                console.error('❌ Supabase connection failed:', error.message);
                if (error.code) console.error(`   Code: ${error.code}`);
            } else {
                console.log('✅ Supabase connected successfully!');
            }
        } catch (err) {
            console.error('❌ Supabase connection exception:', err.message);
        }
    } else {
        console.warn('\n⚠️ Supabase credentials missing (NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY).');
        console.log('   Please check your .env file or environment variables.');
    }

    // Check for MONGODB_URI just to inform user
    if (process.env.MONGODB_URI) {
        console.log('\nℹ️ MONGODB_URI is present in environment, but skipped check due to library incompatibility.');
        const masked = process.env.MONGODB_URI.replace(/:([^:@]{1,})@/, ':****@');
        console.log(`   URI: ${masked}`);
    } else {
        console.log('\nℹ️ MONGODB_URI not found.');
    }

    console.log('\n--- Check Complete ---');
}

checkConnections();
