import test from 'node:test';
import assert from 'node:assert/strict';
import { PreviewBoundary } from '../dist-electron/electron/preview-boundary.js';

test('preview network access follows one host lease and never inherits shell access', () => {
  const boundary = new PreviewBoundary({ fileRoot: '/app/dist', developmentURL: 'http://127.0.0.1:5173' });
  assert.equal(boundary.allows('file:///app/dist/index.html', true), true);
  assert.equal(boundary.allows('file:///app/private.txt', true), false);
  assert.equal(boundary.allows('file:///app/dist/index.html', false), false);
  assert.equal(boundary.allows('http://127.0.0.1:5173/src/App.tsx', true), true);
  assert.equal(boundary.allows('http://127.0.0.1:5173/src/App.tsx', false), false);
  assert.equal(boundary.allows('https://example.com/exfiltrate', true), false);
  assert.throws(() => boundary.setPreview('https://example.com'), /host-issued/);
  boundary.setPreview('http://127.0.0.1:42100/capability/');
  assert.equal(boundary.allows('http://127.0.0.1:42100/api/invoke', false), true);
  assert.equal(boundary.allows('http://127.0.0.1:42101/stolen', false), false);
  assert.equal(boundary.allows('http://localhost:42100/stolen', false), false);
  boundary.setPreview('http://127.0.0.1:42102/another/');
  assert.equal(boundary.allows('http://127.0.0.1:42100/api/invoke', false), false);
  boundary.setPreview(null);
  assert.equal(boundary.allows('http://127.0.0.1:42102/api/invoke', false), false);
});

const previewURL = 'http://127.0.0.1:42100/';
const developmentURL = 'http://127.0.0.1:5173/build?project=mailmcp';

function responseHarness(shell = { fileRoot: '/app/dist', developmentURL }) {
  const boundary = new PreviewBoundary(shell);
  let onHeadersReceived;
  const contents = {
    id: 7, mainFrame: {}, on() {},
    session: { webRequest: { onBeforeRequest() {}, onHeadersReceived(handler) { onHeadersReceived = handler; } } },
  };
  boundary.install(contents);
  return {
    boundary,
    headers(responseHeaders, details = {}) {
      let response, callbacks = 0;
      onHeadersReceived({ url: previewURL, webContentsId: contents.id, resourceType: 'subFrame', responseHeaders, ...details }, result => {
        response = result; callbacks++;
      });
      assert.equal(callbacks, 1);
      assert.notEqual(response.cancel, true);
      return response.responseHeaders ?? responseHeaders;
    },
  };
}

const cspDirectives = policy => policy.split(';').map(value => value.trim()).filter(Boolean);
const ancestors = policy => cspDirectives(policy).find(value => /^frame-ancestors\s/i.test(value))?.split(/\s+/).slice(1);
const otherDirectives = policy => cspDirectives(policy).filter(value => !/^frame-ancestors(?:\s|$)/i.test(value));

test('an opted-in demo permits the exact development shell origin in existing frame policies', () => {
  const { boundary, headers } = responseHarness();
  boundary.setPreview(previewURL, { allowShellEmbedding: true });
  for (const header of ['content-security-policy', 'Content-Security-Policy', 'CONTENT-SECURITY-POLICY']) {
    const original = {
      [header]: [
        "default-src 'self'; frame-ancestors 'self' file:; object-src 'none'",
        "sandbox; default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'self'; img-src data:",
        "default-src 'self'; sandbox allow-scripts",
      ],
      'X-Frame-Options': ['SAMEORIGIN'],
      'Content-Type': ['text/html; charset=utf-8'],
      'Cache-Control': ['no-store'],
    };
    for (const url of [previewURL, new URL('/api/messages/fictional/body', previewURL).href]) {
      const received = headers(structuredClone(original), { url });
      assert.deepEqual(Object.keys(received).sort(), Object.keys(original).sort());
      assert.deepEqual(ancestors(received[header][0]), ["'self'", 'file:', 'http://127.0.0.1:5173']);
      assert.deepEqual(ancestors(received[header][1]), ["'self'", 'http://127.0.0.1:5173']);
      for (let index = 0; index < original[header].length; index++) {
        assert.deepEqual(otherDirectives(received[header][index]), otherDirectives(original[header][index]));
      }
      assert.equal(received[header][2], original[header][2], 'A policy without frame-ancestors stays unchanged');
      for (const key of ['X-Frame-Options', 'Content-Type', 'Cache-Control']) assert.deepEqual(received[key], original[key]);
    }
  }
});

