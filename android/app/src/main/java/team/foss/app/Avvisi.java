package team.foss.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.os.Build;

import com.google.androidbrowserhelper.trusted.DelegationService;

/**
 * Gli avvisi del sito (web push: FOSS e FOSS.chat) mostrati dall'app.
 * Di serie arriverebbero su un canale «normale» (suono, ma niente comparsa in alto): qui vanno su un
 * canale ad alta importanza, come le app di messaggi: compaiono in alto, suonano e vibrano.
 * Un avviso che il sito manda «senza suono» resta muto (lo decide Chrome nella notifica stessa).
 * Suono e vibrazione si cambiano dalle impostazioni del telefono: App → FOSS → Notifiche → «Messaggi e avvisi».
 */
public class Avvisi extends DelegationService {
    private static final String CANALE = "foss_messaggi";

    @Override
    public boolean onNotifyNotificationWithChannel(String tag, int id, Notification n, String nomeCanale) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            // Android 7 e precedenti: l'importanza sta nella notifica
            if ((n.defaults & Notification.DEFAULT_SOUND) != 0 || n.sound != null) {
                n.priority = Notification.PRIORITY_HIGH;
                n.defaults |= Notification.DEFAULT_VIBRATE;
            }
            return super.onNotifyNotificationWithChannel(tag, id, n, nomeCanale);
        }
        try {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null || !nm.areNotificationsEnabled()) return false;
            NotificationChannel c = new NotificationChannel(CANALE, "Messaggi e avvisi", NotificationManager.IMPORTANCE_HIGH);
            c.setDescription("Messaggi della chat, task assegnate, scadenze");
            c.enableVibration(true);
            c.enableLights(true);
            c.setLockscreenVisibility(Notification.VISIBILITY_PRIVATE);
            nm.createNotificationChannel(c);
            NotificationChannel vero = nm.getNotificationChannel(CANALE);
            if (vero != null && vero.getImportance() == NotificationManager.IMPORTANCE_NONE) return false;
            Notification.Builder b = Notification.Builder.recoverBuilder(this, n);
            b.setChannelId(CANALE);
            nm.notify(tag, id, b.build());
            return true;
        } catch (RuntimeException e) {
            // qualunque imprevisto: l'avviso arriva comunque, nel modo di serie
            return super.onNotifyNotificationWithChannel(tag, id, n, nomeCanale);
        }
    }
}
