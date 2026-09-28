package com.geotrackergv.app;

import android.Manifest;
import android.content.Intent;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "BackgroundLocation",
    permissions = {
        @Permission(
            alias = "location",
            strings = {
                Manifest.permission.ACCESS_COARSE_LOCATION,
                Manifest.permission.ACCESS_FINE_LOCATION
            }
        ),
        @Permission(
            alias = "notifications",
            strings = {
                Manifest.permission.POST_NOTIFICATIONS
            }
        )
    }
)
public class LocationPlugin extends Plugin {
    private static LocationPlugin instance;

    @Override
    public void load() {
        instance = this;
    }

    @PluginMethod
    public void startService(PluginCall call) {
        boolean hasLocation = androidx.core.content.ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_FINE_LOCATION) == android.content.pm.PackageManager.PERMISSION_GRANTED;
        
        if (!hasLocation) {
            requestAllPermissions(call, "permissionCallback");
        } else {
            doStartService(call);
        }
    }

    @PermissionCallback
    private void permissionCallback(PluginCall call) {
        boolean hasLocation = androidx.core.content.ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_FINE_LOCATION) == android.content.pm.PackageManager.PERMISSION_GRANTED;
        if (hasLocation) {
            doStartService(call);
        } else {
            call.reject("Permisiunea de locație a fost refuzată.");
        }
    }

    private void doStartService(PluginCall call) {
        try {
            Intent intent = new Intent(getContext(), LocationForegroundService.class);
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                getContext().startForegroundService(intent);
            } else {
                getContext().startService(intent);
            }
            call.resolve();
        } catch (Exception e) {
            e.printStackTrace();
            call.reject("A apărut o eroare la pornirea serviciului: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stopService(PluginCall call) {
        try {
            Intent intent = new Intent(getContext(), LocationForegroundService.class);
            getContext().stopService(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }

    public static void emitLocation(android.location.Location location) {
        if (instance != null) {
            JSObject ret = new JSObject();
            ret.put("lat", location.getLatitude());
            ret.put("lng", location.getLongitude());
            ret.put("accuracy", location.getAccuracy());
            ret.put("speed", location.getSpeed());
            ret.put("altitude", location.getAltitude());
            ret.put("heading", location.getBearing());
            ret.put("timestamp", location.getTime());
            instance.notifyListeners("locationUpdate", ret);
        }
    }
}

