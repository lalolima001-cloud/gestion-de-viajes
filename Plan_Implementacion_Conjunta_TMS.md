# Plan Detallado de Implementación Conjunta: TMS FARMEX

Este documento detalla la división de responsabilidades entre el Usuario (Eduardo / FARMEX) y el Asistente de IA (Gemini CLI) para la construcción del Sistema de Gestión de Viajes Corporativos (TMS).

## Fase 1: Preparación de la Infraestructura (Semana 1)
**Objetivo:** Tener el servidor listo y los repositorios configurados.

| Tarea | Responsable | Detalle de la acción |
| :--- | :--- | :--- |
| **1. Compra de Dominio y VPS** | 👤 **Usuario** | Comprar dominio (`viajes.farmex.com.pe`) en NIC Perú/Cloudflare y alquilar VPS (Hostinger KVM 2). |
| **2. Creación de Repositorio** | 👤 **Usuario** | Crear un repositorio privado en GitHub para el código fuente del proyecto. |
| **3. Configuración Inicial VPS** | 🤖 **Gemini CLI** | Proveer los comandos exactos SSH para que el usuario los pegue en la terminal y configure el firewall (UFW) y Docker en el servidor. |
| **4. Estructura de Proyecto Local**| 🤖 **Gemini CLI** | Crear las carpetas locales del proyecto (Frontend, Backend, n8n, Base de Datos) mediante comandos en tu terminal. |

## Fase 2: Base de Datos y Backend Core (Semanas 2-3)
**Objetivo:** Crear el modelo de datos y la API principal (Node.js).

| Tarea | Responsable | Detalle de la acción |
| :--- | :--- | :--- |
| **1. Diseño SQL (Esquema)** | 🤖 **Gemini CLI** | Escribir los scripts `.sql` exactos para crear las tablas (empresas, empleados, solicitudes, cotizaciones) en PostgreSQL. |
| **2. Contenedor PostgreSQL** | 🤖 **Gemini CLI** | Escribir el `docker-compose.yml` para levantar la base de datos localmente. |
| **3. Inicialización API Node.js** | 🤖 **Gemini CLI** | Inicializar el proyecto Express, instalar dependencias (pg, cors, express) y estructurar carpetas (routes, controllers, models). |
| **4. Endpoints CRUD Básicos** | 🤖 **Gemini CLI** | Programar las rutas de la API para crear solicitudes de viaje y listar empleados. |
| **5. Registro de App Azure AD** | 👤 **Usuario** | Entrar al portal de Microsoft Entra ID (Azure), registrar la aplicación web y generar el `Client ID` y `Secret`. |
| **6. Integración Auth** | 🤖 **Gemini CLI** | Escribir el código en Node.js para validar el token de Microsoft 365. |

## Fase 3: Frontend Web PWA (Semanas 4-6)
**Objetivo:** Construir la interfaz para el empleado y el responsable de viajes.

| Tarea | Responsable | Detalle de la acción |
| :--- | :--- | :--- |
| **1. Inicialización React/Vite** | 🤖 **Gemini CLI** | Ejecutar comandos para crear el proyecto React, instalar Tailwind CSS y configurar Shadcn UI. |
| **2. Maquetación UI** | 🤖 **Gemini CLI** | Escribir los componentes React (Formulario de solicitud, Tabla de vuelos, Dashboard). |
| **3. Conexión Frontend-Backend** | 🤖 **Gemini CLI** | Escribir los servicios en React (Axios/Fetch) para consumir la API que creamos en la Fase 2. |
| **4. Revisión y Ajustes Visuales**| 👤 **Usuario** | Revisar las pantallas localmente y solicitar a Gemini CLI cambios de colores, logos (FARMEX) o textos. |

## Fase 4: Motor de Flujos (n8n) y Automatización (Semanas 7-8)
**Objetivo:** Configurar las aprobaciones por correo y la IA.

| Tarea | Responsable | Detalle de la acción |
| :--- | :--- | :--- |
| **1. Despliegue n8n Local** | 🤖 **Gemini CLI** | Agregar n8n al `docker-compose.yml` para ejecutarlo localmente. |
| **2. Obtener API Keys** | 👤 **Usuario** | Crear cuenta en Anthropic (Claude API) y SendGrid (Correos), recargar saldo y generar las llaves API. |
| **3. Desarrollo de Flujos (JSON)** | 🤖 **Gemini CLI** | Escribir el código JSON de los flujos de n8n (Recibir webhook -> Consultar IA -> Enviar correo). |
| **4. Importación de Flujos** | 👤 **Usuario** | Entrar a la interfaz web de n8n, darle a "Importar" y pegar el código JSON generado por Gemini CLI. |

## Fase 5: Despliegue a Producción (Semana 9)
**Objetivo:** Subir todo al VPS de Hostinger y dejarlo operativo.

| Tarea | Responsable | Detalle de la acción |
| :--- | :--- | :--- |
| **1. Configurar Variables Entorno**| 👤 **Usuario** | Crear el archivo `.env` en el servidor con las credenciales reales (DB, Microsoft, Anthropic). Gemini proveerá la plantilla vacía. |
| **2. CI/CD GitHub Actions** | 🤖 **Gemini CLI** | Escribir el archivo `.github/workflows/deploy.yml` para automatizar la subida de código al servidor. |
| **3. Configuración de Dominio** | 👤 **Usuario** | Entrar a Cloudflare y apuntar los registros DNS (`A` y `CNAME`) hacia la IP del servidor Hostinger. |
| **4. Proxy Inverso (Traefik/Nginx)**| 🤖 **Gemini CLI** | Configurar el enrutador en Docker para que `viajes.farmex.com.pe` muestre el Frontend y gestione los certificados SSL gratuitos. |
| **5. Pruebas Finales** | 👤 **Usuario** | Realizar flujos completos de prueba (solicitar, aprobar en Outlook, revisar dashboard). |

---
**En resumen:** Tú actúas como el *Product Owner* y administrador de sistemas (gestión de cuentas, pagos, portales externos y pruebas). Yo actúo como tu *Tech Lead* y equipo de desarrollo (escribo todo el código, los scripts de base de datos, configuraciones de infraestructura y comandos de terminal).
