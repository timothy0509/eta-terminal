#!/usr/bin/env node
import readline from 'readline';
import { fetchEtaDb, fetchEtas } from 'hk-bus-eta';

/** Prompt the user and return their input */
async function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise((resolve) =>
    rl.question(question, (ans) => {
      rl.close();
      resolve(ans.trim());
    })
  );
}

/** Print an ASCII table with given headers and row objects */
function printTable(headers, rows) {
  // compute column widths
  const widths = headers.map((h) => h.length);
  rows.forEach((r) =>
    headers.forEach((h, i) => {
      widths[i] = Math.max(widths[i], String(r[h] || '').length);
    })
  );
  const pad = (s, w) => s + ' '.repeat(w - s.length);

  // header row
  console.log(
    '| ' +
      headers.map((h, i) => pad(h, widths[i])).join(' | ') +
      ' |'
  );
  console.log(
    '|-' +
      widths.map((w) => '-'.repeat(w)).join('-|-') +
      '-|'
  );
  // data rows
  rows.forEach((r) => {
    console.log(
      '| ' +
        headers
          .map((h, i) => pad(String(r[h] || ''), widths[i]))
          .join(' | ') +
        ' |'
    );
  });
}

async function main() {
  console.log('HK Bus ETA Terminal App\n');

  // 1) Get user inputs
  const stopQuery = await prompt(
    'Enter bus stop name (partial, EN or ZH): '
  );
  const filterInput = await prompt(
    'Filter by route numbers (comma-sep), or leave blank: '
  );
  const routeFilter = filterInput
    ? new Set(
        filterInput
          .split(',')
          .map((r) => r.trim().toUpperCase())
          .filter((r) => r)
      )
    : null;

  // 2) Fetch and cache DB
  console.log('\nFetching bus database…');
  const busDb = await fetchEtaDb();

  // 3) Match all stops
  const q = stopQuery.toLowerCase();
  const stopMatches = Object.entries(busDb.stopList).filter(
    ([, m]) =>
      m.name.en.toLowerCase().includes(q) ||
      m.name.zh.toLowerCase().includes(q)
  );
  if (stopMatches.length === 0) {
    console.error('No stops matched your query.');
    process.exit(1);
  }

  let printedAny = false;

  // 4) For each matched stop, gather and print ETAs
  for (const [stopId, stopMeta] of stopMatches) {
    // find all routes/seqs serving this stop
    const hits = [];
    for (const [, info] of Object.entries(busDb.routeList)) {
      if (
        routeFilter &&
        !routeFilter.has(info.route.toUpperCase())
      )
        continue;
      for (const stopsArr of Object.values(info.stops)) {
        stopsArr.forEach((sid, seq) => {
          if (sid === stopId) hits.push({ info, seq });
        });
      }
    }

    if (hits.length === 0) continue;

    // fetch ETAs for each hit, build rows
    const rows = [];
    for (const { info, seq } of hits) {
      let etalist = [];
      try {
        etalist = await fetchEtas({
          ...info,
          seq,
          language: 'en'
        });
      } catch {
        // skip non-bus or error
        continue;
      }
      if (!etalist || etalist.length === 0) continue;

      etalist.forEach((e) => {
        let t = e.eta;
        const m = /^.+T(\d\d:\d\d:\d\d)/.exec(t);
        if (m) t = m[1];
        rows.push({
          Route: info.route,
          Direction: `${info.orig.en} → ${info.dest.en}`,
          'Stop #': seq,
          ETA: t,
          Co: e.co,
          Remark: e.remark.en || ''
        });
      });
    }

    if (!rows.length) continue;

    printedAny = true;
    console.log(
      `\nStop: ${stopMeta.name.en} / ${stopMeta.name.zh}`
        + ` (ID: ${stopId})`
    );
    printTable(
      ['Route', 'Direction', 'Stop #', 'ETA', 'Co', 'Remark'],
      rows
    );
  }

  if (!printedAny) {
    console.log(
      '\nNo bus ETAs available for any matching stop/route.'
    );
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});