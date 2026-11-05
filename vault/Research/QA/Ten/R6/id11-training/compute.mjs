import { Worker } from 'node:worker_threads';
import { run } from './domain.mjs';
export async function compute(input,{signal}={}) {
 if(!signal)return run(input);
 return new Promise((resolve,reject)=>{const worker=new Worker(new URL('./domain.mjs',import.meta.url),{workerData:{pb4t:true,input}});const abort=()=>{void worker.terminate();reject(signal.reason||new Error('Cancelled'));};if(signal.aborted)return abort();signal.addEventListener('abort',abort,{once:true});worker.once('message',value=>{signal.removeEventListener('abort',abort);resolve(value);void worker.terminate();});worker.once('error',e=>{signal.removeEventListener('abort',abort);reject(e);});});
}
