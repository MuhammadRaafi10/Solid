<?php
declare(strict_types=1);

function h_register(array $in): array
{
    $name = text($in, 'name', 60);
    $username = strtolower(text($in, 'username', 20));
    $email = strtolower(text($in, 'email', 120));
    $faculty = text($in, 'faculty', 10);
    $angkatan = (int) ($in['angkatan'] ?? 0);
    $password = is_string($in['password'] ?? null) ? $in['password'] : '';

    if (mb_strlen($name) < 2) respond_error('Nama lengkap minimal 2 huruf.');
    if (!preg_match('/^[a-z0-9_.]{3,20}$/', $username)) respond_error('ID cuma boleh huruf kecil, angka, titik, underscore (3-20 karakter).');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) respond_error('Format email belum benar.');
    $domains = cfg('allowed_email_domains') ?: [];
    if ($domains && !in_array(substr(strrchr($email, '@'), 1), $domains, true)) {
        respond_error('Daftar pakai email kampus: @' . implode(', @', $domains));
    }
    if (!in_array($faculty, FACULTY_CODES, true)) respond_error('Pilih fakultasmu.');
    if ($angkatan < 2000 || $angkatan > (int) date('Y') + 1) respond_error('Angkatan tidak valid.');
    if (strlen($password) < 8 || strlen($password) > 72) respond_error('Password 8 sampai 72 karakter.');

    if (scalar('SELECT 1 FROM users WHERE username = ?', [$username])) respond_error('ID itu sudah dipakai. Coba yang lain.', 409);
    if (scalar('SELECT 1 FROM users WHERE email = ?', [$email])) respond_error('Email itu sudah terdaftar.', 409);

    $nick = mb_substr(preg_split('/\s+/u', $name)[0], 0, 20);
    $id = insert('users', [
        'username' => $username, 'email' => $email, 'pass_hash' => password_hash($password, PASSWORD_DEFAULT),
        'name' => $name, 'nickname' => $nick, 'roblox' => '', 'instagram' => '', 'bio' => '',
        'faculty' => $faculty, 'angkatan' => $angkatan, 'avatar' => json_encode(AVATAR_DEFAULT),
        'created_at' => now(), 'last_seen' => now(),
    ]);
    session_regenerate_id(true);
    $_SESSION['uid'] = $id;
    return ['user' => self_user(row('SELECT * FROM users WHERE id = ?', [$id]))];
}

function h_login(array $in): array
{
    $ident = strtolower(text($in, 'id', 120));
    $password = is_string($in['password'] ?? null) ? $in['password'] : '';
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    $since = date('Y-m-d H:i:s', time() - 600);

    $tries = (int) scalar('SELECT COUNT(*) FROM login_attempts WHERE ident = ? AND ip = ? AND created_at > ?', [$ident, $ip, $since]);
    if ($tries >= 5) respond_error('Terlalu banyak percobaan. Tunggu 10 menit lalu coba lagi.', 429, 'THROTTLE');

    $u = row('SELECT * FROM users WHERE username = ? OR email = ?', [$ident, $ident]);
    if (!$u || !password_verify($password, $u['pass_hash'])) {
        insert('login_attempts', ['ident' => $ident, 'ip' => $ip, 'created_at' => now()]);
        respond_error('ID atau password salah.', 401, 'BADLOGIN');
    }
    run('DELETE FROM login_attempts WHERE ident = ?', [$ident]);
    session_regenerate_id(true);
    $_SESSION['uid'] = (int) $u['id'];
    return ['user' => self_user($u)];
}

function h_logout(array $in): array
{
    $_SESSION = [];
    session_destroy();
    return [];
}

function self_user(array $u): array
{
    $o = user_public($u, 'self', true);
    $o['email'] = $u['email'];
    return $o;
}

function h_me(array $in): array
{
    return ['user' => self_user(me())];
}

function h_profile_update(array $in): array
{
    $u = me();
    $set = [];
    if (array_key_exists('nickname', $in)) {
        $v = text($in, 'nickname', 20);
        if (mb_strlen($v) < 2) respond_error('Nama panggilan minimal 2 huruf.');
        $set['nickname'] = $v;
    }
    if (array_key_exists('name', $in)) {
        $v = text($in, 'name', 60);
        if (mb_strlen($v) < 2) respond_error('Nama lengkap minimal 2 huruf.');
        $set['name'] = $v;
    }
    if (array_key_exists('roblox', $in)) $set['roblox'] = text($in, 'roblox', 40);
    if (array_key_exists('instagram', $in)) {
        $v = ltrim(text($in, 'instagram', 31), '@');
        if ($v !== '' && !preg_match('/^[A-Za-z0-9_.]{1,30}$/', $v)) respond_error('Username Instagram tidak valid.');
        $set['instagram'] = $v;
    }
    if (array_key_exists('bio', $in)) $set['bio'] = text($in, 'bio', 160);
    if (array_key_exists('faculty', $in)) {
        $v = text($in, 'faculty', 10);
        if (!in_array($v, FACULTY_CODES, true)) respond_error('Fakultas tidak valid.');
        $set['faculty'] = $v;
    }
    if (array_key_exists('angkatan', $in)) {
        $v = (int) $in['angkatan'];
        if ($v < 2000 || $v > (int) date('Y') + 1) respond_error('Angkatan tidak valid.');
        $set['angkatan'] = $v;
    }
    if (array_key_exists('avatar', $in)) $set['avatar'] = json_encode(avatar_clean($in['avatar']));

    if ($set) {
        $assign = implode(', ', array_map(fn($k) => "$k = ?", array_keys($set)));
        run("UPDATE users SET $assign WHERE id = ?", array_merge(array_values($set), [(int) $u['id']]));
    }
    return ['user' => self_user(row('SELECT * FROM users WHERE id = ?', [(int) $u['id']]))];
}

