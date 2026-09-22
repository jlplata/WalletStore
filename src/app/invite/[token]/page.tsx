import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function AcceptInvitePage({
  params,
}: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = createAdminClient();
  const { data: invitation } = await admin
    .from("invitations")
    .select("id, organization_id, email, role, status, expires_at, organizations(name, slug)")
    .eq("token", token)
    .maybeSingle();

  if (!invitation || invitation.status !== "PENDING") {
    return (
      <InviteMessage
        title="Invitación no válida"
        description="Este enlace ya fue usado o no existe. Pide una nueva invitación."
      />
    );
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return (
      <InviteMessage title="Invitación expirada" description="Pide al dueño del negocio que te envíe una nueva invitación." />
    );
  }

  const org = invitation.organizations as unknown as { name: string; slug: string } | null;

  if (!user) {
    return (
      <InviteMessage
        title={`Te invitaron a ${org?.name ?? "un negocio"}`}
        description={`Inicia sesión o crea una cuenta con ${invitation.email} para aceptar.`}
      >
        <div className="flex gap-2">
          <Button asChild className="flex-1">
            <Link href={`/login?next=/invite/${token}`}>Iniciar sesión</Link>
          </Button>
          <Button asChild variant="outline" className="flex-1">
            <Link href={`/signup?next=/invite/${token}`}>Crear cuenta</Link>
          </Button>
        </div>
      </InviteMessage>
    );
  }

  if (user.email !== invitation.email) {
    return (
      <InviteMessage
        title="Correo distinto"
        description={`Esta invitación es para ${invitation.email}, pero iniciaste sesión como ${user.email}.`}
      />
    );
  }

  const { error } = await supabase.rpc("accept_invitation", { p_token: token });

  if (error) {
    return <InviteMessage title="No se pudo aceptar la invitación" description={error.message} />;
  }

  redirect(`/org/${org?.slug}/dashboard`);
}

function InviteMessage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center px-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        {children && <CardContent>{children}</CardContent>}
      </Card>
    </div>
  );
}
