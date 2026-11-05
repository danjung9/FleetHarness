import type { ToolDefinition } from '@earendil-works/pi-coding-agent';
import { Type } from 'typebox';
import { executeIsolatedProcess } from './isolated-executor.js';

export interface IsolatedAgentToolsOptions {
  workspace: string; executable: string; signal?: AbortSignal; immutablePaths?: string[];
  readPaths?: string[]; denyPaths?: string[];
}

function shellFailure(result: { exitCode: number | null; stdout: string; stderr: string }): string {
  const heading = `Isolated shell exited with code ${result.exitCode ?? 'unknown'}.`;
  const streams = [['stdout', result.stdout], ['stderr', result.stderr]].filter(([, text]) => text);
  if (!streams.length) return heading + '\n(no output)';
  const labels = streams.map(([name]) => `\n\n${name}:\n`);
  const budget = Math.floor((50_000 - Buffer.byteLength(heading + labels.join(''))) / streams.length);
  return heading + streams.map(([, text], index) => {
    const bytes = Buffer.from(text);
    if (bytes.length <= budget) return labels[index] + text;
    const marker = '[Earlier output truncated]\n';
    let start = bytes.length - budget + Buffer.byteLength(marker);
    // Keep each stream's tail without starting inside a UTF-8 character.
    while ((bytes[start] & 0xc0) === 0x80) start++;
    return labels[index] + marker + bytes.subarray(start).toString('utf8');
  }).join('');
}

