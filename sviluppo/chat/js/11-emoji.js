/* ======================= EMOJI, STICKER DI FOSS, GIF ======================= */
const EMOJI = [
  ['😀', 'Faccine', '😀 😃 😄 😁 😆 😅 🤣 😂 🙂 🙃 🫠 😉 😊 😇 🥰 😍 🤩 😘 😗 ☺️ 😚 😙 🥲 😋 😛 😜 🤪 😝 🤑 🤗 🤭 🫢 🫣 🤫 🤔 🫡 🤐 🤨 😐 😑 😶 🫥 😏 😒 🙄 😬 😮‍💨 🤥 🫨 😌 😔 😪 🤤 😴 😷 🤒 🤕 🤢 🤮 🤧 🥵 🥶 🥴 😵 😵‍💫 🤯 🤠 🥳 🥸 😎 🤓 🧐 😕 🫤 😟 🙁 ☹️ 😮 😯 😲 😳 🥺 🥹 😦 😧 😨 😰 😥 😢 😭 😱 😖 😣 😞 😓 😩 😫 🥱 😤 😡 😠 🤬 😈 👿 💀 ☠️ 💩 🤡 👹 👺 👻 👽 👾 🤖 😺 😸 😹 😻 😼 😽 🙀 😿 😾'],
  ['👋', 'Persone e gesti', '👋 🤚 🖐️ ✋ 🖖 🫱 🫲 🫳 🫴 👌 🤌 🤏 ✌️ 🤞 🫰 🤟 🤘 🤙 👈 👉 👆 🖕 👇 ☝️ 🫵 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 🫶 👐 🤲 🤝 🙏 ✍️ 💅 🤳 💪 🦾 🧠 🫀 👀 👁️ 👅 👄 🫦 👶 🧒 👦 👧 🧑 👱 👨 🧔 👩 🧓 👴 👵 🙍 🙎 🙅 🙆 💁 🙋 🧏 🙇 🤦 🤷 👨‍💻 👩‍💻 🧑‍💻 👨‍🎨 👩‍🎨 🧑‍🎤 👨‍🍳 👩‍🍳 🕵️ 💂 🥷 👷 🤴 👸 🦸 🦹 🧙 🧚 🧛 🧜 🧝 💃 🕺 👯 🧖 🚶 🏃 👫 👭 👬 💏 💑 👪'],
  ['🐶', 'Animali e natura', '🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐻‍❄️ 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🙈 🙉 🙊 🐔 🐧 🐦 🐤 🦆 🦅 🦉 🦇 🐺 🐗 🐴 🦄 🐝 🪱 🐛 🦋 🐌 🐞 🐜 🪲 🐢 🐍 🦎 🐙 🦑 🦐 🦀 🐡 🐠 🐟 🐬 🐳 🐋 🦈 🐊 🐅 🐆 🦓 🦍 🐘 🦛 🦏 🐪 🦒 🦘 🐃 🐂 🐄 🐎 🐖 🐏 🐑 🐐 🦌 🐕 🐩 🐈 🐓 🦃 🦚 🦜 🦢 🕊️ 🐇 🦝 🦨 🦡 🦦 🦥 🐁 🐿️ 🦔 🌵 🎄 🌲 🌳 🌴 🌱 🌿 ☘️ 🍀 🍃 🍂 🍁 🍄 🌾 💐 🌷 🌹 🥀 🌺 🌸 🌼 🌻 🌞 🌝 🌚 🌙 ⭐ 🌟 ✨ ⚡ 🔥 🌈 ☀️ ⛅ ☁️ 🌧️ ⛈️ ❄️ ☃️ 🌊 💧'],
  ['🍕', 'Cibo e bevande', '🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍈 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🍆 🥑 🥦 🥬 🥒 🌶️ 🫑 🌽 🥕 🧄 🧅 🥔 🍠 🥐 🥯 🍞 🥖 🥨 🧀 🥚 🍳 🧈 🥞 🧇 🥓 🥩 🍗 🍖 🌭 🍔 🍟 🍕 🫓 🥪 🥙 🧆 🌮 🌯 🫔 🥗 🥘 🫕 🍝 🍜 🍲 🍛 🍣 🍱 🥟 🍤 🍙 🍚 🍘 🍥 🥠 🥮 🍢 🍡 🍧 🍨 🍦 🥧 🧁 🍰 🎂 🍮 🍭 🍬 🍫 🍿 🍩 🍪 🌰 🥜 🍯 🥛 🍼 ☕ 🫖 🍵 🧃 🥤 🧋 🍶 🍺 🍻 🥂 🍷 🥃 🍸 🍹 🧉 🍾 🧊'],
  ['⚽', 'Attività', '⚽ 🏀 🏈 ⚾ 🥎 🎾 🏐 🏉 🥏 🎱 🪀 🏓 🏸 🏒 🏑 🥍 🏏 🪃 🥅 ⛳ 🪁 🏹 🎣 🤿 🥊 🥋 🎽 🛹 🛼 🛷 ⛸️ 🥌 🎿 ⛷️ 🏂 🪂 🏋️ 🤸 ⛹️ 🤺 🤾 🏌️ 🏇 🧘 🏄 🏊 🤽 🚣 🧗 🚵 🚴 🏆 🥇 🥈 🥉 🏅 🎖️ 🎗️ 🎫 🎟️ 🎪 🤹 🎭 🩰 🎨 🎬 🎤 🎧 🎼 🎹 🥁 🪘 🎷 🎺 🪗 🎸 🪕 🎻 🎲 ♟️ 🎯 🎳 🎮 🎰 🧩'],
  ['🚗', 'Viaggi e luoghi', '🚗 🚕 🚙 🚌 🚎 🏎️ 🚓 🚑 🚒 🚐 🛻 🚚 🚛 🚜 🛵 🏍️ 🛺 🚲 🛴 🚨 🚔 🚍 🚘 🚖 🚡 🚠 🚟 🚃 🚋 🚞 🚝 🚄 🚅 🚈 🚂 🚆 🚇 🚊 🚉 ✈️ 🛫 🛬 🛩️ 💺 🛰️ 🚀 🛸 🚁 🛶 ⛵ 🚤 🛥️ 🛳️ ⛴️ 🚢 ⚓ 🪝 ⛽ 🚧 🚦 🚥 🗺️ 🗿 🗽 🗼 🏰 🏯 🏟️ 🎡 🎢 🎠 ⛲ ⛱️ 🏖️ 🏝️ 🏜️ 🌋 ⛰️ 🏔️ 🗻 🏕️ ⛺ 🏠 🏡 🏘️ 🏚️ 🏗️ 🏭 🏢 🏬 🏣 🏤 🏥 🏦 🏨 🏪 🏫 🏩 💒 🏛️ ⛪ 🕌 🕍 🛕 🕋 ⛩️ 🌅 🌄 🌠 🎇 🎆 🌇 🌆 🏙️ 🌃 🌌 🌉 🌁'],
  ['💡', 'Oggetti', '⌚ 📱 📲 💻 ⌨️ 🖥️ 🖨️ 🖱️ 🖲️ 🕹️ 🗜️ 💽 💾 💿 📀 📼 📷 📸 📹 🎥 📽️ 🎞️ 📞 ☎️ 📟 📠 📺 📻 🎙️ 🎚️ 🎛️ 🧭 ⏱️ ⏲️ ⏰ 🕰️ ⌛ ⏳ 📡 🔋 🪫 🔌 💡 🔦 🕯️ 🧯 🛢️ 💸 💵 💴 💶 💷 🪙 💰 💳 💎 ⚖️ 🪜 🧰 🪛 🔧 🔨 ⚒️ 🛠️ ⛏️ 🪚 🔩 ⚙️ 🪤 🧱 ⛓️ 🧲 🔫 💣 🧨 🪓 🔪 🗡️ ⚔️ 🛡️ 🚬 ⚰️ 🔮 📿 🧿 💈 ⚗️ 🔭 🔬 🕳️ 🩹 🩺 💊 💉 🩸 🧬 🦠 🧫 🧪 🌡️ 🧹 🧺 🧻 🚽 🚰 🚿 🛁 🧼 🪥 🪒 🧽 🪣 🧴 🛎️ 🔑 🗝️ 🚪 🪑 🛋️ 🛏️ 🧸 🪆 🖼️ 🪞 🪟 🛍️ 🛒 🎁 🎈 🎏 🎀 🪄 🪅 🎊 🎉 🎎 🏮 🎐 🧧 ✉️ 📩 📨 📧 💌 📥 📤 📦 🏷️ 📪 📫 📬 📭 📮 📯 📜 📃 📄 📑 🧾 📊 📈 📉 🗒️ 🗓️ 📆 📅 🗑️ 📇 🗃️ 🗳️ 🗄️ 📋 📁 📂 🗂️ 🗞️ 📰 📓 📔 📒 📕 📗 📘 📙 📚 📖 🔖 🧷 🔗 📎 🖇️ 📐 📏 🧮 📌 📍 ✂️ 🖊️ 🖋️ ✒️ 🖌️ 🖍️ 📝 ✏️ 🔍 🔎 🔏 🔐 🔒 🔓'],
  ['❤️', 'Simboli', '❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❤️‍🔥 ❤️‍🩹 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 ☮️ ✝️ ☪️ 🕉️ ☸️ ✡️ 🔯 🕎 ☯️ ☦️ 🛐 ⛎ ♈ ♉ ♊ ♋ ♌ ♍ ♎ ♏ ♐ ♑ ♒ ♓ 🆔 ⚛️ 🉑 ☢️ ☣️ 📴 📳 🈶 🈚 🈸 🈺 🈷️ ✴️ 🆚 💮 🉐 ㊙️ ㊗️ 🈴 🈵 🈹 🈲 🅰️ 🅱️ 🆎 🆑 🅾️ 🆘 ❌ ⭕ 🛑 ⛔ 📛 🚫 💯 💢 ♨️ 🚷 🚯 🚳 🚱 🔞 📵 🚭 ❗ ❕ ❓ ❔ ‼️ ⁉️ 🔅 🔆 〽️ ⚠️ 🚸 🔱 ⚜️ 🔰 ♻️ ✅ 🈯 💹 ❇️ ✳️ ❎ 🌐 💠 Ⓜ️ 🌀 💤 🏧 🚾 ♿ 🅿️ 🛗 🈳 🈂️ 🛂 🛃 🛄 🛅 🚹 🚺 🚼 ⚧️ 🚻 🚮 🎦 📶 🈁 🔣 ℹ️ 🔤 🔡 🔠 🆖 🆗 🆙 🆒 🆕 🆓 0️⃣ 1️⃣ 2️⃣ 3️⃣ 4️⃣ 5️⃣ 6️⃣ 7️⃣ 8️⃣ 9️⃣ 🔟 🔢 #️⃣ *️⃣ ▶️ ⏸️ ⏯️ ⏹️ ⏺️ ⏭️ ⏮️ ⏩ ⏪ ⏫ ⏬ ◀️ 🔼 🔽 ➡️ ⬅️ ⬆️ ⬇️ ↗️ ↘️ ↙️ ↖️ ↕️ ↔️ ↪️ ↩️ ⤴️ ⤵️ 🔀 🔁 🔂 🔄 🔃 🎵 🎶 ➕ ➖ ➗ ✖️ 🟰 ♾️ 💲 💱 ™️ ©️ ®️ 〰️ ➰ ➿ 🔚 🔙 🔛 🔝 🔜 ✔️ ☑️ 🔘 🔴 🟠 🟡 🟢 🔵 🟣 ⚫ ⚪ 🟤 🔺 🔻 🔸 🔹 🔶 🔷 🔳 🔲 ▪️ ▫️ ◾ ◽ ◼️ ◻️ 🟥 🟧 🟨 🟩 🟦 🟪 ⬛ ⬜ 🟫 🔈 🔇 🔉 🔊 🔔 🔕 📣 📢 💬 💭 🗯️ ♠️ ♣️ ♥️ ♦️ 🃏 🎴 🀄'],
  ['🇮🇹', 'Bandiere', '🏁 🚩 🎌 🏴 🏳️ 🏳️‍🌈 🏴‍☠️ 🇮🇹 🇸🇲 🇻🇦 🇪🇺 🇫🇷 🇩🇪 🇪🇸 🇵🇹 🇬🇧 🇮🇪 🇨🇭 🇦🇹 🇧🇪 🇳🇱 🇱🇺 🇩🇰 🇸🇪 🇳🇴 🇫🇮 🇮🇸 🇵🇱 🇨🇿 🇸🇰 🇭🇺 🇷🇴 🇧🇬 🇬🇷 🇭🇷 🇸🇮 🇦🇱 🇺🇦 🇹🇷 🇺🇸 🇨🇦 🇲🇽 🇧🇷 🇦🇷 🇨🇱 🇨🇴 🇵🇪 🇯🇵 🇰🇷 🇨🇳 🇮🇳 🇦🇺 🇳🇿 🇿🇦 🇪🇬 🇲🇦 🇹🇳 🇳🇬 🇮🇱 🇦🇪 🇸🇦'],
];
const RECENTI_BASE = ['👍','❤️','😂','🙏','😍','🔥','👏','😊','🎬','✅'];
function recenti(){ return (memoria('emoji_recenti') || RECENTI_BASE).slice(0, 32); }
function usaEmoji(e){ const r = recenti().filter(x => x !== e); r.unshift(e); memoria('emoji_recenti', r.slice(0, 32)); }

