<?php
declare(strict_types=1);

function need_member(int $convId, int $uid): array
{
    $c = row('SELECT * FROM conversations WHERE id = ?', [$convId]);
    if (!$c || !scalar('SELECT 1 FROM conversation_members WHERE conv_id = ? AND user_id = ?', [$convId, $uid])) {
        respond_error('Obrolan tidak ditemukan.', 404);
    }
    return $c;
}

function dm_other_id(int $convId, int $me): int
{
    return (int) scalar('SELECT user_id FROM conversation_members WHERE conv_id = ? AND user_id <> ?', [$convId, $me]);
}

function add_message(int $convId, ?int $uid, string $kind, string $body, ?int $planId = null): int
{
    return insert('messages', ['conv_id' => $convId, 'user_id' => $uid, 'kind' => $kind, 'body' => $body, 'plan_id' => $planId, 'created_at' => now()]);
}

function build_convs(array $ids, int $me): array
{
    if (!$ids) return [];
    $in = marks(count($ids));
    $convs = rows("SELECT * FROM conversations WHERE id IN ($in)", $ids);

    $unread = [];
    foreach (rows("SELECT m.conv_id AS cid, COUNT(*) AS n FROM messages m
        JOIN conversation_members cm ON cm.conv_id = m.conv_id AND cm.user_id = ?
        WHERE m.conv_id IN ($in) AND m.id > cm.last_read_id AND m.user_id <> ? GROUP BY m.conv_id", array_merge([$me], $ids, [$me])) as $r) {
        $unread[(int) $r['cid']] = (int) $r['n'];
    }
    $last = [];
    foreach (rows("SELECT m.*, u.nickname AS nick FROM messages m LEFT JOIN users u ON u.id = m.user_id
        WHERE m.id IN (SELECT MAX(id) FROM messages WHERE conv_id IN ($in) GROUP BY conv_id)", $ids) as $r) {
        $last[(int) $r['conv_id']] = $r;
    }
    $counts = [];
    foreach (rows("SELECT conv_id AS cid, COUNT(*) AS n FROM conversation_members WHERE conv_id IN ($in) GROUP BY conv_id", $ids) as $r) {
        $counts[(int) $r['cid']] = (int) $r['n'];
    }
    $others = [];
    foreach (rows("SELECT cm.conv_id AS cid, u.* FROM conversation_members cm JOIN users u ON u.id = cm.user_id
        WHERE cm.user_id <> ? AND cm.conv_id IN ($in)", array_merge([$me], $ids)) as $r) {
        $others[(int) $r['cid']] = $r;
    }

    $out = [];
    foreach ($convs as $c) {
        $id = (int) $c['id'];
        $l = $last[$id] ?? null;
        $o = [
            'id' => $id, 'type' => $c['type'], 'name' => $c['name'], 'description' => $c['description'],
            'members_count' => $counts[$id] ?? 1, 'unread' => $unread[$id] ?? 0, 'created_at' => $c['created_at'],
            'last' => $l ? ['id' => (int) $l['id'], 'kind' => $l['kind'], 'body' => $l['body'], 'user_id' => $l['user_id'] === null ? 0 : (int) $l['user_id'], 'nick' => $l['nick'], 'created_at' => $l['created_at']] : null,
        ];
        if ($c['type'] === 'dm') {
            $ou = $others[$id] ?? null;
            $o['name'] = $ou ? $ou['nickname'] : 'Pengguna';
            $o['avatar'] = $ou ? avatar_clean($ou['avatar']) : AVATAR_DEFAULT;
            $o['other'] = $ou ? user_card($ou) : null;
        }
        $o['sort'] = $l ? (int) $l['id'] : 0;
        $out[] = $o;
    }
    usort($out, fn($a, $b) => [$b['sort'], $b['id']] <=> [$a['sort'], $a['id']]);
    foreach ($out as &$o) unset($o['sort']);
    return $out;
}

function h_overview(array $in): array
{
    $u = me();
    $meId = (int) $u['id'];
    $ids = array_map('intval', array_column(rows('SELECT conv_id FROM conversation_members WHERE user_id = ?', [$meId]), 'conv_id'));
    $incoming = (int) scalar("SELECT COUNT(*) FROM friendships WHERE status = 'pending' AND requester_id <> ? AND (user_a = ? OR user_b = ?)", [$meId, $meId, $meId]);
    return ['convs' => build_convs($ids, $meId), 'incoming' => $incoming];
}

function h_dm_open(array $in): array
{
    $u = me();
    $meId = (int) $u['id'];
    $to = (int) ($in['user_id'] ?? 0);
    if ($to === $meId || !are_friends($meId, $to)) respond_error('Kamu bisa chat setelah berteman.', 403);
    [$a, $b] = pair($meId, $to);
    $key = "$a:$b";
    $c = row('SELECT id FROM conversations WHERE dm_key = ?', [$key]);
    if ($c) {
        $cid = (int) $c['id'];
    } else {
        db()->beginTransaction();
        $cid = insert('conversations', ['type' => 'dm', 'name' => null, 'description' => '', 'invite_code' => null, 'dm_key' => $key, 'created_by' => $meId, 'created_at' => now()]);
        foreach ([$meId, $to] as $uid) {
            insert('conversation_members', ['conv_id' => $cid, 'user_id' => $uid, 'role' => 'member', 'last_read_id' => 0, 'joined_at' => now()]);
        }
        db()->commit();
    }
    return build_convs([$cid], $meId)[0];
}

function new_invite_code(): string
{
    $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    do {
        $code = '';
        for ($i = 0; $i < 6; $i++) $code .= $chars[random_int(0, strlen($chars) - 1)];
    } while (scalar('SELECT 1 FROM conversations WHERE invite_code = ?', [$code]));
    return $code;
}

function friend_ids_only(int $me, array $ids): array
{
    $ok = [];
    foreach (array_unique(array_map('intval', $ids)) as $id) {
        if ($id !== $me && are_friends($me, $id)) $ok[] = $id;
    }
    return $ok;
}

function nicks(array $ids): string
{
    if (!$ids) return '';
    return implode(', ', array_column(rows('SELECT nickname FROM users WHERE id IN (' . marks(count($ids)) . ')', $ids), 'nickname'));
}

function h_group_create(array $in): array
{
    $u = me();
    $meId = (int) $u['id'];
    $name = text($in, 'name', 40);
    if (mb_strlen($name) < 3) respond_error('Nama grup minimal 3 huruf.');
    $members = friend_ids_only($meId, is_array($in['member_ids'] ?? null) ? $in['member_ids'] : []);
    if (count($members) > 49) respond_error('Maksimal 50 anggota saat membuat grup.');

    db()->beginTransaction();
    $cid = insert('conversations', ['type' => 'group', 'name' => $name, 'description' => text($in, 'description', 120), 'invite_code' => new_invite_code(), 'dm_key' => null, 'created_by' => $meId, 'created_at' => now()]);
    insert('conversation_members', ['conv_id' => $cid, 'user_id' => $meId, 'role' => 'owner', 'last_read_id' => 0, 'joined_at' => now()]);
    foreach ($members as $uid) {
        insert('conversation_members', ['conv_id' => $cid, 'user_id' => $uid, 'role' => 'member', 'last_read_id' => 0, 'joined_at' => now()]);
    }
    add_message($cid, null, 'system', $u['nickname'] . ' membuat grup ini');
    db()->commit();
    return build_convs([$cid], $meId)[0];
}

function h_group_join(array $in): array
{
    $u = me();
    $meId = (int) $u['id'];
    $code = strtoupper(text($in, 'code', 8));
    $c = $code === '' ? null : row("SELECT * FROM conversations WHERE invite_code = ? AND type = 'group'", [$code]);
    if (!$c) respond_error('Kode grup tidak ditemukan.', 404);
    $cid = (int) $c['id'];
    if (!scalar('SELECT 1 FROM conversation_members WHERE conv_id = ? AND user_id = ?', [$cid, $meId])) {
        if ((int) scalar('SELECT COUNT(*) FROM conversation_members WHERE conv_id = ?', [$cid]) >= 200) respond_error('Grup sudah penuh.');
        insert('conversation_members', ['conv_id' => $cid, 'user_id' => $meId, 'role' => 'member', 'last_read_id' => 0, 'joined_at' => now()]);
        add_message($cid, null, 'system', $u['nickname'] . ' bergabung');
    }
    return build_convs([$cid], $meId)[0];
}

function h_group_info(array $in): array
{
    $u = me();
    $cid = (int) ($in['conv_id'] ?? 0);
    $c = need_member($cid, (int) $u['id']);
    if ($c['type'] !== 'group') respond_error('Ini bukan grup.');
    $members = [];
    foreach (rows('SELECT u.*, cm.role AS m_role FROM conversation_members cm JOIN users u ON u.id = cm.user_id WHERE cm.conv_id = ? ORDER BY cm.joined_at, u.id', [$cid]) as $r) {
        $o = user_card($r);
        $o['role'] = $r['m_role'];
        $members[] = $o;
    }
    return ['id' => $cid, 'name' => $c['name'], 'description' => $c['description'], 'invite_code' => $c['invite_code'], 'members' => $members];
}

function h_group_add(array $in): array
{
    $u = me();
    $meId = (int) $u['id'];
    $cid = (int) ($in['conv_id'] ?? 0);
    $c = need_member($cid, $meId);
    if ($c['type'] !== 'group') respond_error('Ini bukan grup.');
    $ids = friend_ids_only($meId, is_array($in['user_ids'] ?? null) ? $in['user_ids'] : []);
    $added = [];
    foreach ($ids as $uid) {
        if (scalar('SELECT 1 FROM conversation_members WHERE conv_id = ? AND user_id = ?', [$cid, $uid])) continue;
        insert('conversation_members', ['conv_id' => $cid, 'user_id' => $uid, 'role' => 'member', 'last_read_id' => 0, 'joined_at' => now()]);
        $added[] = $uid;
    }
    if (!$added) respond_error('Tidak ada teman baru yang bisa ditambahkan.');
    add_message($cid, null, 'system', $u['nickname'] . ' menambahkan ' . nicks($added));
    return ['added' => count($added)];
}

function h_group_leave(array $in): array
{
    $u = me();
    $meId = (int) $u['id'];
    $cid = (int) ($in['conv_id'] ?? 0);
    $c = need_member($cid, $meId);
    if ($c['type'] !== 'group') respond_error('Ini bukan grup.');
    run('DELETE FROM conversation_members WHERE conv_id = ? AND user_id = ?', [$cid, $meId]);
    run('DELETE FROM plan_rsvps WHERE user_id = ? AND plan_id IN (SELECT id FROM plans WHERE conv_id = ?)', [$meId, $cid]);
    $left = (int) scalar('SELECT COUNT(*) FROM conversation_members WHERE conv_id = ?', [$cid]);
    if ($left === 0) {
        run('DELETE FROM conversations WHERE id = ?', [$cid]);
    } else {
        add_message($cid, null, 'system', $u['nickname'] . ' keluar');
        if (!scalar("SELECT 1 FROM conversation_members WHERE conv_id = ? AND role = 'owner'", [$cid])) {
            $next = scalar('SELECT user_id FROM conversation_members WHERE conv_id = ? ORDER BY joined_at, user_id LIMIT 1', [$cid]);
            run("UPDATE conversation_members SET role = 'owner' WHERE conv_id = ? AND user_id = ?", [$cid, (int) $next]);
        }
    }
    return [];
}

function msg_out(array $m): array
{
    return [
        'id' => (int) $m['id'], 'conv_id' => (int) $m['conv_id'], 'user_id' => $m['user_id'] === null ? 0 : (int) $m['user_id'],
        'kind' => $m['kind'], 'body' => $m['body'], 'plan_id' => $m['plan_id'] === null ? null : (int) $m['plan_id'], 'created_at' => $m['created_at'],
    ];
}

function h_msg_list(array $in): array
{
    $u = me();
    $meId = (int) $u['id'];
    $cid = (int) ($in['conv_id'] ?? 0);
    need_member($cid, $meId);
    $after = (int) ($in['after_id'] ?? 0);
    $before = (int) ($in['before_id'] ?? 0);

    $hasMore = false;
    if ($before > 0) {
        $r = rows('SELECT * FROM messages WHERE conv_id = ? AND id < ? ORDER BY id DESC LIMIT 31', [$cid, $before]);
        $hasMore = count($r) > 30;
        $r = array_reverse(array_slice($r, 0, 30));
    } elseif ($after > 0) {
        $r = rows('SELECT * FROM messages WHERE conv_id = ? AND id > ? ORDER BY id ASC LIMIT 100', [$cid, $after]);
    } else {
        $r = rows('SELECT * FROM messages WHERE conv_id = ? ORDER BY id DESC LIMIT 51', [$cid]);
        $hasMore = count($r) > 50;
        $r = array_reverse(array_slice($r, 0, 50));
    }
    if ($before === 0) {
        run('UPDATE conversation_members SET last_read_id = (SELECT COALESCE(MAX(id), 0) FROM messages WHERE conv_id = ?) WHERE conv_id = ? AND user_id = ?', [$cid, $cid, $meId]);
    }

    $uids = array_values(array_unique(array_filter(array_map(fn($m) => $m['user_id'] === null ? 0 : (int) $m['user_id'], $r))));
    $users = [];
    if ($uids) {
        foreach (rows('SELECT * FROM users WHERE id IN (' . marks(count($uids)) . ')', $uids) as $x) $users[(string) $x['id']] = user_card($x);
    }
    $planIds = array_values(array_unique(array_filter(array_map(fn($m) => $m['plan_id'] === null ? 0 : (int) $m['plan_id'], $r))));
    $since = date('Y-m-d H:i:s', time() - 172800);
    $planRows = rows('SELECT * FROM plans WHERE conv_id = ? AND starts_at >= ?', [$cid, $since]);
    $have = array_map(fn($p) => (int) $p['id'], $planRows);
    $missing = array_values(array_diff($planIds, $have));
    if ($missing) $planRows = array_merge($planRows, rows('SELECT * FROM plans WHERE id IN (' . marks(count($missing)) . ')', $missing));

    return ['messages' => array_map('msg_out', $r), 'users' => $users, 'plans' => build_plans($planRows, $meId), 'has_more' => $hasMore];
}

function h_msg_send(array $in): array
{
    $u = me();
    $meId = (int) $u['id'];
    $cid = (int) ($in['conv_id'] ?? 0);
    $c = need_member($cid, $meId);
    $body = text($in, 'body', 1000);
    if ($body === '') respond_error('Pesan kosong.');
    if ($c['type'] === 'dm' && !are_friends($meId, dm_other_id($cid, $meId))) {
        respond_error('Kalian sudah tidak berteman, jadi chat ini ditutup.', 403);
    }
    $id = add_message($cid, $meId, 'text', $body);
    run('UPDATE conversation_members SET last_read_id = ? WHERE conv_id = ? AND user_id = ?', [$id, $cid, $meId]);
    return msg_out(row('SELECT * FROM messages WHERE id = ?', [$id]));
}

function h_room_sync(array $in): array
{
    $u = me();
    $meId = (int) $u['id'];
    $cid = (int) ($in['conv_id'] ?? 0);
    $c = need_member($cid, $meId);
    if ($c['type'] === 'dm' && !are_friends($meId, dm_other_id($cid, $meId))) respond_error('Kalian sudah tidak berteman.', 403);
    $x = max(-7.0, min(7.0, (float) ($in['x'] ?? 0)));
    $z = max(-7.0, min(7.0, (float) ($in['z'] ?? 0)));
    $ry = max(-7.0, min(7.0, (float) ($in['ry'] ?? 0)));
    $emote = text($in, 'emote', 10);
    if (!in_array($emote, ['wave', 'dance', 'jump'], true)) $emote = '';
    $nowMs = (int) (microtime(true) * 1000);
    if (scalar('SELECT 1 FROM room_presence WHERE conv_id = ? AND user_id = ?', [$cid, $meId])) {
        run('UPDATE room_presence SET x = ?, z = ?, ry = ?, updated_at = ? WHERE conv_id = ? AND user_id = ?', [$x, $z, $ry, now(), $cid, $meId]);
        if ($emote !== '') run('UPDATE room_presence SET emote = ?, emote_at = ? WHERE conv_id = ? AND user_id = ?', [$emote, $nowMs, $cid, $meId]);
    } else {
        insert('room_presence', ['conv_id' => $cid, 'user_id' => $meId, 'x' => $x, 'z' => $z, 'ry' => $ry, 'emote' => $emote, 'emote_at' => $emote === '' ? 0 : $nowMs, 'updated_at' => now()]);
    }
    $peers = [];
    $since = date('Y-m-d H:i:s', time() - 12);
    foreach (rows('SELECT p.*, u.nickname, u.avatar FROM room_presence p JOIN users u ON u.id = p.user_id
                   WHERE p.conv_id = ? AND p.user_id <> ? AND p.updated_at >= ?', [$cid, $meId, $since]) as $r) {
        $peers[] = ['id' => (int) $r['user_id'], 'name' => $r['nickname'], 'avatar' => avatar_clean($r['avatar']),
                    'x' => (float) $r['x'], 'z' => (float) $r['z'], 'ry' => (float) $r['ry'],
                    'emote' => ((int) $r['emote_at'] >= $nowMs - 3500) ? $r['emote'] : '', 'emote_at' => (int) $r['emote_at']];
    }
    $out = h_msg_list(['conv_id' => $cid, 'after_id' => (int) ($in['after_id'] ?? 0)]);
    $out['peers'] = $peers;
    return $out;
}

function h_room_leave(array $in): array
{
    $u = me();
    run('DELETE FROM room_presence WHERE conv_id = ? AND user_id = ?', [(int) ($in['conv_id'] ?? 0), (int) $u['id']]);
    return [];
}
