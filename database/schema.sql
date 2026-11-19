-- SOLID UPNVJ: skema MySQL / MariaDB. Impor lewat phpMyAdmin (tab Import).
CREATE DATABASE IF NOT EXISTS solid_upnvj CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE solid_upnvj;
SET NAMES utf8mb4;

CREATE TABLE users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(20) NOT NULL,
  email VARCHAR(120) NOT NULL,
  pass_hash VARCHAR(255) NOT NULL,
  name VARCHAR(60) NOT NULL,
  nickname VARCHAR(20) NOT NULL,
  roblox VARCHAR(40) NOT NULL DEFAULT '',
  instagram VARCHAR(30) NOT NULL DEFAULT '',
  bio VARCHAR(160) NOT NULL DEFAULT '',
  faculty VARCHAR(10) NOT NULL,
  angkatan SMALLINT UNSIGNED NOT NULL,
  avatar TEXT NOT NULL,
  created_at DATETIME NOT NULL,
  last_seen DATETIME NOT NULL,
  UNIQUE KEY uq_username (username),
  UNIQUE KEY uq_email (email),
  KEY idx_faculty (faculty)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- user_a selalu id yang lebih kecil, jadi satu pasangan hanya punya satu baris.
CREATE TABLE friendships (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_a INT UNSIGNED NOT NULL,
  user_b INT UNSIGNED NOT NULL,
  requester_id INT UNSIGNED NOT NULL,
  status ENUM('pending','accepted') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL,
  UNIQUE KEY uq_pair (user_a, user_b),
  KEY idx_b (user_b),
  CONSTRAINT fk_fr_a FOREIGN KEY (user_a) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_fr_b FOREIGN KEY (user_b) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- dm_key berisi "idKecil:idBesar" supaya dua orang hanya punya satu DM.
CREATE TABLE conversations (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  type ENUM('dm','group') NOT NULL,
  name VARCHAR(40) NULL,
  description VARCHAR(120) NOT NULL DEFAULT '',
  invite_code VARCHAR(8) NULL,
  dm_key VARCHAR(24) NULL,
  created_by INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL,
  UNIQUE KEY uq_code (invite_code),
  UNIQUE KEY uq_dm (dm_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE conversation_members (
  conv_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  role ENUM('owner','member') NOT NULL DEFAULT 'member',
  last_read_id BIGINT UNSIGNED NOT NULL DEFAULT 0,
  joined_at DATETIME NOT NULL,
  PRIMARY KEY (conv_id, user_id),
  KEY idx_user (user_id),
  CONSTRAINT fk_cm_c FOREIGN KEY (conv_id) REFERENCES conversations(id) ON DELETE CASCADE,
  CONSTRAINT fk_cm_u FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE plans (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  conv_id INT UNSIGNED NOT NULL,
  creator_id INT UNSIGNED NOT NULL,
  title VARCHAR(60) NOT NULL,
  place_key VARCHAR(30) NOT NULL DEFAULT '',
  place_name VARCHAR(60) NOT NULL,
  starts_at DATETIME NOT NULL,
  note VARCHAR(120) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL,
  KEY idx_conv (conv_id),
  KEY idx_start (starts_at),
  CONSTRAINT fk_pl_c FOREIGN KEY (conv_id) REFERENCES conversations(id) ON DELETE CASCADE,
  CONSTRAINT fk_pl_u FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE messages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  conv_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NULL,
  kind ENUM('text','plan','system') NOT NULL DEFAULT 'text',
  body VARCHAR(1000) NOT NULL,
  plan_id INT UNSIGNED NULL,
  created_at DATETIME NOT NULL,
  KEY idx_conv_id (conv_id, id),
  CONSTRAINT fk_ms_c FOREIGN KEY (conv_id) REFERENCES conversations(id) ON DELETE CASCADE,
  CONSTRAINT fk_ms_u FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE plan_rsvps (
  plan_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  status ENUM('going','no') NOT NULL,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (plan_id, user_id),
  CONSTRAINT fk_rs_p FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE,
  CONSTRAINT fk_rs_u FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE login_attempts (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  ident VARCHAR(120) NOT NULL,
  ip VARCHAR(45) NOT NULL,
  created_at DATETIME NOT NULL,
  KEY idx_ident (ident, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Posisi avatar di ruang 3D. Baris yang tidak diperbarui 12 detik dianggap sudah keluar.
CREATE TABLE room_presence (
  conv_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  x DOUBLE NOT NULL DEFAULT 0,
  z DOUBLE NOT NULL DEFAULT 0,
  ry DOUBLE NOT NULL DEFAULT 0,
  emote VARCHAR(10) NOT NULL DEFAULT '',
  emote_at BIGINT UNSIGNED NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (conv_id, user_id),
  CONSTRAINT fk_rp_c FOREIGN KEY (conv_id) REFERENCES conversations(id) ON DELETE CASCADE,
  CONSTRAINT fk_rp_u FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
