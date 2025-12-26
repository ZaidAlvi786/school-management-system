const { createServer } = require('https');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Certificate paths - use attendance.local certificates
const certPath = path.join(__dirname, 'attendance.local.pem');
const keyPath = path.join(__dirname, 'attendance.local-key.pem');

// Fallback to auto-detected certificates if attendance.local certs don't exist
const findCertificateFiles = () => {
  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    return { cert: certPath, key: keyPath };
  }
  
  // Fallback: try to find any certificate files
  const files = fs.readdirSync(__dirname);
  const certFile = files.find(f => f.endsWith('.pem') && !f.endsWith('-key.pem'));
  const keyFile = files.find(f => f.endsWith('-key.pem'));
  
  if (certFile && keyFile) {
    return {
      cert: path.join(__dirname, certFile),
      key: path.join(__dirname, keyFile)
    };
  }
  
  // Final fallback to default names
  return {
    cert: path.join(__dirname, 'localhost.pem'),
    key: path.join(__dirname, 'localhost-key.pem')
  };
};

const { cert: finalCertPath, key: finalKeyPath } = findCertificateFiles();

// Check if certificates exist
if (!fs.existsSync(finalCertPath) || !fs.existsSync(finalKeyPath)) {
  console.error('\n❌ SSL certificates not found!');
  console.error('Please run: npm run setup:https');
  console.error('Or generate manually: mkcert attendance.local\n');
  process.exit(1);
}

app.prepare().then(() => {
  const httpsOptions = {
    key: fs.readFileSync(finalKeyPath),
    cert: fs.readFileSync(finalCertPath),
  };

  createServer(httpsOptions, async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  }).listen(port, hostname, (err) => {
    if (err) throw err;
    console.log(`\n✅ HTTPS Server Ready!`);
    console.log(`\n🌐 Access URLs:`);
    console.log(`   - https://attendance.local:${port} (recommended)`);
    console.log(`   - https://localhost:${port}`);
    console.log(`\n📱 For mobile access:`);
    console.log(`   - Configure hosts file on mobile: YOUR_IP attendance.local`);
    console.log(`   - Or use: https://YOUR_LOCAL_IP:${port}`);
    console.log(`\n💡 QR codes will use: https://attendance.local:${port}`);
    console.log(`   WebAuthn rpId: attendance.local\n`);
  });
});

