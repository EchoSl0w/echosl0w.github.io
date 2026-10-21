// _scripts/fetch-htb.js
const fs = require('fs');

const USER_ID = process.env.HTB_USER_ID || '1427067';

const ENDPOINTS = {
  machines: `https://labs.hackthebox.com/api/v4/profile/progress/machines/${USER_ID}`,
  sherlocks: `https://labs.hackthebox.com/api/v4/profile/progress/sherlocks/${USER_ID}`,
  challenges: `https://labs.hackthebox.com/api/v4/profile/progress/challenges/${USER_ID}`,
};

const CHART_URL = (type) =>
  `https://labs.hackthebox.com/api/v4/users/${USER_ID}/profile/progress/chart?duration=1Y&content_type=${type}`;

async function getJson(url) {
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'blog-activity-fetch',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return res.json();
}

// Machines use owned_machines/total_machines; challenges and sherlocks use owned_challenges/total_challenges
function summarize(profile, ownsKey, diffKey) {
  const owns = profile[ownsKey];
  return {
    solved: owns.solved,
    total: owns.total,
    difficulties: profile[diffKey].map((d) => ({
      name: d.name,
      owned: d.owned_machines ?? d.owned_challenges ?? 0,
      total: d.total_machines ?? d.total_challenges ?? 0,
    })),
  };
}

// Turn chart points into 12 monthly values (Jan = index 0) for the given year.
// Points look like { time: "2026-10-21 00:00:00", value: 0 }; several points can fall in the same month.
function toMonthly(points, year) {
  const months = Array(12).fill(0);
  for (const p of points || []) {
    const [date] = p.time.split(' ');
    const [y, m] = date.split('-').map(Number);
    if (y === year) months[m - 1] += Number(p.value) || 0;
  }
  return months;
}

async function main() {
  const year = new Date().getFullYear();

  const [
    machines,
    sherlocks,
    challenges,
    chartMachines,
    chartSherlocks,
    chartChallenges,
  ] = await Promise.all([
    getJson(ENDPOINTS.machines),
    getJson(ENDPOINTS.sherlocks),
    getJson(ENDPOINTS.challenges),
    getJson(CHART_URL('machines')),
    getJson(CHART_URL('sherlocks')),
    getJson(CHART_URL('challenges')),
  ]);

  const out = {
    fetched_at: new Date().toISOString(),
    machines: summarize(
      machines.profile,
      'machine_owns',
      'machine_difficulties',
    ),
    sherlocks: summarize(
      sherlocks.profile,
      'challenge_owns',
      'challenge_difficulties',
    ),
    challenges: summarize(
      challenges.profile,
      'challenge_owns',
      'challenge_difficulties',
    ),
    monthly: {
      machines: toMonthly(chartMachines.chart_data.points, year),
      sherlocks: toMonthly(chartSherlocks.chart_data.points, year),
      challenges: toMonthly(chartChallenges.chart_data.points, year),
    },
  };

  fs.mkdirSync('_data', { recursive: true });
  fs.writeFileSync('_data/htb_progress.json', JSON.stringify(out, null, 2));
  console.log(
    `Wrote HTB progress: machines ${out.machines.solved}, ` +
      `sherlocks ${out.sherlocks.solved}, challenges ${out.challenges.solved}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1); // fail the build so the last good deploy stays live
});
