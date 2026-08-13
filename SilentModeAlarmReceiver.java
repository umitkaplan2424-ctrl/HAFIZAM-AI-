package com.hafizam.ai;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class SilentModeAlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (SilentModeHelper.isEnabled(context) && SilentModeHelper.isSilentMode(context)) {
            SilentModeHelper.showNotification(context);
        }
    }
}
