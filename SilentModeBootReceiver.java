package com.hafizam.ai;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class SilentModeBootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent != null && Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) {
            SilentModeHelper.checkAndScheduleSilentMode(context);
        }
    }
}
