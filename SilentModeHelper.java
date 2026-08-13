package com.hafizam.ai;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.media.AudioManager;
import android.os.Build;
import android.provider.Settings;
import android.widget.Toast;
import androidx.core.app.NotificationCompat;

public class SilentModeHelper {
    public static final String PREFS_NAME = "hafizam_silent_prefs";
    public static final String KEY_ENABLED = "silent_reminder_enabled";
    public static final String CHANNEL_ID = "hafizam_silent_mode_channel";
    public static final int NOTIFICATION_ID = 998811;
    public static final int ALARM_REQUEST_CODE = 998812;

    public static final String ACTION_CHECKED = "com.hafizam.ai.ACTION_SILENT_CHECKED";
    public static final String ACTION_SNOOZE_30 = "com.hafizam.ai.ACTION_SILENT_SNOOZE_30";
    public static final String ACTION_SNOOZE_60 = "com.hafizam.ai.ACTION_SILENT_SNOOZE_60";
    public static final String ACTION_TURN_OFF = "com.hafizam.ai.ACTION_SILENT_TURN_OFF";

    public static boolean isEnabled(Context context) {
        return true;
    }

    public static void setEnabled(Context context, boolean enabled) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putBoolean(KEY_ENABLED, enabled).apply();
    }

    public static boolean isSilentMode(Context context) {
        AudioManager am = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
        if (am == null) return false;
        int mode = am.getRingerMode();
        return mode == AudioManager.RINGER_MODE_SILENT || mode == AudioManager.RINGER_MODE_VIBRATE;
    }

    public static String getRingerModeString(Context context) {
        AudioManager am = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
        if (am == null) return "UNKNOWN";
        int mode = am.getRingerMode();
        switch (mode) {
            case AudioManager.RINGER_MODE_SILENT: return "SILENT";
            case AudioManager.RINGER_MODE_VIBRATE: return "VIBRATE";
            case AudioManager.RINGER_MODE_NORMAL: return "NORMAL";
            default: return "UNKNOWN";
        }
    }

    public static void checkAndScheduleSilentMode(Context context) {
        if (!isEnabled(context)) {
            cancelSilentModeTracking(context);
            return;
        }

        if (isSilentMode(context)) {
            scheduleAlarm(context, DEFAULT_DELAY_MS);
        } else {
            cancelSilentModeTracking(context);
        }
    }

    public static void scheduleAlarm(Context context, long delayMillis) {
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;

        Intent intent = new Intent(context, SilentModeAlarmReceiver.class);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }

        PendingIntent pi = PendingIntent.getBroadcast(context, ALARM_REQUEST_CODE, intent, flags);
        long triggerAt = System.currentTimeMillis() + delayMillis;

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi);
            } else {
                am.set(AlarmManager.RTC_WAKEUP, triggerAt, pi);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public static void cancelAlarm(Context context) {
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;

        Intent intent = new Intent(context, SilentModeAlarmReceiver.class);
        int flags = PendingIntent.FLAG_NO_CREATE;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }

        PendingIntent pi = PendingIntent.getBroadcast(context, ALARM_REQUEST_CODE, intent, flags);
        if (pi != null) {
            am.cancel(pi);
            pi.cancel();
        }
    }

    public static void cancelNotification(Context context) {
        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) {
            nm.cancel(NOTIFICATION_ID);
        }
    }

    public static void cancelSilentModeTracking(Context context) {
        cancelAlarm(context);
        cancelNotification(context);
    }

    public static void showNotification(Context context) {
        if (!isEnabled(context) || !isSilentMode(context)) {
            return;
        }

        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Sessiz Mod Hatırlatıcısı",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Telefonunuz uzun süre sessizde kaldığında uyarı verir.");
            nm.createNotificationChannel(channel);
        }

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }

        Intent checkedIntent = new Intent(context, SilentModeReceiver.class);
        checkedIntent.setAction(ACTION_CHECKED);
        PendingIntent piChecked = PendingIntent.getBroadcast(context, 101, checkedIntent, flags);

        Intent snooze30Intent = new Intent(context, SilentModeReceiver.class);
        snooze30Intent.setAction(ACTION_SNOOZE_30);
        PendingIntent piSnooze30 = PendingIntent.getBroadcast(context, 102, snooze30Intent, flags);

        Intent snooze60Intent = new Intent(context, SilentModeReceiver.class);
        snooze60Intent.setAction(ACTION_SNOOZE_60);
        PendingIntent piSnooze60 = PendingIntent.getBroadcast(context, 103, snooze60Intent, flags);

        Intent turnOffIntent = new Intent(context, SilentModeReceiver.class);
        turnOffIntent.setAction(ACTION_TURN_OFF);
        PendingIntent piTurnOff = PendingIntent.getBroadcast(context, 104, turnOffIntent, flags);

        Intent mainIntent = new Intent(context, MainActivity.class);
        mainIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent piMain = PendingIntent.getActivity(context, 100, mainIntent, flags);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_lock_silent_mode)
            .setContentTitle("Sessiz Mod Hatırlatıcısı")
            .setContentText("Telefonun hâlâ sessizde. Aramalarını kaçırmamak için telefonunu kontrol et.")
            .setStyle(new NotificationCompat.BigTextStyle().bigText("Telefonun hâlâ sessizde. Aramalarını kaçırmamak için telefonunu kontrol et."))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(piMain)
            .addAction(0, "Kontrol Ettim", piChecked)
            .addAction(0, "30 dk Ertele", piSnooze30)
            .addAction(0, "1 Saat Ertele", piSnooze60);

        nm.notify(NOTIFICATION_ID, builder.build());
    }

    public static boolean turnOffSilentMode(Context context) {
        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        AudioManager am = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
        if (am == null) return false;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (nm != null && !nm.isNotificationPolicyAccessGranted()) {
                try {
                    Toast.makeText(context, "Sessiz modu kapatmak için Rahatsız Etmeyin izni gereklidir.", Toast.LENGTH_LONG).show();
                    Intent settingsIntent = new Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS);
                    settingsIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(settingsIntent);
                } catch (Exception e) {
                    e.printStackTrace();
                }
                return false;
            }
        }

        try {
            am.setRingerMode(AudioManager.RINGER_MODE_NORMAL);
            cancelSilentModeTracking(context);
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }
}
