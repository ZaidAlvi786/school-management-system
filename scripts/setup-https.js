const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

console.log('🔐 Setting up HTTPS for local development...\n');

// Check if mkcert is installed
try {
  execSync('which mkcert', { stdio: 'ignore' });
} catch (error) {
  console.error('❌ mkcert is not installed!\n');
  console.log('📦 Install mkcert:');
  console.log('   macOS: brew install mkcert');
  console.log('   Linux: See https://github.com/FiloSottile/mkcert#installation');
  console.log('   Windows: See https://github.com/FiloSottile/mkcert#windows\n');
  process.exit(1);
}

// Install local CA
console.log('📝 Installing local certificate authority...');
try {
  execSync('mkcert -install', { stdio: 'inherit' });
  console.log('✅ Local CA installed\n');
} catch (error) {
  console.error('❌ Failed to install local CA');
  process.exit(1);
}

// Get local network IPs
const networkInterfaces = os.networkInterfaces();
const localIPs = ['192.168.1.102'];
for (const interfaceName of Object.keys(networkInterfaces)) {
  for (const iface of networkInterfaces[interfaceName] || []) {
    if (iface.family === 'IPv4' && !iface.internal) {
      localIPs.push(iface.address);
    }
  }
}

// Generate certificate for attendance.local (primary) and localhost (fallback)
// Note: You can also generate just for attendance.local: mkcert attendance.local
const domains = ['attendance.local', 'localhost', '127.0.0.1', ...localIPs];
console.log(`🔑 Generating certificate for: ${domains.join(', ')}...\n`);
console.log(`💡 Primary domain: attendance.local (for WebAuthn)\n`);

try {
  execSync(`mkcert ${domains.join(' ')}`, { stdio: 'inherit', cwd: __dirname + '/..' });
  
  // Find the generated certificate files (mkcert may name them differently)
  const fs = require('fs');
  const files = fs.readdirSync(__dirname + '/..');
  const certFile = files.find(f => f.endsWith('.pem') && !f.endsWith('-key.pem'));
  const keyFile = files.find(f => f.endsWith('-key.pem'));
  
  console.log('\n✅ SSL certificates generated successfully!');
  if (certFile && keyFile) {
    console.log(`   - ${certFile}`);
    console.log(`   - ${keyFile}\n`);
  } else {
    console.log('   - Certificate files created\n');
  }
  
  console.log('\n📱 Access URLs:');
  console.log('   - https://localhost:3000');
  console.log('   - https://attendance.local:3000 (recommended for WebAuthn)');
  if (localIPs.length > 0) {
    console.log('   - https://' + localIPs[0] + ':3000 (fallback)');
  }
  console.log('\n💡 Configure hosts file to use attendance.local:');
  console.log('   macOS/Linux: sudo nano /etc/hosts (add: YOUR_IP attendance.local)');
  console.log('   Windows: C:\\Windows\\System32\\drivers\\etc\\hosts (add: YOUR_IP attendance.local)');
  console.log('\n   Note: You may see a security warning on first visit - this is normal for local certificates.\n');
} catch (error) {
  console.error('❌ Failed to generate certificates');
  process.exit(1);
}

