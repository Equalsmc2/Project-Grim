import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Proposed interchange format, not an adapter to an uninspected .mcaddon.
export function parseBedrockLog(text) {
  const events = text.split(/\r?\n/).filter(line => line.includes('QA_EVENT ')).map(line => JSON.parse(line.slice(line.indexOf('QA_EVENT ') + 9)));
  const ends = events.filter(e => e.type === 'run-end');
  if (ends.length !== 1) throw new Error('Expected one run-end event from one complete run.');
  const end = ends[0];
  if (end.schemaVersion !== 1 || typeof end.runId !== 'string' || !end.runId || !Number.isInteger(end.expected) || end.expected < 1) throw new Error('Invalid run-end metadata.');
  if (events.at(-1) !== end) throw new Error('run-end must be last.');
  const tests = events.filter(e => e.type === 'test');
  if (events.length !== tests.length + 1) throw new Error('Unknown event type.');
  const ids = new Set();
  for (const t of tests) {
    if (t.schemaVersion !== 1 || t.runId !== end.runId || typeof t.id !== 'string' || !t.id || ids.has(t.id) || !['passed','failed','skipped','launched'].includes(t.status)) throw new Error('Invalid or duplicate test event.');
    ids.add(t.id);
  }
  if (tests.length !== end.expected) throw new Error('Incomplete run: result count differs from expected.');
  const status = tests.some(t => t.status === 'failed') ? 'failed' : tests.some(t => t.status !== 'passed') ? 'incomplete' : 'passed';
  return { schemaVersion: 1, source: 'bedrock-log', runId: end.runId, status, tests, visualTested: false };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const input = process.argv[2];
  if (!input) { console.error('Usage: node scripts/bedrock-report.mjs <log.txt> [output-directory]'); process.exitCode = 2; }
  else {
    const directory = process.argv[3] || 'artifacts/bedrock';
    await mkdir(directory, { recursive: true });
    try {
      const report = parseBedrockLog(await readFile(input, 'utf8'));
      await writeFile(resolve(directory, 'qa-report.json'), JSON.stringify(report, null, 2));
      await writeFile(resolve(directory, 'summary.md'), `# Bedrock: ${report.status}\n\nRun: ${report.runId}\n\n` + report.tests.map(t => `- ${t.status}: ${t.id}`).join('\n') + '\n\nVisual testing: not performed.\n');
      if (report.status !== 'passed') process.exitCode = 1;
    } catch (error) {
      await writeFile(resolve(directory, 'qa-report.json'), JSON.stringify({ schemaVersion: 1, source: 'bedrock-log', status: 'invalid', error: error.message, visualTested: false }, null, 2));
      await writeFile(resolve(directory, 'summary.md'), `# Bedrock: invalid\n\n${error.message}\n`);
      console.error(error.message); process.exitCode = 2;
    }
  }
}
