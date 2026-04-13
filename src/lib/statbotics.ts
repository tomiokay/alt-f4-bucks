const STATBOTICS_BASE = "https://api.statbotics.io/v3";

export type StatboticsMatch = {
  match: string;
  pred: {
    red_win_prob: number;
    red_score: number;
    blue_score: number;
  };
};

async function statFetch(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  const res = await fetch(url, {
    next: { revalidate: 300 },
    signal: controller.signal,
    // @ts-expect-error -- Next.js extended fetch option for debug logging
    verbose: true,
  });
  clearTimeout(timeout);
  return res;
}

export async function getMatchPrediction(
  matchKey: string
): Promise<{ redWinProb: number; blueWinProb: number; redPredScore: number; bluePredScore: number } | null> {
  try {
    const res = await statFetch(`${STATBOTICS_BASE}/match/${matchKey}`);
    if (!res.ok) return null;
    const data: StatboticsMatch = await res.json();
    return {
      redWinProb: Math.round(data.pred.red_win_prob * 100),
      blueWinProb: Math.round((1 - data.pred.red_win_prob) * 100),
      redPredScore: Math.round(data.pred.red_score),
      bluePredScore: Math.round(data.pred.blue_score),
    };
  } catch (e) {
    console.error("[Statbotics] getMatchPrediction failed:", e);
    return null;
  }
}

export async function getEventPredictions(
  eventKey: string
): Promise<Map<string, { redWinProb: number; blueWinProb: number }>> {
  const map = new Map<string, { redWinProb: number; blueWinProb: number }>();
  try {
    const res = await statFetch(`${STATBOTICS_BASE}/matches?event=${eventKey}`);
    if (!res.ok) return map;
    const data: StatboticsMatch[] = await res.json();
    for (const m of data) {
      map.set(m.match, {
        redWinProb: Math.round(m.pred.red_win_prob * 100),
        blueWinProb: Math.round((1 - m.pred.red_win_prob) * 100),
      });
    }
  } catch (e) {
    console.error("[Statbotics] getEventPredictions failed:", e);
  }
  return map;
}
