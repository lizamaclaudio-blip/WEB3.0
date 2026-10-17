import {Integrations} from '@/components/web4/Integrations';
import {Shell,marketingMetadata} from '@/components/web4/Marketing';
export const metadata=marketingMetadata('fr',"Intégrations et contact professionnel","COPILOTO VECTOR pour MSFS 2020/2024. Compagnon Windows et projet VECTOR ATC LINK avec SayIntentions SAPI.",'/integraciones');
export default function Page(){return <Shell language="fr"><Integrations language="fr" /></Shell>;}
