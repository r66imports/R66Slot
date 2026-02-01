# Sage CSV -> Site Inventory Sync

This small utility converts a Sage CSV export into a JSON file served from the site's `public/` folder.

Usage

1. Export a CSV from Sage with at least these columns (headers): `sku,quantity`
2. Place the CSV file somewhere accessible and run:

```bash
node update-sage-inventory.js path/to/sage.csv
```

3. The script will write `public/sage-inventory.json` containing a mapping of `sku -> quantity`.

Notes

- The site includes a lightweight client component that fetches `/sage-inventory.json` and shows Sage quantities as a fallback. This does not change Shopify inventory; it only displays Sage values on the storefront.
- For scheduled syncing, run the script periodically (Task Scheduler, cron, or CI job) and deploy/upload the updated `public/sage-inventory.json` to your site host.
