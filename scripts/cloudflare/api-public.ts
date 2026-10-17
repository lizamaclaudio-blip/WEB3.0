// Public GET handlers only; Supabase reads use the publishable key and RLS.
import {GET as availability} from '../../src/app/api/vector/availability/route';
import {readRoadmap as roadmap,readProposals as proposals} from './read-public-data';
export const publicHandlers:Record<string,(request:Request)=>Response|Promise<Response>>={
 'GET /api/vector/availability':availability,
 'GET /api/vector/community/roadmap':roadmap,
 'GET /api/vector/community/proposals':proposals,
};
