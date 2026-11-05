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
