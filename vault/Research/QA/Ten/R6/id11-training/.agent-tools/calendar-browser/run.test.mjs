import test from 'node:test';import assert from 'node:assert/strict';import {options} from './run.mjs';
test('preserves inherited environment and supplied browser paths',()=>{assert.deepEqual(options({modulePath:'/tmp/modules',executablePath:'/tmp/browser'}),{...process.env,NODE_PATH:'/tmp/modules',BROWSER_EXECUTABLE:'/tmp/browser'});});
test('rejects missing browser configuration',()=>{assert.throws(()=>options({}),/required/);});
