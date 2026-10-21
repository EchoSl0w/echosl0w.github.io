// scripts/fetch-activity.js
const fs = require('fs');

const USER_ID = process.env.PWN_USER_ID || '3947';
const URL = `https://pwn.college/pwncollege_api/v1/activity/${USER_ID}`;
const BELT = 'yellow'; // set this to your current belt

async function main() {
  const headers = {};
  if (process.env.PWN_COOKIE) headers.Cookie = process.env.PWN_COOKIE; // only if needed

  const res = await fetch(URL, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status} from pwn.college`);

  const body = await res.json();
  if (!body.success) throw new Error('API returned success=false');

  // Count solves per calendar day in Europe/Berlin (en-CA formats as YYYY-MM-DD)
  const days = {};
  for (const ts of body.data.solve_timestamps) {
    const day = new Date(ts).toLocaleDateString('en-CA', {
      timeZone: 'Europe/Berlin',
    });
    days[day] = (days[day] || 0) + 1;
  }

  const out = {
    fetched_at: new Date().toISOString(),
    belt: BELT,
    total_solves: body.data.total_solves,
    days,
  };

  fs.mkdirSync('_data', { recursive: true });
  fs.writeFileSync('_data/pwn_activity.json', JSON.stringify(out, null, 2));
  console.log(
    `Wrote ${Object.keys(days).length} active days, ${out.total_solves} solves`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1); // fail the build so Pages keeps the last good deploy
});
