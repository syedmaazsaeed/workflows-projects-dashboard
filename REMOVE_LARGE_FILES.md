# Removing Large Files from Git History

## Problem
GitHub rejected the push because these files exceed 100MB:
- `frontend/node_modules/@next/swc-win32-x64-msvc/next-swc.win32-x64-msvc.node` (117.69 MB)
- `frontend/.next/cache/webpack/client-development/2.pack.gz` (10.22 MB)

These files should never have been committed. They're in `node_modules/` and `.next/` which should be ignored.

## Solution: Remove from Git History

### Option 1: Using git filter-branch (Recommended)

```bash
# Remove node_modules from entire git history
git filter-branch --force --index-filter "git rm -rf --cached --ignore-unmatch frontend/node_modules backend/node_modules" --prune-empty --tag-name-filter cat -- --all

# Remove .next from entire git history
git filter-branch --force --index-filter "git rm -rf --cached --ignore-unmatch frontend/.next" --prune-empty --tag-name-filter cat -- --all

# Force garbage collection
git for-each-ref --format="delete %(refname)" refs/original | git update-ref --stdin
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

### Option 2: Using git-filter-repo (Faster, but needs installation)

```bash
# Install git-filter-repo first (if not installed)
# pip install git-filter-repo

# Remove node_modules
git filter-repo --path frontend/node_modules --invert-paths
git filter-repo --path backend/node_modules --invert-paths

# Remove .next
git filter-repo --path frontend/.next --invert-paths
```

### Option 3: Simple Remove (If you haven't pushed yet)

If you haven't pushed to GitHub yet, you can simply:

```bash
# Remove from staging and tracking
git rm -r --cached frontend/node_modules
git rm -r --cached backend/node_modules
git rm -r --cached frontend/.next

# Commit the removal
git commit -m "Remove node_modules and .next from repository"

# Verify .gitignore is in place
git add .gitignore frontend/.gitignore backend/.gitignore
git commit -m "Add .gitignore files"
```

## After Removing from History

### 1. Verify .gitignore is Working
```bash
# Check that node_modules and .next are ignored
git status
# Should NOT show node_modules/ or .next/
```

### 2. Force Push (if you've already pushed)
```bash
# WARNING: This rewrites history. Only do this if you're the only one working on the repo
# or coordinate with your team first.

git push origin --force --all
git push origin --force --tags
```

### 3. Alternative: Start Fresh Branch
If you want to avoid force pushing:

```bash
# Create a new branch without the large files
git checkout --orphan clean-main
git add .
git commit -m "Initial commit without large files"
git branch -D main
git branch -m main
git push -f origin main
```

## Quick Fix Script

Run these commands in order:

```bash
# 1. Remove from current index
git rm -r --cached frontend/node_modules
git rm -r --cached backend/node_modules  
git rm -r --cached frontend/.next
git rm -r --cached backend/dist

# 2. Add .gitignore files
git add .gitignore frontend/.gitignore backend/.gitignore

# 3. Commit
git commit -m "Remove large files and add .gitignore"

# 4. If already pushed, clean history (CAREFUL!)
git filter-branch --force --index-filter "git rm -rf --cached --ignore-unmatch frontend/node_modules backend/node_modules frontend/.next backend/dist" --prune-empty --tag-name-filter cat -- --all

# 5. Clean up
git for-each-ref --format="delete %(refname)" refs/original | git update-ref --stdin
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# 6. Force push (only if needed)
# git push origin --force --all
```

## Prevention

After fixing, ensure:
- ✅ `.gitignore` files are in place
- ✅ `node_modules/` is ignored
- ✅ `.next/` is ignored
- ✅ `dist/` is ignored
- ✅ Never commit these directories again

## Verify Before Pushing

```bash
# Check file sizes
git ls-files | ForEach-Object { $size = (Get-Item $_ -ErrorAction SilentlyContinue).Length; if ($size -gt 50MB) { Write-Host "$_ : $([math]::Round($size/1MB,2)) MB" } }

# Should show NO files over 50MB
```

