import test from 'node:test';
import assert from 'node:assert/strict';
import {configuration} from './run.mjs';
test('retains inherited environment and explicit provisioned paths',()=>{const env=configuration({playwrightModule:'/browser/module',chromeExecutable:'/browser/bin',outputDirectory:'repair-evidence'});assert.equal(env.PATH,process.env.PATH);assert.equal(env.PLAYWRIGHT_MODULE,'/browser/module');assert.equal(env.OFFLINE_EVIDENCE_DIR,'repair-evidence');});
test('rejects absent paths and escaping evidence directory',()=>{assert.throws(()=>configuration({}));assert.throws(()=>configuration({playwrightModule:'/module',chromeExecutable:'/bin',outputDirectory:'../escape'}));});
