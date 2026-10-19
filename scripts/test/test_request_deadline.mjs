import test from 'node:test';
import assert from 'node:assert/strict';
import { withDeadline } from '../shared/request-deadline.mjs';
test('successful request returns its confirmed result', async () => {
    assert.deepEqual(await withDeadline(() => Promise.resolve({ success: true }), 100, 'timeout'), { success: true });
});
test('failed request remains a failure', async () => {
    await assert.rejects(withDeadline(() => Promise.reject(new Error('Sai mật khẩu hiện tại')), 100, 'timeout'), /Sai mật khẩu/);
});
test('stalled request releases the waiting UI', async () => {
    await assert.rejects(withDeadline(() => new Promise(() => {}), 10, 'Chưa xác nhận được kết quả'), /Chưa xác nhận/);
});
