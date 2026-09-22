# Configurar Apple Wallet (PassKit)

WalletStore incluye una integración real con Apple Wallet (`src/lib/wallet/apple/`):
genera y firma archivos `.pkpass` válidos, implementa el web service de
PassKit (registro de dispositivos, actualización de pases) y envía push
notifications reales vía APNs usando `node:http2`. Mientras no configures
las credenciales de abajo, `AppleWalletProvider` no se usa: el sistema cae
automáticamente a `MockWalletProvider`, y la UI lo indica claramente
("Modo de prueba").

## 1. Requisitos

- Una cuenta de [Apple Developer Program](https://developer.apple.com/programs/) (de pago, $99 USD/año).
- Acceso a **Certificates, Identifiers & Profiles** en developer.apple.com.

## 2. Crear el Pass Type ID

1. En developer.apple.com → **Certificates, Identifiers & Profiles** → **Identifiers** → **+**.
2. Elige **Pass Type IDs** → Continue.
3. Description: `WalletStore Loyalty Card` (o el nombre que prefieras).
4. Identifier: `pass.mx.tuapp.loyalty` (formato reverse-DNS, debe ser único). Este valor es `APPLE_PASS_TYPE_IDENTIFIER`.
5. Register.

## 3. Generar el certificado del Pass Type ID

1. En tu Mac (o cualquier máquina con OpenSSL), genera una solicitud de firma (CSR):
   ```bash
   openssl req -new -newkey rsa:2048 -nodes \
     -keyout passkey.pem -out pass.csr \
     -subj "/CN=WalletStore Pass/O=Tu Negocio/C=MX"
   ```
2. En developer.apple.com, abre el Pass Type ID que creaste → **Create Certificate** → sube `pass.csr`.
3. Descarga el certificado (`pass.cer`).
4. Conviértelo a PEM:
   ```bash
   openssl x509 -inform DER -in pass.cer -out pass.pem -outform PEM
   ```
5. Codifica en base64 (una sola línea) para las variables de entorno:
   ```bash
   base64 -i pass.pem | tr -d '\n' > pass.pem.b64
   base64 -i passkey.pem | tr -d '\n' > passkey.pem.b64
   ```

## 4. Certificado intermedio WWDR

1. Descarga el certificado **Apple Worldwide Developer Relations — G4** (u la versión vigente) desde
   [Apple PKI](https://www.apple.com/certificateauthority/).
2. Conviértelo a PEM igual que el paso anterior si viene en `.cer`:
   ```bash
   openssl x509 -inform DER -in AppleWWDRCAG4.cer -out wwdr.pem -outform PEM
   base64 -i wwdr.pem | tr -d '\n' > wwdr.pem.b64
   ```

## 5. Team Identifier

Lo encuentras en developer.apple.com → **Membership** → **Team ID** (10 caracteres alfanuméricos). Es `APPLE_TEAM_IDENTIFIER`.

## 6. Variables de entorno

En `.env.local` (o las variables de entorno de tu hosting):

```bash
APPLE_TEAM_IDENTIFIER=ABCDE12345
APPLE_PASS_TYPE_IDENTIFIER=pass.mx.tuapp.loyalty
APPLE_CERTIFICATE_BASE64=<contenido de pass.pem.b64>
APPLE_PRIVATE_KEY_BASE64=<contenido de passkey.pem.b64>
APPLE_PRIVATE_KEY_PASSPHRASE=            # solo si cifraste la llave privada
APPLE_WWDR_CERTIFICATE_BASE64=<contenido de wwdr.pem.b64>
APPLE_WEB_SERVICE_URL=https://tu-dominio.com/api/wallet/apple
```

`APPLE_WEB_SERVICE_URL` debe apuntar al dominio de producción (Apple Wallet
llama a esta URL desde los dispositivos de tus clientes para registrar
actualizaciones — no funciona con `localhost`).

## 7. Cómo funciona en el código

- `src/lib/wallet/apple/certs.ts` — carga y valida las credenciales; si falta
  cualquier variable, devuelve `null` (nunca lanza) para permitir el fallback a mock.
- `src/lib/wallet/apple/build-pkpass.ts` — construye `pass.json`, genera
  artwork placeholder con el color de marca del negocio, calcula el
  `manifest.json` (SHA-1 por archivo) y firma con PKCS#7 usando `node-forge`.
- `src/app/api/wallet/apple/passes/[serial]/route.ts` — descarga inicial del `.pkpass`.
- `src/app/api/wallet/apple/v1/...` — web service de PassKit (registro/baja de
  dispositivo, última versión del pase, log de errores), según la
  [especificación de Apple](https://developer.apple.com/documentation/walletpasses).
- `src/lib/wallet/apple/apns.ts` — envía push notifications reales a los
  dispositivos registrados cuando cambia el saldo del cliente, usando el
  mismo certificado del Pass Type ID sobre `node:http2` (sin librerías
  adicionales).

## 8. Probar

1. Configura las variables y despliega (o usa un túnel como ngrok para
   `APPLE_WEB_SERVICE_URL` en desarrollo).
2. Registra un cliente desde `/join/[programId]` en un iPhone.
3. Toca "Add to Apple Wallet" — debe abrir la vista previa nativa de iOS.
4. Registra una compra desde el Modo Caja y confirma que el saldo se
   actualiza en la tarjeta (puede tardar unos segundos por el push de APNs).

## Limitación conocida

El endpoint de logging (`/v1/log`) y el manejo de reintentos de push están
implementados de forma mínima (ver `TODO.md`). Para volumen alto de push,
considera una cola dedicada en vez de enviarlos inline durante la petición.