/* ---------- gli sticker di FOSS: la Goccia, mascotte di FOSS ---------- */
const GOCCIA = 'M256 64C330 160 392 232 392 306a136 136 0 0 1-272 0C120 232 182 160 256 64z';
function faccia(tipo){
  const occhi = {
    felice: '<ellipse cx="208" cy="300" rx="15" ry="20" fill="#1b1b1b"/><ellipse cx="304" cy="300" rx="15" ry="20" fill="#1b1b1b"/><circle cx="213" cy="293" r="5" fill="#fff"/><circle cx="309" cy="293" r="5" fill="#fff"/>',
    ride: '<path d="M188 302q20-24 40 0M284 302q20-24 40 0" stroke="#1b1b1b" stroke-width="11" fill="none" stroke-linecap="round"/>',
    chiusi: '<path d="M188 300q20 14 40 0M284 300q20 14 40 0" stroke="#1b1b1b" stroke-width="10" fill="none" stroke-linecap="round"/>',
    occhiolino: '<ellipse cx="208" cy="300" rx="15" ry="20" fill="#1b1b1b"/><circle cx="213" cy="293" r="5" fill="#fff"/><path d="M284 302q20-16 40 0" stroke="#1b1b1b" stroke-width="10" fill="none" stroke-linecap="round"/>',
    cuori: '<path d="M208 318s-26-15-26-32a13 13 0 0 1 26-4 13 13 0 0 1 26 4c0 17-26 32-26 32zM304 318s-26-15-26-32a13 13 0 0 1 26-4 13 13 0 0 1 26 4c0 17-26 32-26 32z" fill="#ff2d55"/>',
    stupito: '<circle cx="208" cy="298" r="19" fill="#fff" stroke="#1b1b1b" stroke-width="7"/><circle cx="304" cy="298" r="19" fill="#fff" stroke="#1b1b1b" stroke-width="7"/><circle cx="208" cy="300" r="8" fill="#1b1b1b"/><circle cx="304" cy="300" r="8" fill="#1b1b1b"/>',
    arrabbiato: '<ellipse cx="208" cy="306" rx="14" ry="17" fill="#1b1b1b"/><ellipse cx="304" cy="306" rx="14" ry="17" fill="#1b1b1b"/><path d="M182 270l46 18M330 270l-46 18" stroke="#1b1b1b" stroke-width="11" stroke-linecap="round"/>',
    occhiali: '<path d="M170 286h172" stroke="#1b1b1b" stroke-width="9"/><rect x="172" y="282" width="72" height="44" rx="16" fill="#1b1b1b"/><rect x="268" y="282" width="72" height="44" rx="16" fill="#1b1b1b"/><path d="M184 292l18 0" stroke="#666" stroke-width="5" stroke-linecap="round"/><path d="M280 292l18 0" stroke="#666" stroke-width="5" stroke-linecap="round"/>',
  }[tipo.o];
  const bocca = {
    sorriso: '<path d="M222 352q34 30 68 0" stroke="#1b1b1b" stroke-width="10" fill="none" stroke-linecap="round"/>',
    aperta: '<path d="M214 344q42 0 84 0q-4 44-42 44t-42-44z" fill="#7a1c1c"/><path d="M232 372q24 16 48 0" fill="#ff7a8a"/>',
    o: '<ellipse cx="256" cy="362" rx="16" ry="20" fill="#7a1c1c"/>',
    triste: '<path d="M224 372q32-26 64 0" stroke="#1b1b1b" stroke-width="10" fill="none" stroke-linecap="round"/>',
    piatta: '<path d="M230 360h52" stroke="#1b1b1b" stroke-width="10" stroke-linecap="round"/>',
    lingua: '<path d="M222 350q34 26 68 0" stroke="#1b1b1b" stroke-width="10" fill="none" stroke-linecap="round"/><path d="M262 360q22 0 18 26q-4 16-20 8q-10-8 2-34z" fill="#ff6b81"/>',
  }[tipo.b];
  return occhi + bocca + '<ellipse cx="180" cy="340" rx="18" ry="11" fill="#ff8a5c" opacity=".45"/><ellipse cx="332" cy="340" rx="18" ry="11" fill="#ff8a5c" opacity=".45"/>';
}
function stickerSvg(o){
  const corpo = '<path d="'+GOCCIA+'" fill="#FFAD01"/><path d="M190 150q-30 50-38 110" stroke="#ffd36b" stroke-width="16" fill="none" stroke-linecap="round" opacity=".8"/>' + faccia(o);
  const testo = o.t ? '<text x="256" y="'+(o.ty || 466)+'" text-anchor="middle" font-family="Arial Black, Arial, Helvetica, sans-serif" font-weight="900" font-size="'+Math.round((o.fs || 64) * .92)+'" '+
    'fill="'+(o.tc || '#0D1926')+'" stroke="#fff" stroke-width="18" stroke-linejoin="round" paint-order="stroke" transform="rotate('+(o.r || -3)+' 256 450)">'+o.t+'</text>' : '';
  const sagoma = '<g stroke="#fff" stroke-width="30" stroke-linejoin="round" fill="#fff"><path d="'+GOCCIA+'"/>'+(o.extraSagoma || '')+'</g>';
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><g transform="translate(26 4) scale(.9)"><g filter="url(#o)">'+sagoma+corpo+(o.extra || '')+'</g></g>'+testo+
    '<defs><filter id="o" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity=".25"/></filter></defs></svg>';
}
const CIAK = '<g transform="translate(300 330) rotate(-12)"><rect x="0" y="22" width="150" height="100" rx="10" fill="#1b1b1b"/><path d="M0 22l8-34 150 0-8 34z" fill="#1b1b1b"/>'+
  '<path d="M26-12l-12 34M62-12l-12 34M98-12l-12 34M134-12l-12 34" stroke="#fff" stroke-width="12"/><rect x="16" y="50" width="118" height="8" rx="4" fill="#fff" opacity=".8"/><rect x="16" y="76" width="80" height="8" rx="4" fill="#fff" opacity=".8"/></g>';
