# FlagBid account emails

These are the emails Supabase sends for your customers' accounts, styled as FlagBid instead of the plain "Supabase Auth" ones:

| File                  | Sent when                                                            | Supabase template name |
| --------------------- | -------------------------------------------------------------------- | ---------------------- |
| `confirm-signup.html` | someone creates an account (and when they ask for the email again)   | **Confirm sign up**    |
| `reset-password.html` | someone uses "Forgot your password?"                                 | **Reset password**     |

Each one has the FlagBid wordmark, a rounded white card with a blue top edge, one big button, the plain link underneath in case the button is blocked, and the same text in Lithuanian below the English. The other Supabase templates (magic link, invite, change email, reauthentication) are not used by the app, so they can stay as they are.

## 1. First, turn on custom SMTP (Supabase locks the templates until you do)

On the Supabase **Free** plan the **Subject** and **Body** boxes are read-only and the page says _"Set up custom SMTP to edit templates"_. Setting up your own sending service is the key that unlocks them, and it is also what makes the email come **from FlagBid** instead of "Supabase Auth <noreply@mail.app.supabase.io>" (the built-in sender also only delivers to your own team's addresses). Pick one:

**A. The proper way: your own domain + Resend (about 30 minutes, about EUR 1 a year for the domain).**

1. Finish the **Resend** step in `docs/LAUNCH-PLAN.md`: add your domain, put its SPF, DKIM and DMARC records at your DNS host, run `pnpm email:check-dns yourdomain.com`.
2. Supabase → **Authentication → Emails → SMTP Settings** (or the **Set up SMTP** button on a template page) → **Enable custom SMTP**:
   - **Sender email:** `noreply@yourdomain.com` (an address on the domain you verified in Resend)
   - **Sender name:** `FlagBid`
   - **Host:** `smtp.resend.com` · **Port:** `465` · **Username:** `resend` · **Password:** your Resend API key

**B. A stopgap while you have no domain: your Gmail account (10 minutes, fine for testing and a first trickle of customers, not for scale).**

1. Google Account → **Security** → turn on **2-Step Verification**, then **App passwords** → create one called "FlagBid". Google shows a 16-letter password once.
2. Supabase → SMTP Settings → **Enable custom SMTP**:
   - **Sender email:** your Gmail address (it must be the same account)
   - **Sender name:** `FlagBid`
   - **Host:** `smtp.gmail.com` · **Port:** `465` · **Username:** your Gmail address · **Password:** the 16-letter app password
3. Gmail allows roughly 500 emails a day, and the email shows as "FlagBid <your.address@gmail.com>". Move to option A before you take real traffic. Never type the app password anywhere but Supabase's form; if it leaks, delete it in your Google account.

After either option, open **Authentication → Rate Limits** and raise the emails-per-hour limit if you expect more than a few sign-ups an hour (Supabase starts custom SMTP at a low number).

## 2. Put the designs into Supabase (5 minutes, once step 1 is done)

Supabase dashboard → **Authentication → Emails**.

1. Open **Confirm sign up**.
   - **Subject:** `Confirm your FlagBid account`
   - **Body:** delete everything, switch to the **Source** tab, and paste the whole of `confirm-signup.html`. **Save changes.**
2. Open **Reset password**.
   - **Subject:** `Reset your FlagBid password`
   - **Body:** paste the whole of `reset-password.html`. **Save changes.**
3. Look at each one in the **Preview** tab. The logo only appears once the live site has `public/email/flagbid-logo.png` (it does after the Vercel deploy of this commit) and **Site URL** is set correctly (Authentication → URL Configuration).
4. Test: create an account with an address that is not yours, or use **Forgot your password?** on the sign-in page, and check the inbox and the spam folder.

Only the variables `{{ .ConfirmationURL }}`, `{{ .SiteURL }}` and `{{ .Email }}` are used. Don't add any other `{{ … }}`: Supabase refuses to send an email whose template it can't fill in.

## 3. When the address changes

The logo link is built from Supabase's **Site URL**, so when you move to your own domain and change that setting (and the Redirect URLs), the emails follow. Nothing in these files needs editing.

## Good to know

- Gmail ignores web fonts, so the emails use the reader's system font. The logo is a PNG (`public/email/flagbid-logo.png`) because Gmail does not show SVG images; regenerate it with `pnpm exec tsx scripts/make-email-logo.ts` if the logo ever changes.
- The text is two languages in one email because Supabase sends one template per project. If you later want each customer's own language, the app would have to store it with the account and the template would use it; ask before changing this, because a template that refers to a missing value stops the email being sent.
- `tests/email-templates.test.ts` guards these files: only known variables, no scripts or external CSS, small enough for Gmail, one logo image on our own site.
