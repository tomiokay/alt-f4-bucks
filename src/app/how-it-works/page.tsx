import Link from "next/link";

export const metadata = {
  title: "How It Works — Alt-F4 Bucks",
};

const sections = [
  {
    id: "overview",
    title: "What is Alt-F4 Bucks?",
    content: `Alt-F4 Bucks (AF4) is a prediction market for FRC (FIRST Robotics Competition) matches. Think of it like a stock market, but instead of companies, you're betting on match outcomes, event winners, and team rankings — all with virtual currency. No real money is involved.

Every new member starts with **10,000 AF4**. Use your balance to place bets on upcoming matches and events. If your prediction is correct, you win a share of the prize pool. Climb the leaderboard and prove you know FRC better than anyone.`,
  },
  {
    id: "getting-started",
    title: "Getting Started",
    content: `1. **Sign up** — Create an account with your email. You'll get 10,000 AF4 to start.
2. **Set your display name** — Pick a name and optionally set your team number.
3. **Browse markets** — Head to the Home or Markets page to see active events.
4. **Place your first bet** — Pick a match, choose Red or Blue, enter your amount, and confirm.
5. **Track your portfolio** — Watch your bets resolve in real time from the Portfolio tab.`,
  },
  {
    id: "match-markets",
    title: "Match Markets (Red vs Blue)",
    content: `The core of Alt-F4 Bucks. For every FRC match, you can bet on whether the **Red Alliance** or **Blue Alliance** will win.

**How odds work:**
- Odds are determined by how much money is on each side (parimutuel system).
- If $300 is bet on Red and $700 on Blue, Red is at 30% and Blue at 70%.
- The less popular pick pays more — betting on the underdog is riskier but more rewarding.

**How payouts work:**
- When the match ends, the entire pool (all money bet on both sides) is split among the winners proportionally.
- Example: You bet $100 on Red (30% odds). Red wins. The total pool is $1,000. Red bettors share $1,000 proportional to their bets. Your share: $100/$300 * $1,000 = **$333 payout**.

**Key details:**
- Bets lock when the match starts (or when an admin closes the market).
- Results are pulled automatically from The Blue Alliance API.
- If a match is cancelled, all bets are refunded.`,
  },
  {
    id: "event-winners",
    title: "Event Winner Markets",
    content: `Predict which alliance will win the **entire event playoffs** (not just one match).

- These markets appear once playoff alliances are announced.
- Each option represents an alliance (e.g., "Alliance 1: Teams 254, 1678, 973").
- Payouts follow the same parimutuel system — winners split the total pool.
- These markets resolve when the event finals are complete.

Find these on the **Home page** in the "Event Markets" section, or on the **Trending** page under the "Event Winners" tab.`,
  },
  {
    id: "ranking-markets",
    title: "Ranking Markets",
    content: `Predict team standings! These markets ask: **which team will finish at a specific rank?**

**Types of ranking markets:**
- **Rank #1** — Who finishes first in qualifications?
- **Rank #N** — Who finishes at a specific position?
- **Top 8** — Which teams make it into the top 8?

**Early prediction bonus:**
- Ranking markets reward early bettors! Place your bet early in qualifications to get up to a **2x multiplier** on your stake.
- The multiplier decreases from 2.0x to 1.0x as qualification matches progress.
- Betting locks at 90% of quals completed.

**How it resolves:**
- Rankings are pulled from The Blue Alliance at event completion.
- Your weighted stake (amount * multiplier) determines your share of the pool.`,
  },
  {
    id: "score-predictions",
    title: "Score Predictions",
    content: `Predict the **exact score** of a match — both red and blue alliance scores.

- Enter your predicted red score and blue score before the match starts.
- After the match, payouts are based on **accuracy** — closer predictions win more.
- Accuracy is calculated as: error = |predicted_red - actual_red| + |predicted_blue - actual_blue|
- Lower error = higher payout. Perfect predictions get the biggest share.

These appear on individual event pages for upcoming matches.`,
  },
  {
    id: "custom-markets",
    title: "Custom Markets",
    content: `Team managers can create **custom prediction markets** on any topic:
- "Will our robot score in autonomous?"
- "Which team wins the spirit award?"
- Any question with 2-8 possible answers.

Custom markets are resolved manually by managers. They follow the same parimutuel payout system as other markets.

Featured custom markets appear on the home page carousel.`,
  },
];

