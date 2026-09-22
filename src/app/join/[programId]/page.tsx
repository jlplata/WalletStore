import { notFound } from "next/navigation";
import { Stamp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { RegistrationForm } from "./registration-form";

export default async function JoinPage({ params }: PageProps<"/join/[programId]">) {
  const { programId } = await params;
  const supabase = await createClient();

  const { data: program } = await supabase
    .from("programs")
    .select("id, name, type, reward_headline, organization_id, is_active, program_rules(stamps_required)")
    .eq("id", programId)
    .maybeSingle();

  if (!program || !program.is_active) notFound();

  const { data: org } = await supabase
    .from("organizations")
    .select("name, logo_url, brand_primary_color, brand_secondary_color")
    .eq("id", program.organization_id)
    .single();

  if (!org) notFound();

  const rules = (program.program_rules as unknown as { stamps_required: number | null }[] | null)?.[0];
  const isStamps = program.type === "STAMPS";

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-10">
      <div
        className="mb-6 flex flex-col items-center gap-3 rounded-2xl p-8 text-center"
        style={{ backgroundColor: org.brand_primary_color, color: org.brand_secondary_color }}
      >
        {org.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={org.logo_url} alt={org.name} className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
            <Stamp className="h-8 w-8" />
          </div>
        )}
        <h1 className="text-xl font-bold">{org.name}</h1>
        <p className="text-sm opacity-90">{program.name}</p>
        <p className="text-sm">
          {isStamps
            ? `Junta ${rules?.stamps_required ?? 10} sellos y obtén: ${program.reward_headline ?? "una recompensa"}`
            : `Acumula puntos y obtén: ${program.reward_headline ?? "una recompensa"}`}
        </p>
      </div>

      <h2 className="mb-4 text-lg font-semibold">Regístrate para empezar</h2>
      <RegistrationForm organizationId={program.organization_id} programId={program.id} />
    </div>
  );
}
