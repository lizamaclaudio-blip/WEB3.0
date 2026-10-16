import { CommunityAccount } from '@/components/web4/CommunityAccount';
import { Shell, marketingMetadata } from '@/components/web4/Marketing';
import { communityAuthConfigured, communityQaRegistrationConfigured } from '@/lib/web51/server';
export const dynamic='force-dynamic';
export const metadata={...marketingMetadata('fr','Inscription QA privée','VECTOR QA','/comunidad/qa'),robots:{index:false,follow:false}};
export default function Page(){return <Shell language="fr"><CommunityAccount language="fr" enabled={communityAuthConfigured()} registrationEnabled={communityQaRegistrationConfigured()} qaRegistration /></Shell>;}
