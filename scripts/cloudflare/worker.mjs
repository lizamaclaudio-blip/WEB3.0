import publicAssets from '../../.open-next/public-assets.mjs';
import { connect } from 'cloudflare:sockets';
import { runWithCloudflareRequestContext } from '../../.open-next/cloudflare/init.js';
// Only the immutable connector is shared; sockets and credentials are created
// within a request. Vercel continues to use its existing Node TLS transport.
globalThis[Symbol.for('vector.smtp.native-tls-connect')] = connect;
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from '../../.open-next/worker.js';

// Small dispatcher: public precompiled HTML/RSC bypass Next's server startup.
// Every sensitive/dynamic operation retains the existing OpenNext handler.
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === 'GET' && ['/api/vector/availability', '/api/vector/community/roadmap', '/api/vector/community/proposals', '/api/vector/community/session'].includes(url.pathname)) {
      return runWithCloudflareRequestContext(request, env, ctx, async () => {
        const { readHandlers } = await import('../../.open-next/vector-api.mjs');
        return readHandlers[url.pathname](request);
      });
    }
    if (url.pathname.startsWith('/_vector-public/')) return new Response(null, { status: 404 });
    const asset = publicAssets[url.pathname];
    if (asset && ['GET', 'HEAD'].includes(request.method) && !request.headers.has('next-action')
      && !request.headers.has('next-router-segment-prefetch')) {
      const rsc = request.headers.get('rsc') === '1';
      const target = new URL(asset + (rsc ? '.rsc' : '.html'), url.origin);
      const result = await env.ASSETS.fetch(new Request(target, { method: request.method }));
      if (result.status === 200) {
        const headers = new Headers(result.headers);
        headers.set('Content-Type', rsc ? 'text/x-component; charset=utf-8' : 'text/html; charset=utf-8');
        headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
        headers.set('Vary', 'RSC, Next-Router-State-Tree, Next-Router-Prefetch, Next-Router-Segment-Prefetch');
        headers.set('X-Robots-Tag', 'noindex, nofollow');
        headers.set('Referrer-Policy', 'no-referrer');
        headers.set('X-Content-Type-Options', 'nosniff');
        headers.set('X-Vector-Delivery', rsc ? 'precompiled-rsc' : 'precompiled-html');
        headers.delete('set-cookie');
        return new Response(result.body, { status: 200, headers });
      }
    }
    // Static CSS/fonts/images also avoid the application server. Asset misses
    // fall through, preserving redirects, auth, API validation and 404 handling.
    if (['GET', 'HEAD'].includes(request.method) && /\.(?:css|js|woff2?|webp|png|jpg|jpeg|svg|ico)$/.test(url.pathname)) {
      const result = await env.ASSETS.fetch(request);
      if (result.status === 200) return result;
    }
    const { default: application } = await import('../../.open-next/worker.js');
    return application.fetch(request, env, ctx);
  },
};
