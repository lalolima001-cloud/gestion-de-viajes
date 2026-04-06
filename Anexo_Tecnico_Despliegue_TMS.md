# ANEXO TÉCNICO: Requisitos de Despliegue, Seguridad y Continuidad Operativa
**Proyecto:** Sistema de Gestión de Viajes Corporativos (TMS) – FARMEX S.A.
**Referencia:** Complemento al Plan de Diseño de Solución (Abril 2026)

### 1. Objetivo
Este anexo establece los lineamientos técnicos obligatorios para la fase de despliegue (deployment) y mantenimiento de la infraestructura del TMS. El propósito es garantizar la alta disponibilidad del sistema, proteger la integridad de los datos transaccionales y facilitar futuras actualizaciones, manteniendo el presupuesto operativo definido en el plan original (bajo los $50/mes).

Se solicita a los consultores incluir la implementación de estos lineamientos dentro de su propuesta técnica y económica.

---

### 2. Requerimientos Técnicos para el Despliegue

#### 2.1. Arquitectura Contenerizada y Backend como Servicio (BaaS)
*   **Requisito:** El Frontend y el motor de flujos (n8n) se desplegarán mediante **Docker y Docker Compose** en el VPS. Se elimina la capa intermedia de "Backend API en Node.js" utilizando la API autogenerada del servicio gestionado de Base de Datos (ej. Supabase) conectada directo al Frontend SDK.
*   **Justificación:** La eliminación de una API REST separada reduce la sobrecarga del VPS (ahorro de RAM), elimina puntos de fallo y disminuye sustancialmente el número de componentes a mantener (actualizaciones de paquetes, vulnerabilidades Node). Docker sigue permitiendo aislar n8n adecuadamente y mantener un entorno de desarrollo idéntico a producción.

#### 2.2. Estrategia de Base de Datos (Managed / Supabase recomendado)
*   **Requisito:** El esquema de respaldos semanales nativo del VPS es **insuficiente** para la criticidad de las aprobaciones y transacciones de viajes diarios.
*   **Obligación/Migración de Arquitectura:** Desacoplar la base de datos del VPS principal utilizando obligatoriamente un servicio gestionado (Managed PostgreSQL) con BaaS como **Supabase**. Esto incluye opciones de respaldo *Point-in-Time Recovery* limitando la dependencia sobre Hostinger. Alternativamente (sólo de fallar lo anterior), se requerirá un volcado automatizado vía cron diario a *Cloudflare R2*.

#### 2.3. Integración y Despliegue Continuo (CI/CD)
*   **Requisito:** El código fuente debe estar alojado en un repositorio seguro (ej. GitHub privado de FARMEX). El despliegue de nuevas versiones del Frontend y Backend debe estar automatizado mediante **GitHub Actions** (u otra herramienta CI/CD gratuita).
*   **Justificación:** Evitar las actualizaciones manuales (transferencia de archivos vía FTP/SSH) por parte del consultor. Esto mitiga el riesgo de errores humanos, asegura que siempre haya una versión estable funcionando y facilita el paso entre la Fase 1, 2, 3 y 4 del proyecto sin interrupciones del servicio.

#### 2.4. Gestión Segura de Credenciales (Secretos)
*   **Requisito:** Ninguna credencial, token, contraseña o API Key (Claude API, Azure/MS Graph, Cloudflare, accesos a Base de Datos externa) debe estar escrita en el código fuente (*hardcoded*).
*   **Justificación:** Por políticas de seguridad corporativa, todas las credenciales deben inyectarse de manera segura directamente en el servidor VPS mediante el uso estricto de **Variables de Entorno (`.env`)**.

#### 2.5. Monitoreo Activo y Trazabilidad de Errores
*   **Requisito:** El sistema debe contar con telemetría básica en producción:
    *   **UptimeRobot (o similar):** Para monitorear la disponibilidad del servidor y de la API cada 5 minutos, enviando alertas por correo al equipo técnico de FARMEX en caso de caída.
    *   **Sentry (Capa gratuita):** Integrado en el Frontend (React) y Backend (Node.js) para capturar errores de sistema. 
*   **Justificación:** Si un usuario (ej. un Jefe Aprobador) experimenta un error al intentar aprobar un viaje desde su celular, Sentry capturará el error técnico exacto en tiempo real, permitiendo al consultor solucionarlo rápidamente sin necesidad de que el usuario reporte el problema manualmente.

#### 2.6. Infraestructura de Envío de Correos (Microsoft 365 Institucional)
*   **Requisito:** Queda prohibida la configuración de la dependencia de proveedores SMTP / envíos de correo de terceros como SendGrid o Resend. El sistema **deberá integrarse empleando nodos nativos en n8n conectados a un buzón autorizado en Microsoft Graph / Azure AD (Office365)** (por ejemplo, `viajes@farmex.com.pe`).
*   **Justificación:** Al ya disponer de la infraestructura corporativa en M365, el envío transaccional en Graph aumenta la credibilidad en seguridad local para los antispam, evitando correos de dudosa procedencia durante las autorizaciones, y centralizando todo gasto.

***

**Nota para los postulantes/consultores:** 
La adhesión a estas prácticas estándar de la industria no debería representar un incremento significativo en las horas de desarrollo, pero son de carácter obligatorio para la aceptación técnica y paso a producción del proyecto.
