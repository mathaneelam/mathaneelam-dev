/* ============================================================================
 *  EVERYTHING YOU CAN CHANGE LIVES IN THIS FILE.
 *
 *  Edit the text between the quote marks. Save. The website updates itself in
 *  about a minute. You never need to touch any other file.
 *
 *  Two rules:
 *    1. Keep the quote marks "" around text. Only change what is inside them.
 *    2. Keep the commas at the end of each line.
 *
 *  ---------------------------------------------------------------------------
 *  >>> BEFORE YOU GO LIVE, REPLACE EVERY LINE MARKED  [FILL THIS IN]  <<<
 *  ---------------------------------------------------------------------------
 * ========================================================================== */

export const site = {
  /* ------------------------------------------------------------------ YOU */

  // Your name, exactly as you want it printed on the site.
  name: "Mathan Eelam",

  // The one line under your name. Keep it short and plain.
  role: "AI Voice Agents for Indian Businesses",

  // Used by Google and by WhatsApp when someone shares your link.
  description:
    "I build AI receptionists that answer your business phone in Tamil, Hindi or English — day, night and Sunday. You keep your existing number.",

  // Your website address. Only used as a fallback — on Vercel the real
  // address is detected automatically. Change it when you buy a domain.
  url: "https://mathaneelam.vercel.app",

  // Where you are based. This appears in the About section.
  city: "Tiruppur",
  state: "Tamil Nadu",

  /* -------------------------------------------------------------- CONTACT */

  contact: {
    // Your WhatsApp number: country code first, no spaces, no plus sign.
    whatsapp: "919003388830",

    // The same number, written how a human should read it.
    phoneDisplay: "+91 90033 88830",

    // The number a phone should actually dial.
    phoneDial: "+919003388830",

    // Your email address.
    email: "mathaneelam@gmail.com",

    // The message that is pre-typed when someone taps your WhatsApp button.
    // Making it specific gets you far better first messages than "Hi".
    whatsappMessage:
      "Hi Mathan, I saw your site and I want an AI receptionist for my business.",
  },

  /* ----------------------------------------------------------------- HERO */

  hero: {
    eyebrow: "AI Voice Agents · Tiruppur",
    // The headline is printed one line per entry, in a large serif face, and
    // the LAST line is set in terracotta italic. Keep each line short.
    headlineLines: ["Your phone rings.", "You are busy."],
    headlineAccent: "They call someone else.",
    body: "I build AI receptionists that answer your business phone — in Tamil, Hindi or English. Day, night, Sunday, festival day. You keep the same number you have always used. Your customer never knows anything changed.",
    primaryCta: "Hear it answer a call",
    secondaryCta: "What does it cost me?",
  },

  /* -------------------------------------------------------------- PROBLEM */

  problem: {
    eyebrow: "The quiet loss",
    heading: "Nobody counts the calls they miss.",
    body: "You were with a patient. You were showing a site. You were closing up. The phone rang and by the time you called back, they had already booked somewhere else. It never shows up in your accounts, because a customer you never spoke to leaves no record.",
    // Three plain facts. Change the numbers to whatever you can stand behind.
    stats: [
      { value: "8 in 10", label: "callers never ring a second time" },
      { value: "62%", label: "of calls come after business hours" },
      { value: "15 sec", label: "before a caller hangs up and moves on" },
    ],
    // Where the numbers came from. Being honest about this builds more trust
    // than a big number does. [FILL THIS IN] with your real source, or delete.
    source: "Figures shown are industry estimates, not measurements of your business.",
  },

  /* --------------------------------------------------------------- DEMO */

  demo: {
    eyebrow: "Try it yourself",
    heading: "Pick a language. Pick a business. Press call.",
    body: "This is not a video. You are talking to the same kind of AI receptionist I would build for you. Speak to it, or type — whichever you prefer.",
    micHint: "Tap the mic to speak, or type here",
    typeHint: "Type your reply",
    listeningLabel: "Listening… tap to stop",
    // Shown when the browser refuses microphone access.
    micBlocked:
      "Your browser is blocking the microphone. Tap the padlock in the address bar and allow it — or just type below, which works the same.",
    micFailed: "Could not hear that. Try again, or type instead.",
    // Shown on iPhones, where Apple does not allow websites to use the mic
    // for speech. There is nothing broken — typing works exactly the same.
    iosNotice: "Typing only on iPhone — Apple does not allow this on Safari yet.",
    endedLabel: "Call ended",
    restartLabel: "Try another one",
  },

  /* ------------------------------------------------------------ SERVICES */

  services: {
    eyebrow: "What I build",
    heading: "Four things. All of them plain to explain.",
    items: [
      {
        icon: "📞",
        title: "An AI receptionist for your phone",
        body: "It answers every call in your customer's language, books appointments, answers the same twelve questions you answer every day, and sends you a summary. It never sleeps and never has a bad morning.",
      },
      {
        icon: "💬",
        title: "WhatsApp and chat that replies itself",
        body: "Most of your customers would rather message than call. This replies in seconds, at 11pm, with the right answer — and hands over to you the moment it matters.",
      },
      {
        icon: "🖥️",
        title: "Websites and software with AI inside",
        body: "Not a brochure that sits there. A site that books, answers, follows up and tells you what happened while you were busy.",
      },
      {
        icon: "🔗",
        title: "Joining up what you already use",
        body: "Your calendar, your billing book, your Excel sheet, your CRM. I connect them so you stop copying the same detail into three places.",
      },
    ],
  },

  /* ---------------------------------------------------------- HOW IT WORKS */

  howItWorks: {
    eyebrow: "How it works",
    heading: "Three steps. About a week.",
    steps: [
      {
        n: "01",
        title: "I listen to how you already talk",
        body: "We sit for an hour. You tell me what people ask, how you answer, what you never want said to a customer. That conversation is the whole training.",
      },
      {
        n: "02",
        title: "I build it and you test it",
        body: "You call it yourself. You try to trip it up. We fix what sounds wrong until it sounds like your business.",
      },
      {
        n: "03",
        title: "It goes live on your number",
        body: "You keep the number printed on your board, your card and your Google listing. Nothing changes for your customer. You just stop missing calls.",
      },
    ],
    // The single most common fear. Say it plainly and early.
    reassurance: "You keep your existing number. Nothing on your board, your card or your Google listing has to change.",
  },

  /* -------------------------------------------------------------- PRICING */

  pricing: {
    eyebrow: "Pricing",
    heading: "Plain numbers. No quotation drama.",
    body: "You will know what this costs before you message me. If it does not pay for itself in recovered customers, it is not worth either of our time.",
    // [FILL THIS IN] These are placeholder prices. Change them to yours.
    plans: [
      {
        name: "Starter",
        price: "₹4,999",
        period: "per month",
        best: "One clinic, one shop, one office",
        features: [
          "Answers your calls in one language",
          "Books appointments into your calendar",
          "Daily WhatsApp summary of every call",
          "Up to 300 calls a month",
        ],
        cta: "Ask about Starter",
        featured: false,
      },
      {
        name: "Business",
        price: "₹9,999",
        period: "per month",
        best: "Most businesses start here",
        features: [
          "Everything in Starter",
          "Tamil, Hindi and English on the same number",
          "WhatsApp replies as well as calls",
          "Follows up with people who did not book",
          "Up to 1,000 calls a month",
        ],
        cta: "Ask about Business",
        featured: true,
      },
      {
        name: "Custom",
        price: "Let's talk",
        period: "",
        best: "Several branches, or something unusual",
        features: [
          "Everything in Business",
          "More than one location or number",
          "Connected to your existing software",
          "Built around how you actually work",
        ],
        cta: "Tell me what you need",
        featured: false,
      },
    ],
    // One honest line does more than a guarantee badge.
    note: "One month at a time. Stop whenever you want. No lock-in, no setup fee.",
  },

  /* ---------------------------------------------------------------- ABOUT */

  about: {
    eyebrow: "Who you would be working with",
    heading: "I am one person you can actually call.",
    // [FILL THIS IN] Replace this with your own words. Two or three sentences
    // about why you started doing this. Plain and true beats polished.
    body: [
      "I am Mathan. I build AI systems from Tiruppur, and I answer my own phone — which is a slightly funny thing for someone who sells AI receptionists to say.",
      "I started doing this because I kept meeting owners losing real money to a phone nobody could get to. Not a technology problem. A being-in-two-places problem.",
      "If you message me, you get me. Not a sales team, not a ticket number.",
    ],
    // [FILL THIS IN] Delete this line if you would rather not mention it.
    credential: "",
    portraitAlt: "Mathan Eelam",
  },

  /* ------------------------------------------------------------------ FAQ */

  faq: {
    eyebrow: "The questions everybody asks",
    heading: "Straight answers.",
    items: [
      {
        q: "Will my customer know they are talking to a machine?",
        a: "Some will, some will not, and I do not think you should hide it. What matters to your customer is that someone picked up and sorted their problem at 9pm. It introduces itself as your assistant. It never pretends to be you.",
      },
      {
        q: "What happens when it cannot answer something?",
        a: "It says so honestly, takes the person's number, and messages you straight away. It is built to never invent an answer about your business. A wrong answer costs you more than no answer.",
      },
      {
        q: "Do I have to change my phone number?",
        a: "No. This is the thing people worry about most, and the answer is no. It works with the number already printed on your board and your visiting card.",
      },
      {
        q: "Which languages can it speak?",
        a: "Tamil, Hindi and English properly today. Telugu, Malayalam, Kannada, Marathi, Bengali, Gujarati and Punjabi are available too. It can also switch language mid-call if your customer does.",
      },
      {
        q: "What happens to my customers' information?",
        a: "It stays yours. I do not sell it, share it or use it to train anything. If you stop working with me, I delete it and send you everything I had.",
      },
      {
        q: "What if it does not work for my business?",
        a: "Then stop after the first month. There is no lock-in and no setup fee, because I would rather you leave easily than feel trapped and tell people so.",
      },
    ],
  },

  /* -------------------------------------------------------------- CONTACT */

  cta: {
    eyebrow: "Next step",
    heading: "Send me a message. I reply myself.",
    body: "Tell me what your business is and how many calls you think you are missing. If an AI receptionist is wrong for you, I will say so.",
    whatsappLabel: "Message on WhatsApp",
    callLabel: "Call me",
    emailLabel: "Email instead",
  },

  footer: {
    // [FILL THIS IN] Delete or change as you like.
    tagline: "Built in Tiruppur. Works anywhere in India.",
  },
} as const;

export type Site = typeof site;

/* Builds the WhatsApp link with your message already typed in. */
export function whatsappHref(message?: string): string {
  const text = encodeURIComponent(message ?? site.contact.whatsappMessage);
  return `https://wa.me/${site.contact.whatsapp}?text=${text}`;
}
