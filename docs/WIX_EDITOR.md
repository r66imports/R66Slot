R66 Studio (Wix-style editor)

This project includes a self-hosted, Wix-style editor integrated as a static page at `/wix-studio`.

Feature flag & admin access

- To enable the editor link in the site header, set the environment variable:

  NEXT_PUBLIC_ENABLE_WIX_EDITOR=1

- The header link is only visible to authenticated admins. Admin authentication uses the existing admin session cookie and the endpoint `/api/admin/auth/check`.

How to use

1. Ensure an admin user exists (POST `/api/admin/seed` seeds an Admin user in development).
2. Log in via `/admin/login`.
3. Enable the feature flag and deploy.
4. Open the Editor at `/wix-studio` (the editor runs inside an iframe and stores canvas data locally by default).

Security notes

- Keep the feature flag off in public environments unless you intend editors to be accessible.
- The `/wix-studio` route is now server-protected: it returns a 404 when `NEXT_PUBLIC_ENABLE_WIX_EDITOR` is not set to `1`, and it redirects non-admin users to `/admin/login`.
- Review admin authentication and session cookie configurations before enabling in production.

Maintenance

- Static editor files live in `public/wix-studio/`.
- The route is defined in `src/app/wix-studio/page.tsx`.

If you want, I can merge the PR and trigger a Vercel deploy for you — tell me who should be reviewers and whether I should proceed with merging & deploy.