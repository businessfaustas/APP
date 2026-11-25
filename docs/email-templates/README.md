# FlagBid account emails

These are the emails Supabase sends for your customers' accounts, styled as FlagBid instead of the plain "Supabase Auth" ones:

| File                  | Sent when                                                            | Supabase template name |
| --------------------- | -------------------------------------------------------------------- | ---------------------- |
| `confirm-signup.html` | someone creates an account (and when they ask for the email again)   | **Confirm sign up**    |
| `reset-password.html` | someone uses "Forgot your password?"                                 | **Reset password**     |

**Confirm sign up** is a full welcome email: the wordmark, "Welcome to FlagBid", a picture of the product (the demo report with its max bid and damage markers) on a blue backdrop, one big **Confirm email address** button, four "get started" cards (paste a lot link, read the damage, get your max bid, check the profit), a dark "Built to help you bid smarter" block, a help bar and a footer. It is in English; the confirmation line, the security note and the "ignore this if it wasn't you" note are also in Lithuanian.

**Reset password** is deliberately short: the wordmark, one card, one button, the plain link, English and Lithuanian. A security email should not look like marketing.

The other Supabase templates (magic link, invite, change email, reauthentication) are not used by the app, so they can stay as they are.

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

- Gmail ignores web fonts, so the headings are pictures of text set in **Bricolage Grotesque** (a free, open-licence font; the body text stays in the reader's own system font, which is what keeps the emails readable and out of spam). Every heading has alt text, so with pictures blocked the words still show.
- The pictures are PNG and JPEG files in `public/email/` (Gmail shows no SVG and strips CSS gradients), so they only appear once the site has them deployed. Supabase's **Preview** box does not fill in `{{ … }}` variables, which is why the picture addresses are written out in full (`https://auctionpulse-ai.vercel.app/email/...`) instead of using `{{ .SiteURL }}`.
- **When you move to your own domain,** replace `https://auctionpulse-ai.vercel.app` with `https://flagbid.com` in both HTML files (a find-and-replace; the test checks that only one address is used), or ask me to. Re-paste both into Supabase.
- Regenerate the pictures:
  - `flagbid-logo.png`: `pnpm exec tsx scripts/make-email-logo.ts`
  - `h-*.png` (headings), `icon-*.png`, `car-disc.png` and `hero.jpg`: `pnpm exec tsx scripts/make-email-art.ts` (start `pnpm dev` first; the hero is a screenshot of the landing page's product card, so run it again whenever that card changes). `... make-email-art.ts headings` redraws only the headings and needs no server. To change a heading's wording or the font, edit `HEADINGS` in that script and the matching `alt` and `width` in the HTML.
- The "get started" cards link to the site's own pages (`/app`, `/#sample`, `/#how-it-works`, `/pricing`, `/#faq`) through Supabase's Site URL. Before a customer has confirmed they can only read the pages that don't need a login.
- Left out of the reference layout on purpose: social-media icons (there are no accounts yet), a postal address (add the real one from `LEGAL_ADDRESS` before launch), and an unsubscribe link (this is a transactional email; marketing email would need one).
- The text is two languages in one email because Supabase sends one template per project. If you later want each customer's own language, the app would have to store it with the account and the template would use it; ask before changing this, because a template that refers to a missing value stops the email being sent.
- `tests/email-templates.test.ts` guards these files: only known variables, no scripts or external CSS, small enough for Gmail, one logo image on our own site.
