# Translation System Setup Guide

## Overview
Sell More uses an automatic translation system that keeps Indonesian (id) and Chinese (zh) translations in sync with English (en) keys.

---

## 🎯 Workflow

### 1. Developer Adds New Feature (English Only)
```typescript
// src/lib/translations.ts
export const translations = {
  en: { 
    "new_feature.title": "New Feature",
    "new_feature.description": "Description of the feature"
  },
  id: { },  // ← Leave blank
  zh: { }   // ← Leave blank
}
```

### 2. Deploy to Vercel
- Use Softgen's "Publish" button
- Deployment succeeds with English text working
- Indonesian/Chinese users see English (fallback)

### 3. Trigger Auto-Translation
**After successful deployment:**

Visit: `https://your-app.vercel.app/api/translate-orphaned`

**What happens:**
1. API detects missing keys in id/zh
2. Calls Google Translate API for each missing key
3. Updates translations.ts with translated values
4. Commits changes back to GitHub repo
5. Returns success message with count

### 4. Next Deployment
- Pull latest code (includes translations)
- All languages now complete
- No more English fallbacks

---

## 📋 Prerequisites

### 1. Google Translate API Key
**Required:** `GOOGLE_TRANSLATE_API_KEY`

**How to get:**
1. Go to Google Cloud Console
2. Enable "Cloud Translation API"
3. Create API key
4. Add to Softgen Environment Variables (Settings → Environment)

### 2. GitHub Personal Access Token
**Required for auto-commit:**
- `GITHUB_TOKEN`
- `GITHUB_REPO_OWNER` (your GitHub username)
- `GITHUB_REPO_NAME` (your repository name)

**See:** `GITHUB_TOKEN_SETUP.md` for detailed instructions

---

## 🚀 Usage Examples

### Manual Translation (Simple)
After each deployment, visit:
```
https://your-app.vercel.app/api/translate-orphaned
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully translated and committed 5 keys",
  "translated": 5
}
```

### Automatic Translation (Advanced)
Add to your deployment script:
```bash
# After Vercel deployment succeeds
curl -X POST https://your-app.vercel.app/api/translate-orphaned
```

---

## 🔍 How Fallback Works

**Priority order:**
1. Try current language (id or zh)
2. If missing → Fall back to English (en)
3. If still missing → Return key itself

**Example:**
```typescript
translate("new_feature.title", "id")
// Returns: "New Feature" (English fallback)

// After translation runs:
translate("new_feature.title", "id")
// Returns: "Fitur Baru" (Indonesian)
```

---

## 📝 Best Practices

### DO:
✅ Always add new keys to English (en) first
✅ Leave id/zh blank for new keys
✅ Use descriptive key names: `feature.action.label`
✅ Run translation API after major feature additions
✅ Commit translation results back to repo

### DON'T:
❌ Don't manually translate to id/zh (API does it)
❌ Don't delete keys without checking usage
❌ Don't use hardcoded text outside translations.ts
❌ Don't forget to add GOOGLE_TRANSLATE_API_KEY

---

## 🐛 Troubleshooting

### "No orphaned keys found"
✅ All translations are complete!
- This means id/zh have all the keys from en

### "Translation failed"
❌ Check:
1. `GOOGLE_TRANSLATE_API_KEY` is set correctly
2. API has remaining quota
3. Key is valid and active

### "GitHub commit failed"
❌ Check:
1. `GITHUB_TOKEN` has correct permissions
2. `GITHUB_REPO_OWNER` and `GITHUB_REPO_NAME` are correct
3. Token hasn't expired

**Note:** Translation will still work locally even if GitHub commit fails

### "localStorage is not defined"
✅ This is expected during build/server-side
- Translation fallback works correctly
- Only happens in SSR context

---

## 🔐 Security

- API key is stored in environment variables (never exposed)
- API endpoint is public but harmless (only translates text)
- GitHub commits are authenticated with token
- No sensitive data is transmitted

---

## 📊 Translation Stats

Check current status:
```bash
# Count English keys
grep -o '"[^"]*":' src/lib/translations.ts | wc -l

# Check for blank Indonesian keys
# (if count differs, translations needed)
```

---

## 🎓 Advanced: Custom Translation

If you need to override automatic translation:
```typescript
// src/lib/translations.ts
export const translations = {
  en: { "brand_name": "Sell More" },
  id: { "brand_name": "Sell More" },  // ← Keep English brand name
  zh: { "brand_name": "Sell More" }   // ← Don't translate
}
```

---

**Need help?** Check console logs or contact support.