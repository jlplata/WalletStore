export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-4 px-4 py-12 text-sm leading-relaxed">
      <div className="mb-2 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        <strong>Plantilla revisable.</strong> Este aviso de privacidad es un punto de partida y no
        constituye asesoría legal. Antes de operar, cada negocio debe revisarlo con un abogado
        conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares
        y demás legislación aplicable en México.
      </div>
      <h1 className="text-2xl font-bold">Aviso de privacidad</h1>
      <p>
        Los datos personales que nos proporcionas (nombre, teléfono, correo, fecha de nacimiento)
        se utilizan para administrar tu programa de lealtad: registrar tus visitas, otorgar
        sellos/puntos y avisarte sobre recompensas disponibles.
      </p>
      <h2 className="text-lg font-semibold">Uso de tus datos</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Operar tu tarjeta de lealtad digital.</li>
        <li>Enviarte comunicaciones de marketing, solo si diste tu consentimiento explícito.</li>
        <li>Cumplir obligaciones legales del negocio.</li>
      </ul>
      <h2 className="text-lg font-semibold">Tus derechos</h2>
      <p>
        Puedes solicitar acceso, rectificación, cancelación u oposición (derechos ARCO) sobre tus
        datos, así como darte de baja de comunicaciones de marketing en cualquier momento desde{" "}
        <a href="/legal/eliminar-datos" className="underline">
          esta página
        </a>
        .
      </p>
    </article>
  );
}
