import { defineEventHandler } from 'nitro/h3';
import { handleApi } from '../server/api.js';
import { errorResponse } from '../server/http.js';
import { proxyModel } from '../server/model-proxy.js';
import { startRun, pauseRun } from '../server/build-control.js';
import { previewUrl } from '../server/preview.js';
import { appOrigin } from '../server/sandbox.js';

export default defineEventHandler(async ({ req }) => {
  try {
    const match = new URL(req.url).pathname.match(/^\/api\/internal\/model\/([a-f0-9-]+)\/responses$/);
    if (match) return await proxyModel(req, match[1]);
    return await handleApi(req, { startRun, pauseRun, previewUrl, shareUrl: token => `${appOrigin()}/api/share/${token}` });
  } catch (error) { return errorResponse(error); }
});
