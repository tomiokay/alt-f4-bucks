// Simple profanity filter for display names
// Only blocks the most obvious slurs/swear words — not overly aggressive

const BLOCKED_WORDS = [
  "fuck", "shit", "bitch", "asshole", "cunt", "nigger", "nigga",
  "faggot", "fag", "retard", "whore", "slut", "bastard", "dick",
  "cock", "pussy", "ass", "piss", "damn", "crap", "prick",
  "motherfucker", "fucker", "bullshit", "jackass", "dipshit",
];

/** Returns the offending word if found, null otherwise */
export function findProfanity(text: string): string | null {
  const lower = text.toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const word of BLOCKED_WORDS) {
    if (lower.includes(word)) return word;
  }
  return null;
}

export function containsProfanity(text: string): boolean {
  return findProfanity(text) !== null;
}
