import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
export function options(input){if(!input||typeof input.modulePath!=='string'||!input.modulePath||typeof input.executablePath!=='string'||!input.executablePath)throw Error('Existing modulePath and executablePath required');return {...process.env,NODE_PATH:input.modulePath,BROWSER_EXECUTABLE:input.executablePath};}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const env=options(JSON.parse(readFileSync(0,'utf8')));const r=spawnSync(process.execPath,['--test','calendar.browser.cjs'],{env,encoding:'utf8'});console.log(JSON.stringify({exitCode:r.status,stdout:r.stdout,stderr:r.stderr}));}
