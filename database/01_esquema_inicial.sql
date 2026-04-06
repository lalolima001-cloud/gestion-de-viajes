-- 01_esquema_inicial.sql
-- Creación de Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tablas de Configuración (Maestros)
CREATE TABLE empresas (
    id_empresa UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(200) NOT NULL,
    ruc VARCHAR(20) NOT NULL,
    flujo_aprobacion BOOLEAN DEFAULT true,
    dias_anticipacion_min INTEGER DEFAULT 7,
    moneda_default VARCHAR(3) DEFAULT 'USD',
    sla_horas_agencia INTEGER DEFAULT 24,
    sla_horas_hotel INTEGER DEFAULT 48,
    activo BOOLEAN DEFAULT true
);

CREATE TABLE empleados (
    id_empleado UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_empresa UUID REFERENCES empresas(id_empresa),
    id_jefe_directo UUID REFERENCES empleados(id_empleado) NULL, -- NULL para gerencia alta
    dni VARCHAR(15) UNIQUE NOT NULL,
    ap_paterno VARCHAR(100) NOT NULL,
    ap_materno VARCHAR(100),
    nombres VARCHAR(100) NOT NULL,
    cargo VARCHAR(200),
    email_corporativo VARCHAR(200) UNIQUE NOT NULL,
    celular VARCHAR(20),
    zona_macro VARCHAR(100),
    ubicacion VARCHAR(100),
    puede_aprobar BOOLEAN DEFAULT false,
    is_admin BOOLEAN DEFAULT false, -- Responsable de viajes
    auth_user_id UUID UNIQUE NULL   -- Ligar con genérico de Supabase Auth
);

-- Proveedores (Agencias y Hoteles consolidados por simplicidad)
CREATE TABLE proveedores (
    id_proveedor UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo VARCHAR(50) CHECK (tipo IN ('agencia', 'hotel')),
    nombre VARCHAR(200) NOT NULL,
    ruc VARCHAR(20),
    email_cotizaciones VARCHAR(200) NOT NULL,
    email_confirmaciones VARCHAR(200) NOT NULL,
    telefono VARCHAR(100),
    contacto VARCHAR(100),
    sla_horas_respuesta INTEGER DEFAULT 24,
    categoria INTEGER NULL CHECK (categoria >= 1 AND categoria <= 5),
    ciudad VARCHAR(100) NULL,
    activo BOOLEAN DEFAULT true
);

-- Transacciones
CREATE TABLE solicitudes_viaje (
    id_solicitud UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_empresa UUID REFERENCES empresas(id_empresa),
    id_empleado UUID REFERENCES empleados(id_empleado),
    tipo_solicitud VARCHAR(50) CHECK (tipo_solicitud IN ('individual', 'grupal', 'evento')),
    origen VARCHAR(100) NOT NULL,
    destino VARCHAR(100) NOT NULL,
    fecha_viaje_ida DATE NOT NULL,
    fecha_viaje_vuelta DATE,
    incluye_hospedaje BOOLEAN DEFAULT false,
    flujo_aprobacion BOOLEAN DEFAULT true,
    justificacion_negocio TEXT NOT NULL,
    estado_solicitud VARCHAR(50) DEFAULT 'enviado' CHECK (estado_solicitud IN ('borrador', 'enviado', 'cotizando', 'seleccionado', 'aprobado', 'rechazado', 'confirmado', 'completado', 'cancelado')),
    nombre_evento VARCHAR(200),
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cotizaciones Vuelo
CREATE TABLE cotizaciones_vuelo (
    id_cotizacion UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_solicitud UUID REFERENCES solicitudes_viaje(id_solicitud),
    id_agencia UUID REFERENCES proveedores(id_proveedor),
    opcion_numero INTEGER NOT NULL,
    aerolinea VARCHAR(100) NOT NULL,
    nro_vuelo_ida VARCHAR(50) NOT NULL,
    nro_vuelo_vuelta VARCHAR(50),
    fecha_hora_salida TIMESTAMP WITH TIME ZONE NOT NULL,
    fecha_hora_llegada TIMESTAMP WITH TIME ZONE NOT NULL,
    fecha_hora_salida_vuelta TIMESTAMP WITH TIME ZONE,
    fecha_hora_llegada_vuelta TIMESTAMP WITH TIME ZONE,
    tarifa_tipo VARCHAR(50),
    tarifa_usd DECIMAL(10,2) NOT NULL,
    incluye_equipaje BOOLEAN DEFAULT false,
    permite_cambios BOOLEAN DEFAULT false,
    penalidad_cambio_usd DECIMAL(10,2),
    pros TEXT,
    contras TEXT,
    seleccionada BOOLEAN DEFAULT false
);

-- Cotizaciones Hotel
CREATE TABLE cotizaciones_hotel (
    id_cot_hotel UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_solicitud UUID REFERENCES solicitudes_viaje(id_solicitud),
    id_hotel UUID REFERENCES proveedores(id_proveedor),
    tipo_habitacion VARCHAR(100) NOT NULL,
    tarifa_noche_usd DECIMAL(10,2) NOT NULL,
    incluye_igv BOOLEAN DEFAULT false,
    fecha_checkin DATE NOT NULL,
    fecha_checkout DATE NOT NULL,
    incluye_desayuno BOOLEAN DEFAULT false,
    politica_cancelacion TEXT,
    fecha_limite_decision TIMESTAMP WITH TIME ZONE,
    pros TEXT,
    contras TEXT,
    seleccionada BOOLEAN DEFAULT false
);

CREATE TABLE aprobaciones (
    id_aprobacion UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_solicitud UUID REFERENCES solicitudes_viaje(id_solicitud),
    id_aprobador UUID REFERENCES empleados(id_empleado),
    tipo VARCHAR(50) CHECK (tipo IN ('vuelo', 'hotel', 'cambio', 'cancelacion')),
    decision VARCHAR(50) DEFAULT 'pendiente' CHECK (decision IN ('aprobado', 'rechazado', 'pendiente')),
    motivo_rechazo TEXT,
    implica_nueva_busqueda BOOLEAN DEFAULT false,
    tiempo_respuesta_horas DECIMAL(10,2),
    fecha_decision TIMESTAMP WITH TIME ZONE
);
