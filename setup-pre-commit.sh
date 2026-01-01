#!/bin/bash

# Setup script to install pre-commit hook
# This script creates the pre-commit hook that runs npm run build before commits

echo "🔧 Setting up pre-commit hook..."

# Create hooks directory if it doesn't exist
mkdir -p .git/hooks

# Create pre-commit hook
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/sh

# Pre-commit hook to run npm run build before committing
# This ensures the code builds successfully before commit

echo "🔨 Running build before commit..."
echo ""

# Run the build command
npm run build

# Check if build was successful
if [ $? -ne 0 ]; then
  echo ""
  echo "❌ Build failed! Please fix the errors before committing."
  echo ""
  exit 1
fi

echo ""
echo "✅ Build successful! Proceeding with commit..."
echo ""

exit 0
EOF

# Make the hook executable
chmod +x .git/hooks/pre-commit

echo "✅ Pre-commit hook installed successfully!"
echo ""
echo "Now, every time you commit, it will automatically run 'npm run build' first."
echo "If the build fails, the commit will be cancelled."

