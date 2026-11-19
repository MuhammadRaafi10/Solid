<?php
declare(strict_types=1);

const FACULTY_CODES = ['FEB', 'FH', 'FIKES', 'FT', 'FIK', 'FK', 'FISIP'];
const AVATAR_LIMITS = ['skin' => 6, 'hairStyle' => 8, 'hairColor' => 8, 'face' => 4, 'outfit' => 4, 'outfitColor' => 8, 'pants' => 4, 'acc' => 4];
const AVATAR_DEFAULT = ['skin' => 1, 'hairStyle' => 1, 'hairColor' => 0, 'face' => 0, 'outfit' => 0, 'outfitColor' => 0, 'pants' => 0, 'acc' => 0];

function cfg(?string $key = null)
{
    static $c = null;
    if ($c === null) {
        $file = __DIR__ . '/../config.php';
        if (!is_file($file)) {
            respond_error('config.php belum ada. Salin api/config.sample.php jadi api/config.php lalu isi kredensial database.', 500, 'CONFIG');
        }
        $c = require $file;
    }
    return $key === null ? $c : ($c[$key] ?? null);
}

function respond(array $data): void
{
    echo json_encode(['ok' => true, 'data' => $data], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function respond_error(string $msg, int $status = 400, string $code = 'ERR'): void
{
    if (!headers_sent()) {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
    }
    echo json_encode(['ok' => false, 'error' => $msg, 'code' => $code], JSON_UNESCAPED_UNICODE);
    exit;
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $pdo = new PDO(cfg('db_dsn'), cfg('db_user'), cfg('db_pass'), [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    }
    return $pdo;
}

function run(string $sql, array $params = []): PDOStatement
{
    $st = db()->prepare($sql);
    $st->execute($params);
    return $st;
}

function rows(string $sql, array $params = []): array
{
    return run($sql, $params)->fetchAll();
}

function row(string $sql, array $params = []): ?array
{
    $r = run($sql, $params)->fetch();
    return $r === false ? null : $r;
}

function scalar(string $sql, array $params = [])
{
    $r = run($sql, $params)->fetchColumn();
    return $r === false ? null : $r;
}

function insert(string $table, array $data): int
{
    $cols = implode(', ', array_keys($data));
    $ph = implode(', ', array_fill(0, count($data), '?'));
    run("INSERT INTO $table ($cols) VALUES ($ph)", array_values($data));
    return (int) db()->lastInsertId();
}

function marks(int $n): string
{
    return implode(',', array_fill(0, max(1, $n), '?'));
}

function now(): string
{
    return date('Y-m-d H:i:s');
}

function input(): array
{
    $raw = file_get_contents('php://input');
    $j = json_decode($raw ?: '', true);
    return is_array($j) ? $j : [];
}

function text(array $in, string $key, int $max): string
{
    $v = $in[$key] ?? '';
    if (!is_string($v) && !is_numeric($v)) return '';
    $v = trim(preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/u', '', (string) $v) ?? '');
    return mb_substr($v, 0, $max);
}

function start_session(): void
{
    $secure = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
    ini_set('session.gc_maxlifetime', '2592000');
    session_name('solid_sid');
    session_set_cookie_params(['lifetime' => 2592000, 'path' => '/', 'secure' => $secure, 'httponly' => true, 'samesite' => 'Lax']);
    session_start();
}

function me(): array
{
    $id = (int) ($_SESSION['uid'] ?? 0);
    $u = $id ? row('SELECT * FROM users WHERE id = ?', [$id]) : null;
    if (!$u) respond_error('Sesi habis. Masuk lagi ya.', 401, 'AUTH');
    if (strtotime($u['last_seen']) < time() - 60) {
        run('UPDATE users SET last_seen = ? WHERE id = ?', [now(), $id]);
    }
    return $u;
}

function avatar_clean($v): array
{
    if (is_string($v)) $v = json_decode($v, true);
    if (!is_array($v)) $v = [];
    $out = [];
    foreach (AVATAR_LIMITS as $k => $lim) {
        $n = isset($v[$k]) ? (int) $v[$k] : AVATAR_DEFAULT[$k];
        $out[$k] = ($n >= 0 && $n < $lim) ? $n : AVATAR_DEFAULT[$k];
    }
    return $out;
}

function user_card(array $u): array
{
    return [
        'id' => (int) $u['id'], 'username' => $u['username'], 'name' => $u['name'], 'nickname' => $u['nickname'],
        'faculty' => $u['faculty'], 'angkatan' => (int) $u['angkatan'], 'avatar' => avatar_clean($u['avatar']),
    ];
}

function user_public(array $u, string $status, bool $private): array
{
    $o = user_card($u);
    $o['bio'] = $u['bio'];
    $o['friend_status'] = $status;
    $o['roblox'] = $private ? $u['roblox'] : '';
    $o['instagram'] = $private ? $u['instagram'] : '';
    return $o;
}

function pair(int $a, int $b): array
{
    return [min($a, $b), max($a, $b)];
}

function relation(int $me, int $other): ?array
{
    [$a, $b] = pair($me, $other);
    return row('SELECT * FROM friendships WHERE user_a = ? AND user_b = ?', [$a, $b]);
}

function relation_status(?array $rel, int $me): string
{
    if (!$rel) return 'none';
    if ($rel['status'] === 'accepted') return 'friends';
    return (int) $rel['requester_id'] === $me ? 'sent' : 'received';
}

function are_friends(int $a, int $b): bool
{
    $rel = relation($a, $b);
    return $rel !== null && $rel['status'] === 'accepted';
}