// Fixed host code, evaluated by Node inside the OS sandbox. Tool paths and file
// contents are read only by this child; the host never resolves user paths.
const worker = String.raw`
const fs=require('node:fs/promises'), constants=require('node:fs').constants, path=require('node:path'),{spawn}=require('node:child_process'),{isUtf8}=require('node:buffer');
const MAX=2000000;
function unicode(value,field){
  if(typeof value==='string'&&!value.isWellFormed())throw Error(field+' must contain well-formed Unicode; unpaired surrogates cannot be encoded as UTF-8');
}
function text(bytes){
  if(!isUtf8(bytes))throw Error('File must contain valid UTF-8 for text read or edit. Use bash for bounded byte inspection or explicit encoding conversion before retrying.');
  return bytes.toString('utf8');
}
async function filePath(value,create){
  if(typeof value!=='string'||!value||value.includes('\0'))throw Error('Invalid file path');
  unicode(value,'File path');
  const root=process.cwd(),file=path.resolve(root,value);
  if(!file.startsWith(root+path.sep))throw Error('File path must stay inside the candidate workspace');
  const parts=path.relative(root,file).split(path.sep);let current=root;
  for(let i=0;i<parts.length;i++){
    current=path.join(current,parts[i]);let info;
    try{info=await fs.lstat(current);}catch(error){
      if(error.code!=='ENOENT')throw error;
      if(i===parts.length-1)break;
      if(!create)throw error;await fs.mkdir(current,{mode:0o700});info=await fs.lstat(current);
    }
    if(info.isSymbolicLink()||(!info.isDirectory()&&!info.isFile())||(info.isFile()&&info.nlink!==1))throw Error('File aliases and special files are not allowed');
    if(i<parts.length-1&&!info.isDirectory())throw Error('File ancestor is not a directory');
  }
  return file;
}
async function read(file,maximum){
  const handle=await fs.open(file,constants.O_RDONLY|constants.O_NOFOLLOW);
  try{const info=await handle.stat();if(!info.isFile()||info.nlink!==1||info.size>maximum)throw Error('File exceeds the read limit or is not an ordinary file');
    const bytes=Buffer.alloc(maximum+1);let count=0;
    for(;;){const item=await handle.read(bytes,count,bytes.length-count,null);count+=item.bytesRead;if(!item.bytesRead)break;if(count>maximum)throw Error('File exceeds the read limit');}
    return bytes.subarray(0,count);
  }finally{await handle.close();}
}
async function write(file,text){
  if(typeof text!=='string'||Buffer.byteLength(text)>MAX)throw Error('File content exceeds the 2 MB limit');
  unicode(text,'File content');
  const handle=await fs.open(file,constants.O_WRONLY|constants.O_CREAT|constants.O_NOFOLLOW,0o600);
  try{const info=await handle.stat();if(!info.isFile()||info.nlink!==1)throw Error('File must be ordinary and unlinked');await handle.truncate(0);await handle.writeFile(text,'utf8');}
  finally{await handle.close();}
}
async function main(){
  // A pipe chunk may end inside a UTF-8 character. Bound raw bytes and decode once.
  const chunks=[];let size=0;
  for await(const chunk of process.stdin){size+=chunk.length;if(size>MAX)throw Error('Tool input exceeds 2 MB');chunks.push(chunk);}
  const {operation,args}=JSON.parse(Buffer.concat(chunks,size).toString('utf8'));
  if(operation==='bash'){
    if(typeof args.command!=='string'||!args.command||Buffer.byteLength(args.command)>64000)throw Error('Invalid bounded shell command');
    const child=spawn('/bin/bash',['--noprofile','--norc','-c',args.command],{cwd:process.cwd(),env:process.env,stdio:['ignore','inherit','inherit']});
    await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',(code)=>{process.exitCode=code??1;resolve();});});return;
  }
  if(operation==='write')unicode(args.content,'File content');
  const file=await filePath(args.path,operation==='write');
  if(operation==='write'){await write(file,args.content);console.log(JSON.stringify({content:[{type:'text',text:'Wrote '+args.path}],details:{bytes:Buffer.byteLength(args.content)}}));return;}
  const bytes=await read(file,8000000);
  if(operation==='read'){
    let mime;
    if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))mime='image/png';
    else if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)mime='image/jpeg';
    else if(/^GIF8[79]a$/.test(bytes.subarray(0,6).toString()))mime='image/gif';
    else if(bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP')mime='image/webp';
    if(mime){if(bytes.length>1200000)throw Error('Image exceeds the 1.2 MB attachment limit');console.log(JSON.stringify({content:[{type:'text',text:'Image '+args.path},{type:'image',mimeType:mime,data:bytes.toString('base64')}],details:{image:true}}));return;}
    if(bytes.includes(0))throw Error('Unsupported binary file');
    const offset=args.offset??1,limit=args.limit??2000;
    if(!Number.isSafeInteger(offset)||offset<1||!Number.isSafeInteger(limit)||limit<1||limit>2000)throw Error('Use a positive line offset and a limit between 1 and 2000');
    const lines=text(bytes).split('\n');
    const notice=next=>next<=lines.length?'\n[Truncated; continue at line '+next+'.]':'';
    const selected=lines.slice(offset-1,offset-1+limit);
    let size=Buffer.byteLength(selected.join('\n'));
    while(selected.length&&size+Buffer.byteLength(notice(offset+selected.length))>50000){
      size-=Buffer.byteLength(selected.pop())+(selected.length?1:0);
    }
    if(!selected.length&&offset<=lines.length)throw Error('Line '+offset+' cannot fit in the 50000-byte read output limit ('+Buffer.byteLength(lines[offset-1])+' UTF-8 bytes before the continuation notice). Use bash to inspect a bounded slice of the line or selected JSON fields; reducing the line limit cannot split a line.');
    const next=offset+selected.length;const truncated=next<=lines.length;
    const result=selected.join('\n')+notice(next);
    console.log(JSON.stringify({content:[{type:'text',text:result}],details:{totalLines:lines.length,nextOffset:truncated?next:undefined,truncated}}));return;
  }
  if(operation==='edit'){
    if(!Array.isArray(args.edits)||!args.edits.length||args.edits.length>100)throw Error('Provide between 1 and 100 targeted edits');
    const original=text(bytes),edits=args.edits.map(edit=>{
      if(typeof edit.oldText!=='string'||!edit.oldText||typeof edit.newText!=='string')throw Error('Each edit requires nonempty oldText and string newText');
      unicode(edit.oldText,'oldText');unicode(edit.newText,'newText');
      const start=original.indexOf(edit.oldText);if(start<0||original.indexOf(edit.oldText,start+1)!==-1)throw Error('oldText must match exactly once in the original file');
      return {start,end:start+edit.oldText.length,text:edit.newText};
    }).sort((a,b)=>a.start-b.start);
    for(let i=1;i<edits.length;i++)if(edits[i].start<edits[i-1].end)throw Error('Targeted edits must not overlap');
    let result=original;for(const edit of edits.reverse())result=result.slice(0,edit.start)+edit.text+result.slice(edit.end);
    await write(file,result);console.log(JSON.stringify({content:[{type:'text',text:'Applied '+edits.length+' exact edit(s) to '+args.path}],details:{edits:edits.length}}));return;
  }
  throw Error('Unknown file operation');
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
`;

