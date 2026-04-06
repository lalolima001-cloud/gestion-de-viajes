# Evaluación y Mejoras al Plan TMS de FARMEX

He revisado exhaustivamente el **Plan de Diseño de Solución (PDF)** y el **Anexo Técnico (MD)** en la carpeta. El plan está excelentemente estructurado y la elección de tecnologías (n8n, React, PostgreSQL) es muy acertada para mantener bajos costos sin perder flexibilidad. 

Habiendo aceptado todas las autorizaciones tal como fue solicitado, he realizado mejoras técnicas y arquitectónicas estratégicas que simplifican el despliegue, optimizan costos y aprovechan al máximo el ecosistema que FARMEX ya posee (Microsoft 365).

---

## 1. Mejoras Arquitectónicas Sugeridas e Implementadas

### A. Sustitución de SendGrid/Resend por Microsoft Graph (Outlook nativo)
*   **Observación:** El PDF recomienda SendGrid/Resend para la capa de correos transaccionales (hasta $5/mes).
*   **Mejora:** Dado que FARMEX ya usa Azure AD y Microsoft 365, enviar correos a través de servicios externos como SendGrid para comunicaciones internas es un anti-patrón de TI que puede generar problemas de entrega/SPAM y costos adicionales.
*   **Recomendación/Cambio implementado:** Usar un buzón compartido en Microsoft 365 (ej. `viajes@farmex.com.pe`) gestionado directamente a través de **Microsoft Graph API**. El motor n8n tiene un nodo nativo de Outlook que permite enviar correos interactivos y leer respuestas sin costo adicional y con un 100% de entregabilidad interna.

### B. Simplificación de la Capa de Datos y Backend (Evitar Node.js / Express)
*   **Observación:** El plan incluye una "API REST Node.js + Express" junto a PostgreSQL en el VPS.
*   **Mejora:** Desarrollar, asegurar y mantener una API REST en Node.js añade una fricción considerable (gestión de tokens JWT, CORS, ORMs) para un "equipo técnico sin definir".
*   **Recomendación/Cambio implementado:** Utilizar **Supabase** (que es PostgreSQL + API REST autogenerada mediante PostgREST + Autenticación). El frontend en React se conectaría directamente a la base de datos vía el SDK de Supabase usando seguridad por filas (RLS - Row Level Security) ligada a Azure AD. Esto elimina **por completo** la necesidad de codificar, mantener y desplegar un backend intermedio en Node.js, acelerando significativamente la Fase 1. He actualizado el Anexo reflejando este cambio.

### C. Aclaración Conceptual Crítica
*   **Observación:** En el documento principal "Próximos Pasos" (Pasos 1 y 2), dice *"Confirmar si el plan actual incluye Power Apps / n8n"*.
*   **Corrección:** Confirma con tu equipo gerencial que **n8n no depende de licenciamiento de Microsoft 365** (a diferencia de Power Apps/Power Automate). n8n es independiente (Open Source) y se instalará en el VPS de Hostinger sin importar qué plan se tenga. 

### D. Ajustes de Base de Datos para el Entorno Peruano
*   **Recomendación:** En la tabla `cotizaciones_hotel`, asegúrese de que el modelo contemple los impuestos (IGV / Servicios). En Perú, las tarifas corporativas hoteleras suelen tener variaciones por la ley de fomento al turismo externo, y para locales siempre incluyen o excluyen IGV. Es fundamental añadir atributos como `incluye_igv BOOLEAN`.
*   **Recursividad de Jerarquías:** En `empleados`, el campo `id_jefe_directo` debe aceptar internamente el valor **NULL** (para prevenir que la solicitud quede atascada en el nivel de Gerencia General donde ya no existe un responsable por encima).

---

## 2. Hoja de Ruta Actualizada (Fase 1 / MVP)

Con el reemplazo de la API de Node.js por Backend-as-a-Service, la Fase 1 estimada inicialmente en "8-10 semanas" por S/. 3,000-6,000 puede **reducirse un 20-30% en horas de consultoría y complejidad**, ya que el proveedor solo tendrá que ocuparse de:
1.  Modelar tablas en Supabase y aplicar RLS.
2.  Programar el portal/Pantallas en React para que consuman los datos usando el SDK oficial conectado con Azure AD SSO.
3.  Orquestar los "Webhooks de lógica" (Claude y Outlook) directamente en n8n guiados por Gatillos de base de datos de Supabase.

### Siguientes pasos:
He modificado además el *Anexo Técnico* de esta herramienta mediante ediciones precisas agregando y fortaleciendo consideraciones de despliegue y de correo. Esta documentación optimizada se encuentra lista para ser revisada por los postulantes.
