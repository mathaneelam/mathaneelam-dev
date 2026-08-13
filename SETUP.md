# Setup — in plain English

This guide assumes you have never written code. Everything here is copy, paste
and click. Nothing costs money.

---

## 1. What you must change before showing anyone

Open the file **`content/site.ts`**. Everything on the website lives in that one
file. Look for the lines marked `[FILL THIS IN]` and replace them:

| What | Where it appears |
|---|---|
| Your WhatsApp number | Every WhatsApp button on the site |
| Your phone number | The "Call me" button |
| Your email | The contact section |
| Your three prices | The pricing section |
| Your own story | The About section |

**How to edit it without any software:**

1. Go to your repository on github.com
2. Click into `content` → `site.ts`
3. Click the pencil icon (top right)
4. Change the text between the `" "` quote marks
5. Scroll down, click **Commit changes**

The website updates itself in about a minute.

> Two rules: keep the `"` quote marks around text, and keep the commas at the
> end of each line. Everything else is yours to change.

---

## 2. Putting it online — free, about five minutes

1. Go to **vercel.com** and sign in with your GitHub account
2. Click **Add New → Project**
3. Choose the `mathaneelam-dev` repository
4. Click **Deploy** — do not change any setting

You will get an address like `mathaneelam-dev.vercel.app`. It is live, it has a
security certificate, and it costs nothing, permanently.

Every time you edit `content/site.ts` on GitHub, Vercel rebuilds the site
automatically. You never have to touch Vercel again.

---

## 3. The demo works right now with no keys

Press the green call button on the site. It answers, in Tamil.

That is deliberate. The demo has four levels and drops down quietly whenever
something is unavailable, so a visitor never sees an error:

| Level | What happens |
|---|---|
| 1 | Plays a recorded clip — instant, free, best quality |
| 2 | Real AI reply, spoken by the visitor's own phone |
| 3 | Scripted reply, spoken by the visitor's own phone |
| 4 | Text only — the conversation still finishes |

**You can launch today without doing anything below.** Sections 4 and 5 make it
better, not functional.

---

## 4. Turning on the real AI (free)

Right now the demo follows a script. This makes it answer anything.

1. Go to **aistudio.google.com/apikey**
2. Sign in with a Google account
3. Click **Create API key** — no card, no payment
4. Copy the key

Then put it into Vercel:

1. Open your project on vercel.com
2. **Settings → Environment Variables**
3. Name: `GEMINI_API_KEY` — Value: paste your key
4. Click **Save**, then **Deployments → ⋯ → Redeploy**

**What it costs:** nothing. The free allowance is roughly 200–250 demo
conversations a day. The site is also capped at 150 AI replies a day in
`lib/limits.ts`, so it can never go past the free tier even if you get a
sudden rush of visitors. When the cap is hit, the demo silently goes back to
the script. No bill is possible.

---

## 5. Recording the voice clips (free, one time)

Without clips, the AI speaks in the phone's own built-in voice. It works, but
it sounds robotic — and you are selling voice quality.

1. Sign up free at **elevenlabs.io**
2. Pick a voice that sounds Indian (search the voice library for "Indian")
3. Copy your API key from your profile
4. Put it in a file called `.env.local` in the project:
   ```
   ELEVENLABS_API_KEY=your_key_here
   ELEVENLABS_VOICE_ID=the_voice_id_you_picked
   ```
5. Run:
   ```bash
   npm run voice
   ```

This reads every line in `lib/personas.ts`, generates the audio once, and saves
it into `public/voice/`. Commit those files to GitHub and they play free,
forever.

63 lines, 5,297 characters in total — about half of one month's free
allowance, so all three languages fit in a single free month with room spare.
If a run fails partway, just run it again: finished clips are kept and never
regenerated, so you never pay for the same line twice.

**Do this again** whenever you change a line in `lib/personas.ts`.

---

## 6. Adding another language

1. Open `lib/languages.ts` and set `flagship: true` on the language you want
2. Open `lib/personas.ts` and add that language's lines for all three businesses
3. Run `npm run voice` again

Languages that are not flagship still work — they use the real AI and the
phone's own voice.

---

## 7. Connecting a proper domain (about ₹800–1,200 a year)

`mathaneelam-dev.vercel.app` works fine. A real domain is worth it because you
are asking businesses to trust you with their customer calls.

1. Buy a domain (Namecheap, GoDaddy, Cloudflare)
2. In Vercel: **Settings → Domains → Add**
3. Follow the two lines of instructions Vercel gives you
4. Change `url:` in `content/site.ts` to your new address

---

## Where things live

```
content/site.ts     ← all your words, prices and contact details
lib/personas.ts     ← what the three demo receptionists know and say
lib/limits.ts       ← the spending caps. Nothing here can cost you money.
lib/languages.ts    ← which languages the demo offers
public/voice/       ← the recorded clips
```
