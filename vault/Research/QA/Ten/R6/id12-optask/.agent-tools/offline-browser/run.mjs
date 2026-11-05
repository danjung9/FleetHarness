import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
export function configuration(input){
 if(!input || !path.isAbsolute(input.playwrightModule||'') || !path.isAbsolute(input.chromeExecutable||''))throw Error('Absolute provisioned browser paths required');
 if(typeof input.outputDirectory!=='string'||!input.outputDirectory||path.isAbsolute(input.outputDirectory)||input.outputDirectory.split('/').includes('..'))throw Error('Workspace-relative output directory required');
 return {...process.env,PLAYWRIGHT_MODULE:input.playwrightModule,CHROME_EXECUTABLE:input.chromeExecutable,OFFLINE_EVIDENCE_DIR:input.outputDirectory};
}
if(import.meta.url===pathToFileURL(process.argv[1]).href){
 try{const env=configuration(JSON.parse(readFileSync(0,'utf8')));const r=spawnSync(process.execPath,['--test','tests/offline.integration.mjs'],{env,encoding:'utf8',timeout:120000});process.stdout.write(JSON.stringify({exitCode:r.status,stdout:r.stdout,stderr:r.stderr,error:r.error?.message||null}));process.exitCode=r.status===0?0:1;}catch(e){console.error(e.message);process.exitCode=1;}
}