const tabs = [
  {
    id: "home",
    title: "Home",
    icon: "🏠",
    description:
      "Your dashboard showing featured markets, event markets (winners + rankings), all upcoming match markets, breaking news from recently completed matches, and a sidebar with upcoming events.",
  },
  {
    id: "trending",
    title: "Trending",
    icon: "🔥",
    description:
      "All markets ranked by activity — what people are betting on most. Filter by match markets, event winners, rankings, or custom markets. Sort by most active, highest volume, or newest.",
  },
  {
    id: "markets",
    title: "Markets",
    icon: "📊",
    description:
      "The full match browser. Search for specific teams or events. Filter by qualification, semifinal, or final matches. Place bets directly from match cards. See detailed odds and team lists.",
  },
  {
    id: "events",
    title: "Events",
    icon: "📅",
    description:
      "Browse all active FRC events. Click into an event to see all its matches, prediction markets (score predictions, rankings, event winner), and place bets. Events auto-sync with The Blue Alliance.",
  },
  {
    id: "leaderboard",
    title: "Leaderboard",
    icon: "🏆",
    description:
      "Global rankings by portfolio value. See where you stack up against other bettors. Rankings update in real time as bets resolve. Filter and search by team number or display name.",
  },
  {
    id: "portfolio",
    title: "Portfolio",
    icon: "💼",
    description:
      "Your personal dashboard showing your balance, active positions (open bets), profit & loss breakdown, bet history, and prediction market bets. Track every bet you've placed and its outcome.",
  },
  {
    id: "store",
    title: "Store",
    icon: "🛒",
    description:
      "Spend your AF4 on real team rewards! Browse available items, check stock, and make purchases. Your purchase history is tracked in your portfolio.",
  },
];

