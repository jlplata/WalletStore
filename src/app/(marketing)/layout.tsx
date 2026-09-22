import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";

export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Wallet className="h-5 w-5 text-brand" />
            WalletStore
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <Link href="/#como-funciona" className="hover:text-foreground">
              Cómo funciona
            </Link>
            <Link href="/#precios" className="hover:text-foreground">
              Precios
            </Link>
            <Link href="/#preguntas" className="hover:text-foreground">
              Preguntas frecuentes
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/login">Iniciar sesión</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Crear cuenta gratis</Link>
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} WalletStore. Todos los derechos reservados.</p>
          <div className="flex gap-4">
            <Link href="/legal/privacidad" className="hover:text-foreground">
              Aviso de privacidad
            </Link>
            <Link href="/legal/terminos" className="hover:text-foreground">
              Términos
            </Link>
            <Link href="/legal/eliminar-datos" className="hover:text-foreground">
              Eliminar mis datos
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
