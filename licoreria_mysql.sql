-- SQL generado desde licoreria_mysql.dbml
-- Version compatible sin CHECK constraints (MySQL/MariaDB comunes)

-- Opcional: crea y selecciona la base de datos.
-- CREATE DATABASE IF NOT EXISTS licoreria
--   CHARACTER SET utf8mb4
--   COLLATE utf8mb4_0900_ai_ci;
-- USE licoreria;

CREATE TABLE IF NOT EXISTS productos (
  id INT NOT NULL,
  nombre VARCHAR(180) NOT NULL,
  categoria ENUM(
    'VINO',
    'WHISKY',
    'PISCO',
    'VODKA',
    'RON',
    'TEQUILA',
    'GIN',
    'CERVEZA',
    'READY_TO_DRINK',
    'GASEOSAS',
    'CIGARROS',
    'SNACKS',
    'OTROS'
  ) NOT NULL DEFAULT 'OTROS',
  precio DECIMAL(10,2) UNSIGNED NOT NULL DEFAULT 0,
  pedido INT UNSIGNED NOT NULL DEFAULT 0,
  stock_actual DECIMAL(12,2) UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_productos_nombre (nombre),
  KEY idx_productos_categoria (categoria),
  KEY idx_productos_pedido (pedido)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ventas_diarias (
  id_venta INT NOT NULL AUTO_INCREMENT,
  fecha DATE NOT NULL,
  producto_id INT NOT NULL,
  nombre_snapshot VARCHAR(180) NOT NULL,
  cantidad DECIMAL(12,2) UNSIGNED NOT NULL,
  precio DECIMAL(10,2) UNSIGNED NOT NULL,
  total DECIMAL(12,2) UNSIGNED NOT NULL,
  tipo_pago VARCHAR(20) NOT NULL DEFAULT 'Efectivo',
  origen VARCHAR(20) NOT NULL DEFAULT 'MANUAL',
  PRIMARY KEY (id_venta),
  KEY idx_ventas_fecha (fecha),
  KEY idx_ventas_producto (producto_id),
  KEY idx_ventas_tipo_pago (tipo_pago),
  CONSTRAINT fk_ventas_producto FOREIGN KEY (producto_id) REFERENCES productos(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS kardex_movimientos (
  id_mov INT NOT NULL AUTO_INCREMENT,
  fecha_hora DATETIME NOT NULL,
  producto_id INT NOT NULL,
  nombre_snapshot VARCHAR(180) NOT NULL,
  tipo ENUM('INGRESO', 'SALIDA') NOT NULL,
  cantidad DECIMAL(12,2) UNSIGNED NOT NULL,
  stock_antes DECIMAL(12,2) UNSIGNED NOT NULL,
  stock_despues DECIMAL(12,2) UNSIGNED NOT NULL,
  referencia VARCHAR(80) NULL,
  nota VARCHAR(255) NULL,
  PRIMARY KEY (id_mov),
  KEY idx_kardex_fecha_hora (fecha_hora),
  KEY idx_kardex_producto (producto_id),
  KEY idx_kardex_tipo (tipo),
  KEY idx_kardex_referencia (referencia),
  CONSTRAINT fk_kardex_producto FOREIGN KEY (producto_id) REFERENCES productos(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS configuracion_fuente_productos (
  id TINYINT UNSIGNED NOT NULL DEFAULT 1,
  active_csv_path VARCHAR(512) NOT NULL,
  source_name VARCHAR(255) NOT NULL,
  source_type ENUM('default', 'custom', 'uploaded') NOT NULL,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

-- Migracion para instalaciones existentes donde productos no tenia categoria.
ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS categoria VARCHAR(40) NOT NULL DEFAULT 'OTROS' AFTER nombre;

UPDATE productos
SET categoria = CASE
  WHEN UPPER(nombre) REGEXP 'VINO|ESPUMANTE|CHAMPAGNE' THEN 'VINO'
  WHEN UPPER(nombre) REGEXP 'WHISKY|JOHNNIE|CHIVAS|OLD PARR|BALLANTINE|JACK DANIEL|OLD TIMES' THEN 'WHISKY'
  WHEN UPPER(nombre) REGEXP 'PISCO' THEN 'PISCO'
  WHEN UPPER(nombre) REGEXP 'VODKA|SMIRNOFF|RUSSKAYA|ABSOLUT' THEN 'VODKA'
  WHEN UPPER(nombre) REGEXP 'RON|CARTAVIO|FLOR DE CANA|BACARDI|HAVANA' THEN 'RON'
  WHEN UPPER(nombre) REGEXP 'TEQUILA|JOSE CUERVO|DON JULIO|PATRON' THEN 'TEQUILA'
  WHEN UPPER(nombre) REGEXP 'GIN|BEEFEATER|TANQUERAY|BOMBAY' THEN 'GIN'
  WHEN UPPER(nombre) REGEXP 'CERVEZA|PILSEN|CUSQUENA|CORONA|HEINEKEN|CRISTAL|STELLA' THEN 'CERVEZA'
  WHEN UPPER(nombre) REGEXP 'READY|RTD|COCTEL|COCKTAIL|CHILCANO' THEN 'READY_TO_DRINK'
  WHEN UPPER(nombre) REGEXP 'GASEOSA|COCA|PEPSI|INCA KOLA|SPRITE|FANTA|SEVEN UP|7UP|TONICA|SODA' THEN 'GASEOSAS'
  WHEN UPPER(nombre) REGEXP 'CIGARRO|MARLBORO|KENT|LUCKY|WINSTON|PHILIP' THEN 'CIGARROS'
  WHEN UPPER(nombre) REGEXP 'SNACK|PIQUEO|GALLETA|PAPAS|CHIFLES|MANI|PRINGLES|DORITOS' THEN 'SNACKS'
  WHEN UPPER(nombre) REGEXP 'HIELO|ENCENDEDOR' THEN 'OTROS'
  ELSE 'OTROS'
END;

ALTER TABLE productos
  MODIFY COLUMN categoria ENUM(
    'VINO',
    'WHISKY',
    'PISCO',
    'VODKA',
    'RON',
    'TEQUILA',
    'GIN',
    'CERVEZA',
    'READY_TO_DRINK',
    'GASEOSAS',
    'CIGARROS',
    'SNACKS',
    'OTROS'
  ) NOT NULL DEFAULT 'OTROS';

-- Opcional: inicializa fila singleton de configuracion.
INSERT INTO configuracion_fuente_productos (id, active_csv_path, source_name, source_type, updated_at)
VALUES (1, '', 'productos.csv', 'default', NOW())
ON DUPLICATE KEY UPDATE
  active_csv_path = VALUES(active_csv_path),
  source_name = VALUES(source_name),
  source_type = VALUES(source_type),
  updated_at = VALUES(updated_at);
