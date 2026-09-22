export default function TermsPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-4 px-4 py-12 text-sm leading-relaxed">
      <div className="mb-2 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        <strong>Plantilla revisable.</strong> Estos términos son un punto de partida y no
        constituyen asesoría legal. Revísalos con un abogado antes de operar.
      </div>
      <h1 className="text-2xl font-bold">Términos del programa de lealtad</h1>
      <p>
        Al registrarte, aceptas que los sellos/puntos, recompensas y vigencias son definidos por
        cada negocio y pueden cambiar. Tu progreso se calcula a partir de las compras registradas
        por el negocio en el punto de venta.
      </p>
      <h2 className="text-lg font-semibold">Recompensas</h2>
      <p>Las recompensas están sujetas a disponibilidad y a las condiciones que cada negocio defina.</p>
      <h2 className="text-lg font-semibold">Cancelación</h2>
      <p>
        Puedes solicitar la baja de tu cuenta en cualquier momento desde{" "}
        <a href="/legal/eliminar-datos" className="underline">
          esta página
        </a>
        .
      </p>
    </article>
  );
}
