# mathaneelam-dev

Personal site for **Mathan Eelam** — AI voice agents for Indian businesses,
built in Tiruppur, Tamil Nadu.

**If you are Mathan and want to change something, read [SETUP.md](./SETUP.md).**
Everything you need is in there, in plain English.

---

## The idea

Most agencies build a website that *describes* AI voice agents. This one *is*
one. A visitor presses a green button and a receptionist answers — in Tamil,
Hindi or English — and they can talk back with their microphone or type.

## Running cost: ₹0 / month

| Piece | Service | Cost |
|---|---|---|
| Hosting, SSL, CDN, deploys | Vercel Hobby | Free |
| The demo's brain | Gemini Flash free tier | Free |
| Hearing the visitor | Web Speech API (in the browser) | Free |
| Speaking — flagship languages | Pre-recorded MP3s in `public/voice` | Free |
| Speaking — other languages | Browser `speechSynthesis` | Free |
| Leads | WhatsApp deep link | Free |

Spend caps live in `lib/limits.ts` and are set below the free allowance, so no
amount of traffic can produce a bill.

## The demo never breaks

Four levels, dropping quietly from one to the next. The visitor never sees an
error:

1. Recorded clip → instant, free, best quality
2. Live AI reply → spoken by the visitor's own phone
3. Scripted reply → spoken by the visitor's own phone
4. Text only → the conversation still completes

Level 3 needs no API key, no network and no quota. **The site is fully
demonstrable the moment it is deployed, with nothing configured.**

## Performance

Built for a mid-range Android phone on 4G, which is what most visitors will use.

- Every page statically prerendered and served from the CDN
- Server Components by default — only the demo ships JavaScript
- Body text uses `system-ui`, so no font is downloaded for it
- One webfont (DM Serif Display), subset and preloaded
- No animation library; scroll reveals and motion are CSS plus one small observer
- Voice clips are `preload="none"` — audio loads only when someone presses call

## Design system

Colour, type and layout are taken from the Bizzap site so the two properties
read as one family — `#C96442` terracotta on `#1A1A1A`, DM Serif Display
headings, 1200px container, 120px section rhythm, 0.8px hairlines.

The umber tones (`#2F1100` → `#904010`) are sampled from Mathan's portrait so
the photo sits inside the page rather than on top of it.

## Layout

```
app/
  layout.tsx page.tsx globals.css   design tokens live in globals.css
  api/reply/route.ts                the only server route — keeps the API key private
components/
  sections/                         one file per section of the page
  Nav Footer Reveal WhatsAppFab
content/site.ts                     ALL copy, pricing and contact details
lib/
  brain.ts        Gemini + the scripted fallback, behind one function
  personas.ts     the three demo receptionists
  languages.ts    languages + browser capability detection
  limits.ts       the spend caps
  voice.ts        clip → phone voice → silence
public/voice/     recorded clips, committed to the repo
```

## Development

```bash
npm run dev     # http://localhost:3000
npm run build   # production build + type check
npm run voice   # regenerate the voice clips (needs ELEVENLABS_API_KEY)
```
