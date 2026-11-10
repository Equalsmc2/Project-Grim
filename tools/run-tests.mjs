// Project Grim QA runner — no npm dependencies required.
// Runs each test in an isolated Node process; writes a local, reproducible report.
import {spawn} from 'node:child_process';
import {readdirSync,mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const args=new Set(process.argv.slice(2));
const quick=args.has('--quick');
const reportDir=path.join(root,'qa-reports');
const testDir=path.join(root,'tests');
const all=readdirSync(testDir).filter(n=>n.endsWith('.test.mjs')||n.endsWith('.test.cjs')).sort();
const selected=quick?all.filter(n=>['asset-integrity-151.test.mjs','history-151.test.mjs','http-smoke-151.test.mjs','session-stress-151.test.mjs','render-budget-152.test.mjs','preset-rebuild.test.mjs','cloud-outbox-154.test.mjs','scene-backup-154.test.mjs','firebase-recovery-154.test.mjs','accessibility-155.test.mjs','music-157.test.mjs'].includes(n)):all;
const timeoutMs=Number(process.env.GRIM_TEST_TIMEOUT_MS)||90000;
const started=new Date();
function run(test){
  return new Promise(resolve=>{
    const testArgs=test.endsWith('.cjs')?['--experimental-vm-modules',`tests/${test}`]:[`tests/${test}`];
    const t0=performance.now();let out='',err='',timedOut=false,completed=false;
    const child=spawn(process.execPath,testArgs,{cwd:root,env:{...process.env,CI:'1'},stdio:['ignore','pipe','pipe']});
    child.stdout.on('data',data=>{out+=data.toString();if(out.length>60000)out=out.slice(-60000);});
    child.stderr.on('data',data=>{err+=data.toString();if(err.length>30000)err=err.slice(-30000);});
    const timer=setTimeout(()=>{timedOut=true;child.kill('SIGKILL');},timeoutMs);
    child.once('error',error=>{err+=String(error);});
    child.once('close',(code,signal)=>{
      if(completed)return;completed=true;clearTimeout(timer);
      resolve({test,ok:code===0&&!timedOut,exitCode:code,signal,timeout:timedOut,ms:Math.round(performance.now()-t0),stdout:out.trim(),stderr:err.trim()});
    });
  });
}
const results=[];
console.log(`PROJECT GRIM — ${quick?'QUICK':'FULL'} QA · ${selected.length} independent tests`);
for(const test of selected){
 const result=await run(test);results.push(result);
 console.log(`${result.ok?'PASS':'FAIL'}  ${test.padEnd(35)} ${String(result.ms).padStart(5)} ms`);
 if(!result.ok)console.error((result.stderr+'\n'+result.stdout).trim().slice(-1800));
}
const ended=new Date();
const summary={release:'1.5.8',start:started.toISOString(),end:ended.toISOString(),mode:quick?'quick':'full',total:results.length,passed:results.filter(r=>r.ok).length,failed:results.filter(r=>!r.ok).length,browserVisualQA:'NOT RUN (optional manual browser smoke test)',results};
mkdirSync(reportDir,{recursive:true});
writeFileSync(path.join(reportDir,'last-run.json'),JSON.stringify(summary,null,2)+'\n');
const lines=[`# Project Grim ${summary.release} — QA results`,'',`Mode: ${summary.mode}`,`Completed: ${summary.end}`,`Tests: ${summary.passed}/${summary.total} passing`,'','| Test | Result | Time |','|---|---|---:|',...results.map(r=>`| ${r.test} | ${r.ok?'PASS':'FAIL'} | ${r.ms} ms |`),'','Browser visuals/FPS/Firebase live connection: **not verified by this runner**.','',`Full machine-readable results: \`qa-reports/last-run.json\`.`];
writeFileSync(path.join(reportDir,'last-run.md'),lines.join('\n')+'\n');
console.log(`\n${summary.passed}/${summary.total} passed. Results saved to qa-reports/last-run.{json,md}`);
if(summary.failed)process.exitCode=1;
