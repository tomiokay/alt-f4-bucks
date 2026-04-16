"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  createTestMatch,
  createTestEvent,
  resolveTestMatch,
  grantBucks,
  resetEverything,
  updateTeamNumber,
  createTestRankingsAndAlliances,
  createTestPlayoffMatches,
  resolveTestPredictionMarket,
  deleteEvent,
} from "@/app/actions/dev";
import type { MatchCache, Profile, PredictionMarket, PredictionPoolOption } from "@/lib/types";

type Props = {
  userId: string;
  balance: number;
  allProfiles?: Profile[];
  unresolvedMatches: MatchCache[];
  eventKeys?: string[];
  eventNames?: Record<string, string>;
  predictionMarkets?: PredictionMarket[];
  predictionPools?: Record<string, Record<string, PredictionPoolOption>>;
};

const COMP_LABELS: Record<string, string> = {
  qm: "Qual",
  sf: "Semi",
  f: "Final",
};

export function DevPanel({
  userId,
  balance,
  unresolvedMatches,
  allProfiles = [],
  eventKeys = [],
  eventNames = {},
  predictionMarkets = [],
  predictionPools = {},
}: Props) {
  const router = useRouter();

  return (
    <div className="space-y-6">
      {/* Core */}
      <div>
        <h2 className="text-[14px] font-medium text-[#7d8590] mb-3">Core</h2>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <GrantBucksCard userId={userId} balance={balance} router={router} />
          <CreateEventCard router={router} />
          <CreateMatchCard router={router} />
          <ResolveMatchCard matches={unresolvedMatches} router={router} />
        </div>
      </div>

      {/* Prediction Markets */}
      <div>
        <h2 className="text-[14px] font-medium text-[#7d8590] mb-3">Prediction Markets (Rankings & Playoffs)</h2>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <CreateRankingsCard eventKeys={eventKeys} eventNames={eventNames} router={router} />
          <CreatePlayoffsCard eventKeys={eventKeys} eventNames={eventNames} router={router} />
          <ResolvePredictionCard markets={predictionMarkets} pools={predictionPools} router={router} />
        </div>
      </div>

      {/* Manage Events */}
      {eventKeys.filter((ek) => ek.includes("devtest") || !/^\d{4}[a-z]{2,}$/.test(ek)).length > 0 && (
        <div>
          <h2 className="text-[14px] font-medium text-[#7d8590] mb-3">Manage Events</h2>
          <DeleteEventCard eventKeys={eventKeys} eventNames={eventNames} router={router} />
        </div>
      )}

      {/* Admin */}
      <div>
        <h2 className="text-[14px] font-medium text-[#7d8590] mb-3">Admin</h2>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <TeamNumberCard profiles={allProfiles} router={router} />
          <ResetCard router={router} />
        </div>
      </div>
    </div>
  );
}

function GrantBucksCard({ userId, balance, router }: { userId: string; balance: number; router: ReturnType<typeof useRouter> }) {
  const [amount, setAmount] = useState(1000);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const ref = useRef(false);

  async function handleGrant() {
    if (ref.current) return;
    ref.current = true;
    setLoading(true);
    setMsg(null);

    const fd = new FormData();
    fd.set("userId", userId);
    fd.set("amount", String(amount));
    const res = await grantBucks(fd);

    setLoading(false);
    ref.current = false;
    setMsg(res.error ?? `Granted $${amount} AF4!`);
    if (res.success) router.refresh();
  }

  return (
    <div className="rounded-xl bg-[#161b22] p-5 space-y-4">
      <div>
        <h3 className="text-[14px] font-semibold text-[#e6edf3]">Grant Bucks</h3>
        <p className="text-[11px] text-[#484f58]">Current balance: ${balance.toLocaleString()}</p>
      </div>
      <div className="flex gap-2">
        {[100, 1000, 10000].map((v) => (
          <button
            key={v}
            onClick={() => setAmount(v)}
            className={`flex-1 rounded-lg py-2 text-[12px] font-medium transition-colors ${
              amount === v ? "bg-[#21262d] text-[#e6edf3]" : "bg-[#0d1117] text-[#7d8590] hover:text-[#e6edf3]"
            }`}
          >
            +${v.toLocaleString()}
          </button>
        ))}
      </div>
      <button
        onClick={handleGrant}
        disabled={loading}
        className="w-full rounded-lg bg-[#22c55e] py-2 text-[13px] font-semibold text-white hover:bg-[#16a34a] disabled:opacity-50 transition-colors"
      >
        {loading ? "Granting..." : `Grant $${amount.toLocaleString()}`}
      </button>
      {msg && <p className="text-[12px] text-[#7d8590]">{msg}</p>}
    </div>
  );
}

