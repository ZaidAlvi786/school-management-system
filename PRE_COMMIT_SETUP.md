# Pre-Commit Hook Setup

This project includes a pre-commit hook that automatically runs `npm run build` before each commit to ensure your code builds successfully.

## How It Works

When you try to commit code, Git will automatically:
1. Run `npm run build`
2. Check if the build was successful
3. If successful → proceed with commit
4. If failed → cancel commit and show error

## Setup

The pre-commit hook is already set up! The hook file is located at:
```
.git/hooks/pre-commit
```

## Manual Setup (if needed)

If for some reason the hook is missing, you can run:

```bash
./setup-pre-commit.sh
```

Or manually create the hook:

```bash
# Make sure you're in the project root
mkdir -p .git/hooks

# Create the pre-commit hook
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/sh
echo "🔨 Running build before commit..."
npm run build
if [ $? -ne 0 ]; then
  echo "❌ Build failed! Please fix the errors before committing."
  exit 1
fi
echo "✅ Build successful! Proceeding with commit..."
exit 0
EOF

# Make it executable
chmod +x .git/hooks/pre-commit
```

## Testing

To test if it works:

1. Make a small change to a file
2. Try to commit:
   ```bash
   git add .
   git commit -m "Test commit"
   ```
3. You should see the build running before the commit

## Skipping the Hook (if needed)

If you need to skip the pre-commit hook for a specific commit (not recommended), you can use:

```bash
git commit --no-verify -m "Your message"
```

⚠️ **Warning**: Only skip the hook if you're absolutely sure the code builds correctly!

## Troubleshooting

### Hook not running

- Make sure the file `.git/hooks/pre-commit` exists
- Make sure it's executable: `chmod +x .git/hooks/pre-commit`
- Check that Git hooks are enabled (they should be by default)

### Build takes too long

If the build is taking too long and you want to make it faster:
- The build is necessary to catch errors early
- Consider optimizing your build process
- You can temporarily skip with `--no-verify` if needed

### Build fails but code is fine

- Check for TypeScript errors: `npm run lint`
- Check for missing dependencies
- Make sure all environment variables are set (if needed for build)

## Notes

- The hook runs on every commit
- It ensures code quality by catching build errors early
- Failed builds prevent broken code from being committed
- This is especially useful before pushing to remote repositories

