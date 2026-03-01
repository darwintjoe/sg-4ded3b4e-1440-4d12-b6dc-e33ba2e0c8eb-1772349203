# 🌐 Automatic Translation Setup Guide

This guide explains how to set up automatic translation checking during deployment.

## ✅ What's Already Done

1. ✅ **Translation Script Created**: `scripts/check-and-translate.ts`
   - Checks if translations are complete before build
   - Auto-translates missing keys using Google Translate API
   - Fails build if API key is missing (prevents incomplete deploys)

2. ✅ **Manual Translation Script**: `scripts/translate.ts`
   - Use when you want to translate manually during development
   - Run: `npx tsx scripts/translate.ts`

## 📝 Manual Setup Required

### Step 1: Update `package.json`

**Location:** `package.json` → `"scripts"` section

**Change this:**
```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  }
}
```

**To this:**
```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "tsx scripts/check-and-translate.ts && next build",
    "start": "next start",
    "lint": "next lint",
    "translate": "tsx scripts/translate.ts"
  }
}
```

**What changed:**
- `"build"`: Now runs translation check BEFORE Next.js build
- `"translate"`: Added manual translation command

---

### Step 2: Add Google Translate API Key to Vercel

**🔑 Get Your API Key:**
1. Go to: https://console.cloud.google.com/apis/credentials
2. Select your project (or create new one)
3. Click "Create Credentials" → "API Key"
4. Copy the API key

**📤 Add to Vercel:**

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Select your project: `Sell More`

2. **Navigate to Environment Variables**
   - Click "Settings" tab
   - Click "Environment Variables" in sidebar

3. **Add New Variable**
   - Click "Add New" button
   - Fill in:
     ```
     Name: GOOGLE_TRANSLATE_API_KEY
     Value: [paste your API key here]
     ```

4. **⚠️ CRITICAL: Enable for Build**
   - Check ✅ **Production**
   - Check ✅ **Preview** 
   - Check ✅ **Development**
   - **Check ✅ "Expose to Build"** ← MUST be enabled!

5. **Save**
   - Click "Save"
   - Redeploy your app (or wait for next push)

**Why "Expose to Build"?**
- The translation script runs during build time (not runtime)
- Without this, the API key won't be available during build
- Build will fail with: "GOOGLE_TRANSLATE_API_KEY not found"

---

### Step 3: Add API Key Locally (Optional)

