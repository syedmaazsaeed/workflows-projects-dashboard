# Clean Git History - Remove Large Files

## Problem
GitHub rejected push because large files (117MB+) are in git history:
- `frontend/node_modules/@next/swc-win32-x64-msvc/next-swc.win32-x64-msvc.node` (117.69 MB)

## Solution: Clean Git History

### Step 1: Remove from Current Index (Already Done ✅)
```bash
git rm -r --cached backend/node_modules
git rm -r --cached frontend/.next
git rm -r --cached backend/dist
```

### Step 2: Remove from Entire Git History

Since the large file is in git history, you need to rewrite history:

#### Option A: Using git filter-branch (Built-in)

```bash
# Remove node_modules from entire history
git filter-branch --force --index-filter "git rm -rf --cached --ignore-unmatch frontend/node_modules backend/node_modules" --prune-empty --tag-name-filter cat -- --all

# Remove .next from entire history
git filter-branch --force --index-filter "git rm -rf --cached --ignore-unmatch frontend/.next" --prune-empty --tag-name-filter cat -- --all

# Remove dist from entire history
git filter-branch --force --index-filter "git rm -rf --cached --ignore-unmatch backend/dist" --prune-empty --tag-name-filter cat -- --all

# Clean up
git for-each-ref --format="delete %(refname)" refs/original | git update-ref --stdin
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

#### Option B: Using BFG Repo-Cleaner (Faster, Recommended)

1. Download BFG: https://rtyley.github.io/bfg-repo-cleaner/
2. Run:
```bash
java -jar bfg.jar --delete-folders node_modules
java -jar bfg.jar --delete-folders .next
java -jar bfg.jar --delete-folders dist
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

#### Option C: Start Fresh (Easiest if you haven't pushed much)

```bash
# Create new orphan branch
git checkout --orphan clean-main

# Add all files (respecting .gitignore)
git add .

# Commit
git commit -m "Initial commit - cleaned repository"

# Replace old main
git branch -D main
git branch -m main

# Force push (WARNING: This rewrites history!)
git push -f origin main
```

### Step 3: Verify Large Files Are Gone

```bash
# Check for files over 50MB
git rev-list --objects --all | git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | Where-Object { $_ -match '^blob' } | ForEach-Object { $parts = $_ -split '\s+'; if ([int]$parts[2] -gt 52428800) { [PSCustomObject]@{SizeMB=[math]::Round([int]$parts[2]/1MB,2); Path=$parts[3..($parts.Length-1)] -join ' '} } } | Sort-Object SizeMB -Descending
```

Should show NO files over 50MB.

### Step 4: Force Push (If Already Pushed)

```bash
# WARNING: Only do this if you're the only one working on the repo
# or coordinate with your team first!

git push origin --force --all
git push origin --force --tags
```

## Quick Fix Script (All-in-One)

```bash
# 1. Remove from index (if not already done)
git rm -r --cached backend/node_modules frontend/node_modules frontend/.next backend/dist 2>$null

# 2. Add .gitignore files
git add .gitignore frontend/.gitignore backend/.gitignore .gitattributes

# 3. Commit removal
git commit -m "Remove large files and add .gitignore"

# 4. Clean history (choose one method above)

# 5. Force push (if needed)
# git push origin --force --all
```

## Prevention

After fixing:
- ✅ `.gitignore` files are in place
- ✅ `node_modules/` is ignored
- ✅ `.next/` is ignored
- ✅ `dist/` is ignored
- ✅ Never commit these again!

## Verify Before Next Push

```bash
git status
# Should NOT show node_modules/, .next/, or dist/
```

