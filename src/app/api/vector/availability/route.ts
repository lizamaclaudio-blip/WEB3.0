import { inquiryConfigured } from '@/lib/web4/inquiry';
import { mailConfiguration } from '@/lib/web4/mail';
import { communityResponse } from '@/lib/web51/server';
export const dynamic = 'force-dynamic';
export function GET() {
  return communityResponse({ enabled: inquiryConfigured(process.env), preview: process.env.VECTOR_FORMS_MODE !== 'public', mailEnabled: mailConfiguration(process.env) !== null });
}