const faqItems = [
  {
    q: "Is this real money?",
    a: "No. Alt-F4 Bucks (AF4) is a virtual currency with no real-world value. Everyone starts with 10,000 AF4.",
  },
  {
    q: "Where does match data come from?",
    a: "All match schedules, scores, and results come from The Blue Alliance (TBA) API. Data syncs automatically every 2 minutes during active events.",
  },
  {
    q: "When do bets lock?",
    a: "Match bets lock when the match is scheduled to start. Ranking bets lock at 90% of qualification matches completed. Managers can also manually close markets.",
  },
  {
    q: "What happens if a match is cancelled?",
    a: "If a match is voided, all bets are refunded to their original amounts.",
  },
  {
    q: "How are odds calculated?",
    a: "Odds are parimutuel — determined by how much money is on each side. The percentage shown (e.g., Red 40%) reflects the proportion of the pool on that side. There's no house edge.",
  },
  {
    q: "Can I bet on multiple outcomes?",
    a: "Yes! You can bet on both sides of a match or multiple options in a prediction market. Each bet is independent.",
  },
  {
    q: "What is the early prediction multiplier?",
    a: "For ranking markets, betting early in qualifications gives you up to a 2x multiplier on your stake. This rewards confident early predictions. The multiplier decreases as more quals are played.",
  },
  {
    q: "How do I earn more AF4?",
    a: "Win bets, get awards from team managers, or make accurate score predictions. Managers can award AF4 for participation, contributions, or special achievements.",
  },
  {
    q: "What can I spend AF4 on?",
    a: "Visit the Store tab to spend AF4 on team items and rewards. Managers add items to the store throughout the season.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero */}
      <div className="mb-10">
        <h1 className="text-[28px] font-bold text-[#e6edf3] mb-2">
          How Alt-F4 Bucks Works
        </h1>
        <p className="text-[15px] text-[#7d8590] max-w-2xl">
          Everything you need to know about the FRC prediction market — from
          placing your first bet to climbing the leaderboard.
        </p>
      </div>

      {/* Quick nav */}
      <div className="rounded-xl bg-[#161b22] border border-[#21262d] p-5 mb-8">
        <h2 className="text-[13px] font-semibold text-[#7d8590] uppercase tracking-wide mb-3">
          Jump to
        </h2>
        <div className="flex flex-wrap gap-2">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="rounded-full px-3 py-1 text-[12px] font-medium border border-[#21262d] text-[#388bfd] hover:text-[#58a6ff] hover:border-[#30363d] transition-colors"
            >
              {s.title}
            </a>
          ))}
          <a
            href="#pages"
            className="rounded-full px-3 py-1 text-[12px] font-medium border border-[#21262d] text-[#388bfd] hover:text-[#58a6ff] hover:border-[#30363d] transition-colors"
          >
            Page Guide
          </a>
          <a
            href="#faq"
            className="rounded-full px-3 py-1 text-[12px] font-medium border border-[#21262d] text-[#388bfd] hover:text-[#58a6ff] hover:border-[#30363d] transition-colors"
          >
            FAQ
          </a>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-10">
        {sections.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-20">
            <h2 className="text-[20px] font-bold text-[#e6edf3] mb-3 pb-2 border-b border-[#21262d]">
              {section.title}
            </h2>
            <div className="prose-custom text-[14px] text-[#c9d1d9] leading-relaxed whitespace-pre-line">
              {section.content.split("\n").map((line, i) => {
                // Bold text
                const parts = line.split(/(\*\*[^*]+\*\*)/g);
                return (
                  <p key={i} className={line.trim() === "" ? "h-3" : "mb-2"}>
                    {parts.map((part, j) =>
                      part.startsWith("**") && part.endsWith("**") ? (
                        <strong key={j} className="text-[#e6edf3] font-semibold">
                          {part.slice(2, -2)}
                        </strong>
                      ) : (
                        <span key={j}>{part}</span>
                      )
                    )}
                  </p>
                );
              })}
            </div>
          </section>
        ))}

        {/* Page Guide */}
        <section id="pages" className="scroll-mt-20">
          <h2 className="text-[20px] font-bold text-[#e6edf3] mb-3 pb-2 border-b border-[#21262d]">
            Page Guide
          </h2>
          <p className="text-[14px] text-[#c9d1d9] mb-4">
            Here&apos;s what each tab in the navigation does:
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                className="rounded-xl bg-[#161b22] border border-[#21262d] p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[18px]">{tab.icon}</span>
                  <h3 className="text-[15px] font-semibold text-[#e6edf3]">
                    {tab.title}
                  </h3>
                </div>
                <p className="text-[13px] text-[#7d8590] leading-relaxed">
                  {tab.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Payout Example */}
        <section id="payout-example" className="scroll-mt-20">
          <h2 className="text-[20px] font-bold text-[#e6edf3] mb-3 pb-2 border-b border-[#21262d]">
            Payout Example
          </h2>
          <div className="rounded-xl bg-[#161b22] border border-[#21262d] p-5">
            <div className="space-y-4 text-[14px] text-[#c9d1d9]">
              <p>
                <strong className="text-[#e6edf3]">Scenario:</strong> Qual Match
                12 — Red vs Blue
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/20 p-3">
                  <p className="text-[#ef4444] font-semibold mb-1">Red Pool</p>
                  <p className="text-[#e6edf3] text-[18px] font-bold font-mono">
                    $400
                  </p>
                  <p className="text-[#7d8590] text-[12px]">3 bettors</p>
                </div>
                <div className="rounded-lg bg-[#3b82f6]/10 border border-[#3b82f6]/20 p-3">
                  <p className="text-[#3b82f6] font-semibold mb-1">Blue Pool</p>
                  <p className="text-[#e6edf3] text-[18px] font-bold font-mono">
                    $600
                  </p>
                  <p className="text-[#7d8590] text-[12px]">5 bettors</p>
                </div>
              </div>
              <div className="rounded-lg bg-[#21262d] p-3">
                <p className="text-[#7d8590] text-[12px] mb-1">Total Pool</p>
                <p className="text-[#e6edf3] text-[20px] font-bold font-mono">
                  $1,000
                </p>
              </div>
              <div className="border-t border-[#21262d] pt-4">
                <p className="mb-2">
                  <strong className="text-[#ef4444]">Red wins!</strong> All $1,000
                  is split among Red bettors:
                </p>
                <div className="rounded-lg bg-[#22c55e]/10 border border-[#22c55e]/20 p-3">
                  <p className="text-[12px] text-[#7d8590] mb-1">
                    You bet $200 on Red (50% of Red pool)
                  </p>
                  <p className="text-[#22c55e] text-[18px] font-bold font-mono">
                    Payout: $500
                  </p>
                  <p className="text-[#22c55e] text-[12px]">
                    Profit: +$300 (150% return)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20">
          <h2 className="text-[20px] font-bold text-[#e6edf3] mb-3 pb-2 border-b border-[#21262d]">
            FAQ
          </h2>
          <div className="space-y-3">
            {faqItems.map((item, i) => (
              <div
                key={i}
                className="rounded-xl bg-[#161b22] border border-[#21262d] p-4"
              >
                <h3 className="text-[14px] font-semibold text-[#e6edf3] mb-1.5">
                  {item.q}
                </h3>
                <p className="text-[13px] text-[#7d8590] leading-relaxed">
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Bottom CTA */}
      <div className="mt-12 mb-8 rounded-xl bg-gradient-to-r from-[#22c55e]/10 to-[#388bfd]/10 border border-[#21262d] p-6 text-center">
        <h2 className="text-[18px] font-bold text-[#e6edf3] mb-2">
          Ready to start betting?
        </h2>
        <p className="text-[13px] text-[#7d8590] mb-4">
          You have 10,000 AF4 waiting. Browse markets and place your first bet.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/"
            className="rounded-full bg-[#22c55e] hover:bg-[#16a34a] px-5 py-2.5 text-[14px] font-semibold text-white transition-colors"
          >
            Browse Markets
          </Link>
          <Link
            href="/trending"
            className="rounded-full bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] px-5 py-2.5 text-[14px] font-semibold text-[#e6edf3] transition-colors"
          >
            See Trending
          </Link>
        </div>
      </div>
    </div>
  );
}
