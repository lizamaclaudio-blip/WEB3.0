import {Integrations} from '@/components/web4/Integrations';
import {Shell,marketingMetadata} from '@/components/web4/Marketing';
export const metadata=marketingMetadata('es',"Integraciones y contacto empresarial","COPILOTO VECTOR para MSFS 2020/2024. Desarrollo propio y propuesta planificada de VECTOR ATC LINK con SayIntentions SAPI.",'/integraciones');
export default function Page(){return <Shell language="es"><Integrations language="es" /></Shell>;}
