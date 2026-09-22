"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { updateOrgBrandingAction, type SettingsFormState } from "./actions";

const initialState: SettingsFormState = {};

export function BrandingSettingsForm({
  orgId,
  orgSlug,
  defaultValues,
}: {
  orgId: string;
  orgSlug: string;
  defaultValues: {
    brand_primary_color: string;
    brand_secondary_color: string;
    logo_url: string | null;
  };
}) {
  const action = updateOrgBrandingAction.bind(null, orgId, orgSlug);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [logoUrl, setLogoUrl] = useState(defaultValues.logo_url ?? "");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (state.success) toast.success("Marca actualizada.");
  }, [state.success]);

  async function handleLogoUpload(file: File) {
    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop();
      const path = `${orgId}/logo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("org-assets").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("org-assets").getPublicUrl(path);
      setLogoUrl(data.publicUrl);
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label>Logo</Label>
        <div className="flex items-center gap-3">
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="Logo" className="h-12 w-12 rounded-md border object-cover" />
          )}
          <Input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleLogoUpload(file);
            }}
          />
        </div>
        <input type="hidden" name="logoUrl" value={logoUrl} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="brandPrimaryColor">Color principal</Label>
          <Input
            id="brandPrimaryColor"
            name="brandPrimaryColor"
            defaultValue={defaultValues.brand_primary_color}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="brandSecondaryColor">Color secundario</Label>
          <Input
            id="brandSecondaryColor"
            name="brandSecondaryColor"
            defaultValue={defaultValues.brand_secondary_color}
            required
          />
        </div>
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending || uploading}>
        {pending ? "Guardando..." : "Guardar marca"}
      </Button>
    </form>
  );
}