const TAZZA = '<g transform="translate(318 352)"><path d="M0 0h104v60a42 42 0 0 1-42 42h-20a42 42 0 0 1-42-42z" fill="#fff" stroke="#1b1b1b" stroke-width="9"/><path d="M104 18h14a22 22 0 0 1 0 44h-14" fill="none" stroke="#1b1b1b" stroke-width="9"/>'+
  '<path d="M24-20q-10-16 0-30M52-20q-10-16 0-30M80-20q-10-16 0-30" stroke="#9aa" stroke-width="7" fill="none" stroke-linecap="round"/><rect x="10" y="12" width="84" height="16" fill="#7b4a2b"/></g>';
const SPUNTA = '<g transform="translate(340 120)"><circle cx="50" cy="50" r="58" fill="#25d366" stroke="#fff" stroke-width="12"/><path d="M22 52l20 20 38-42" stroke="#fff" stroke-width="16" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>';
const CUORI = '<path d="M408 140s-36-21-36-45a18 18 0 0 1 36-6 18 18 0 0 1 36 6c0 24-36 45-36 45zM96 200s-26-15-26-32a13 13 0 0 1 26-4 13 13 0 0 1 26 4c0 17-26 32-26 32z" fill="#ff2d55" stroke="#fff" stroke-width="8"/>';
const OROLOGIO = '<g transform="translate(340 108)"><circle cx="56" cy="56" r="56" fill="#fff" stroke="#1b1b1b" stroke-width="10"/><path d="M56 22v36l24 14" stroke="#ff3b30" stroke-width="10" fill="none" stroke-linecap="round"/></g>';
const STELLE = '<g fill="#ffd23f" stroke="#fff" stroke-width="8" stroke-linejoin="round"><path d="M410 70l14 30 32 4-24 22 6 32-28-16-28 16 6-32-24-22 32-4z"/><path d="M90 150l9 19 20 3-15 14 4 20-18-10-18 10 4-20-15-14 20-3z"/></g>';
const BARRA = '<g transform="translate(96 140)"><rect x="0" y="0" width="320" height="40" rx="20" fill="#1b1b1b" stroke="#fff" stroke-width="10"/><rect x="10" y="10" width="190" height="20" rx="10" fill="#25d366"/></g>';
const LUNA = '<g transform="translate(350 70)"><path d="M70 10a60 60 0 1 0 40 96 50 50 0 1 1-40-96z" fill="#ffd23f" stroke="#fff" stroke-width="10"/><text x="-40" y="40" font-family="Arial Black,sans-serif" font-size="40" font-weight="900" fill="#7f66ff" stroke="#fff" stroke-width="8" paint-order="stroke">z</text><text x="-80" y="0" font-family="Arial Black,sans-serif" font-size="30" font-weight="900" fill="#7f66ff" stroke="#fff" stroke-width="7" paint-order="stroke">z</text></g>';
const MANO = '<g transform="translate(360 210) rotate(18)"><rect x="0" y="40" width="70" height="80" rx="30" fill="#FFAD01" stroke="#fff" stroke-width="10"/><rect x="2" y="0" width="16" height="70" rx="8" fill="#FFAD01" stroke="#fff" stroke-width="6"/><rect x="20" y="-10" width="16" height="70" rx="8" fill="#FFAD01" stroke="#fff" stroke-width="6"/><rect x="38" y="-6" width="16" height="70" rx="8" fill="#FFAD01" stroke="#fff" stroke-width="6"/><rect x="56" y="6" width="14" height="60" rx="7" fill="#FFAD01" stroke="#fff" stroke-width="6"/></g>';
const POLLICE = '<g transform="translate(340 260)"><rect x="0" y="44" width="96" height="80" rx="22" fill="#FFAD01" stroke="#fff" stroke-width="10"/><rect x="34" y="-14" width="30" height="80" rx="15" fill="#FFAD01" stroke="#fff" stroke-width="8"/><path d="M12 72h60M12 96h60" stroke="#c98500" stroke-width="6" stroke-linecap="round"/></g>';
const STICKER_FOSS = {
  ok: {o: 'occhiolino', b: 'sorriso', t: 'OK!', extra: POLLICE},
  grazie: {o: 'cuori', b: 'sorriso', t: 'Grazie!', extra: CUORI},
  sigira: {o: 'occhiali', b: 'sorriso', t: 'Si gira!', extra: CIAK, fs: 60},
  consegnato: {o: 'felice', b: 'aperta', t: 'Consegnato!', extra: SPUNTA, fs: 54},
  caffe: {o: 'chiusi', b: 'sorriso', t: 'Pausa caffè', extra: TAZZA, fs: 52},
  arrivo: {o: 'stupito', b: 'o', t: 'Arrivo!', extra: OROLOGIO},
  top: {o: 'felice', b: 'lingua', t: 'Top!', extra: STELLE, fs: 74},
  ahah: {o: 'ride', b: 'aperta', t: 'AHAHAH', tc: '#ff2d55', fs: 62},
  ciao: {o: 'felice', b: 'sorriso', t: 'Ciao!', extra: MANO},
  render: {o: 'stupito', b: 'piatta', t: 'Render…', extra: BARRA, fs: 60},
  notte: {o: 'chiusi', b: 'piatta', t: 'Buonanotte', extra: LUNA, fs: 52, tc: '#2b3a67'},
  no: {o: 'arrabbiato', b: 'triste', t: 'NO!', tc: '#ff3b30', fs: 80},
};
const cacheSticker = {};
function stickerFoss(nome){
  if(cacheSticker[nome]) return cacheSticker[nome];
  const o = STICKER_FOSS[nome] || STICKER_FOSS.ok;
  return (cacheSticker[nome] = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(stickerSvg(o)));
}

