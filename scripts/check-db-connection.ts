
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import mongoose from 'mongoose';

// Load environment variables
dotenv.config();

async function checkConnections() {
    console.log('--- Database Connection Check ---');

    // 1. Supabase Check
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
        console.log(`\nChecking Supabase connection...`);
        console.log(`URL: ${supabaseUrl}`);
        try {
            const supabase = createClient(supabaseUrl, supabaseKey);
            // Try to fetch a single row from 'users' table or just check health
            const { count, error } = await supabase.from('users').select('*', { count: 'exact', head: true });

            if (error) {
                console.error('❌ Supabase connection failed:', error.message);
            } else {
                console.log('✅ Supabase connected successfully!');
                console.log(`   (Found ${count !== null ? count : 'metadata'} records in 'users')`);
            }
        } catch (err: any) {
            console.error('❌ Supabase connection exception:', err.message);
        }
    } else {
        console.warn('\n⚠️ Supabase credentials missing (NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY).');
    }

    // 2. MongoDB Check
    const mongoUri = process.env.MONGODB_URI;
    if (mongoUri) {
        console.log(`\nChecking MongoDB connection...`);
        // Mask password
        const masked = mongoUri.replace(/:([^:@]{1,})@/, ':****@');
        console.log(`URI: ${masked}`);
        try {
            await mongoose.connect(mongoUri);
            console.log('✅ MongoDB connected successfully!');

            const connectionState = mongoose.connection.readyState;
            const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
            console.log(`   State: ${states[connectionState]}`);

            await mongoose.disconnect();
        } catch (err: any) {
            console.error('❌ MongoDB connection failed:', err.message);
        }
    } else {
        console.log('\nℹ️ MONGODB_URI not found. Skipping MongoDB check.');
    }

    // 3. FastAPI Check
    const fastapiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000';
    console.log(`\nChecking FastAPI backend...`);
    console.log(`URL: ${fastapiUrl}`);
    try {
        const res = await fetch(`${fastapiUrl}/docs`);
        if (res.ok) {
            console.log('✅ FastAPI backend is reachable!');
        } else {
            console.error(`❌ FastAPI reachable but returned status ${res.status}`);
        }
    } catch (err: any) {
        console.error('❌ FastAPI not reachable:', err.message);
        console.log('   (Is the backend running?)');
        if (err.cause) console.error('   Cause:', err.cause);
    }

    console.log('\n--- Check Complete ---');
}

checkConnections();
