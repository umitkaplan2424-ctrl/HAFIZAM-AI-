package com.hafizam.ai;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.media.AudioManager;

public class SilentModeReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();

        if (AudioManager.RINGER_MODE_CHANGED_ACTION.equals(action)) {
            SilentModeHelper.checkAndScheduleSilentMode(context);
            return;
        }

        if (SilentModeHelper.ACTION_CHECKED.equals(action)) {
            SilentModeHelper.cancelSilentModeTracking(context);
            return;
        }

        if (SilentModeHelper.ACTION_SNOOZE_30.equals(action)) {
            SilentModeHelper.cancelNotification(context);
            SilentModeHelper.scheduleAlarm(context, 30 * 60 * 1000L);
            return;
        }

        if (SilentModeHelper.ACTION_SNOOZE_60.equals(action)) {
            SilentModeHelper.cancelNotification(context);
            SilentModeHelper.scheduleAlarm(context, 60 * 60 * 1000L);
            return;
        }

        if (SilentModeHelper.ACTION_TURN_OFF.equals(action)) {
            SilentModeHelper.cancelNotification(context);
            SilentModeHelper.turnOffSilentMode(context);
            return;
        }
    }
}
