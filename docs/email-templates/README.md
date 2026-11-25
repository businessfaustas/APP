# FlagBid account emails

These are the emails Supabase sends for your customers' accounts, styled as FlagBid instead of the plain "Supabase Auth" ones:

| File                  | Sent when                                                            | Supabase template name |
| --------------------- | -------------------------------------------------------------------- | ---------------------- |
| `confirm-signup.html` | someone creates an account (and when they ask for the email again)   | **Confirm sign up**    |
| `reset-password.html` | someone uses "Forgot your password?"                                 | **Reset password**     |

Each one has the FlagBid wordmark, a rounded white card with a blue top edge, one big button, the plain link underneath in case the button is blocked, and the same text in Lithuanian below the English. The other Supabase templates (magic link, invite, change email, reauthentication) are not used by the app, so they can stay as they are.

## 1. Put the designs into Supabase (5 minutes)

Supabase dashboard → your project → **Authentication → Emails** (called **Email Templates** in older dashboards).

1. Open **Confirm sign up**.
   - **Subject:** `Confirm your FlagBid account`
   - **Message body:** delete everything and paste the whole of `confirm-signup.html`. Save.
2. Open **Reset password**.
   - **Subject:** `Reset your FlagBid password`
   - **Message body:** paste the whole of `reset-password.html`. Save.
3. Use the **Preview** tab to look at each one. The logo only appears once the live site has the `public/email/flagbid-logo.png` file (it does after the next Vercel deploy) and **Site URL** is set correctly (Authentication → URL Configuration).

Only the variables `{{ .ConfirmationURL }}`, `{{ .SiteURL }}` and `{{ .Email }}` are used. Don't add any other `{{ … }}`: Supabase refuses to send an email whose template it can't fill in.

## 2. Make it come from FlagBid, not from Supabase

The design above fixes what the email looks like. Who it comes from ("Supabase Auth <noreply@mail.app.supabase.io>") is a separate setting, and it needs your own domain:

1. Finish the **Resend** step in `docs/LAUNCH-PLAN.md` (add your domain, put its SPF, DKIM and DMARC records at your DNS host, run `pnpm email:check-dns yourdomain.com`).
2. Supabase → **Authentication → Emails → SMTP Settings** → turn on **Enable custom SMTP**:
   - **Sender email:** `noreply@yourdomain.com` (an address on the domain you verified in Resend)
   - **Sender name:** `FlagBid`
   - **Host:** `smtp.resend.com` · **Port:** `465` · **Username:** `resend` · **Password:** your Resend API key
3. Send yourself a test: create an account with a Gmail address that is not on your Supabase team. It should arrive from **FlagBid**, with the design above, and not land in spam.

Until then Supabase's own sender is used: it only delivers to your own team's addresses, and the emails still carry the new design but say "Supabase Auth" as the sender.

## 3. When the address changes

The logo link is built from Supabase's **Site URL**, so when you move to your own domain and change that setting (and the Redirect URLs), the emails follow. Nothing in these files needs editing.

## Good to know

- Gmail ignores web fonts, so the emails use the reader's system font. The logo is a PNG (`public/email/flagbid-logo.png`) because Gmail does not show SVG images; regenerate it with `pnpm exec tsx scripts/make-email-logo.ts` if the logo ever changes.
- The text is two languages in one email because Supabase sends one template per project. If you later want each customer's own language, the app would have to store it with the account and the template would use it; ask before changing this, because a template that refers to a missing value stops the email being sent.
- `tests/email-templates.test.ts` guards these files: only known variables, no scripts or external CSS, small enough for Gmail, one logo image on our own site.
