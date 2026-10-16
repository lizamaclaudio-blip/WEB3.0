// Reuse the actual handlers and their validation/RLS-backed RPCs. No parallel
// business logic, response cache, session cache or privileged shortcut.
import { GET as availability } from '../../src/app/api/vector/availability/route';
import { GET as roadmap } from '../../src/app/api/vector/community/roadmap/route';
import { GET as proposals } from '../../src/app/api/vector/community/proposals/route';
import { GET as session } from '../../src/app/api/vector/community/session/route';
export const readHandlers: Record<string, (request: Request) => Response | Promise<Response>> = {
  '/api/vector/availability': availability,
  '/api/vector/community/roadmap': roadmap,
  '/api/vector/community/proposals': proposals,
  '/api/vector/community/session': session,
};
