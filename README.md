# SOLID UPNVJ

Social Online Link for Inter-Department. Web chat dan pertemanan lintas fakultas UPNVJ: cari teman lewat ID, grup, rencana ketemu dengan saran tempat, avatar, dan ruang 3D.

Stack: HTML5 + CSS + JavaScript (tanpa framework), PHP 8 (PDO), MySQL/MariaDB. Jalan di komputer sendiri.

## Menjalankan lokal

1. Install XAMPP atau Laragon (PHP 8.1+ dan MySQL). Nyalakan Apache dan MySQL.
2. Salin folder proyek ini ke `htdocs` (XAMPP) atau `www` (Laragon), misal jadi `htdocs/solid`.
3. Buka phpMyAdmin, tab **Import**, pilih `database/schema.sql`. Database `solid_upnvj` dibuat otomatis.
4. Salin `api/config.sample.php` jadi `api/config.php`. Kalau MySQL-mu pakai password, isi di situ.
5. Buka `http://localhost/solid/`, daftar akun, lalu mulai.

Akses dari HP di jaringan yang sama: pakai `http://IP-laptop/solid/` (cek IP dengan `ipconfig`).

## Struktur

```
index.html            satu halaman, isinya dirender app.js
assets/css/app.css    semua gaya
assets/js/api.js      satu fungsi API.call(action, data) ke backend
assets/js/app.js      layar: login, chat, teman, jadwal, profil
assets/js/avatar.js   avatar dari angka konfigurasi (SVG)
assets/js/places.js   daftar tempat saran
assets/js/room3d.js   ruang 3D (canvas)
api/index.php         pintu masuk, tabel rute action -> fungsi
api/lib/core.php      koneksi DB, session, validasi, helper
api/lib/users.php     daftar, login, profil, teman
api/lib/chat.php      percakapan, grup, pesan, ruang 3D
api/lib/plans.php     rencana ketemu (CRUD lengkap)
database/schema.sql   9 tabel
tests/api_test.py     tes API otomatis
tests/ui/             tes tampilan (Playwright)
```

## Modul CRUD

Rencana ketemu (`plans`): `plan_create`, `plan_list`, `plan_update`, `plan_delete`. Ubah dan hapus hanya boleh oleh pembuatnya (dicek di server). Validasi di sisi klien (form) dan di sisi server (`plan_fields` di `plans.php`).

## Pengujian

`tests/api_test.py` memanggil API lewat HTTP (54 pengecekan: daftar, login, teman, grup, chat, CRUD rencana, hak akses, ruang 3D). Hanya butuh Python 3.

```
BASE=http://localhost/solid/api/index.php?action= python tests/api_test.py
```

Pakai database kosong (impor ulang `schema.sql`), karena tes membuat akun uji. Hasil akhirnya harus `FAILS: []`.

Tes tampilan (opsional) ada di `tests/ui/`: `semantik.py` (struktur HTML5 tiap layar), `validasi.py` (validasi klien), `crud.py` (buat, ubah, hapus rencana lewat UI). Butuh `pip install playwright` dan `playwright install chromium`. Tiap tes membuat akun acak, jadi bisa dijalankan berulang:

```
BASE_URL=http://localhost/solid/ python tests/ui/semantik.py
```

## Catatan

- Semua query pakai prepared statement. Password disimpan dengan `password_hash`.
- Chat memakai polling (cek tiap beberapa detik), bukan realtime.
- Login dibatasi 5 kali gagal per 10 menit.
