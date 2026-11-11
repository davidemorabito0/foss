#!/bin/sh
# FOSS.chat — avvio sul NAS: il server dei media e il collegamento sicuro di Cloudflare
# nello stesso contenitore. CF puo' contenere il token da solo o tutto il comando copiato
# da Cloudflare: il token lo trovo io.
T=$(printf '%s' "$CF" | grep -oE 'eyJ[A-Za-z0-9_=-]+' | head -n1)
[ -n "$T" ] || { echo "Manca il token di Cloudflare (variabile CF)"; sleep 60; exit 1; }
wget -qO /tmp/server.mjs https://foss.team/nas/server.mjs || { echo "Non riesco a scaricare il server"; sleep 30; exit 1; }
if [ ! -x /data/.bin/cloudflared ]; then
  mkdir -p /data/.bin
  case "$(uname -m)" in aarch64|arm64) A=arm64 ;; *) A=amd64 ;; esac
  wget -qO /data/.bin/cloudflared.part "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-$A" \
    && chmod +x /data/.bin/cloudflared.part && mv /data/.bin/cloudflared.part /data/.bin/cloudflared \
    || { echo "Non riesco a scaricare cloudflared"; sleep 30; exit 1; }
fi
node /tmp/server.mjs & N=$!
/data/.bin/cloudflared tunnel --no-autoupdate run --token "$T" & C=$!
# se uno dei due si ferma, riparte tutto il contenitore
while kill -0 $N 2>/dev/null && kill -0 $C 2>/dev/null; do sleep 5; done
kill $N $C 2>/dev/null
exit 1
