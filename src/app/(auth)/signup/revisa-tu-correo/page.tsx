import { MailCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function CheckEmailPage() {
  return (
    <Card>
      <CardHeader className="items-center text-center">
        <MailCheck className="h-10 w-10 text-brand" />
        <CardTitle className="mt-2">Revisa tu correo</CardTitle>
        <CardDescription>
          Te enviamos un enlace de confirmación. Ábrelo para activar tu cuenta y continuar.
        </CardDescription>
      </CardHeader>
      <CardContent />
    </Card>
  );
}
