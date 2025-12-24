# Quick Fix for Large Files Issue

## The Problem
GitHub rejected your push because `frontend/node_modules/@next/swc-win32-x64-msvc/next-swc.win32-x64-msvc.node` (117MB) exceeds the 100MB limit.

## Quick Solution (Choose One)

### Option 1: Clean History Script (Recommended)

Run the PowerShell script:
```powershell
.\clean-history.ps1
```

Then:
```bash
# Commit the removal
git commit -m "Remove large files and add .gitignore"

# Force push (WARNING: Rewrites history!)
git push origin --force --all
```

### Option 2: Manual Clean History

```bash
# Remove from history
git filter-branch --force --index-filter "git rm -rf --cached --ignore-unmatch frontend/node_modules backend/node_modules frontend/.next backend/dist" --prune-empty --tag-name-filter cat -- --all

# Clean up
git for-each-ref --format="delete %(refname)" refs/original | git update-ref --stdin
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Commit
git commit -m "Remove large files and add .gitignore"

# Force push
git push origin --force --all
```

### Option 3: Start Fresh Branch (Easiest)

If you haven't pushed much or are okay starting fresh:

```bash
# Create new clean branch
git checkout --orphan clean-main

# Add all files (respecting .gitignore)
git add .

# Commit
git commit -m "Initial commit - cleaned repository"

# Replace main branch
git branch -D main
git branch -m main

# Force push
git push -f origin main
```

## What We've Already Done ✅

1. ✅ Removed `backend/node_modules` from tracking
2. ✅ Removed `frontend/.next` from tracking
3. ✅ Removed `backend/dist` from tracking
4. ✅ Added `.gitignore` files
5. ✅ Files are staged for commit

## Next Steps

1. **Clean git history** (use one of the options above)
2. **Commit the changes**: `git commit -m "Remove large files and add .gitignore"`
3. **Verify**: `git status` (should NOT show node_modules, .next, or dist)
4. **Force push**: `git push origin --force --all` (if already pushed before)

## ⚠️ Important Notes

- **Force push rewrites history** - Only do this if you're the only contributor
- If others are working on the repo, coordinate with them first
- After force push, others will need to: `git fetch origin` then `git reset --hard origin/main`

## Verify It Worked

After cleaning, check for large files:
```bash
git rev-list --objects --all | git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | Where-Object { $_ -match '^blob' } | ForEach-Object { $parts = $_ -split '\s+'; if ([int]$parts[2] -gt 52428800) { Write-Host "$([math]::Round([int]$parts[2]/1MB,2)) MB - $($parts[3..($parts.Length-1)] -join ' ')" } }
```

Should show NO files over 50MB.

