<?php
declare(strict_types=1);

require __DIR__ . '/lib/core.php';
require __DIR__ . '/lib/users.php';
require __DIR__ . '/lib/chat.php';
require __DIR__ . '/lib/plans.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

set_exception_handler(function (Throwable $e) {
    error_log('[solid] ' . $e);
    if (db_in_transaction()) db()->rollBack();
    respond_error(cfg('debug') ? $e->getMessage() : 'Server lagi bermasalah. Coba lagi sebentar.', 500, 'SERVER');
});

function db_in_transaction(): bool
{
    try { return db()->inTransaction(); } catch (Throwable $e) { return false; }
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') respond_error('Metode tidak diizinkan.', 405);
if (($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') !== 'solid') respond_error('Permintaan ditolak.', 403);

date_default_timezone_set(cfg('timezone') ?: 'Asia/Jakarta');
start_session();

$routes = [
    'register' => 'h_register', 'login' => 'h_login', 'logout' => 'h_logout', 'me' => 'h_me', 'profile_update' => 'h_profile_update',
    'search_users' => 'h_search_users', 'user_get' => 'h_user_get',
    'friend_request' => 'h_friend_request', 'friend_respond' => 'h_friend_respond', 'friend_remove' => 'h_friend_remove', 'friends_list' => 'h_friends_list',
    'overview' => 'h_overview', 'dm_open' => 'h_dm_open',
    'group_create' => 'h_group_create', 'group_join' => 'h_group_join', 'group_info' => 'h_group_info', 'group_add' => 'h_group_add', 'group_leave' => 'h_group_leave',
    'msg_list' => 'h_msg_list', 'msg_send' => 'h_msg_send', 'room_sync' => 'h_room_sync', 'room_leave' => 'h_room_leave',
    'plan_create' => 'h_plan_create', 'plan_update' => 'h_plan_update', 'plan_delete' => 'h_plan_delete', 'plan_list' => 'h_plan_list', 'plan_rsvp' => 'h_plan_rsvp',
];

$action = $_GET['action'] ?? '';
if (!isset($routes[$action])) respond_error('Aksi tidak dikenal.', 404);
respond(($routes[$action])(input()));
