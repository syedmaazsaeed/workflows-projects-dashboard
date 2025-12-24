# Removing Already-Tracked Files from Git

Some build files (`backend/dist/` and `frontend/.next/`) are already being tracked by git. 
These should be ignored. Follow these steps:

## Step 1: Remove from Git Tracking (but keep local files)

```bash
# Remove backend/dist/ from tracking
git rm -r --cached backend/dist/

# Remove frontend/.next/ from tracking
git rm -r --cached frontend/.next/

# Verify they're removed
git status
```

## Step 2: Add .gitignore files

```bash
# Add the new .gitignore files
git add .gitignore
git add frontend/.gitignore
git add backend/.gitignore
git add .gitattributes
```

## Step 3: Commit the changes

```bash
git commit -m "Add .gitignore files and remove build artifacts from tracking"
```

## Step 4: Verify

After committing, these directories should no longer appear in `git status`:
- `backend/dist/`
- `frontend/.next/`

## Alternative: One-liner

```bash
git rm -r --cached backend/dist/ frontend/.next/ && git add .gitignore frontend/.gitignore backend/.gitignore .gitattributes && git commit -m "Add .gitignore and remove build artifacts"
```

## Important Notes

- `--cached` flag removes files from git tracking but keeps them on your local disk
- These files will be regenerated when you build the project
- They should NOT be committed to the repository
- The `.gitignore` files will prevent them from being tracked in the future

