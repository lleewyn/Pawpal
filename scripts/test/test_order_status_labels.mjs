import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeOrderStatus, getStatusLabel } from '../shared/order-status.mjs';

for (const [source, status, label] of [
    ['delivering', 'shipping', 'Đang giao'],
    ['cancelled', 'cancelled', 'Đã hủy'],
    ['returned', 'returned', 'Trả hàng']
]) {
    test(`${source} displays ${label}`, () => {
        for (const value of [source, source.toUpperCase(), ` ${source} `]) {
            assert.equal(normalizeOrderStatus(value), status);
            assert.equal(getStatusLabel(value), label);
        }
    });
}
