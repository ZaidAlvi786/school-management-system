
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load root .env to compare
const rootEnvPath = path.join(process.cwd(), '.env');
const backendEnvPath = path.join(process.cwd(), 'backend', '.env');

try {
    const rootEnv = dotenv.parse(fs.readFileSync(rootEnvPath, 'utf8'));

    if (fs.existsSync(backendEnvPath)) {
        const backendEnv = dotenv.parse(fs.readFileSync(backendEnvPath, 'utf8'));

        const rootSecret = rootEnv.NEXTAUTH_SECRET;
        const backendSecret = backendEnv.NEXTAUTH_SECRET || backendEnv.JWT_SECRET;

        console.log('--- Secret Key Comparison ---');
        console.log(`Root .env has NEXTAUTH_SECRET? ${rootSecret ? 'YES' : 'NO'}`);
        console.log(`Backend .env has Secret? ${backendSecret ? 'YES' : 'NO'}`);

        if (rootSecret && backendSecret) {
            if (rootSecret === backendSecret) {
                console.log('✅ Secrets MATCH perfectly.');
            } else {
                console.log('❌ Secrets DO NOT MATCH.');
                console.log(`   Root length: ${rootSecret.length}`);
                console.log(`   Backend length: ${backendSecret.length}`);
                console.log('   Please ensure they are identical strings.');
            }
        }
    } else {
        console.log('❌ backend/.env file NOT FOUND.');
    }
} catch (err) {
    console.error('Error:', err.message);
}
