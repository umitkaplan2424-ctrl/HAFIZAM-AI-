package com.hafizam.ai;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "SilentModePlugin")
public class SilentModePlugin extends Plugin {

    @PluginMethod
    public void isEnabled(PluginCall call) {
        boolean enabled = SilentModeHelper.isEnabled(getContext());
        JSObject ret = new JSObject();
        ret.put("enabled", enabled);
        call.resolve(ret);
    }

    @PluginMethod
    public void setEnabled(PluginCall call) {
        Boolean enabled = call.getBoolean("enabled", true);
        boolean val = enabled != null ? enabled : true;
        SilentModeHelper.setEnabled(getContext(), val);

        if (val) {
            SilentModeHelper.checkAndScheduleSilentMode(getContext());
        } else {
            SilentModeHelper.cancelSilentModeTracking(getContext());
        }

        JSObject ret = new JSObject();
        ret.put("enabled", val);
        call.resolve(ret);
    }

    @PluginMethod
    public void checkRingerMode(PluginCall call) {
        String mode = SilentModeHelper.getRingerModeString(getContext());
        boolean isSilent = SilentModeHelper.isSilentMode(getContext());
        JSObject ret = new JSObject();
        ret.put("ringerMode", mode);
        ret.put("isSilent", isSilent);
        call.resolve(ret);
    }
}
