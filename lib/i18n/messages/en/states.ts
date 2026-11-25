/** Compliance prompts and the in-between states (errors, 404, offline). */
export const states = {
  welcome: {
    title: "Before you start",
    body: "FlagBid helps people who buy and sell cars for a living. Please confirm two things to continue.",
    age: "I am 18 years of age or older.",
    terms: "I have read and accept the {terms} and the {privacy}.",
    ageNote: "FlagBid is not meant for anyone under 18, and we don't knowingly collect data from children.",
    continue: "Continue",
    saving: "Saving…",
    failed: "Couldn't save that. Please try again.",
    signedInAs: "Signed in as {email}",
    notYou: "Not you? Sign out",
  },
  consent: {
    dialogLabel: "Cookie preferences",
    title: "Cookies and privacy",
    body: "We use essential cookies to keep you signed in and to remember your language and theme. With your OK we also measure which pages are used and how fast they load, anonymously. No ads, no tracking across other sites, and never session recordings.",
    accept: "Allow analytics",
    decline: "Essential only",
    policy: "Privacy Policy",
    manage: "Cookie settings",
  },
  loginGate: {
    confirm: "I am 18 or older and I accept the {terms} and {privacy}.",
    required: "Tick the box above to continue.",
  },
  renewal: {
    monthly:
      "Renews automatically every month at {price} until you cancel. Cancel any time in Billing → Manage subscription; your plan stays active until the end of the period you paid for. Partial months aren't refunded. Taxes may apply.",
    pack: "One-time payment of {price}. No subscription and no renewal. Credits never expire. Unused credits can be refunded within 14 days of purchase.",
    trial: "Taxes may apply. Prices are in euros.",
  },
  unsubscribe: {
    title: "Unsubscribe from emails",
    body: "Stop reminder and product emails to this address? You'll still get account and billing emails, such as receipts and payment problems.",
    confirm: "Unsubscribe",
    working: "Unsubscribing…",
    done: "You're unsubscribed. We won't send you reminder or product emails.",
    invalid: "This unsubscribe link isn't valid. Sign in and turn email off in Settings, or contact support.",
    failed: "Something went wrong. Please try again.",
    home: "Back to home",
  },
  errors: {
    title: "Something went wrong",
    body: "We hit an unexpected problem. It has been reported and we'll look into it. Your data is safe.",
    retry: "Try again",
    home: "Back to home",
    ref: "Reference: {digest}",
    appTitle: "This page couldn't load",
    appBody: "Something went wrong while loading this page. You can try again, or go back to your dashboard.",
    dashboard: "Go to dashboard",
  },
  notFound: {
    title: "Page not found",
    body: "The page you're looking for doesn't exist, or it has moved.",
    home: "Go to the home page",
    app: "Go to your dashboard",
    code: "404",
  },
  offline: {
    banner: "You're offline. Changes can't be saved until you reconnect.",
    requestFailed: "Couldn't reach the server. Check your connection and try again.",
    timeout: "That took too long. Check your connection and try again.",
  },
  visual: {
    noPreview: "No preview available",
    lobbyLabel: "Cars waiting to be scanned",
  },
  legalFooter: {
    dmca: "Copyright (DMCA)",
    operator: "Operated by {entity}, {address}",
  },
};