function relation_map(int $me): array
{
    $map = [];
    foreach (rows('SELECT * FROM friendships WHERE user_a = ? OR user_b = ?', [$me, $me]) as $r) {
        $other = (int) $r['user_a'] === $me ? (int) $r['user_b'] : (int) $r['user_a'];
        $map[$other] = relation_status($r, $me);
    }
    return $map;
}

function h_search_users(array $in): array
{
    $u = me();
    $meId = (int) $u['id'];
    $q = strtolower(ltrim(text($in, 'q', 40), '@'));
    $f = text($in, 'faculty', 10);
    $where = 'id <> ?';
    $p = [$meId];

    if ($f !== '' && in_array($f, FACULTY_CODES, true)) {
        $where .= ' AND faculty = ?';
        $p[] = $f;
    }
    if ($q !== '') {
        $like = '%' . str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $q) . '%';
        $where .= " AND (username LIKE ? ESCAPE '!' OR LOWER(name) LIKE ? ESCAPE '!' OR LOWER(nickname) LIKE ? ESCAPE '!')";
        array_push($p, $like, $like, $like);
        $order = '(username = ?) DESC, nickname ASC';
        $p[] = $q;
    } else {
        $where .= ' AND id NOT IN (SELECT CASE WHEN user_a = ? THEN user_b ELSE user_a END FROM friendships WHERE user_a = ? OR user_b = ?)';
        array_push($p, $meId, $meId, $meId);
        $order = '(faculty = ?) ASC, last_seen DESC';
        $p[] = $u['faculty'];
    }
    $found = rows("SELECT * FROM users WHERE $where ORDER BY $order LIMIT 30", $p);
    $rel = relation_map($meId);
    $out = [];
    foreach ($found as $r) {
        $s = $rel[(int) $r['id']] ?? 'none';
        $out[] = user_public($r, $s, $s === 'friends');
    }
    return ['users' => $out];
}

function h_user_get(array $in): array
{
    $u = me();
    $id = (int) ($in['user_id'] ?? 0);
    $t = $id ? row('SELECT * FROM users WHERE id = ?', [$id]) : null;
    if (!$t) respond_error('Pengguna tidak ditemukan.', 404);
    if ($id === (int) $u['id']) return self_user($t);
    $s = relation_status(relation((int) $u['id'], $id), (int) $u['id']);
    return user_public($t, $s, $s === 'friends');
}

function h_friend_request(array $in): array
{
    $u = me();
    $meId = (int) $u['id'];
    $to = (int) ($in['user_id'] ?? 0);
    if ($to === $meId) respond_error('Itu kamu sendiri.');
    if (!scalar('SELECT 1 FROM users WHERE id = ?', [$to])) respond_error('Pengguna tidak ditemukan.', 404);
    $rel = relation($meId, $to);
    if ($rel) {
        if ($rel['status'] === 'accepted') respond_error('Kalian sudah berteman.');
        if ((int) $rel['requester_id'] === $meId) respond_error('Permintaan sudah terkirim.');
        run("UPDATE friendships SET status = 'accepted' WHERE id = ?", [(int) $rel['id']]);
        return ['status' => 'friends'];
    }
    [$a, $b] = pair($meId, $to);
    insert('friendships', ['user_a' => $a, 'user_b' => $b, 'requester_id' => $meId, 'status' => 'pending', 'created_at' => now()]);
    return ['status' => 'sent'];
}

function h_friend_respond(array $in): array
{
    $u = me();
    $meId = (int) $u['id'];
    $from = (int) ($in['user_id'] ?? 0);
    $rel = relation($meId, $from);
    if (!$rel || $rel['status'] !== 'pending' || (int) $rel['requester_id'] !== $from) respond_error('Permintaan tidak ditemukan.', 404);
    if (!empty($in['accept'])) {
        run("UPDATE friendships SET status = 'accepted' WHERE id = ?", [(int) $rel['id']]);
        return ['status' => 'friends'];
    }
    run('DELETE FROM friendships WHERE id = ?', [(int) $rel['id']]);
    return ['status' => 'none'];
}

function h_friend_remove(array $in): array
{
    $u = me();
    $rel = relation((int) $u['id'], (int) ($in['user_id'] ?? 0));
    if ($rel) run('DELETE FROM friendships WHERE id = ?', [(int) $rel['id']]);
    return ['status' => 'none'];
}

function h_friends_list(array $in): array
{
    $u = me();
    $meId = (int) $u['id'];
    $sql = 'SELECT u.*, f.status AS f_status, f.requester_id AS f_req FROM friendships f
            JOIN users u ON u.id = CASE WHEN f.user_a = ? THEN f.user_b ELSE f.user_a END
            WHERE f.user_a = ? OR f.user_b = ? ORDER BY u.nickname';
    $out = ['friends' => [], 'incoming' => [], 'outgoing' => []];
    foreach (rows($sql, [$meId, $meId, $meId]) as $r) {
        if ($r['f_status'] === 'accepted') $out['friends'][] = user_public($r, 'friends', true);
        elseif ((int) $r['f_req'] === $meId) $out['outgoing'][] = user_public($r, 'sent', false);
        else $out['incoming'][] = user_public($r, 'received', false);
    }
    return $out;
}
