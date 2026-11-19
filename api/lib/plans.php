<?php
declare(strict_types=1);

function build_plans(array $planRows, int $me): array
{
    if (!$planRows) return [];
    $ids = array_map(fn($p) => (int) $p['id'], $planRows);
    $by = [];
    foreach (rows('SELECT r.plan_id, r.user_id, r.status, u.nickname FROM plan_rsvps r JOIN users u ON u.id = r.user_id WHERE r.plan_id IN (' . marks(count($ids)) . ') ORDER BY r.updated_at, r.user_id', $ids) as $r) {
        $by[(int) $r['plan_id']][] = $r;
    }
    $out = [];
    foreach ($planRows as $p) {
        $id = (int) $p['id'];
        $going = 0; $no = 0; $names = []; $mine = null;
        foreach ($by[$id] ?? [] as $r) {
            if ($r['status'] === 'going') {
                $going++;
                if (count($names) < 4) $names[] = $r['nickname'];
            } else {
                $no++;
            }
            if ((int) $r['user_id'] === $me) $mine = $r['status'];
        }
        $out[] = [
            'id' => $id, 'conv_id' => (int) $p['conv_id'], 'creator_id' => (int) $p['creator_id'], 'title' => $p['title'],
            'place_key' => $p['place_key'], 'place_name' => $p['place_name'], 'starts_at' => $p['starts_at'], 'note' => $p['note'],
            'going' => $going, 'no' => $no, 'going_names' => $names, 'mine' => $mine,
        ];
    }
    return $out;
}

function plan_fields(array $in): array
{
    $title = text($in, 'title', 60);
    $place = text($in, 'place_name', 60);
    if (mb_strlen($title) < 2) respond_error('Judul rencana minimal 2 huruf.');
    if (mb_strlen($place) < 2) respond_error('Isi nama tempatnya.');
    $dt = DateTime::createFromFormat('Y-m-d H:i:s', text($in, 'starts_at', 19), new DateTimeZone(cfg('timezone') ?: 'Asia/Jakarta'));
    if (!$dt) respond_error('Format tanggal atau jam salah.');
    if ($dt->getTimestamp() < time() - 300) respond_error('Waktunya sudah lewat. Pilih waktu yang akan datang.');
    return [
        'title' => $title, 'place_key' => text($in, 'place_key', 30), 'place_name' => $place,
        'starts_at' => $dt->format('Y-m-d H:i:s'), 'note' => text($in, 'note', 120),
    ];
}

function own_plan(array $in, int $meId): array
{
    $p = row('SELECT * FROM plans WHERE id = ?', [(int) ($in['plan_id'] ?? 0)]);
    if (!$p) respond_error('Rencana tidak ditemukan.', 404, 'NOTFOUND');
    need_member((int) $p['conv_id'], $meId);
    if ((int) $p['creator_id'] !== $meId) respond_error('Cuma pembuat rencana yang bisa mengubah atau menghapusnya.', 403, 'FORBIDDEN');
    return $p;
}

function h_plan_create(array $in): array
{
    $meId = (int) me()['id'];
    $cid = (int) ($in['conv_id'] ?? 0);
    $c = need_member($cid, $meId);
    $f = plan_fields($in);
    if ($c['type'] === 'dm' && !are_friends($meId, dm_other_id($cid, $meId))) respond_error('Kalian sudah tidak berteman.', 403);

    db()->beginTransaction();
    $pid = insert('plans', $f + ['conv_id' => $cid, 'creator_id' => $meId, 'created_at' => now()]);
    insert('plan_rsvps', ['plan_id' => $pid, 'user_id' => $meId, 'status' => 'going', 'updated_at' => now()]);
    add_message($cid, $meId, 'plan', $f['title'], $pid);
    db()->commit();
    return build_plans(rows('SELECT * FROM plans WHERE id = ?', [$pid]), $meId)[0];
}

function h_plan_update(array $in): array
{
    $meId = (int) me()['id'];
    $p = own_plan($in, $meId);
    $f = plan_fields($in);
    run('UPDATE plans SET title = ?, place_key = ?, place_name = ?, starts_at = ?, note = ? WHERE id = ?',
        [$f['title'], $f['place_key'], $f['place_name'], $f['starts_at'], $f['note'], $p['id']]);
    return build_plans(rows('SELECT * FROM plans WHERE id = ?', [$p['id']]), $meId)[0];
}

function h_plan_delete(array $in): array
{
    $p = own_plan($in, (int) me()['id']);
    db()->beginTransaction();
    run('DELETE FROM messages WHERE plan_id = ?', [$p['id']]);
    run('DELETE FROM plans WHERE id = ?', [$p['id']]);
    db()->commit();
    return ['deleted' => (int) $p['id']];
}

function h_plan_list(array $in): array
{
    $u = me();
    $meId = (int) $u['id'];
    $since = date('Y-m-d H:i:s', time() - 3 * 3600);
    $pr = rows('SELECT p.* FROM plans p JOIN conversation_members cm ON cm.conv_id = p.conv_id AND cm.user_id = ?
                WHERE p.starts_at >= ? ORDER BY p.starts_at ASC LIMIT 50', [$meId, $since]);
    $plans = build_plans($pr, $meId);
    $names = [];
    foreach (build_convs(array_values(array_unique(array_column($plans, 'conv_id'))), $meId) as $c) $names[$c['id']] = $c['name'];
    foreach ($plans as &$p) $p['conv_name'] = $names[$p['conv_id']] ?? '';
    return ['plans' => $plans];
}

function h_plan_rsvp(array $in): array
{
    $u = me();
    $meId = (int) $u['id'];
    $pid = (int) ($in['plan_id'] ?? 0);
    $p = row('SELECT * FROM plans WHERE id = ?', [$pid]);
    if (!$p) respond_error('Rencana tidak ditemukan.', 404);
    need_member((int) $p['conv_id'], $meId);
    $st = $in['status'] ?? '';
    if (!in_array($st, ['going', 'no', 'none'], true)) respond_error('Status tidak valid.');
    $has = scalar('SELECT 1 FROM plan_rsvps WHERE plan_id = ? AND user_id = ?', [$pid, $meId]);
    if ($st === 'none') {
        run('DELETE FROM plan_rsvps WHERE plan_id = ? AND user_id = ?', [$pid, $meId]);
    } elseif ($has) {
        run('UPDATE plan_rsvps SET status = ?, updated_at = ? WHERE plan_id = ? AND user_id = ?', [$st, now(), $pid, $meId]);
    } else {
        insert('plan_rsvps', ['plan_id' => $pid, 'user_id' => $meId, 'status' => $st, 'updated_at' => now()]);
    }
    return build_plans([$p], $meId)[0];
}
