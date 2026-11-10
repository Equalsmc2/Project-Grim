import { mkdir, writeFile, appendFile } from 'node:fs/promises';
import { relative } from 'node:path';
import { project } from './project.mjs';
export default class QAReporter {
  onBegin(config, suite) { this.suite = suite; this.errors = []; }
  onError(error) { this.errors.push(error.message || String(error)); }
  async onEnd(result) {
    await mkdir('artifacts', { recursive: true });
    const tests = this.suite.allTests().map(test => ({
      title: test.titlePath().join(' > '), outcome: test.outcome(),
      location: { ...test.location, file: relative(process.cwd(), test.location.file) }, annotations: test.annotations,
      attempts: test.results.map(r => ({ status: r.status, retry: r.retry, durationMs: r.duration,
        errors: r.errors.map(e => e.message || String(e)),
        attachments: r.attachments.filter(a => a.path).map(a => ({ name: a.name, path: relative(process.cwd(), a.path) })) }))
    }));
    const report = { schemaVersion: 1, source: 'playwright', project: project.name, visualMode: project.visual,
      status: result.status, generatedAt: new Date().toISOString(), errors: this.errors, tests };
    await writeFile('artifacts/qa-report.json', JSON.stringify(report, null, 2));
    const lines = [`# Project QA: ${project.name}`, '', `Run: **${result.status}**`, `Visual mode: **${project.visual}**${project.visual === 'capture' ? ' (screenshots saved; NOT regression-tested)' : ''}`, '',
      ...['expected', 'unexpected', 'flaky', 'skipped'].map(s => `- ${s}: ${tests.filter(t => t.outcome === s).length}`), '',
      ...this.errors.map(e => `Runner error: ${e}`)];
    for (const test of tests.filter(t => t.outcome !== 'expected')) {
      lines.push('', `## ${test.outcome}: ${test.title}`, '', `Source: ${test.location.file}:${test.location.line}`);
      for (const r of test.attempts) lines.push(`Attempt ${r.retry + 1}: ${r.status}`, ...r.errors.map(e => '\n```text\n' + e.replaceAll('```','~~~') + '\n```'), ...r.attachments.map(a => `Artifact: ${a.path}`));
    }
    lines.push('', 'Open artifacts/html/index.html with npm run report for screenshots, traces and steps.', 'Skipped checks are not passes. Retries remain visible. No AI repair ran.');
    const md = lines.join('\n');
    await writeFile('artifacts/summary.md', md);
    if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, md);
  }
}
