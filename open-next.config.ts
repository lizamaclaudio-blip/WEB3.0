import {defineCloudflareConfig} from '@opennextjs/cloudflare';
// Isolated compatibility trial: no R2, D1, paid Images or revalidation queue.
// Dynamic/private state remains in the existing Supabase project.
export default defineCloudflareConfig();
