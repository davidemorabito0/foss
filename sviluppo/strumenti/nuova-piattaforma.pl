#!/usr/bin/perl
# Crea una piattaforma gemella di FOSS con un altro nome, un altro dominio e un altro database.
# Copia tutto il progetto in una cartella nuova e sostituisce nome, dominio, chiavi pubbliche, colore,
# dati legali e identificativi delle app. Il progetto di partenza non viene toccato.
#
# Uso, dalla radice del progetto FOSS:
#   perl sviluppo/strumenti/nuova-piattaforma.pl <file di impostazioni> <cartella nuova>
# Esempio:
#   cp sviluppo/strumenti/piattaforma-esempio.txt ~/Desktop/atelier.txt   (e lo compili)
#   perl sviluppo/strumenti/nuova-piattaforma.pl ~/Desktop/atelier.txt ~/Desktop/atelier
#
# Il file di impostazioni ha una riga per voce:  CHIAVE = valore   (le righe con # sono commenti).
# La guida completa è NUOVA-PIATTAFORMA.md.
use strict; use warnings;
use File::Find; use File::Path qw(make_path remove_tree); use File::Basename qw(dirname); use File::Copy qw(copy);

my ($cfgfile, $dest) = @ARGV;
die "uso: perl sviluppo/strumenti/nuova-piattaforma.pl <impostazioni.txt> <cartella nuova>\n" unless $cfgfile && $dest;
my $src = '.';
die "lancialo dalla radice del progetto FOSS (manca index.html)\n" unless -f "$src/index.html" && -d "$src/sviluppo/chat";
die "la cartella $dest esiste già: scegline una nuova\n" if -e $dest;

