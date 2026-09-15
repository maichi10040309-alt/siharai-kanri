import assert from 'node:assert/strict';import {buildZengin,encodeJis,toHalfWidth} from '../zengin.js';
assert.equal(toHalfWidth('カブシキガイシャＡＢＣ'),'ｶﾌﾞｼｷｶﾞｲｼｬABC');
assert.deepEqual(encodeJis('ｷﾖｳ').bytes,[0xb7,0xd6,0xb3]);
const result=buildZengin({settings:{clientCode:'1234567890',clientName:'ｶﾌﾞｼｷｶﾞｲｼﾔ ABC',originBranchCode:'123',originBranchName:'ﾎﾝﾃﾝ',originAccountType:'1',originAccountNumber:'1234567'},transferDate:'2026-09-30',transfers:[{amount:123456,ediInfo:'A001',vendor:{name:'テスト',bankCode:'0001',bankName:'ﾐｽﾞﾎ',branchCode:'001',branchName:'ﾎﾝﾃﾝ',accountType:'1',accountNumber:'7654321',recipientName:'ｶ)ﾃｽﾄ'}}]});
assert.deepEqual(result.errors,[]);assert.equal(result.rows.length,4);assert.ok(result.rows.every(r=>r.length===120));assert.equal(result.bytes.length,486);assert.equal(String.fromCharCode(...result.rows[2].slice(1,7)),'000001');assert.equal(String.fromCharCode(...result.rows[2].slice(7,19)),'000000123456');console.log('zengin tests: ok');