/** Override Pi's four built-ins so every file and shell action crosses the OS boundary. */
export function createIsolatedAgentTools(options: IsolatedAgentToolsOptions): ToolDefinition[] {
  let queue: Promise<unknown> = Promise.resolve();
  const schemas = {
    read: Type.Object({ path: Type.String(), offset: Type.Optional(Type.Number()), limit: Type.Optional(Type.Number()) }),
    write: Type.Object({ path: Type.String(), content: Type.String() }),
    edit: Type.Object({ path: Type.String(), edits: Type.Array(Type.Object({ oldText: Type.String(), newText: Type.String() })) }),
    bash: Type.Object({ command: Type.String(), timeout: Type.Optional(Type.Number()) }),
  };
  const descriptions = {
    read: 'Read valid UTF-8 candidate workspace text by 1-based line offset or attach a small PNG/JPEG/GIF/WebP image. Maximum 2000 lines and 50000 UTF-8 bytes including the continuation notice per read. If a line cannot fit, use bash to inspect bounded slices or selected JSON fields.',
    write: 'Write UTF-8 content to a candidate workspace file, creating parent directories. Protected contracts and inputs are immutable.',
    edit: 'Apply exact unique, non-overlapping edits to the original UTF-8 candidate file. Each edits[].oldText must match exactly once. Invalid UTF-8 files or unpaired Unicode surrogates are rejected before file mutation.',
    bash: 'Execute a bounded bash command inside the isolated candidate workspace. Host files, credentials and all network connections are unavailable.',
  };
  return (Object.keys(schemas) as (keyof typeof schemas)[]).map(name => ({
    name, label: name, description: descriptions[name], promptSnippet: descriptions[name], parameters: schemas[name], executionMode: 'sequential' as const,
    async execute(_id, args, signal) {
      const operation = queue.catch(() => {}).then(async () => {
        const input = args as Record<string, unknown>;
        let timeoutMs = 30_000;
        if (name === 'bash') {
          const seconds = input.timeout ?? 60;
          if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0 || seconds > 300) throw new Error('Shell timeout must be greater than zero and at most 300 seconds.');
          timeoutMs = Math.ceil(seconds * 1000);
        }
        const combined = AbortSignal.any([...(options.signal ? [options.signal] : []), ...(signal ? [signal] : [])]);
        combined.throwIfAborted();
        const result = await executeIsolatedProcess({ workspace: options.workspace, command: [options.executable, '--no-global-search-paths', '-e', worker],
          writable: name !== 'read', immutablePaths: options.immutablePaths, readPaths: options.readPaths, denyPaths: options.denyPaths,
          signal: combined, timeoutMs, maxOutputBytes: 2_000_000, stdin: JSON.stringify({ operation: name, args: input }) });
        if (result.exitCode !== 0) throw new Error(name === 'bash' ? shellFailure(result)
          : (result.stderr || result.stdout || 'Isolated tool failed.').slice(-50_000));
        if (name === 'bash') return { content: [{ type: 'text' as const, text: (result.stdout + result.stderr) || '(no output)' }], details: { isolated: true, exitCode: result.exitCode } };
        const output = JSON.parse(result.stdout);
        return { content: output.content, details: { ...output.details, isolated: true } };
      });
      queue = operation; return operation;
    },
  }));
}