**Location:** `.env.local` (create if doesn't exist)

**Add this line:**
```bash
GOOGLE_TRANSLATE_API_KEY=your_api_key_here
```

**This enables:**
- Testing translations locally
- Running `npm run build` locally
- Running `npm run translate` manually

---

## 🚀 How It Works

### Automatic Flow (After Setup)

**When you deploy:**
```bash
git push
# or click "Publish" in Softgen
```

**What happens automatically:**
1. Vercel detects changes
2. Runs `npm run build`
3. **Translation check runs first:**
   - ✅ If all translations complete → Skip translation, continue build
   - ⚠️ If missing translations → Auto-translate, then continue build
   - ❌ If API key missing → Fail build with error message
4. Next.js builds with complete translations
5. Deploy succeeds

**Console output during build:**
```
🔍 Checking translations before build...

📊 Translation Status:
   English (en): 382/382 keys (100%)
   Indonesian (id): 382/382 keys (100%)
   Chinese (zh): 382/382 keys (100%)

✅ All translations complete! Proceeding with build...
```

**If translations are missing:**
```
🔍 Checking translations before build...

📊 Translation Status:
   English (en): 385/385 keys (100%)
   Indonesian (id): 382/385 keys (99%)
   Chinese (zh): 382/385 keys (99%)

⚠️  Missing translations detected!
   - Indonesian: 3 keys missing
   - Chinese: 3 keys missing

🌐 Auto-translating missing keys...

🇮🇩 Translating 3 Indonesian keys...
  Translating batch 1/1 (3 keys)...
✅ Indonesian translation complete!

🇨🇳 Translating 3 Chinese keys...
  Translating batch 1/1 (3 keys)...
✅ Chinese translation complete!

✅ Successfully translated 6 keys!
📝 Updated: src/lib/translations.ts
🚀 Proceeding with build...
```

---

## 💻 Development Workflow

### Adding New Features with Text

**Option A: Let Deploy Handle It (Recommended)**
```bash
# 1. Add new English translations
# Edit src/lib/translations.ts:
en: {
  "newfeature.title": "New Feature",
  "newfeature.description": "Feature description",
  // ... existing keys
}

# 2. Use the keys in your code
import { useTranslation } from "@/contexts/AppContext";
const { t } = useTranslation();
<h1>{t("newfeature.title")}</h1>

# 3. Commit and push
git add .
git commit -m "Add new feature"
git push

# → Vercel auto-translates on deploy
```

**Option B: Translate Manually First**
```bash
# 1. Add new English translations (same as above)

# 2. Run manual translation
npm run translate
# or: npx tsx scripts/translate.ts

# 3. Review translations in src/lib/translations.ts
# (Edit if Google Translate made mistakes)

# 4. Commit and push
git add .
git commit -m "Add new feature with translations"
git push

# → Vercel sees complete translations, skips translation
```

---

## 🧪 Testing

### Test Locally
```bash
# This will run the same check as Vercel
npm run build
```

### Test Translation Script
```bash
# Add some English-only keys to translations.ts
# Then run:
npm run translate

# Check the output - should see:
# ✅ Successfully translated X keys!
```

---

## 🔍 Troubleshooting

### Build Fails: "GOOGLE_TRANSLATE_API_KEY not found"

**Problem:** API key not available during build

**Solution:**
1. Go to Vercel → Settings → Environment Variables
2. Find `GOOGLE_TRANSLATE_API_KEY`
3. Make sure ✅ "Expose to Build" is checked
4. If not set, add the variable with this option enabled
5. Redeploy

### Build Succeeds but Translations Still Missing

**Problem:** Translation script didn't run

**Check:**
1. Verify `package.json` has: `"build": "tsx scripts/check-and-translate.ts && next build"`
2. Check build logs for "🔍 Checking translations before build..."
3. If not present, the build script wasn't updated

### Local Build Fails: API Key Error

**Problem:** `.env.local` missing or incorrect

**Solution:**
```bash
# Create/edit .env.local
echo "GOOGLE_TRANSLATE_API_KEY=your_api_key_here" >> .env.local
```

### Translations Are Wrong/Poor Quality

**Problem:** Google Translate isn't perfect

**Solution:**
```bash
# 1. Run automatic translation first
npm run translate

# 2. Manually edit src/lib/translations.ts
# Find the bad translation and fix it

# 3. Commit the corrected version
git add src/lib/translations.ts
git commit -m "Improve translations"
git push
```

---

## 📊 Cost Estimation

**Google Translate API Pricing:**
- $20 per 1 million characters
- Average key = 50 characters
- 1000 keys = 50,000 characters = $1

**Your app:**
- 382 keys × 2 languages = 764 translations
- ~38,200 characters = **$0.76 one-time**
- Adding 10 new keys = ~500 characters = **$0.01**

**Conclusion:** Very affordable! Even with frequent updates.

---

## 🎯 Summary Checklist

Before deploying, ensure:

- [ ] `package.json` build script updated
- [ ] `GOOGLE_TRANSLATE_API_KEY` added to Vercel
- [ ] "Expose to Build" enabled for API key
- [ ] Tested locally with `npm run build`
- [ ] `.env.local` has API key (for local testing)

Once set up, you **never need to manually translate again!** 🎉

---

## 🆘 Need Help?

If something doesn't work:
1. Check Vercel build logs for error messages
2. Verify API key is set correctly
3. Test locally with `npm run build`
4. Check that `scripts/check-and-translate.ts` exists
5. Ensure `tsx` is installed: `npm install -D tsx`

---

**Last Updated:** 2026-03-01
**Script Version:** 1.0.0
**Status:** ✅ Ready for Production