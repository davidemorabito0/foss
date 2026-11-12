// La mail della super notifica di FOSS.chat: stessa grafica delle altre mail di FOSS.
const F = 'Helvetica,Arial,sans-serif';
export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function iniziali(n) {
  const p = String(n || '').trim().split(/\s+/).filter(Boolean);
  return ((p[0] || '?')[0] + (p[1] ? p[1][0] : '')).toUpperCase();
}
/* d: {chi, foto, chat, testo, allegato, quando, url} */
export function corpoMail(d) {
  const primo = String(d.chi || 'Qualcuno').split(' ')[0];
  const foto = /^https:\/\//.test(d.foto || '') ? d.foto : '';
  const corpo = (d.testo ? esc(d.testo).replace(/\n/g, '<br>') : '') +
    (d.allegato ? `${d.testo ? '<br><br>' : ''}<span style="color:#8A9BB4">Ti ha mandato ${esc(d.allegato)}: aprilo nella chat.</span>` : '');
  return `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"><title>${esc(primo)} ti ha scritto</title>
<style>@media (max-width:600px){.fx-pad{padding:26px 20px 24px 22px!important}.fx-h1{font-size:26px!important}}</style></head>
<body style="margin:0;padding:0;background:#07111F">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(String(d.testo || d.allegato || '').slice(0, 110))}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#07111F;background-image:radial-gradient(ellipse at 50% 0%,#0F2240 0%,#07111F 60%)"><tr><td align="center" style="padding:30px 12px 40px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px">
 <tr><td align="center" style="padding:0 0 22px">
  <table role="presentation" cellpadding="0" cellspacing="0"><tr>
   <td style="width:34px;height:34px;border-radius:9px;background:#FFAD01;text-align:center;font:800 19px/34px ${F};color:#0D1926">F</td>
   <td style="padding-left:11px;font:800 20px ${F};letter-spacing:.06em;color:#FFFFFF">FOSS.chat</td></tr></table>
 </td></tr>
 <tr><td style="border-radius:18px;background:#0E1D33;background-image:linear-gradient(160deg,#13253F 0%,#0C1A2E 55%,#0B1729 100%);border:1px solid #1E3150">
 <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
  <td width="4" style="width:4px;border-radius:18px 0 0 18px;background:#FFAD01"></td>
  <td class="fx-pad" style="padding:30px 32px 26px 30px">
   <div style="font:800 11px ${F};letter-spacing:.2em;color:#FFAD01;text-transform:uppercase">Super notifica &nbsp;·&nbsp; Importante</div>
   <h1 class="fx-h1" style="margin:12px 0 0;font:800 30px/1.15 ${F};color:#FFFFFF;letter-spacing:-.02em">${esc(primo)} <span style="color:#FFAD01">ti ha scritto</span></h1>
   <p style="margin:10px 0 0;font:400 15px/1.5 ${F};color:#B9C6D9">${d.chat ? `Nel gruppo <b style="color:#FFFFFF">${esc(d.chat)}</b> su FOSS.chat.` : 'In una chat privata su FOSS.chat.'} Ha voluto che lo leggessi subito.</p>
   <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0"><tr>
    <td width="60" valign="top" style="width:60px">${foto
      ? `<img src="${esc(foto)}" width="48" height="48" alt="" style="display:block;width:48px;height:48px;border-radius:50%;object-fit:cover;border:0">`
      : `<div style="width:48px;height:48px;border-radius:50%;background:#FFAD01;color:#0D1926;font:800 17px/48px ${F};text-align:center">${esc(iniziali(d.chi))}</div>`}</td>
    <td valign="top">
     <div style="font:700 15px ${F};color:#FFFFFF">${esc(d.chi)} <span style="font-weight:400;color:#7F90AA">&nbsp;${esc(d.quando)}</span></div>
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:9px"><tr>
      <td width="4" style="width:4px;background:#FFAD01;border-radius:3px"></td>
      <td style="background:#0A1628;border-radius:0 12px 12px 0;padding:14px 18px;font:400 16px/1.6 ${F};color:#E6ECF5">${corpo}</td>
     </tr></table>
    </td></tr></table>
   <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0 0"><tr><td align="center">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:12px;background:#FFAD01">
     <a href="${esc(d.url)}" style="display:inline-block;padding:17px 46px;font:800 17px ${F};color:#0D1926;text-decoration:none;border-radius:12px">Rispondi in chat &rarr;</a></td></tr></table>
    <p style="margin:16px 0 0;font:400 13px/1.55 ${F};color:#8A9BB4">Il link apre la chat direttamente.</p>
   </td></tr></table>
  </td></tr></table>
 </td></tr>
 <tr><td style="padding:22px 10px 0;text-align:center;font:400 12px/1.6 ${F};color:#5E6F88">
  Ricevi questa email perché ${esc(primo)} ha mandato una super notifica alla chat.<br>I messaggi normali restano solo dentro FOSS.chat.</td></tr>
</table></td></tr></table></body></html>`;
}
export function testoSemplice(d) {
  return `${d.chi} ti ha scritto su FOSS.chat${d.chat ? ' nel gruppo «' + d.chat + '»' : ''}:\n\n` +
    `${d.testo || ''}${d.allegato ? (d.testo ? '\n\n' : '') + 'Ti ha mandato ' + d.allegato + ': aprilo nella chat.' : ''}\n\n` +
    `Rispondi in chat: ${d.url}\n\nRicevi questa email perché è una super notifica.`;
}
