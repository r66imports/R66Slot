# R66SLOT - Deployment Checklist

Quick checklist for deploying to Vercel. Check off each step as you complete it.

---

## Pre-Deployment

- [ ] Project builds successfully locally (`npm run build`)
- [ ] All environment variables documented in `.env.example`
- [ ] Git repository initialized with initial commit ✅ (DONE)
- [ ] `.gitignore` configured properly ✅ (DONE)
- [ ] `.env.local` NOT committed to git ✅ (DONE)

---

## Shopify Setup

- [ ] Shopify store created
- [ ] Storefront API app created in Shopify
- [ ] API scopes configured:
  - [ ] `unauthenticated_read_product_listings`
  - [ ] `unauthenticated_read_product_inventory`
  - [ ] `unauthenticated_read_product_tags`
  - [ ] `unauthenticated_read_collection_listings`
- [ ] App installed
- [ ] Storefront API token copied
- [ ] Store domain noted (e.g., `your-store.myshopify.com`)

---

## GitHub Setup

- [ ] GitHub account ready
- [ ] New repository created on GitHub
- [ ] Repository name: `r66slot` (or your choice)
- [ ] Code pushed to GitHub:
  ```bash
  git remote add origin https://github.com/YOUR_USERNAME/r66slot.git
  git branch -M main
  git push -u origin main
  ```

---

## Vercel Deployment

- [ ] Vercel account created (https://vercel.com/signup)
- [ ] GitHub connected to Vercel
- [ ] Project imported from GitHub
- [ ] Framework detected as Next.js
- [ ] Environment variables added:
  - [ ] `NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN`
  - [ ] `NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN`
  - [ ] `NEXT_PUBLIC_SITE_URL` (add after first deploy)
- [ ] First deployment triggered
- [ ] Deployment successful (check build logs)
- [ ] Site URL copied (e.g., `https://r66slot.vercel.app`)
- [ ] `NEXT_PUBLIC_SITE_URL` updated with actual URL
- [ ] Site redeployed after URL update

---

## Post-Deployment Verification

- [ ] Homepage loads: `https://your-site.vercel.app`
- [ ] Products page loads: `/products`
- [ ] Cart page loads: `/cart`
- [ ] About page loads: `/about`
- [ ] Contact page loads: `/contact`
- [ ] Brands page loads: `/brands`
- [ ] Header navigation works
- [ ] Footer links work
- [ ] Mobile responsive (test on phone)
- [ ] Cart drawer opens from header
- [ ] SSL certificate active (https)

---

## Shopify Integration Test

- [ ] Products appear on `/products` page
- [ ] Product detail pages load
- [ ] Add to cart works
- [ ] Cart drawer updates
- [ ] Cart page shows correct items
- [ ] Checkout button redirects to Shopify
- [ ] Shopify checkout loads correctly
- [ ] Test purchase completes successfully

---

## Performance Check

- [ ] Run Lighthouse audit (Chrome DevTools)
  - [ ] Performance > 90
  - [ ] Accessibility > 90
  - [ ] Best Practices > 90
  - [ ] SEO > 90
- [ ] Check Vercel Analytics dashboard
- [ ] Test page load speed
- [ ] Test on slow 3G connection

---

## SEO & Metadata

- [ ] Homepage title and description set
- [ ] Product pages have dynamic titles
- [ ] Open Graph tags present
- [ ] Sitemap accessible (if generated)
- [ ] Robots.txt configured
- [ ] Favicon present

---

## Optional Enhancements

- [ ] Custom domain configured
- [ ] DNS records updated
- [ ] SSL certificate for custom domain
- [ ] Google Analytics added
- [ ] Klaviyo email marketing connected
- [ ] Staging environment created
- [ ] Error monitoring (Sentry) added
- [ ] Newsletter signup tested

---

## Launch Day

- [ ] Products added to Shopify store
- [ ] Shipping rates configured
- [ ] Payment processor activated
- [ ] Tax settings configured
- [ ] Return policy published
- [ ] Legal pages complete (Privacy, Terms)
- [ ] Test order placed and fulfilled
- [ ] Marketing materials prepared
- [ ] Social media accounts ready
- [ ] Announcement email drafted

---

## Post-Launch Monitoring

- [ ] Monitor Vercel Analytics
- [ ] Check for build/deployment errors
- [ ] Review Shopify orders
- [ ] Test cart abandonment flow
- [ ] Monitor page load times
- [ ] Check for JavaScript errors
- [ ] Review customer feedback
- [ ] Track conversion rates

---

## Quick Commands Reference

```bash
# Check git status
git status

# Push changes to GitHub
git add .
git commit -m "Your message"
git push origin main

# Pull latest changes
git pull origin main

# Create new branch for features
git checkout -b feature-name
git push -u origin feature-name

# View Vercel deployments
# Go to: https://vercel.com/dashboard
```

---

## Environment Variables Quick Reference

```env
# Required for basic functionality
NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN=shpat_xxxxx
NEXT_PUBLIC_SITE_URL=https://your-site.vercel.app

# Optional for future features
NEXT_PUBLIC_ALGOLIA_APP_ID=
NEXT_PUBLIC_ALGOLIA_SEARCH_KEY=
KLAVIYO_PRIVATE_KEY=
NEXT_PUBLIC_KLAVIYO_COMPANY_ID=
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

---

## Support Resources

- **Vercel Docs:** https://vercel.com/docs
- **Next.js Docs:** https://nextjs.org/docs
- **Shopify Storefront API:** https://shopify.dev/docs/api/storefront
- **Deployment Guide:** See `DEPLOYMENT_GUIDE.md`
- **Project README:** See `README.md`

---

## Current Status

✅ **Code Complete** - All features implemented
✅ **Git Initialized** - Repository ready
✅ **Documentation** - Complete guides available
⏳ **GitHub Push** - Waiting for you
⏳ **Vercel Deploy** - Ready when you are
⏳ **Shopify Connect** - Needs credentials
⏳ **Go Live** - Almost there!

---

**Next Steps:**

1. Push code to GitHub
2. Import to Vercel
3. Add Shopify credentials
4. Deploy and test
5. Launch! 🚀

Good luck with your deployment!
