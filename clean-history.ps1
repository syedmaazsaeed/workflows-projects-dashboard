# PowerShell script to clean git history of large files
# Run this script from the project root

Write-Host "Cleaning git history of large files..." -ForegroundColor Yellow

# Step 1: Remove from entire git history using filter-branch
Write-Host "`nStep 1: Removing node_modules from git history..." -ForegroundColor Cyan
git filter-branch --force --index-filter "git rm -rf --cached --ignore-unmatch frontend/node_modules backend/node_modules" --prune-empty --tag-name-filter cat -- --all

Write-Host "`nStep 2: Removing .next from git history..." -ForegroundColor Cyan
git filter-branch --force --index-filter "git rm -rf --cached --ignore-unmatch frontend/.next" --prune-empty --tag-name-filter cat -- --all

Write-Host "`nStep 3: Removing dist from git history..." -ForegroundColor Cyan
git filter-branch --force --index-filter "git rm -rf --cached --ignore-unmatch backend/dist" --prune-empty --tag-name-filter cat -- --all

# Step 2: Clean up references
Write-Host "`nStep 4: Cleaning up references..." -ForegroundColor Cyan
git for-each-ref --format="delete %(refname)" refs/original | git update-ref --stdin
git reflog expire --expire=now --all
git gc --prune=now --aggressive

Write-Host "`n✅ Git history cleaned!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Verify: git status" -ForegroundColor White
Write-Host "2. Commit current changes: git commit -m 'Remove large files and add .gitignore'" -ForegroundColor White
Write-Host "3. Force push: git push origin --force --all" -ForegroundColor White
Write-Host "`n⚠️  WARNING: Force push rewrites history. Only do this if you're the only contributor!" -ForegroundColor Red

