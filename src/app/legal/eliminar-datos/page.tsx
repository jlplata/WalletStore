import { DeleteDataForm } from "./delete-data-form";

export default function DeleteDataPage() {
  return (
    <article className="mx-auto max-w-lg px-4 py-12">
      <h1 className="text-2xl font-bold">Solicitar eliminación de mis datos</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Envíanos tu correo o teléfono registrado y el negocio correspondiente procesará tu
        solicitud de eliminación conforme a la legislación aplicable.
      </p>
      <div className="mt-6">
        <DeleteDataForm />
      </div>
    </article>
  );
}
