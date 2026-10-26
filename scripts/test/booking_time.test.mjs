import test from 'node:test';
import assert from 'node:assert/strict';
import {vietnamDateTimeInput,parseVietnamDateTimeInput} from '../shared/booking-time.mjs';

test('Vietnam wall clock maps to fixed UTC instant across midnight and year boundaries',()=>{
    for(const [wall,utc]of [
        ['2031-04-02T10:00','2031-04-02T03:00:00.000Z'],
        ['2031-01-01T00:30','2030-12-31T17:30:00.000Z'],
        ['2028-02-29T23:59','2028-02-29T16:59:00.000Z']
    ]){
        assert.equal(parseVietnamDateTimeInput(wall)?.toISOString(),utc);
        assert.equal(vietnamDateTimeInput(utc),wall);
    }
});

test('invalid calendar dates, overflow times and unzoned input shapes are rejected',()=>{
    for(const value of ['',null,undefined,'2031-02-29T10:00','2031-04-31T10:00','2031-13-01T10:00','2031-04-02T24:00','2031-04-02T10:60','2031-04-02','2031-04-02T10:00Z'])assert.equal(parseVietnamDateTimeInput(value),null);
    assert.equal(vietnamDateTimeInput('invalid'),'');
});
