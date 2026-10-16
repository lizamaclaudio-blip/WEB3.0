import { CommunityAccount } from '@/components/web4/CommunityAccount';
import { Shell, marketingMetadata } from '@/components/web4/Marketing';
import { communityAuthConfigured, communityQaRegistrationConfigured } from '@/lib/web51/server';
export const dynamic='force-dynamic';
export const metadata={...marketingMetadata('es','Registro QA privado','VECTOR QA','/comunidad/qa'),robots:{index:false,follow:false}};
export default function Page(){return <Shell language="es"><CommunityAccount language="es" enabled={communityAuthConfigured()} registrationEnabled={communityQaRegistrationConfigured()} qaRegistration /></Shell>;}