# ---------- impostazioni ----------
my %c;
open my $fh, '<:encoding(UTF-8)', $cfgfile or die "non leggo $cfgfile\n";
while (my $r = <$fh>) {
  next if $r =~ /^\s*(#|$)/;
  next unless $r =~ /^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/;
  $c{$1} = $2;
}
close $fh;
for my $k (qw(NOME DOMINIO)) { die "manca $k nelle impostazioni\n" unless defined $c{$k} && length $c{$k}; }
$c{NOME_CHAT}     ||= "$c{NOME}.chat";
# server dei media (come il NAS di FOSS): di serie nessuno, i file vanno su Supabase (fino a 50 MB l'uno)
$c{DOMINIO_MEDIA} ||= 'nessuno';
$c{SLUG}          ||= do { (my $s = lc $c{NOME}) =~ s/[^a-z0-9]+//g; $s };
$c{ID_APP}        ||= join('.', reverse split /\./, $c{DOMINIO}) . '.app';
die "NOME_CHAT non può contenere «FOSS»\n" if $c{NOME_CHAT} =~ /FOSS/;
die "COLORE deve essere tipo #3B82F6\n" if $c{COLORE} && $c{COLORE} !~ /^#[0-9A-Fa-f]{6}$/;
die "ID_APP deve essere tipo com.nome.app\n" unless $c{ID_APP} =~ /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){2,}$/;

# Senza database proprio la copia NON deve parlare col database di FOSS: le chiavi restano vuote e
# l'app parte in modalità locale, con i dati dimostrativi.
my $ref  = $c{SUPABASE_PROGETTO} // '';
my $key  = $c{SUPABASE_CHIAVE}   // '';
my $url  = $ref ? "https://$ref.supabase.co" : '';
my $vap  = $c{VAPID_PUBBLICA}    // '';

# ---------- colore principale e sue sfumature ----------
sub hex2rgb { my $h = shift; $h =~ s/#//; return map { hex } ($h =~ /(..)(..)(..)/); }
sub rgb2hex { return sprintf('#%02X%02X%02X', map { $_ < 0 ? 0 : $_ > 255 ? 255 : int($_ + .5) } @_); }
sub mescola { my ($a, $b, $t) = @_; my @a = hex2rgb($a); my @b = hex2rgb($b); return rgb2hex(map { $a[$_] * (1 - $t) + $b[$_] * $t } 0..2); }
my %colori;
if ($c{COLORE}) {
  my $col = uc $c{COLORE}; my @rgb = hex2rgb($col);
  my $lum = (0.2126 * $rgb[0] + 0.7152 * $rgb[1] + 0.0722 * $rgb[2]) / 255;
  %colori = (
    '#FFAD01' => $col,
    '#9A6A00' => mescola($col, '#000000', 0.40),   # inchiostro sui temi chiari
    '#3A2D0C' => mescola($col, '#1A1F23', 0.78),   # fondo tenue sui temi scuri
    '#FFF3D6' => mescola($col, '#FFFFFF', 0.85),   # fondo tenue sui temi chiari
    '#1A1305' => ($lum > 0.55 ? '#1A1305' : '#FFFFFF'),   # testo sopra il colore
    '#261900' => ($lum > 0.55 ? '#261900' : '#FFFFFF'),
  );
  $colori{'255,173,1'} = join(',', @rgb);
}

# ---------- cosa sostituire (l'ordine conta) ----------
my @sost = (
  ['https://suqpteanvnvvmfujlevi.supabase.co', $url],
  ['suqpteanvnvvmfujlevi', $ref || 'PROGETTO-SUPABASE-DA-IMPOSTARE'],
  ['sb_publishable_f5Kjp6NHT9yTxr1bhWJjhg_4y72V-Kj', $key],
  ['BNlGbW4nZrXmx8DioKxnl7ubULVOr5_6CAKvpuQYoiXeObmxYAzGU6UrkExx2zu1hACmtRNDcpoMh_ARQ0GSmlw', $vap],
  ($c{DOMINIO_MEDIA} eq 'nessuno' ? (["'https://media.foss.team'", "''"], ['media.foss.team', "media.$c{DOMINIO}"])
                                   : (['media.foss.team', $c{DOMINIO_MEDIA}])),
  ['foss.team', $c{DOMINIO}],
  ['team.foss.app', $c{ID_APP}],
  ['team/foss/app', join('/', split /\./, $c{ID_APP})],
  ['davidemorabito0/foss', $c{REPO} || 'utente/repository'],
  ['foss-guscio', "$c{SLUG}-guscio"],
);
$c{EMAIL} ||= "info\@$c{DOMINIO}";
push @sost, ['info@davidemorabito.com', $c{EMAIL}];
# dati legali: solo in privacy.html, termini.html e README.md (se mancano restano da compilare)
my @legali = (['Davide Morabito', $c{TITOLARE} || 'TITOLARE-DA-COMPILARE'],
              ['Via Berna 15, 20147 Milano (MI)', $c{INDIRIZZO} || 'INDIRIZZO-DA-COMPILARE'],
              ['03606720831', $c{PIVA} || 'PIVA-DA-COMPILARE']);
# NIENTE DATI DI PERSONE VERE nella copia: i nomi dei dati dimostrativi e delle prove diventano inventati
# (con le stesse iniziali, così avatar e prove restano coerenti) e l'email personale sparisce.
my @persone = (
  ['morabito1992@gmail.com', 'demo@example.com'], ['davidemorabito.com', $c{DOMINIO}], ['davidemorabito', 'dariomarchi'],
  ['Davide Morabito', 'Dario Marchi'], ['Susanna Giammona', 'Silvia Galli'], ['Guido Giannone', 'Giorgio Gatti'],
  ['Marco Del Borrello', 'Matteo Bassi'], ['Monica Mancini', 'Marta Moretti'], ['Nicolò Bandello', 'Nadia Bruni'],
  ['Francesco Olivieri', 'Filippo Orsi'], ['Del Latte', 'Donati'],
);
my @nomi = (['Davide', 'Dario'], ['Morabito', 'Marchi'], ['Monica', 'Marta'], ['Mancini', 'Moretti'],
            ['Antonio', 'Alberto'], ['Sergio', 'Stefano'], ['Pellino', 'Piras']);

# ---------- copia ----------
my @VIA = (qr{^\.git(/|$)}, qr{^desktop/src-tauri/target/}, qr{^desktop/src-tauri/gen/}, qr{(^|/)node_modules/},
           qr{(^|/)__pycache__/}, qr{(^|/)\.DS_Store$}, qr{^sviluppo/test/app/shot/}, qr{^android/\.gradle/},
           qr{^android/(app/)?build/}, qr{^\.well-known/assetlinks\.json$},
           # il diario tecnico di FOSS ha dettagli personali (casa, NAS, chiavi): non va nella copia
           qr{^sviluppo/FOSS-CHAT\.md$}, qr{^sviluppo/strumenti/piattaforma-esempio\.txt$}, qr{^BRIEF-NUOVA-CHAT\.md$},
           # gli strumenti per creare piattaforme gemelle restano solo in FOSS
           qr{^sviluppo/strumenti/nuova-piattaforma\.pl$}, qr{^NUOVA-PIATTAFORMA\.md$});
my $TESTO = qr{\.(html|js|mjs|ts|css|json|md|txt|yml|yaml|rs|toml|xml|gradle|properties|py|sql|sh|plist|svg|java|pl|conf)$|(^|/)(_headers|robots\.txt|Dockerfile)$};
my ($nf, $nt) = (0, 0);
find({ no_chdir => 1, wanted => sub {
  return unless -f $_ && ! -l $_;
  (my $p = $_) =~ s{^\Q$src\E/}{};
  return if grep { $p =~ $_ } @VIA;
  my $q = $p; $q =~ s{team/foss/app}{join('/', split /\./, $c{ID_APP})}e;
  my $out = "$dest/$q"; make_path(dirname($out));
  if ($p =~ $TESTO) {
    open my $i, '<:raw', $_ or die; local $/; my $t = <$i>; close $i;
    for my $s (@sost) { my ($a, $b) = @$s; $t =~ s/\Q$a\E/$b/g; }
    if ($p =~ m{^(privacy|termini)\.html$|^README\.md$}) { for my $s (@legali) { my ($a, $b) = @$s; $t =~ s/\Q$a\E/$b/g; } }
    for my $s (@persone) { my ($a, $b) = @$s; $t =~ s/\Q$a\E/$b/g; }
    for my $s (@nomi) { my ($a, $b) = @$s; $t =~ s/(?<![A-Za-z0-9_])\Q$a\E(?![A-Za-z0-9_])/$b/g; }
    $t =~ s/FOSS\.chat/$c{NOME_CHAT}/g;
    $t =~ s/(?<![A-Za-z0-9_])FOSS(?![A-Za-z0-9_])/$c{NOME}/g;
    for my $k (keys %colori) { my $v = $colori{$k}; $t =~ s/\Q$k\E/$v/gi; }
    open my $o, '>:raw', $out or die; print $o $t; close $o; $nt++;
  } else { copy($_, $out) or die "copia di $p: $!"; }
  chmod((stat $_)[2] & 07777, $out); $nf++;
}}, $src);

# ---------- la chat si ricostruisce dai sorgenti già rinominati ----------
system('perl', "$dest/sviluppo/strumenti/build.pl", "$dest/sviluppo/chat", "$dest/chat.html") == 0 or die "costruzione della chat non riuscita\n";

# ---------- cosa resta ----------
my $resto = 0;
find({ no_chdir => 1, wanted => sub {
  return unless -f $_ && $_ =~ /\.(html|js|json)$/ && $_ !~ m{/sviluppo/};
  open my $i, '<:raw', $_ or return; local $/; my $t = <$i>; close $i;
  $resto++ if $t =~ /suqpteanvnvvmfujlevi|foss\.team/;
}}, $dest);

print "\nCreata «$c{NOME}» in $dest: $nf file ($nt rinominati).\n";
print "  nome: $c{NOME}   chat: $c{NOME_CHAT}   dominio: $c{DOMINIO}   app: $c{ID_APP}\n";
print "  database: ", ($ref ? "https://$ref.supabase.co" : "NESSUNO (modalità locale con dati dimostrativi)"), "\n";
print "  colore: ", ($c{COLORE} || 'quello di FOSS'), "\n";
print "ATTENZIONE: $resto pagine contengono ancora il vecchio dominio o database\n" if $resto;
my @personali;
find({ no_chdir => 1, wanted => sub {
  return unless -f $_ && $_ =~ $TESTO;
  open my $i, '<:raw', $_ or return; local $/; my $t = <$i>; close $i;
  (my $p = $_) =~ s{^\Q$dest\E/}{};
  push @personali, $p if $t =~ /morabito|Pellino|Giammona|Giannone|Borrello|Bandello|Olivieri|192\.168\.\d+\.\d+/i;
}}, $dest);
print "ATTENZIONE: dati personali ancora presenti in: @personali\n" if @personali;
print "\nDa fare a mano (vedi NUOVA-PIATTAFORMA.md): logo e icone, database, segreti, dominio, app.\n";
