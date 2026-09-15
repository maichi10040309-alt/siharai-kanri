const kanaMap={
  '。':'｡','「':'｢','」':'｣','、':'､','・':'･','ヲ':'ｦ','ァ':'ｧ','ィ':'ｨ','ゥ':'ｩ','ェ':'ｪ','ォ':'ｫ','ャ':'ｬ','ュ':'ｭ','ョ':'ｮ','ッ':'ｯ','ー':'ｰ','ア':'ｱ','イ':'ｲ','ウ':'ｳ','エ':'ｴ','オ':'ｵ','カ':'ｶ','キ':'ｷ','ク':'ｸ','ケ':'ｹ','コ':'ｺ','サ':'ｻ','シ':'ｼ','ス':'ｽ','セ':'ｾ','ソ':'ｿ','タ':'ﾀ','チ':'ﾁ','ツ':'ﾂ','テ':'ﾃ','ト':'ﾄ','ナ':'ﾅ','ニ':'ﾆ','ヌ':'ﾇ','ネ':'ﾈ','ノ':'ﾉ','ハ':'ﾊ','ヒ':'ﾋ','フ':'ﾌ','ヘ':'ﾍ','ホ':'ﾎ','マ':'ﾏ','ミ':'ﾐ','ム':'ﾑ','メ':'ﾒ','モ':'ﾓ','ヤ':'ﾔ','ユ':'ﾕ','ヨ':'ﾖ','ラ':'ﾗ','リ':'ﾘ','ル':'ﾙ','レ':'ﾚ','ロ':'ﾛ','ワ':'ﾜ','ン':'ﾝ','゛':'ﾞ','゜':'ﾟ',
  'ガ':'ｶﾞ','ギ':'ｷﾞ','グ':'ｸﾞ','ゲ':'ｹﾞ','ゴ':'ｺﾞ','ザ':'ｻﾞ','ジ':'ｼﾞ','ズ':'ｽﾞ','ゼ':'ｾﾞ','ゾ':'ｿﾞ','ダ':'ﾀﾞ','ヂ':'ﾁﾞ','ヅ':'ﾂﾞ','デ':'ﾃﾞ','ド':'ﾄﾞ','バ':'ﾊﾞ','ビ':'ﾋﾞ','ブ':'ﾌﾞ','ベ':'ﾍﾞ','ボ':'ﾎﾞ','パ':'ﾊﾟ','ピ':'ﾋﾟ','プ':'ﾌﾟ','ペ':'ﾍﾟ','ポ':'ﾎﾟ','ヴ':'ｳﾞ'
};

export function toHalfWidth(value=''){
  return String(value).trim().toUpperCase().replace(/[Ａ-Ｚａ-ｚ０-９]/g,c=>String.fromCharCode(c.charCodeAt(0)-0xFEE0)).replace(/[（）［］｛｝／：．，－＆]/g,c=>({'（':'(','）':')','［':'[','］':']','｛':'{','｝':'}','／':'/','：':':','．':'.','，':',','－':'-','＆':'&'}[c])).replace(/[ァ-ヺ、。「」・ー゛゜]/g,c=>kanaMap[c]??c).replace(/　/g,' ');
}

export function encodeJis(value=''){
  const normalized=toHalfWidth(value); const bytes=[]; const unsupported=[];
  for(const ch of normalized){const code=ch.charCodeAt(0);if(code>=0x20&&code<=0x7e)bytes.push(code);else if(code>=0xff61&&code<=0xff9f)bytes.push(code-0xff61+0xa1);else unsupported.push(ch)}
  return {bytes,unsupported};
}

const numeric=(value,length)=>[...String(value??'').replace(/\D/g,'').slice(-length).padStart(length,'0')].map(c=>c.charCodeAt(0));
function chars(value,length,field,errors){const e=encodeJis(value);if(e.unsupported.length)errors.push(`${field}に使用できない文字があります: ${[...new Set(e.unsupported)].join('')}`);if(e.bytes.length>length)errors.push(`${field}が${length}バイトを超えています`);return [...e.bytes.slice(0,length),...Array(Math.max(0,length-e.bytes.length)).fill(0x20)]}
function record(parts){const bytes=parts.flat();if(bytes.length!==120)throw new Error(`レコード長が${bytes.length}バイトです`);return bytes}

export function buildZengin({settings,transferDate,transfers}){
  const errors=[];if(!/^\d{10}$/.test(settings.clientCode||''))errors.push('委託者コードは10桁で入力してください');if(!/^\d{3}$/.test(settings.originBranchCode||''))errors.push('振込元支店番号は3桁で入力してください');if(!/^\d{1,7}$/.test(settings.originAccountNumber||''))errors.push('振込元口座番号は7桁以内の数字で入力してください');if(!transferDate)errors.push('振込指定日を入力してください');if(!transfers.length)errors.push('出力対象の振込がありません');
  const mmdd=transferDate?transferDate.slice(5,7)+transferDate.slice(8,10):'0000';
  const rows=[record([[0x31],[0x32,0x31],[0x30],numeric(settings.clientCode,10),chars(settings.clientName,40,'振込依頼人名',errors),numeric(mmdd,4),[0x30,0x31,0x36,0x33],chars('ｷﾖｳ',15,'仕向銀行名',errors),numeric(settings.originBranchCode,3),chars(settings.originBranchName,15,'振込元支店名',errors),[Number(settings.originAccountType||1)+0x30],numeric(settings.originAccountNumber,7),Array(17).fill(0x20)])];
  let total=0;
  transfers.forEach((t,i)=>{const v=t.vendor;const amount=Math.trunc(Number(t.amount)||0);total+=amount;if(!/^\d{4}$/.test(v.bankCode||''))errors.push(`${v.name}: 銀行番号は4桁で入力してください`);if(!/^\d{3}$/.test(v.branchCode||''))errors.push(`${v.name}: 支店番号は3桁で入力してください`);if(!/^\d{1,7}$/.test(v.accountNumber||''))errors.push(`${v.name}: 口座番号を7桁以内で入力してください`);if(amount<1||amount>9999999999)errors.push(`${v.name}: 振込金額が範囲外です`);rows.push(record([[0x32],numeric(v.bankCode,4),chars(v.bankName,15,`${v.name} 銀行名`,errors),numeric(v.branchCode,3),chars(v.branchName,15,`${v.name} 支店名`,errors),[0x30,0x30,0x30,0x30],[Number(v.accountType||1)+0x30],numeric(v.accountNumber,7),chars(v.recipientName,30,`${v.name} 受取人名`,errors),numeric(amount,10),[0x30],chars(t.ediInfo||'',20,`${v.name} 顧客番号`,errors),[0x37],[0x20],Array(7).fill(0x20)]))});
  rows.push(record([[0x38],numeric(transfers.length,6),numeric(total,12),Array(101).fill(0x20)]));rows.push(record([[0x39],Array(119).fill(0x20)]));
  const crlf=[0x0d,0x0a];const bytes=new Uint8Array(rows.flatMap((r,i)=>i<rows.length-1?[...r,...crlf]:r));return {bytes,errors:[...new Set(errors)],recordCount:transfers.length,total,rows};
}
