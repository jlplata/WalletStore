"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { updateBrandingAction, type OnboardingFormState } from "../../actions";

const initialState: OnboardingFormState = {};

export function BrandingForm({
  orgId,
  defaultValues,
}: {
  orgId: string;
  defaultValues: {
    brand_primary_color: string;
    brand_secondary_color: string;
    logo_url: string | null;
  };
}) {
  const action = updateBrandingAction.bind(null, orgId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [primary, setPrimary] = useState(defaultValues.brand_primary_color);
  const [secondary, setSecondary] = useState(defaultValues.brand_secondary_color);
  const [logoUrl, setLogoUrl] = useState(defaultValues.logo_url ?? "");
  const [uploading, setUploading] = useState(false);

  async function handleLogoUpload(file: File) {
    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop();
      const path = `${orgId}/logo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("org-assets").upload(path, file, {
        cacheControl: "3600",
        upsert: true,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("org-assets").getPublicUrl(path);
      setLogoUrl(data.publicUrl);
    } catch {
      // Non-fatal: the user can still continue without a logo and add one
      // later from settings.
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label>Logo (opcional)</Label>
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
        {uploading && <p className="text-xs text-muted-foreground">Subiendo...</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="brandPrimaryColor">Color principal</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={primary}
              onChange={(e) => setPrimary(e.target.value)}
              className="h-9 w-9 shrink-0 rounded border"
              aria-label="Color principal"
            />
            <Input
              id="brandPrimaryColor"
              name="brandPrimaryColor"
              value={primary}
              onChange={(e) => setPrimary(e.target.value)}
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="brandSecondaryColor">Color secundario</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={secondary}
              onChange={(e) => setSecondary(e.target.value)}
              className="h-9 w-9 shrink-0 rounded border"
              aria-label="Color secundario"
            />
            <Input
              id="brandSecondaryColor"
              name="brandSecondaryColor"
              value={secondary}
              onChange={(e) => setSecondary(e.target.value)}
              required
            />
          </div>
        </div>
      </div>

      <div
        className="flex h-24 items-center justify-center rounded-lg text-sm font-medium"
        style={{ backgroundColor: primary, color: secondary }}
      >
        Vista previa de tu tarjeta
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending || uploading}>
        {pending ? "Guardando..." : "Continuar"}
      </Button>
    </form>
  );
}
