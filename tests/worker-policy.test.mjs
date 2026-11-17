import test from 'node:test';
import assert from 'node:assert/strict';
import { workerContentSecurityPolicy } from '../dist-electron/shared/worker-policy.js';
test('hosted CSP admits only the configured worker and isolated previews',()=>{
 const policy=workerContentSecurityPolicy('https://worker.example.com','https://*.preview.example.com',false);
 assert.match(policy,/connect-src 'self' https:\/\/worker\.example\.com;/);
 assert.match(policy,/frame-src https:\/\/\*\.preview\.example\.com$/);
 assert.match(policy,/script-src 'self';/);assert.ok(!policy.includes('unsafe-eval'));
 assert.throws(()=>workerContentSecurityPolicy('http://worker.example.com','https://*.preview.example.com',false));
 assert.throws(()=>workerContentSecurityPolicy('https://worker.example.com',undefined,false));
 assert.throws(()=>workerContentSecurityPolicy('https://worker.example.com','https://worker.example.com',false));
 assert.match(workerContentSecurityPolicy('http://127.0.0.1:3000','http://*.localhost:3001',true),/frame-src http:\/\/\*\.localhost:3001$/);
});
