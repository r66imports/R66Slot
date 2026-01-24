# R66SLOT - Deployment Guide

Complete guide to deploying R66SLOT to Vercel.

---

## Prerequisites

Before deploying, ensure you have:

- ✅ GitHub account
- ✅ Vercel account (free tier works great!)
- ✅ Shopify store with Storefront API credentials
- ✅ This project ready to deploy

---

## Step 1: Push to GitHub

### Option A: Create New Repository via GitHub Website

1. Go to https://github.com/new
2. Repository name: `r66slot` (or your choice)
3. Description: `Premium slot car ecommerce site`
4. Privacy: Choose Public or Private
5. **Don't** initialize with README (we already have one)
6. Click "Create repository"

### Option B: Using Command Line

After creating the repository on GitHub:

```bash
cd r66slot

# Add GitHub as remote (replace with your URL)
git remote add origin https://github.com/YOUR_USERNAME/r66slot.git

# Push to GitHub
git branch -M main
git push -u origin main
```

---

## Step 2: Deploy to Vercel

### Quick Deploy (Recommended)

1. **Go to Vercel:** https://vercel.com/new

2. **Import Git Repository**
   - Click "Import Project"
   - Select "Import Git Repository"
   - Choose your GitHub repository `r66slot`
   - Click "Import"

3. **Configure Project**
   - **Framework Preset:** Next.js (auto-detected)
   - **Root Directory:** `./` (default)
   - **Build Command:** `npm run build` (auto-detected)
   - **Output Directory:** `.next` (auto-detected)
   - **Install Command:** `npm install` (auto-detected)

4. **Add Environment Variables**

   Click "Environment Variables" and add:

   ```
   NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN
   Value: your-store.myshopify.com

   NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN
   Value: your-storefront-access-token

   NEXT_PUBLIC_SITE_URL
   Value: https://your-project.vercel.app (you'll get this after first deploy)
   ```

   **Optional (for future):**
   ```
   NEXT_PUBLIC_ALGOLIA_APP_ID
   NEXT_PUBLIC_ALGOLIA_SEARCH_KEY
   KLAVIYO_PRIVATE_KEY
   NEXT_PUBLIC_KLAVIYO_COMPANY_ID
   NEXT_PUBLIC_GA_ID
   ```

5. **Deploy!**
   - Click "Deploy"
   - Wait 2-3 minutes for the build
   - 🎉 Your site is live!

---

## Step 3: Post-Deployment

### Update Site URL

1. After first deploy, copy your Vercel URL (e.g., `https://r66slot.vercel.app`)
2. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
3. Update `NEXT_PUBLIC_SITE_URL` to your actual URL
4. Redeploy (Vercel → Deployments → overflow menu → Redeploy)

### Configure Custom Domain (Optional)

1. Vercel Dashboard → Your Project → Settings → Domains
2. Add your custom domain (e.g., `r66slot.com`)
3. Follow Vercel's DNS configuration instructions
4. Wait for SSL certificate to provision (automatic)
5. Update `NEXT_PUBLIC_SITE_URL` to your custom domain

---

## Step 4: Verify Deployment

### Check These Pages

1. **Homepage:** `https://your-site.vercel.app`
2. **Products:** `https://your-site.vercel.app/products`
3. **Cart:** `https://your-site.vercel.app/cart`
4. **Brands:** `https://your-site.vercel.app/brands`
5. **About:** `https://your-site.vercel.app/about`

### Test Cart Functionality

1. Browse to a product (once Shopify is connected)
2. Click "Add to Cart"
3. Open cart drawer from header
4. Adjust quantity
5. Click "Proceed to Checkout"
6. Verify Shopify checkout loads

---

## Step 5: Configure Shopify (If Not Done)

### Get Storefront API Credentials

1. **Shopify Admin** → Settings → Apps and sales channels
2. Click **"Develop apps"** (top right)
3. Click **"Create an app"**
4. Name: `R66SLOT Storefront`
5. Click **"Create app"**

### Configure API Scopes

6. Click **"Configure Storefront API scopes"**
7. Select these scopes:
   - ✅ `unauthenticated_read_product_listings`
   - ✅ `unauthenticated_read_product_inventory`
   - ✅ `unauthenticated_read_product_tags`
   - ✅ `unauthenticated_read_collection_listings`
8. Click **"Save"**

### Install & Get Token

9. Click **"Install app"** → Confirm
10. Go to **"API credentials"** tab
11. Under "Storefront API access token" → Click **"Copy"**
12. Save this token securely

### Add to Vercel

13. Vercel Dashboard → Your Project → Settings → Environment Variables
14. Add/Update:
    ```
    NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN = your-store.myshopify.com
    NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN = [paste token]
    ```
15. Redeploy the site

---

## Automatic Deployments

Vercel automatically deploys when you push to GitHub:

