package com.hafizam.ai;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SilentModePlugin.class);
        super.onCreate(savedInstanceState);
        SilentModeHelper.checkAndScheduleSilentMode(this);
    }
}
