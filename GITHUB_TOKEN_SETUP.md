# GitHub Token Setup for Auto-Translation

## Why Needed?
The auto-translation system needs to commit translated keys back to your GitHub repository after each deployment.

## Steps to Create GitHub Token

### 1. Go to GitHub Settings
- Open: https://github.com/settings/tokens
- Or: GitHub.com → Your profile picture (top right) → Settings → Developer settings → Personal access tokens → Tokens (classic)

### 2. Generate New Token
- Click **"Generate new token"** → **"Generate new token (classic)"**
- **Note/Name:** "Sell More Auto Translations"
- **Expiration:** Choose "No expiration" (or 90 days if you prefer)

### 3. Select Permissions
Check these boxes:
- ✅ **repo** (Full control of private repositories)
  - This includes: repo:status, repo_deployment, public_repo, repo:invite, security_events

### 4. Generate and Copy Token
- Scroll down, click **"Generate token"**
- **IMPORTANT:** Copy the token immediately (starts with `ghp_...`)
- You won't be able to see it again!

### 5. Add to Softgen Environment Variables

#### In Softgen Interface:
1. Click **Settings** (⚙️ icon, top right)
2. Go to **"Environment"** tab
3. Add these three variables:

```
GITHUB_TOKEN=ghp_your_token_here
GITHUB_REPO_OWNER=your-github-username
GITHUB_REPO_NAME=your-repo-name
```

**Example:**
```
GITHUB_TOKEN=ghp_abc123xyz789...
GITHUB_REPO_OWNER=johndoe
GITHUB_REPO_NAME=sell-more-pos
```

### 6. Save and Restart
- Click **"Save"**
- Restart your Next.js server (use "Restart Server" button in Softgen)

---

## How to Use After Setup

### Option 1: Manual Trigger (Simple)
After deploying, visit:
```
https://your-app.vercel.app/api/translate-orphaned
```

### Option 2: Automatic (Advanced)
Add this to your deployment script or CI/CD:
```bash
curl -X POST https://your-app.vercel.app/api/translate-orphaned
```

---

## Workflow Example

### 1. Developer adds new feature:
```typescript
// src/lib/translations.ts
export const translations = {
  en: { 
    "new_feature": "New Feature",
    "save_button": "Save Changes"
  },
  id: { }, // ← Empty, will be filled automatically
  zh: { }  // ← Empty, will be filled automatically
}
```

### 2. Deploy to Vercel (via Softgen Publish)
- Code goes live
- App works in English
- Indonesian/Chinese users see English (fallback)

### 3. Trigger Translation
- Visit: `https://your-app.vercel.app/api/translate-orphaned`
- System detects missing keys
- Calls Google Translate API
- Commits translations to GitHub

### 4. Next Deployment
- Translations are included
- All languages work perfectly

---

## Troubleshooting

### "GitHub credentials not configured"
- Make sure all 3 environment variables are set
- Check spelling exactly: `GITHUB_TOKEN`, `GITHUB_REPO_OWNER`, `GITHUB_REPO_NAME`
- Restart Next.js server after adding variables

### "Failed to commit"
- Verify token has `repo` permission
- Check if token is expired
- Verify repo owner/name are correct

### "Translation API error"
- Verify `GOOGLE_TRANSLATE_API_KEY` is set correctly
- Check if you have remaining quota/credits

---

## Security Notes

- ✅ Token is stored securely in environment variables
- ✅ Token is never exposed to client-side code
- ✅ API endpoint only accessible to admins
- ✅ Commits are made on your behalf with proper attribution

---

## Testing

Test the setup:
```bash
# Check if API is accessible
curl https://your-app.vercel.app/api/translate-orphaned

# Should return JSON with translation status
```

---

**Need help?** Check the console logs in Softgen terminal or browser DevTools for detailed error messages.