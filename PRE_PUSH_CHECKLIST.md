# Pre-Push Checklist ✅

## Before Pushing to GitHub

### 1. Verify .gitignore is Working ✅
```bash
git status
# Should NOT show:
# - .env files
# - node_modules/
# - backend/dist/
# - frontend/.next/
# - build outputs
```

### 2. Remove Already-Tracked Build Files ⚠️
If `backend/dist/` or `frontend/.next/` appear in `git status`, remove them:
```bash
git rm -r --cached backend/dist/ frontend/.next/
```

### 3. Add New Files ✅
```bash
# Add .gitignore files
git add .gitignore
git add frontend/.gitignore
git add backend/.gitignore
git add .gitattributes

# Add new feature files
git add frontend/app/(protected)/analytics/
git add frontend/app/(protected)/settings/
git add frontend/components/
git add frontend/lib/export-utils.ts
git add frontend/lib/use-toast.ts

# Add documentation
git add *.md
```

### 4. Review Changes ✅
```bash
git status
# Review what will be committed
```

### 5. Commit ✅
```bash
git commit -m "Add professional features: analytics, notifications, export/import, global search"
```

### 6. Push to GitHub ✅
```bash
git push origin main
# or
git push origin master
```

## Files That Should NOT Be Committed

- ❌ `.env` (any variant)
- ❌ `node_modules/`
- ❌ `backend/dist/`
- ❌ `frontend/.next/`
- ❌ `frontend/build/`
- ❌ `*.log`
- ❌ `.DS_Store`
- ❌ IDE configuration files (unless shared)

## Files That SHOULD Be Committed

- ✅ `env.example` (template)
- ✅ `package.json` and `package-lock.json`
- ✅ Source code (`.ts`, `.tsx`, `.js`, `.jsx`)
- ✅ Configuration files
- ✅ `.gitignore` files
- ✅ Documentation (`.md` files)
- ✅ Docker files
- ✅ Database init scripts

## Security Check

Before pushing, ensure:
- ✅ No API keys in code
- ✅ No passwords in code
- ✅ No `.env` files committed
- ✅ `env.example` exists as template
- ✅ All secrets are in `.env` (ignored)

## Quick Commands

```bash
# Check what will be committed
git status

# See detailed changes
git diff

# Add all (respecting .gitignore)
git add .

# Commit
git commit -m "Your commit message"

# Push
git push origin main
```

