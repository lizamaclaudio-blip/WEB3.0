import {Integrations} from '@/components/web4/Integrations';
import {Shell,marketingMetadata} from '@/components/web4/Marketing';
export const metadata=marketingMetadata('en',"Integrations and developer contact","COPILOTO VECTOR for MSFS 2020/2024. Windows companion development and planned VECTOR ATC LINK integration with SayIntentions SAPI.",'/integraciones');
export default function Page(){return <Shell language="en"><Integrations language="en" /></Shell>;}
