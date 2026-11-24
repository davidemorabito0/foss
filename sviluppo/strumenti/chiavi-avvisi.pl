#!/usr/bin/perl
# Crea una coppia di chiavi VAPID per gli avvisi push di una piattaforma nuova (serve solo openssl).
# Non scrive niente nel progetto: stampa a schermo le due parti.
#   - la PUBBLICA va nel file di impostazioni (VAPID_PUBBLICA) e finisce nel codice: è fatta per essere pubblica;
#   - la PRIVATA (il testo JSON) va SOLO nel Vault di Supabase, col nome indicato, e non va mai nel codice.
# Uso:  perl sviluppo/strumenti/chiavi-avvisi.pl [nome del segreto, di serie foss_vapid]
use strict; use warnings; use MIME::Base64 qw(encode_base64); use File::Temp qw(tempdir);
my $nome = shift || 'foss_vapid';
my $d = tempdir(CLEANUP => 1);
system("openssl ecparam -name prime256v1 -genkey -noout -out $d/k.pem 2>/dev/null") == 0 or die "openssl non riesce a creare la chiave\n";
my $txt = `openssl ec -in $d/k.pem -text -noout 2>/dev/null`;
my ($priv) = $txt =~ /priv:\s*([0-9a-f:\s]+?)\s*pub:/s or die "chiave non leggibile\n";
my ($pub)  = $txt =~ /pub:\s*([0-9a-f:\s]+?)\s*ASN1/s or die "chiave non leggibile\n";
s/[\s:]//g for $priv, $pub;
$priv = substr(('0' x 64) . $priv, -64);            # 32 byte esatti
die "chiave pubblica inattesa\n" unless length($pub) == 130 && $pub =~ /^04/;
sub b64u { my $b = encode_base64(pack('H*', shift), ''); $b =~ tr{+/}{-_}; $b =~ s/=+$//; return $b; }
my ($x, $y) = (substr($pub, 2, 64), substr($pub, 66, 64));
print "\nCHIAVE PUBBLICA (va nel file di impostazioni, voce VAPID_PUBBLICA):\n", b64u($pub), "\n";
print "\nCHIAVE PRIVATA (va SOLO nel Vault di Supabase. Nell'editor SQL del progetto nuovo:)\n";
printf "select vault.create_secret('{\"jwk\":{\"kty\":\"EC\",\"crv\":\"P-256\",\"x\":\"%s\",\"y\":\"%s\",\"d\":\"%s\"}}', '%s');\n\n",
  b64u($x), b64u($y), b64u($priv), $nome;
print "Non salvare la chiave privata in nessun file del progetto.\n";
