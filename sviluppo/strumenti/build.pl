# Come sviluppo/chat/build.py (che vuole python3), ma in perl: ricostruisce chat.html dai sorgenti.
# Uso, dalla radice del progetto:  perl sviluppo/strumenti/build.pl sviluppo/chat chat.html
use strict; my $d = shift; my $out = shift;
sub leggi { local $/; open my $h, '<:raw', $_[0] or die $_[0]; my $c = <$h>; close $h; $c }
my @js = sort glob("$d/js/*.js");
my $s = leggi("$d/head.html") . leggi("$d/chat.css") . leggi("$d/body.html")
      . "(function(){\n" . join("\n", map { leggi($_) } @js) . "\n})();\n" . leggi("$d/fine.html");
open my $o, '>:raw', $out or die; print $o $s; close $o; print length($s), " byte -> $out\n";
