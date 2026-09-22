# Configurar Google Wallet

WalletStore incluye una integración real con Google Wallet
(`src/lib/wallet/google/`): crea/actualiza clases y objetos de "loyalty card"
vía la API REST de Google Wallet y genera el enlace firmado
"Save to Google Wallet". Mientras no configures las credenciales de abajo,
`GoogleWalletProvider` no se usa: el sistema cae automáticamente a
`MockWalletProvider`, y la UI lo indica claramente ("Modo de prueba").

## 1. Requisitos

- Una cuenta de Google Cloud.
- Acceso a [Google Wallet Business Console](https://pay.google.com/business/console/).

## 2. Registrar tu cuenta de Google Wallet

1. Entra a [Google Wallet Business Console](https://pay.google.com/business/console/)
   y crea una cuenta de "Issuer" (emisor) para tu plataforma.
2. Completa la verificación de negocio que Google solicite (puede tomar
   varios días hábiles — esto es aprobación externa, no algo que este
   repositorio pueda saltarse).
3. Una vez aprobado, copia tu **Issuer ID** (numérico). Es `GOOGLE_WALLET_ISSUER_ID`.

## 3. Crear una cuenta de servicio

1. En [Google Cloud Console](https://console.cloud.google.com/), crea o
   selecciona un proyecto.
2. Habilita la **Google Wallet API**.
3. **IAM & Admin → Service Accounts → Create Service Account**.
4. Otorga acceso: no necesita roles de IAM del proyecto, pero debes
   agregarla como usuario autorizado en Google Wallet Business Console
   (**Users** → agrega el email de la cuenta de servicio con permiso de
   Developer/Admin).
5. Genera una clave: **Keys → Add Key → JSON**. Descarga el archivo.

## 4. Variables de entorno

```bash
GOOGLE_WALLET_ISSUER_ID=3388000000012345678
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","client_email":"...","private_key":"-----BEGIN PRIVATE KEY-----...","...":"..."}
```

`GOOGLE_SERVICE_ACCOUNT_JSON` es el contenido completo del archivo JSON
descargado, minificado a una sola línea (por ejemplo con
`jq -c . service-account.json`). Nunca lo subas al repositorio.

## 5. Cómo funciona en el código

- `src/lib/wallet/google/certs.ts` — parsea `GOOGLE_SERVICE_ACCOUNT_JSON`;
  devuelve `null` si falta o es inválido (fallback a mock).
- `src/lib/wallet/google/api.ts`:
  - `ensureLoyaltyClass` — crea/actualiza la `loyaltyClass` del programa
    (marca, colores, nombre) vía REST, autenticado con OAuth2 usando
    `google-auth-library` (scope `wallet_object.issuer`).
  - `ensureLoyaltyObject` — crea/actualiza el `loyaltyObject` del cliente
    (saldo, código de barras QR con el `qr_token` del cliente, próxima
    recompensa).
  - `buildSaveUrl` — firma un JWT RS256 con la llave privada de la cuenta
    de servicio y arma el enlace `https://pay.google.com/gp/v/save/<jwt>`.
- Actualizaciones posteriores (compra, canje) llaman `updatePass`, que
  vuelve a hacer `PATCH` del objeto — Google Wallet sincroniza el cambio
  sin necesidad de un paso de push explícito.

## 6. Probar

1. Configura las variables de entorno y reinicia la app.
2. Registra un cliente desde `/join/[programId]` en un Android (o navegador
   con sesión de Google iniciada).
3. Toca "Add to Google Wallet" — debe abrir el flujo nativo de guardado.
4. Registra una compra desde el Modo Caja y confirma que el saldo se
   actualiza en la tarjeta guardada.

## Limitación conocida

`loyaltyClass.reviewStatus` se crea como `UNDER_REVIEW`; Google requiere
publicarla (`APPROVED`) antes de que las tarjetas sean visibles para
clientes reales fuera de las cuentas de prueba del emisor — ver la consola
de Google Wallet Business para solicitar la revisión. Esto es un paso de
aprobación de Google, no algo que el código pueda omitir.