test('demo framing exceptions are restricted to the selected origin, owning web contents, and subframes', () => {
  const { boundary, headers } = responseHarness();
  boundary.setPreview(previewURL, { allowShellEmbedding: true });
  const original = { 'Content-Security-Policy': ["sandbox; frame-ancestors 'self' file:"], 'X-Frame-Options': ['DENY'] };
  for (const details of [
    { url: 'http://127.0.0.1:42101/' },
    { url: 'http://localhost:42100/' },
    { url: 'http://127.0.0.1:5173/' },
    { url: 'https://127.0.0.1:42100/' },
    { webContentsId: 8 },
    { webContentsId: undefined },
    { resourceType: 'mainFrame' },
    { resourceType: 'script' },
    { resourceType: 'xhr' },
  ]) assert.deepEqual(headers(structuredClone(original), details), original, JSON.stringify(details));
});

test('ordinary previews and packaged shells retain their original framing policies', () => {
  const original = { 'Content-Security-Policy': ["default-src 'self'; frame-ancestors 'self' file:"], 'X-Frame-Options': ['SAMEORIGIN'] };
  const ordinary = responseHarness();
  ordinary.boundary.setPreview(previewURL);
  assert.deepEqual(ordinary.headers(structuredClone(original)), original);
  ordinary.boundary.setPreview(previewURL, { allowShellEmbedding: false });
  assert.deepEqual(ordinary.headers(structuredClone(original)), original);
  const packaged = responseHarness({ fileRoot: '/app/dist' });
  packaged.boundary.setPreview(previewURL, { allowShellEmbedding: true });
  assert.deepEqual(packaged.headers(structuredClone(original)), original);
});

test('clearing or replacing a demo preview revokes its shell embedding exception', () => {
  const { boundary, headers } = responseHarness();
  const original = { 'Content-Security-Policy': ["frame-ancestors 'self' file:"] };
  boundary.setPreview(previewURL, { allowShellEmbedding: true });
  assert.ok(ancestors(headers(structuredClone(original))['Content-Security-Policy'][0]).includes('http://127.0.0.1:5173'));
  boundary.setPreview(null);
  assert.deepEqual(headers(structuredClone(original)), original);
  boundary.setPreview(previewURL);
  assert.deepEqual(headers(structuredClone(original)), original, 'A generic preview does not inherit the previous demo opt-in');
  boundary.setPreview(previewURL, { allowShellEmbedding: true });
  boundary.setPreview('http://127.0.0.1:42101/', { allowShellEmbedding: true });
  assert.deepEqual(headers(structuredClone(original)), original, 'A former demo origin loses its exception');
});

test('demo framing preserves explicit denial and missing policies without repeating an allowed shell origin', () => {
  const { boundary, headers } = responseHarness();
  boundary.setPreview(previewURL, { allowShellEmbedding: true });
  for (const original of [
    { 'Content-Type': ['text/html'], 'X-Frame-Options': ['SAMEORIGIN'] },
    { 'Content-Security-Policy': ["default-src 'self'; sandbox"] },
    { 'Content-Security-Policy': ["frame-ancestors 'none'; sandbox"] },
    { 'Content-Security-Policy': ["frame-ancestors 'self' http://127.0.0.1:5173 file:; sandbox"] },
  ]) assert.deepEqual(headers(structuredClone(original)), original);
});