- **Push to `main` branch** → Production deployment
- **Push to other branches** → Preview deployment
- **Pull requests** → Preview deployments with unique URLs

### Manual Redeploy

1. Vercel Dashboard → Your Project
2. Go to "Deployments" tab
3. Find latest deployment
4. Click overflow menu (•••) → "Redeploy"

---

## Monitoring & Analytics

### Vercel Analytics (Free)

Automatically enabled! View in Vercel Dashboard:
- Page views
- Unique visitors
- Performance metrics (Core Web Vitals)
- Top pages

### Vercel Speed Insights

Shows real user performance data:
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Cumulative Layout Shift (CLS)
- First Input Delay (FID)

### Enable Production Errors (Recommended)

1. Vercel Dashboard → Settings → Error Monitoring
2. Enable error tracking
3. View errors in Logs section

---

## Troubleshooting

### Build Fails

**Check build logs:**
1. Vercel Dashboard → Deployments → Failed deployment
2. Click to view logs
3. Look for error messages

**Common issues:**
- Missing environment variables
- TypeScript errors (run `npm run build` locally first)
- Node version mismatch (Vercel uses Node 18+ by default)

### Products Not Showing

**Check:**
1. Shopify credentials are correct in Vercel
2. Shopify app is installed and scopes configured
3. Products exist in your Shopify store
4. Redeploy after adding environment variables

### Cart Not Working

**Check:**
1. Browser console for errors
2. Shopify Storefront API token has cart permissions
3. localStorage is enabled in browser
4. Vercel deployment logs for API errors

---

## Performance Tips

### Already Optimized

The site is already optimized with:
- ✅ Server-side rendering (SSR)
- ✅ Static generation where possible
- ✅ Image optimization (next/image)
- ✅ Code splitting
- ✅ Font optimization

### Further Optimization

For even better performance:

1. **Enable Vercel Analytics**
   - Already included in deployment
   - No setup needed

2. **Add Vercel Speed Insights**
   ```bash
   npm install @vercel/speed-insights
   ```

3. **Configure ISR** (Incremental Static Regeneration)
   - Already configured for product pages
   - Revalidates every hour automatically

4. **Use Vercel Edge Functions** (Future)
   - For global CDN distribution
   - Faster response times worldwide

---

## Security

### Environment Variables

- ✅ Never commit `.env.local` to Git
- ✅ Use Vercel Environment Variables for secrets
- ✅ Rotate API tokens periodically
- ✅ Use different tokens for staging/production

### API Security

- ✅ Shopify Storefront API is public (safe)
- ✅ Admin API tokens kept secret
- ✅ HTTPS enforced by Vercel
- ✅ CORS handled automatically

---

## Staging Environment (Optional)

### Create Staging Deployment

1. Create `staging` branch:
   ```bash
   git checkout -b staging
   git push -u origin staging
   ```

2. Vercel Dashboard → Your Project → Settings
3. Go to "Git" section
4. Configure staging branch for preview deployments

### Use Case

- Test changes before production
- Share with team for review
- Separate Shopify store for testing

---

## Costs

### Vercel Free Tier

Perfect for R66SLOT:
- ✅ Unlimited deployments
- ✅ Automatic HTTPS
- ✅ Analytics included
- ✅ 100 GB bandwidth/month
- ✅ Serverless functions

### If You Exceed Free Tier

- Pro plan: $20/month per user
- Includes higher limits and team features

### Shopify Costs

- Shopify plan (starts at $29/month)
- Transaction fees (if not using Shopify Payments)

---

## Next Steps After Deployment

1. ✅ **Add Products** to Shopify store
2. ✅ **Test Checkout** flow end-to-end
3. ✅ **Configure Shipping** rates in Shopify
4. ✅ **Set up Payment** processor (Shopify Payments)
5. ✅ **Add Custom Domain** (optional)
6. ✅ **Configure Email** notifications (Shopify handles this)
7. ✅ **Test on Mobile** devices
8. ✅ **Share with Friends** for feedback!

---

## Support & Resources

### Vercel Docs
- https://vercel.com/docs
- https://vercel.com/docs/deployments/overview

### Next.js Deployment
- https://nextjs.org/docs/deployment

### Shopify Storefront API
- https://shopify.dev/docs/api/storefront

### Need Help?

1. Check Vercel build logs
2. Review Shopify API docs
3. Check browser console for errors
4. Verify environment variables

---

## Congratulations! 🎉

Your R66SLOT site is now live and ready to sell slot cars!

**Your deployment URL:** `https://[your-project].vercel.app`

**What's working:**
- ✅ Product browsing
- ✅ Shopping cart
- ✅ Shopify checkout
- ✅ Mobile responsive
- ✅ SEO optimized
- ✅ Lightning fast

**Go ahead and start selling! 🏎️**

---

**Last Updated:** January 22, 2026