function CreateEventCard({ router }: { router: ReturnType<typeof useRouter> }) {
  const [eventName, setEventName] = useState("Dev Test Regional");
  const [numMatches, setNumMatches] = useState(12);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const ref = useRef(false);

  async function handleCreate() {
    if (ref.current) return;
    ref.current = true;
    setLoading(true);
    setMsg(null);

    const fd = new FormData();
    fd.set("eventName", eventName);
    fd.set("numMatches", String(numMatches));
    const res = await createTestEvent(fd);

    setLoading(false);
    ref.current = false;

    if (res.error) {
      setMsg(`Error: ${res.error}`);
    } else {
      setMsg(`Created ${res.matchCount} matches for ${res.eventKey}`);
      router.refresh();
    }
  }

  return (
    <div className="rounded-xl bg-[#161b22] p-5 space-y-3">
      <div>
        <h3 className="text-[14px] font-semibold text-[#e6edf3]">Create Test Event</h3>
        <p className="text-[11px] text-[#484f58]">Creates a full event with random team matchups</p>
      </div>
      <input
        value={eventName}
        onChange={(e) => setEventName(e.target.value)}
        placeholder="Event name"
        className="w-full h-8 rounded-lg bg-[#0d1117] border border-[#21262d] px-3 text-[12px] text-[#e6edf3] focus:border-[#388bfd] focus:outline-none"
      />
      <div>
        <label className="text-[10px] text-[#484f58]">Number of qual matches</label>
        <div className="flex gap-2 mt-1">
          {[6, 12, 24, 48].map((n) => (
            <button
              key={n}
              onClick={() => setNumMatches(n)}
              className={`flex-1 rounded-lg py-2 text-[12px] font-medium transition-colors ${
                numMatches === n ? "bg-[#21262d] text-[#e6edf3]" : "bg-[#0d1117] text-[#7d8590] hover:text-[#e6edf3]"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      <button
        onClick={handleCreate}
        disabled={loading}
        className="w-full rounded-lg bg-[#22c55e] py-2 text-[13px] font-semibold text-white hover:bg-[#16a34a] disabled:opacity-50 transition-colors"
      >
        {loading ? "Creating..." : `Create Event (${numMatches} matches)`}
      </button>
      {msg && <p className="text-[12px] text-[#7d8590]">{msg}</p>}
    </div>
  );
}

function CreateMatchCard({ router }: { router: ReturnType<typeof useRouter> }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [eventName, setEventName] = useState("Dev Test Regional");
  const [compLevel, setCompLevel] = useState("qm");
  const [matchNumber, setMatchNumber] = useState(1);
  const [redTeams, setRedTeams] = useState("254,1678,971");
  const [blueTeams, setBlueTeams] = useState("118,2056,1114");
  const ref = useRef(false);

  async function handleCreate() {
    if (ref.current) return;
    ref.current = true;
    setLoading(true);
    setMsg(null);

    const fd = new FormData();
    fd.set("eventName", eventName);
    fd.set("compLevel", compLevel);
    fd.set("matchNumber", String(matchNumber));
    fd.set("redTeams", redTeams);
    fd.set("blueTeams", blueTeams);
    const res = await createTestMatch(fd);

    setLoading(false);
    ref.current = false;

    if (res.error) {
      setMsg(`Error: ${res.error}`);
    } else {
      setMsg(`Created ${res.matchKey}`);
      setMatchNumber((n) => n + 1);
      router.refresh();
    }
  }

  return (
    <div className="rounded-xl bg-[#161b22] p-5 space-y-3">
      <div>
        <h3 className="text-[14px] font-semibold text-[#e6edf3]">Create Test Match</h3>
        <p className="text-[11px] text-[#484f58]">Scheduled for tomorrow so betting is open</p>
      </div>
      <input
        value={eventName}
        onChange={(e) => setEventName(e.target.value)}
        placeholder="Event name"
        className="w-full h-8 rounded-lg bg-[#0d1117] border border-[#21262d] px-3 text-[12px] text-[#e6edf3] focus:border-[#388bfd] focus:outline-none"
      />
      <div className="flex gap-2">
        <select
          value={compLevel}
          onChange={(e) => setCompLevel(e.target.value)}
          className="flex-1 h-8 rounded-lg bg-[#0d1117] border border-[#21262d] px-2 text-[12px] text-[#e6edf3]"
        >
          <option value="qm">Qual</option>
          <option value="sf">Semi</option>
          <option value="f">Final</option>
        </select>
        <input
          type="number"
          value={matchNumber}
          onChange={(e) => setMatchNumber(parseInt(e.target.value) || 1)}
          className="w-20 h-8 rounded-lg bg-[#0d1117] border border-[#21262d] px-3 text-[12px] text-[#e6edf3] text-center focus:border-[#388bfd] focus:outline-none"
        />
      </div>
      <input
        value={redTeams}
        onChange={(e) => setRedTeams(e.target.value)}
        placeholder="Red teams (comma separated)"
        className="w-full h-8 rounded-lg bg-[#0d1117] border border-[#21262d] px-3 text-[12px] text-[#ef4444] focus:border-[#388bfd] focus:outline-none"
      />
      <input
        value={blueTeams}
        onChange={(e) => setBlueTeams(e.target.value)}
        placeholder="Blue teams (comma separated)"
        className="w-full h-8 rounded-lg bg-[#0d1117] border border-[#21262d] px-3 text-[12px] text-[#3b82f6] focus:border-[#388bfd] focus:outline-none"
      />
      <button
        onClick={handleCreate}
        disabled={loading}
        className="w-full rounded-lg bg-[#388bfd] py-2 text-[13px] font-semibold text-white hover:bg-[#2563eb] disabled:opacity-50 transition-colors"
      >
        {loading ? "Creating..." : "Create Match"}
      </button>
      {msg && <p className="text-[12px] text-[#7d8590]">{msg}</p>}
    </div>
  );
}

function ResolveMatchCard({ matches, router }: { matches: MatchCache[]; router: ReturnType<typeof useRouter> }) {
  const [selectedKey, setSelectedKey] = useState(matches[0]?.match_key ?? "");
  const [winner, setWinner] = useState<"red" | "blue">("red");
  const [redScore, setRedScore] = useState(150);
  const [blueScore, setBlueScore] = useState(120);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const ref = useRef(false);

  const selected = matches.find((m) => m.match_key === selectedKey);

  async function handleResolve() {
    if (ref.current || !selectedKey) return;
    ref.current = true;
    setLoading(true);
    setMsg(null);

    const fd = new FormData();
    fd.set("matchKey", selectedKey);
    fd.set("winner", winner);
    fd.set("redScore", String(redScore));
    fd.set("blueScore", String(blueScore));
    const res = await resolveTestMatch(fd);

    setLoading(false);
    ref.current = false;

    if (res.error) {
      setMsg(`Error: ${res.error}`);
    } else {
      setMsg(`Resolved! ${res.resolved} bets paid out.`);
      router.refresh();
    }
  }

  return (
    <div className="rounded-xl bg-[#161b22] p-5 space-y-3">
      <div>
        <h3 className="text-[14px] font-semibold text-[#e6edf3]">Resolve Match</h3>
        <p className="text-[11px] text-[#484f58]">Pick a winner, trigger payouts</p>
      </div>
      <select
        value={selectedKey}
        onChange={(e) => setSelectedKey(e.target.value)}
        className="w-full h-8 rounded-lg bg-[#0d1117] border border-[#21262d] px-2 text-[12px] text-[#e6edf3]"
      >
        {matches.length === 0 && <option value="">No unresolved matches</option>}
        {matches.map((m) => {
          const comp = COMP_LABELS[m.comp_level] ?? m.comp_level;
          return (
            <option key={m.match_key} value={m.match_key}>
              {m.event_name} — {comp} {m.match_number}
            </option>
          );
        })}
      </select>

      {selected && (
        <>
          <div className="text-[11px] text-[#484f58] space-y-1">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#ef4444]" />
              <span className="text-[#e6edf3] font-mono">{selected.red_teams.join(", ")}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#3b82f6]" />
              <span className="text-[#e6edf3] font-mono">{selected.blue_teams.join(", ")}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setWinner("red")}
              className={`flex-1 rounded-lg py-2 text-[12px] font-semibold transition-colors ${
                winner === "red" ? "bg-[#ef4444] text-white" : "bg-[#21262d] text-[#7d8590]"
              }`}
            >
              Red Wins
            </button>
            <button
              onClick={() => setWinner("blue")}
              className={`flex-1 rounded-lg py-2 text-[12px] font-semibold transition-colors ${
                winner === "blue" ? "bg-[#3b82f6] text-white" : "bg-[#21262d] text-[#7d8590]"
              }`}
            >
              Blue Wins
            </button>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] text-[#484f58]">Red Score</label>
              <input
                type="number"
                value={redScore}
                onChange={(e) => setRedScore(parseInt(e.target.value) || 0)}
                className="w-full h-8 rounded-lg bg-[#0d1117] border border-[#21262d] px-3 text-[12px] text-[#ef4444] text-center focus:border-[#388bfd] focus:outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-[#484f58]">Blue Score</label>
              <input
                type="number"
                value={blueScore}
                onChange={(e) => setBlueScore(parseInt(e.target.value) || 0)}
                className="w-full h-8 rounded-lg bg-[#0d1117] border border-[#21262d] px-3 text-[12px] text-[#3b82f6] text-center focus:border-[#388bfd] focus:outline-none"
              />
            </div>
          </div>
        </>
      )}

      <button
        onClick={handleResolve}
        disabled={loading || !selectedKey}
        className="w-full rounded-lg bg-[#f59e0b] py-2 text-[13px] font-semibold text-black hover:bg-[#d97706] disabled:opacity-50 transition-colors"
      >
        {loading ? "Resolving..." : "Resolve & Payout"}
      </button>
      {msg && <p className="text-[12px] text-[#7d8590]">{msg}</p>}
    </div>
  );
}

function TeamNumberCard({ profiles, router }: { profiles: Profile[]; router: ReturnType<typeof useRouter> }) {
  const [selectedUser, setSelectedUser] = useState(profiles[0]?.id ?? "");
  const [teamNum, setTeamNum] = useState(profiles[0]?.team_number ?? "");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const ref = useRef(false);

  async function handleUpdate() {
    if (ref.current || !selectedUser) return;
    ref.current = true;
    setLoading(true);
    setMsg(null);
    const fd = new FormData();
    fd.set("userId", selectedUser);
    fd.set("teamNumber", teamNum);
    const res = await updateTeamNumber(fd);
    setLoading(false);
    ref.current = false;
    setMsg(res.error ?? "Updated!");
    if (res.success) router.refresh();
  }

  return (
    <div className="rounded-xl bg-[#161b22] p-5 space-y-3">
      <div>
        <h3 className="text-[14px] font-semibold text-[#e6edf3]">Set Team Number</h3>
        <p className="text-[11px] text-[#484f58]">Assign FRC team numbers to users</p>
      </div>
      <select
        value={selectedUser}
        onChange={(e) => {
          setSelectedUser(e.target.value);
          const p = profiles.find((pr) => pr.id === e.target.value);
          setTeamNum(p?.team_number ?? "");
        }}
        className="w-full h-8 rounded-lg bg-[#0d1117] border border-[#21262d] px-2 text-[12px] text-[#e6edf3]"
      >
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>
            {p.display_name} {p.team_number ? `(${p.team_number})` : ""}
          </option>
        ))}
      </select>
      <input
        value={teamNum}
        onChange={(e) => setTeamNum(e.target.value)}
        placeholder="e.g. 7558"
        className="w-full h-8 rounded-lg bg-[#0d1117] border border-[#21262d] px-3 text-[12px] text-[#e6edf3] placeholder:text-[#484f58] focus:border-[#388bfd] focus:outline-none"
      />
      <button onClick={handleUpdate} disabled={loading} className="w-full rounded-lg bg-[#388bfd] py-2 text-[13px] font-semibold text-white hover:bg-[#2563eb] disabled:opacity-50 transition-colors">
        {loading ? "Saving..." : "Set Team Number"}
      </button>
      {msg && <p className="text-[12px] text-[#7d8590]">{msg}</p>}
    </div>
  );
}

function CreateRankingsCard({
  eventKeys,
  eventNames,
  router,
}: {
  eventKeys: string[];
  eventNames: Record<string, string>;
  router: ReturnType<typeof useRouter>;
}) {
  const [selectedEvent, setSelectedEvent] = useState(eventKeys[0] ?? "");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const ref = useRef(false);

  async function handleCreate() {
    if (ref.current || !selectedEvent) return;
    ref.current = true;
    setLoading(true);
    setMsg(null);

    const fd = new FormData();
    fd.set("eventKey", selectedEvent);
    const res = await createTestRankingsAndAlliances(fd);

    setLoading(false);
    ref.current = false;

    if (res.error) {
      setMsg(`Error: ${res.error}`);
    } else {
      setMsg(`Created ${res.rankingCount} rankings + ${res.allianceCount} alliances → ranking & event winner markets!`);
      router.refresh();
    }
  }

  return (
    <div className="rounded-xl bg-[#161b22] p-5 space-y-3">
      <div>
        <h3 className="text-[14px] font-semibold text-[#e6edf3]">Create Rankings & Alliances</h3>
        <p className="text-[11px] text-[#484f58]">
          Generates fake rankings + 8 playoff alliances → creates ranking markets (#1-#8) and event winner market
        </p>
      </div>
      <select
        value={selectedEvent}
        onChange={(e) => setSelectedEvent(e.target.value)}
        className="w-full h-8 rounded-lg bg-[#0d1117] border border-[#21262d] px-2 text-[12px] text-[#e6edf3]"
      >
        {eventKeys.length === 0 && <option value="">No events — create one first</option>}
        {eventKeys.map((ek) => (
          <option key={ek} value={ek}>
            {eventNames[ek] ?? ek}
          </option>
        ))}
      </select>
      <button
        onClick={handleCreate}
        disabled={loading || !selectedEvent}
        className="w-full rounded-lg bg-[#a855f7] py-2 text-[13px] font-semibold text-white hover:bg-[#9333ea] disabled:opacity-50 transition-colors"
      >
        {loading ? "Creating..." : "Generate Rankings & Alliances"}
      </button>
      {msg && <p className="text-[12px] text-[#7d8590]">{msg}</p>}
    </div>
  );
}

function CreatePlayoffsCard({
  eventKeys,
  eventNames,
  router,
}: {
  eventKeys: string[];
  eventNames: Record<string, string>;
  router: ReturnType<typeof useRouter>;
}) {
  const [selectedEvent, setSelectedEvent] = useState(eventKeys[0] ?? "");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const ref = useRef(false);

  async function handleCreate() {
    if (ref.current || !selectedEvent) return;
    ref.current = true;
    setLoading(true);
    setMsg(null);

    const fd = new FormData();
    fd.set("eventKey", selectedEvent);
    const res = await createTestPlayoffMatches(fd);

    setLoading(false);
    ref.current = false;

    if (res.error) {
      setMsg(`Error: ${res.error}`);
    } else {
      setMsg(`Created ${res.matchCount} playoff matches (${res.allianceCount} alliances)`);
      router.refresh();
    }
  }

  return (
    <div className="rounded-xl bg-[#161b22] p-5 space-y-3">
      <div>
        <h3 className="text-[14px] font-semibold text-[#e6edf3]">Create Playoff Matches</h3>
        <p className="text-[11px] text-[#484f58]">
          Generates semifinal + final matches with random alliance matchups. Use after creating rankings.
        </p>
      </div>
      <select
        value={selectedEvent}
        onChange={(e) => setSelectedEvent(e.target.value)}
        className="w-full h-8 rounded-lg bg-[#0d1117] border border-[#21262d] px-2 text-[12px] text-[#e6edf3]"
      >
        {eventKeys.length === 0 && <option value="">No events — create one first</option>}
        {eventKeys.map((ek) => (
          <option key={ek} value={ek}>
            {eventNames[ek] ?? ek}
          </option>
        ))}
      </select>
      <button
        onClick={handleCreate}
        disabled={loading || !selectedEvent}
        className="w-full rounded-lg bg-[#f59e0b] py-2 text-[13px] font-semibold text-black hover:bg-[#d97706] disabled:opacity-50 transition-colors"
      >
        {loading ? "Creating..." : "Generate Playoff Bracket"}
      </button>
      {msg && <p className="text-[12px] text-[#7d8590]">{msg}</p>}
    </div>
  );
}

function ResolvePredictionCard({
  markets,
  pools,
  router,
}: {
  markets: PredictionMarket[];
  pools: Record<string, Record<string, PredictionPoolOption>>;
  router: ReturnType<typeof useRouter>;
}) {
  // Only show open markets that can be manually resolved (event_winner, ranking, custom)
  const resolvable = markets.filter(
    (m) =>
      m.status === "open" &&
      (m.type === "event_winner" ||
        m.type === "ranking_top1" ||
        m.type === "ranking_top8" ||
        m.type === "ranking_position" ||
        m.type === "custom")
  );

  const [selectedMarket, setSelectedMarket] = useState(resolvable[0]?.id ?? "");
  const [selectedOption, setSelectedOption] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const ref = useRef(false);

  const market = resolvable.find((m) => m.id === selectedMarket);

  function handleMarketChange(id: string) {
    setSelectedMarket(id);
    setSelectedOption("");
    setMsg(null);
  }

  async function handleResolve() {
    if (ref.current || !selectedMarket || !selectedOption) return;
    ref.current = true;
    setLoading(true);
    setMsg(null);

    const fd = new FormData();
    fd.set("marketId", selectedMarket);
    fd.set("correctOption", selectedOption);
    const res = await resolveTestPredictionMarket(fd);

    setLoading(false);
    ref.current = false;

    if (res.error) {
      setMsg(`Error: ${res.error}`);
    } else {
      setMsg(`Resolved! ${res.resolved} bets paid out.`);
      router.refresh();
    }
  }

  const TYPE_LABELS: Record<string, string> = {
    event_winner: "Event Winner",
    ranking_top1: "Rank #1",
    ranking_position: "Rank",
    ranking_top8: "Top 8",
    custom: "Custom",
  };

  return (
    <div className="rounded-xl bg-[#161b22] p-5 space-y-3">
      <div>
        <h3 className="text-[14px] font-semibold text-[#e6edf3]">Resolve Prediction Market</h3>
        <p className="text-[11px] text-[#484f58]">Pick the winning option to resolve and pay out</p>
      </div>
      <select
        value={selectedMarket}
        onChange={(e) => handleMarketChange(e.target.value)}
        className="w-full h-8 rounded-lg bg-[#0d1117] border border-[#21262d] px-2 text-[12px] text-[#e6edf3]"
      >
        {resolvable.length === 0 && <option value="">No open prediction markets</option>}
        {resolvable.map((m) => {
          const typeLabel = TYPE_LABELS[m.type] ?? m.type;
          const poolTotal = Object.values(pools[m.id] ?? {}).reduce((s, p) => s + p.pool, 0);
          return (
            <option key={m.id} value={m.id}>
              [{typeLabel}] {m.title} {poolTotal > 0 ? `($${poolTotal})` : "(no bets)"}
            </option>
          );
        })}
      </select>

      {market && (
        <>
          <div className="text-[11px] text-[#484f58]">
            {market.options.length} options · Pick the winner:
          </div>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {market.options.map((opt) => {
              const poolInfo = pools[market.id]?.[opt.key];
              return (
                <button
                  key={opt.key}
                  onClick={() => setSelectedOption(opt.key)}
                  className={`w-full text-left rounded-lg px-3 py-2 text-[12px] transition-colors ${
                    selectedOption === opt.key
                      ? "bg-[#22c55e]/15 border border-[#22c55e]/50 text-[#22c55e]"
                      : "bg-[#0d1117] border border-[#21262d] text-[#e6edf3] hover:border-[#30363d]"
                  }`}
                >
                  <span className="font-medium">{opt.label}</span>
                  {poolInfo && poolInfo.bettors > 0 && (
                    <span className="ml-2 text-[10px] text-[#484f58]">
                      ${poolInfo.pool} · {poolInfo.bettors} bet{poolInfo.bettors !== 1 ? "s" : ""}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}

      <button
        onClick={handleResolve}
        disabled={loading || !selectedMarket || !selectedOption}
        className="w-full rounded-lg bg-[#22c55e] py-2 text-[13px] font-semibold text-white hover:bg-[#16a34a] disabled:opacity-50 transition-colors"
      >
        {loading ? "Resolving..." : "Resolve & Payout"}
      </button>
      {msg && <p className="text-[12px] text-[#7d8590]">{msg}</p>}
    </div>
  );
}

function ResetCard({ router }: { router: ReturnType<typeof useRouter> }) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const ref = useRef(false);

  async function handleReset() {
    if (ref.current) return;
    if (!confirm) { setConfirm(true); return; }
    ref.current = true;
    setLoading(true);
    setMsg(null);
    const fd = new FormData();
    fd.set("password", password);
    const res = await resetEverything(fd);
    setLoading(false);
    ref.current = false;
    setConfirm(false);
    setPassword("");
    if (res.error) { setMsg(`Error: ${res.error}`); }
    else { setMsg("Everything reset! All users back to $10,000."); router.refresh(); }
  }

  return (
    <div className="rounded-xl bg-[#161b22] border border-[#ef4444]/30 p-5 space-y-3">
      <div>
        <h3 className="text-[14px] font-semibold text-[#ef4444]">Reset Everything</h3>
        <p className="text-[11px] text-[#484f58]">Deletes all bets, transactions, comments. Gives everyone $10,000 fresh.</p>
      </div>
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Reset password"
        className="w-full h-8 rounded-lg bg-[#0d1117] border border-[#21262d] px-3 text-[12px] text-[#e6edf3] placeholder:text-[#484f58] focus:border-[#ef4444] focus:outline-none" />
      {confirm && (
        <div className="rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/30 px-3 py-2">
          <p className="text-[12px] text-[#ef4444] font-medium">This will permanently delete ALL data. Click again to confirm.</p>
        </div>
      )}
      <button onClick={handleReset} disabled={loading || !password}
        className="w-full rounded-lg bg-[#ef4444] py-2 text-[13px] font-semibold text-white hover:bg-[#dc2626] disabled:opacity-50 transition-colors">
        {loading ? "Resetting..." : confirm ? "Confirm Reset" : "Reset Everything"}
      </button>
      {msg && <p className="text-[12px] text-[#7d8590]">{msg}</p>}
    </div>
  );
}

function DeleteEventCard({
  eventKeys,
  eventNames,
  router,
}: {
  eventKeys: string[];
  eventNames: Record<string, string>;
  router: ReturnType<typeof useRouter>;
}) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmKey, setConfirmKey] = useState<string | null>(null);

  async function handleDelete(eventKey: string) {
    if (confirmKey !== eventKey) {
      setConfirmKey(eventKey);
      return;
    }
    setLoading(true);
    setMsg(null);
    const res = await deleteEvent(eventKey);
    setLoading(false);
    setConfirmKey(null);
    if (res.error) setMsg(`Error: ${res.error}`);
    else {
      setMsg(`Deleted ${eventNames[eventKey] ?? eventKey}`);
      router.refresh();
    }
  }

  return (
    <div className="rounded-xl bg-[#161b22] border border-[#21262d] p-5 space-y-3 max-w-md">
      <div>
        <h3 className="text-[14px] font-semibold text-[#e6edf3]">Delete Event</h3>
        <p className="text-[11px] text-[#484f58]">Remove an event and all its matches, bets, and prediction markets</p>
      </div>
      <div className="space-y-2">
        {eventKeys
          .filter((ek) => ek.includes("devtest") || !/^\d{4}[a-z]{2,}$/.test(ek))
          .map((ek) => (
          <div key={ek} className="flex items-center justify-between rounded-lg bg-[#0d1117] px-3 py-2">
            <div className="min-w-0">
              <span className="text-[12px] text-[#e6edf3] block truncate">{eventNames[ek] ?? ek}</span>
              <span className="text-[10px] text-[#484f58]">{ek}</span>
            </div>
            <button
              onClick={() => handleDelete(ek)}
              disabled={loading}
              className={`shrink-0 rounded-md px-3 py-1 text-[11px] font-semibold transition-colors ${
                confirmKey === ek
                  ? "bg-[#ef4444] text-white"
                  : "bg-[#ef4444]/10 text-[#ef4444] hover:bg-[#ef4444]/20 border border-[#ef4444]/30"
              } disabled:opacity-50`}
            >
              {loading && confirmKey === ek ? "Deleting..." : confirmKey === ek ? "Confirm" : "Delete"}
            </button>
          </div>
        ))}
      </div>
      {msg && <p className="text-[12px] text-[#7d8590]">{msg}</p>}
    </div>
  );
}
