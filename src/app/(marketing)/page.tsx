import Link from "next/link";
import {
  ArrowRight,
  QrCode,
  Smartphone,
  BarChart3,
  Megaphone,
  Stamp,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";

async function getPlans() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("plans")
      .select("id, code, name, description, price_monthly_cents, sort_order")
      .eq("is_active", true)
      .order("sort_order");
    if (error) throw error;
    return data ?? [];
  } catch {
    return null;
  }
}

const steps = [
  {
    icon: QrCode,
    title: "Genera tu QR",
    description:
      "Crea tu programa de lealtad y obtén un QR único para que tus clientes se registren en segundos.",
  },
  {
    icon: Smartphone,
    title: "Sin apps que descargar",
    description:
      "Tu cliente agrega su tarjeta directo a Apple Wallet o Google Wallet desde el navegador de su teléfono.",
  },
  {
    icon: Stamp,
    title: "Registra visitas",
    description:
      "Tu equipo escanea al cliente en caja, registra la compra y el sistema otorga sellos o puntos automáticamente.",
  },
  {
    icon: BarChart3,
    title: "Mide resultados",
    description:
      "Dashboard con clientes activos, frecuencia de visita, canjes y más, sin hojas de cálculo.",
  },
];

const benefits = [
  {
    icon: Stamp,
    title: "Sellos o puntos, tú decides",
    description:
      "Configura recompensas por visitas (10 sellos = café gratis) o por gasto acumulado.",
  },
  {
    icon: Megaphone,
    title: "Campañas dirigidas",
    description:
      "Reactiva clientes inactivos, felicita cumpleaños y premia a tus clientes más frecuentes.",
  },
  {
    icon: ShieldCheck,
    title: "Datos seguros y aislados",
    description:
      "Cada negocio tiene sus datos completamente separados, con permisos por rol para tu equipo.",
  },
];

const faqs = [
  {
    q: "¿Mis clientes necesitan descargar una app?",
    a: "No. La tarjeta se agrega directo a Apple Wallet o Google Wallet desde el navegador, sin instalar nada.",
  },
  {
    q: "¿Funciona con varias sucursales?",
    a: "Sí. Puedes crear sucursales, asignar empleados a cada una y ver reportes por sucursal.",
  },
  {
    q: "¿Qué pasa si no tengo certificados de Apple o Google todavía?",
    a: "Puedes configurar tu programa y probar todo el flujo en modo de prueba (sandbox); cuando tengas tus credenciales de Apple/Google, las tarjetas se emiten de forma real sin cambiar nada más.",
  },
  {
    q: "¿Puedo cancelar cuando quiera?",
    a: "Sí, la suscripción se administra directamente desde tu panel de facturación.",
  },
];

export default async function MarketingHomePage() {
  const plans = await getPlans();

  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-16 sm:px-6 sm:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="secondary" className="mb-4">
            Para cafeterías, restaurantes, barberías, gimnasios y más
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Haz que tus clientes regresen.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
            Crea tu programa de lealtad digital para Apple Wallet y Google
            Wallet. Sin apps, sin tarjetas físicas.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/signup">
                Crear mi programa gratis <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="#como-funciona">Ver cómo funciona</Link>
            </Button>
          </div>
        </div>
      </section>

      <section id="como-funciona" className="border-y bg-muted/30 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-semibold tracking-tight">
            Cómo funciona
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => (
              <Card key={step.title} className="relative">
                <CardHeader>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <step.icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="mt-2">
                    {i + 1}. {step.title}
                  </CardTitle>
                  <CardDescription>{step.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-semibold tracking-tight">
            Todo lo que necesitas para fidelizar
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {benefits.map((b) => (
              <Card key={b.title}>
                <CardHeader>
                  <b.icon className="h-6 w-6 text-brand" />
                  <CardTitle className="mt-2">{b.title}</CardTitle>
                  <CardDescription>{b.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="precios" className="border-y bg-muted/30 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-semibold tracking-tight">
            Precios simples
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
            Todos los planes incluyen tarjetas ilimitadas y prueba de 14 días.
            Precios en pesos mexicanos.
          </p>
          {plans && plans.length > 0 ? (
            <div className="mt-12 grid gap-6 sm:grid-cols-3">
              {plans.map((plan) => (
                <Card key={plan.id} className={plan.code === "PRO" ? "border-primary shadow-md" : ""}>
                  <CardHeader>
                    {plan.code === "PRO" && (
                      <Badge className="w-fit">Más popular</Badge>
                    )}
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">
                      {formatCurrency(plan.price_monthly_cents)}
                      <span className="text-sm font-normal text-muted-foreground">
                        {" "}
                        /mes
                      </span>
                    </p>
                    <Button className="mt-6 w-full" asChild variant={plan.code === "PRO" ? "default" : "outline"}>
                      <Link href="/signup">Empezar</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="mt-12 text-center text-sm text-muted-foreground">
              Los precios se cargan desde la plataforma — configura Supabase
              (ver docs/development.md) para verlos aquí.
            </p>
          )}
        </div>
      </section>

      <section id="preguntas" className="py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-semibold tracking-tight">
            Preguntas frecuentes
          </h2>
          <div className="mt-10 space-y-6">
            {faqs.map((f) => (
              <div key={f.q}>
                <h3 className="font-medium">{f.q}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-semibold tracking-tight">
            Empieza a fidelizar clientes hoy
          </h2>
          <Button size="lg" className="mt-6" asChild>
            <Link href="/signup">
              Crear mi programa gratis <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