/* ---------- il pannello emoji / GIF / sticker ---------- */
let pannelloEmojiAperto = false, pannelloEmojiScheda = 'emoji', emojiCat = 0;
function alternaPannelloEmoji(){ if(pannelloEmojiAperto) chiudiPannelloEmoji(); else apriPannelloEmoji(pannelloEmojiScheda); }
function chiudiPannelloEmoji(){ pannelloEmojiAperto = false; const p = el('pannelloEmoji'); if(p){ p.className = ''; p.innerHTML = ''; } const b = el('emojiB'); if(b) b.classList.remove('attivo'); }
function apriPannelloEmoji(scheda){
  pannelloEmojiAperto = true; pannelloEmojiScheda = scheda || 'emoji';
  const p = el('pannelloEmoji'); if(!p) return;
  p.className = 'pannello-emoji';
  const b = el('emojiB'); if(b) b.classList.add('attivo');
  const sch = '<div class="pe-schede">'+[['emoji','Emoji'],['gif','GIF'],['sticker','Sticker']].map(x =>
    '<button class="pe-scheda'+(pannelloEmojiScheda === x[0] ? ' on' : '')+'" data-pe="'+x[0]+'">'+x[1]+'</button>').join('')+'</div>';
  let corpo = '';
  if(pannelloEmojiScheda === 'emoji'){
    corpo = '<div class="pe-cat">'+['🕘'].concat(EMOJI.map(x => x[0])).map((e, i) => '<button class="'+(emojiCat === i ? 'on' : '')+'" data-cat="'+i+'" title="'+(i ? EMOJI[i - 1][1] : 'Recenti')+'">'+e+'</button>').join('')+'</div>'+
      '<div class="pe-corpo" id="peCorpo"><div class="pe-tit">'+(emojiCat ? EMOJI[emojiCat - 1][1] : 'Usate di recente')+'</div><div class="pe-griglia">'+
      (emojiCat ? EMOJI[emojiCat - 1][2].split(' ') : recenti()).map(e => '<button data-emo="'+e+'">'+e+'</button>').join('')+'</div></div>';
  } else if(pannelloEmojiScheda === 'gif'){
    corpo = '<div class="pe-cerca">'+svg('cerca', 2)+'<input id="gifQ" type="search" enterkeyhint="search" autocomplete="off" placeholder="Cerca GIF" value="'+esc(GIFW.q)+'"></div>'+
      '<div class="pe-corpo" id="gifCorpo">'+corpoGif()+'</div>';
  } else {
    corpo = '<div class="pe-corpo"><div class="pe-griglia stk">'+
      '<button class="nuovo-stk" data-a="nuovo-sticker">'+svg('foto', 1.8)+'Da una foto</button>'+
      '<button class="nuovo-stk" data-a="sticker-disegno">'+svg('disegno', 1.8)+'Disegnalo</button>'+
      S.sticker.map(x => '<button data-racc="'+x.id+'"><img data-path="'+esc(x.path)+'" alt="Sticker"></button>').join('')+'</div>'+
      '<div class="pe-tit">La Goccia di FOSS</div><div class="pe-griglia stk">'+
      Object.keys(STICKER_FOSS).map(k => '<button data-foss="'+k+'"><img src="'+stickerFoss(k)+'" alt="'+k+'"></button>').join('')+'</div></div>';
  }
  p.innerHTML = sch + corpo;
  $$('[data-path]', p).forEach(async n => { n.src = await urlFirmata(n.dataset.path); });
  if(pannelloEmojiScheda === 'gif') avviaGif(p);
  p.onclick = e => {
    const s = e.target.closest('[data-pe]'); if(s){ apriPannelloEmoji(s.dataset.pe); return; }
    const c = e.target.closest('[data-cat]'); if(c){ emojiCat = +c.dataset.cat; apriPannelloEmoji('emoji'); return; }
    const em = e.target.closest('[data-emo]'); if(em){ inserisci(em.dataset.emo); usaEmoji(em.dataset.emo); return; }
    const f = e.target.closest('[data-foss]'); if(f){ mandaStickerFoss(f.dataset.foss); return; }
    const g = e.target.closest('[data-giphy]'); if(g){ const x = GIFW.lista.find(z => z.id === g.dataset.giphy); if(x) mandaGiphy(x); return; }
    if(e.target.closest('[data-a="gif-riprova"]')){ GIFW.err = ''; GIFW.lista = []; GIFW.fine = false; cercaGif(); return; }
    const r = e.target.closest('[data-racc]'); if(r){ const x = S.sticker.concat(S.gif).find(z => z.id === r.dataset.racc); if(x) mandaDaRaccolta(x); return; }
  };
}
/* ---------- GIF: tendenze e ricerca (GIPHY, tramite la funzione «gif») ---------- */
const GIFW = {q: '', lista: [], off: 0, fine: false, carica: false, err: '', giro: 0};
function corpoGif(){
  let h = '';
  if(!GIFW.q && S.gif.length) h += '<div class="pe-tit">Le tue GIF</div><div class="pe-griglia stk gif">'+
    S.gif.map(x => '<button data-racc="'+x.id+'">'+(/\.mp4$/.test(x.path) ? '<video data-path="'+esc(x.path)+'" muted loop playsinline autoplay></video>' : '<img data-path="'+esc(x.path)+'" alt="GIF">')+'</button>').join('')+'</div>';
  h += '<div class="pe-tit">'+(GIFW.q ? 'Risultati' : 'Di tendenza')+'</div><div class="gif-mosaico" id="gifMos">'+
    (GIFW.q ? '' : '<button class="nuovo-stk" data-a="importa-gif">'+svg('piu')+'Importa GIF</button>')+
    GIFW.lista.map(gifCella).join('')+'</div>';
  if(GIFW.err) h += '<div class="pe-vuoto">'+esc(GIFW.err)+(GIFW.err.indexOf('chiave') < 0 ? '<br><button class="tasto-link" data-a="gif-riprova">Riprova</button>' : '')+'</div>';
  else if(GIFW.carica || !GIFW.lista.length && !GIFW.fine) h += '<div class="gif-attesa"><span></span><span></span><span></span></div>';
  else if(!GIFW.lista.length) h += '<div class="pe-vuoto">Nessuna GIF per «'+esc(GIFW.q)+'».</div>';
  h += '<div class="gif-giphy">Powered by GIPHY</div>';
  return h;
}
function gifCella(x){
  return '<button data-giphy="'+esc(x.id)+'" title="'+esc(x.titolo || 'GIF')+'" style="aspect-ratio:'+(x.w || 200)+'/'+(x.h || 200)+'"><img src="'+esc(x.anteprima)+'" alt="'+esc(x.titolo || 'GIF')+'" loading="lazy" decoding="async"></button>';
}
function avviaGif(p){
  const q = el('gifQ'), C = el('gifCorpo'); if(!q || !C) return;
  let t = 0;
  q.oninput = () => { clearTimeout(t); t = setTimeout(() => { const v = q.value.trim(); if(v === GIFW.q) return; GIFW.q = v; GIFW.lista = []; GIFW.off = 0; GIFW.fine = false; GIFW.err = ''; ridisegnaGif(); cercaGif(); }, 350); };
  q.onkeydown = e => { if(e.key === 'Enter'){ e.preventDefault(); q.blur(); } };
  C.onscroll = () => { if(C.scrollTop + C.clientHeight > C.scrollHeight - 300) cercaGif(); };
  if(!GIFW.lista.length && !GIFW.fine) cercaGif();
}
function ridisegnaGif(){
  const C = el('gifCorpo'); if(!C) return;
  const top = C.scrollTop; C.innerHTML = corpoGif(); C.scrollTop = top;
  $$('[data-path]', C).forEach(async n => { n.src = await urlFirmata(n.dataset.path); });
}
async function cercaGif(){
  if(GIFW.carica || GIFW.fine || GIFW.err) return;
  GIFW.carica = true; const giro = ++GIFW.giro, q = GIFW.q;
  try{
    const {data, error} = await sb.functions.invoke('gif', {body: {q, offset: GIFW.off}});
    if(giro !== GIFW.giro || q !== GIFW.q) return;
    if(error) throw error;
    if(data && data.errore === 'chiave'){ GIFW.err = 'La ricerca delle GIF non è ancora attiva: manca la chiave di GIPHY.'; }
    else if(!data || data.errore) throw new Error('gif');
    else{
      const visti = new Set(GIFW.lista.map(x => x.id));
      const nuove = (data.lista || []).filter(x => !visti.has(x.id));
      GIFW.lista = GIFW.lista.concat(nuove); GIFW.off = data.prossimo || GIFW.off + 24; GIFW.fine = !!data.fine || !nuove.length;
    }
  }catch(e){ if(giro === GIFW.giro) GIFW.err = navigator.onLine ? 'Non riesco a caricare le GIF.' : 'Sei offline.'; }
  finally{ if(giro === GIFW.giro){ GIFW.carica = false; ridisegnaGif(); } }
}
async function mandaGiphy(x){
  if(!S.aperta) return;
  /* l'indirizzo pulito di GIPHY (senza «?...»): e' quello che il database accetta */
  const url = /^[A-Za-z0-9]{1,40}$/.test(x.id || '') ? 'https://media.giphy.com/media/' + x.id + '/giphy.mp4' : String(x.mp4 || '').split('?')[0];
  const m = nuovoLocale('video', {media: {gif: true, url, w: x.w || 200, h: x.h || 200, giphy: x.id}});
  if(S.risposta){ S.risposta = null; disegnaScrivi(); } mettiInLista(m); suono('invio');
  if(tocco()) chiudiPannelloEmoji();
  try{ await salvaMessaggio(m); }catch(e){ m._stato = 'errore'; ridisegnaMessaggio(m.id); errore(e, 'GIF non inviata'); }
}
function inserisci(t){
  const i = el('testoIn'); if(!i) return;
  const a = i.selectionStart != null ? i.selectionStart : i.value.length, b = i.selectionEnd != null ? i.selectionEnd : a;
  i.value = i.value.slice(0, a) + t + i.value.slice(b);
  const p = a + t.length; try{ i.setSelectionRange(p, p); }catch(e){}
  adatta(i); aggiornaTastoManda(); salvaBozzaPresto();
  if(!tocco()) i.focus();
}
/* scegliere un'emoji (reazioni, sticker) */
function sceltaEmoji(fatto){
  let cat = 0;
  const corpo = () => '<div class="pe-cat" style="margin:0 -14px">'+['🕘'].concat(EMOJI.map(x => x[0])).map((e, i) => '<button class="'+(cat === i ? 'on' : '')+'" data-cat="'+i+'">'+e+'</button>').join('')+'</div>'+
    '<div class="pe-griglia" style="margin-top:8px;max-height:46vh;overflow:auto">'+(cat ? EMOJI[cat - 1][2].split(' ') : recenti()).map(e => '<button data-emo="'+e+'">'+e+'</button>').join('')+'</div>';
  const v = foglio('Scegli un’emoji', corpo(), [['Annulla']]);
  const C = v.querySelector('.foglio-c');
  C.onclick = e => {
    const c = e.target.closest('[data-cat]'); if(c){ cat = +c.dataset.cat; C.innerHTML = corpo(); return; }
    const em = e.target.closest('[data-emo]'); if(em){ usaEmoji(em.dataset.emo); v.remove(); fatto(em.dataset.emo); }
  };
}
