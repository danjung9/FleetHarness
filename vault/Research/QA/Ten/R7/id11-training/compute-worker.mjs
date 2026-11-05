import { parentPort, workerData } from 'node:worker_threads';
import { compute, prepareCadence, negotiateWithTrace } from './compute.mjs';
const {input,operation}=workerData;
try {
 parentPort.postMessage(operation==='/api/cadence'?{record:prepareCadence(input.record,input.rules)}:operation==='/api/exchanges'?negotiateWithTrace(input):compute(input));
} catch(e){parentPort.postMessage({error:e.message});}
