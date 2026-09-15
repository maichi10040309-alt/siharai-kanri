import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
const crypto=webcrypto,enc=new TextEncoder(),dec=new TextDecoder();
const derive=async(password,salt)=>{const material=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:310000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt'])};
const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12)),key=await derive('correct-password',salt),source=JSON.stringify({accountNumber:'1234567',vendor:'テスト商事'}),cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,enc.encode(source));
assert.equal(Buffer.from(cipher).includes(Buffer.from('1234567')),false);
assert.equal(dec.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv},key,cipher)),source);
const wrong=await derive('wrong-password',salt);await assert.rejects(()=>crypto.subtle.decrypt({name:'AES-GCM',iv},wrong,cipher));
console.log('vault encryption tests: ok');
