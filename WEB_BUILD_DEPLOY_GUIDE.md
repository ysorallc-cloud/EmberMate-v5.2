# EmberMate Web Build & Deployment Guide

**Quick Start Guide for Web Platform**
**Last Updated**: January 4, 2026

---

## Overview

Your EmberMate app is now ready to run on web! This guide will walk you through building and deploying the web version.

### What's Been Implemented

✅ **Web-compatible storage** (IndexedDB)
✅ **Password-based authentication** (replaces biometrics)
✅ **Web Crypto API encryption** (AES-256-GCM)
✅ **Platform detection and adaptation**
✅ **Web login screen**
✅ **Cross-platform utilities**

---

## Prerequisites

Make sure you have:
- Node.js 18+ installed
- npm or yarn package manager
- Expo CLI (`npm install -g expo-cli`)
- Your EmberMate project directory

---

## Step 1: Install Dependencies

If you haven't already, install all required packages:

```bash
cd /Users/ambercook/embermate-v5

# Install dependencies
npm install

# Or with yarn
yarn install
```

---

## Step 2: Build for Web (Development)

### Local Development Server

Run the web development server to test locally:

```bash
# Start Expo web development server
npx expo start --web

# Or
npm run web
```

This will:
- Build your app for web
- Start a development server (usually http://localhost:8081 or :19006)
- Open your default browser
- Enable hot reload for development

**Test the following**:
1. Password setup flow (first time)
2. Login/logout
3. Data storage (medications, appointments)
4. Encryption (check browser DevTools → IndexedDB)
5. Session timeout
6. Failed login lockout

---

## Step 3: Build for Production

### Create Production Build

```bash
# Export static web build
npx expo export:web

# Or with options
npx expo export:web --output-dir dist
```

This creates an optimized production build in the `dist/` directory (or `web-build/`).

**What gets generated**:
- `index.html` - Main HTML file
- `_expo/static/js/` - Optimized JavaScript bundles
- `_expo/static/css/` - Stylesheets
- `assets/` - Images, fonts, etc.
- `manifest.json` - PWA manifest

---

## Step 4: Test Production Build Locally

Before deploying, test the production build:

```bash
# Install serve globally
npm install -g serve

# Serve the production build
serve -s dist

# Or specify port
serve -s dist -p 3000
```

Visit `http://localhost:3000` to test the production build.

**Critical Tests**:
- [ ] App loads without errors
- [ ] Authentication works
- [ ] Data persistence works (refresh page, data remains)
- [ ] No console errors
- [ ] All features functional

---

## Step 5: Deploy to Netlify (Recommended)

### Option A: Deploy via Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy to production
netlify deploy --prod --dir=dist
```

Follow prompts:
1. Choose "Create & configure a new site"
2. Select your team
3. Enter site name (e.g., `embermate-app`)
4. Deployment will start

Your site will be live at: `https://embermate-app.netlify.app`

### Option B: Deploy via Netlify Web UI

1. Go to [https://app.netlify.com](https://app.netlify.com)
2. Click "Add new site" → "Deploy manually"
3. Drag and drop your `dist/` folder
4. Your site is live!

### Configure Custom Domain (Optional)

1. In Netlify dashboard → Domain settings
2. Add custom domain (e.g., `app.embermate.com`)
3. Update DNS records as instructed
4. SSL automatically enabled

---

## Step 6: Deploy to Vercel (Alternative)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Or deploy directly to production
vercel --prod
```

Follow prompts, and your site will be live!

---

## Step 7: Configure Environment

### Update URLs in Code

After deployment, update the URLs in your legal documents:

**Files to update**:
- `PRIVACY_POLICY.md` - Update `https://ysorallc.org/privacy` to your actual URL
- `TERMS_OF_SERVICE.md` - Update `https://embermate.com/terms`
- `app.json` - Update `extra.privacyPolicyUrl`, `extra.termsOfServiceUrl`, etc.

### Host Legal Documents

Upload your legal documents to your hosting:

**Option 1: Netlify**
```bash
# Create public folder
mkdir public
cp PRIVACY_POLICY.md public/privacy.html  # Convert to HTML first
cp TERMS_OF_SERVICE.md public/terms.html

# Redeploy
netlify deploy --prod --dir=dist
```

**Option 2: Separate Static Site**
- Host on GitHub Pages
- Use a simple static site generator
- Serve as plain text/markdown

---

## Progressive Web App (PWA) Setup

Your app is already configured as a PWA. To enhance it:

### 1. Test PWA Functionality

Open Chrome DevTools → Application tab:
- [ ] Manifest loads correctly
- [ ] Service worker registered
- [ ] Install prompt available
- [ ] Works offline (after first load)

### 2. Add to Home Screen

On mobile browsers or desktop Chrome:
1. Visit your deployed site
2. Click "Install" or browser menu → "Install app"
3. App installs like a native app
4. Opens in standalone mode (no browser UI)

---

## Performance Optimization

### 1. Check Lighthouse Score

1. Open Chrome DevTools
2. Go to Lighthouse tab
3. Run audit for:
   - Performance
   - Accessibility
   - Best Practices
   - SEO
   - PWA

**Target Scores**: 90+ for all categories

### 2. Optimize if Needed

If scores are low:

**Performance**:
- Enable code splitting: Already configured in Expo
- Lazy load routes: Use React.lazy() for large screens
- Optimize images: Use WebP format

**Accessibility**:
- All covered in existing code
- Test with screen reader

**Best Practices**:
- HTTPS: Automatic on Netlify/Vercel
- No console errors: Test thoroughly

---

## Custom Domain Setup

### For Netlify:

1. **Add Domain in Netlify**:
   - Netlify Dashboard → Domain Settings
   - Add custom domain: `app.embermate.com`

2. **Update DNS**:
   ```
   Type: CNAME
   Name: app
   Value: yoursite.netlify.app
   ```

3. **Enable HTTPS**:
   - Automatic with Let's Encrypt
   - Wait for DNS propagation (~5-60 min)

### For Vercel:

1. **Add Domain**:
   - Vercel Dashboard → Domains
   - Add: `app.embermate.com`

2. **Update DNS**:
   ```
   Type: CNAME
   Name: app
   Value: cname.vercel-dns.com
   ```

---

## Continuous Deployment

### Netlify + GitHub

1. **Connect GitHub repo**:
   - Netlify Dashboard → New site from Git
   - Authorize GitHub
   - Select your repo

2. **Configure Build**:
   ```
   Build command: npx expo export:web
   Publish directory: dist
   ```

3. **Auto-Deploy**:
   - Every push to `main` triggers deploy
   - Preview builds for PRs

### Vercel + GitHub

1. **Import Project**:
   - Vercel Dashboard → Add New Project
   - Import from GitHub

2. **Configure**:
   - Framework: Other
   - Build Command: `npx expo export:web`
   - Output Directory: `dist`

3. **Deploy**:
   - Automatic on every push

---

## Environment Variables (Optional)

If you add features requiring API keys:

### Netlify:
```bash
# Set via CLI
netlify env:set API_KEY "your-key-here"

# Or via UI
Site settings → Environment variables
```

### Vercel:
```bash
# Set via CLI
vercel env add API_KEY

# Or via UI
Settings → Environment Variables
```

**Access in code**:
```javascript
const apiKey = process.env.EXPO_PUBLIC_API_KEY;
```

---

## Monitoring & Analytics

### Optional: Add Analytics

**Respect Privacy!** Only add if users opt-in.

**Privacy-friendly options**:
1. **Plausible Analytics** - No cookies, GDPR compliant
2. **Fathom Analytics** - Privacy-focused
3. **Self-hosted Matomo**

**Installation**:
```html
<!-- Add to public/index.html -->
<script defer data-domain="app.embermate.com" src="https://plausible.io/js/script.js"></script>
```

---

## Troubleshooting

### Build Fails

**Error**: `Module not found: Can't resolve '@react-native-async-storage/async-storage'`

**Solution**:
```bash
npm install @react-native-async-storage/async-storage --save
```

### White Screen on Load

**Check**:
1. Browser console for errors
2. Network tab for failed requests
3. Application tab → IndexedDB for storage errors

**Common Fix**:
```bash
# Clear cache and rebuild
rm -rf dist node_modules
npm install
npx expo export:web
```

### Data Not Persisting

**Issue**: Data lost on refresh

**Check**:
1. Browser supports IndexedDB (all modern browsers do)
2. Private browsing disabled (IndexedDB blocked in incognito)
3. Storage quota not exceeded (unlikely)

**Solution**:
- Check DevTools → Application → Storage
- Request persistent storage permission (already implemented)

### Password Not Working

**Issue**: Can't login after deployment

**Check**:
1. Deployment used production build (not dev)
2. No cache issues (hard refresh: Ctrl+Shift+R / Cmd+Shift+R)
3. IndexedDB data intact

**Solution**:
- Clear browser data and start fresh
- Or reset: DevTools → Application → IndexedDB → Delete database

---

## Security Checklist

Before going live:

- [ ] HTTPS enabled (automatic on Netlify/Vercel)
- [ ] CSP headers configured (optional, advanced)
- [ ] No sensitive data in client code
- [ ] Environment variables for any API keys
- [ ] Legal documents hosted and linked
- [ ] Privacy policy accurate
- [ ] Terms of service complete
- [ ] Data deletion works
- [ ] Encryption verified (check IndexedDB - data should be unreadable)
- [ ] Session timeout working
- [ ] Lockout after failed attempts working

---

## Next Steps

### 1. User Testing
- Test on different browsers (Chrome, Firefox, Safari, Edge)
- Test on mobile browsers
- Test on different screen sizes
- Get feedback from beta users

### 2. Documentation
- Create user guide for web version
- Add FAQ for web-specific questions
- Document browser requirements

### 3. Marketing
- Add "Launch Web App" button to your website
- Update app store listings to mention web version
- Create demo video showing web features

### 4. Maintenance
- Monitor error logs
- Track user feedback
- Plan regular updates
- Keep dependencies updated

---

## Browser Support

EmberMate web version supports:

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 90+ | ✅ Fully supported |
| Firefox | 88+ | ✅ Fully supported |
| Safari | 14+ | ✅ Fully supported |
| Edge | 90+ | ✅ Fully supported |
| Mobile Safari | iOS 14+ | ✅ Fully supported |
| Mobile Chrome | Android 11+ | ✅ Fully supported |

**Required Features**:
- IndexedDB
- Web Crypto API
- Service Workers (for PWA)
- ES2020 JavaScript

**Not Supported**:
- Internet Explorer (EOL)
- Very old browsers (pre-2020)

---

## Cost Estimate

### Free Tier (Sufficient for Most Users):

**Netlify Free**:
- 100 GB bandwidth/month
- Unlimited sites
- HTTPS included
- Custom domain supported

**Vercel Free**:
- 100 GB bandwidth/month
- Unlimited deployments
- HTTPS included
- Custom domain supported

**Costs if Scaling**:
- Netlify Pro: $19/month (400 GB bandwidth)
- Vercel Pro: $20/month (1 TB bandwidth)

---

## Commands Reference

```bash
# Development
npx expo start --web           # Start dev server
npm run web                    # Alternative

# Build
npx expo export:web            # Production build
npx expo export:web --clear    # Clean build

# Test Build
serve -s dist                  # Test locally
serve -s dist -p 3000          # Custom port

# Deploy
netlify deploy --prod          # Netlify
vercel --prod                  # Vercel

# Clean
rm -rf dist node_modules       # Full clean
npm install                    # Reinstall
```

---

## Support

**Issues?**
- Check browser console for errors
- Review this guide
- Test in different browser
- Clear cache and retry

**Questions?**
- Expo Web Docs: https://docs.expo.dev/workflow/web/
- React Native Web: https://necolas.github.io/react-native-web/

---

## Success Checklist

Before announcing your web app:

- [ ] App builds without errors
- [ ] Deployed to production URL
- [ ] HTTPS working
- [ ] Custom domain configured (if using)
- [ ] Legal documents hosted
- [ ] All features tested
- [ ] Cross-browser testing complete
- [ ] Mobile responsive
- [ ] PWA installable
- [ ] Lighthouse score 90+
- [ ] Security review passed
- [ ] User testing completed
- [ ] Documentation ready

---

**Congratulations!** 🎉

Your EmberMate health app is now available on the web, maintaining the same privacy-first, secure approach as the mobile version!

---

**Need Help?**
Contact: technical@embermate.com

**Last Updated**: January 4, 2026
