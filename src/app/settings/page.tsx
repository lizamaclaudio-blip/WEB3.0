import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";

export default function SettingsPage() {
  const sections = [
    { title: "Cuenta", items: ["No disponible"] },
    { title: "Integraciones", items: ["No disponible"] },
    { title: "Preferencias", items: ["No disponible"] },
  ];

  return (
    <AppShell>
      <div className="space-y-6">
        <header><h1 className="text-3xl font-semibold text-slate-50">Configuración</h1></header>
        <section className="grid gap-4 lg:grid-cols-3">
          {sections.map((section) => (
            <Card key={section.title}>
              <h2 className="text-base font-semibold text-slate-50">{section.title}</h2>
              <ul className="mt-2 space-y-1 text-sm text-slate-300">{section.items.map((item) => (<li key={item}>- {item}</li>))}</ul>
            </Card>
          ))}
        </section>
      </div>
    </AppShell>
  );
}
