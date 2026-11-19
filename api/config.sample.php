<?php
// Salin file ini jadi config.php. Default-nya cocok untuk XAMPP/Laragon.
return [
    'db_dsn'  => 'mysql:host=localhost;dbname=solid_upnvj;charset=utf8mb4',
    'db_user' => 'root',
    'db_pass' => '',

    'timezone' => 'Asia/Jakarta',

    // Kosongkan untuk membuka pendaftaran bagi semua email.
    // Isi mis. ['mahasiswa.upnvj.ac.id'] untuk membatasi ke email kampus.
    'allowed_email_domains' => [],

    // true hanya saat debugging: pesan error PHP ikut dikirim ke browser.
    'debug' => false,
];
