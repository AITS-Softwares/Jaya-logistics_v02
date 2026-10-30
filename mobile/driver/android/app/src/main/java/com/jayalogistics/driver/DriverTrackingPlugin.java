package com.jayalogistics.driver;

import android.Manifest;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import androidx.core.content.ContextCompat;

@CapacitorPlugin(name = "DriverTracking", permissions = {
  @Permission(alias = "location", strings = { Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION }),
  @Permission(alias = "backgroundLocation", strings = { Manifest.permission.ACCESS_BACKGROUND_LOCATION }),
  @Permission(alias = "notification", strings = { Manifest.permission.POST_NOTIFICATIONS })
})
public class DriverTrackingPlugin extends Plugin {
  @PluginMethod
  public void deviceInfo(PluginCall call) {
    JSObject result = new JSObject();
    result.put("manufacturer", Build.MANUFACTURER == null ? "Android" : Build.MANUFACTURER);
    result.put("model", Build.MODEL == null ? "Android phone" : Build.MODEL);
    result.put("androidVersion", Build.VERSION.RELEASE == null ? "Unknown" : Build.VERSION.RELEASE);
    try {
      String version = getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0).versionName;
      result.put("appVersion", version == null ? "Unknown" : version);
    } catch (Exception ignored) { result.put("appVersion", "Unknown"); }
    call.resolve(result);
  }

  // The refresh token is the only login credential retained between launches.
  // It is encrypted at rest by SecureTrackingStore; short-lived access tokens
  // always come from the server after the app opens.
  @PluginMethod
  public void loadDriverSession(PluginCall call) {
    try {
      SecureTrackingStore store = new SecureTrackingStore(getContext());
      JSObject result = new JSObject();
      result.put("refreshToken", store.get("driverRefreshToken"));
      call.resolve(result);
    } catch (Exception error) { call.reject("SESSION_STORE_READ_FAILED", error.getMessage(), error); }
  }

  @PluginMethod
  public void saveDriverSession(PluginCall call) {
    String refreshToken = call.getString("refreshToken", "");
    if (refreshToken.isEmpty()) { call.reject("REFRESH_TOKEN_REQUIRED", "A refresh token is required."); return; }
    try {
      new SecureTrackingStore(getContext()).put("driverRefreshToken", refreshToken);
      call.resolve();
    } catch (Exception error) { call.reject("SESSION_STORE_WRITE_FAILED", error.getMessage(), error); }
  }

  @PluginMethod
  public void clearDriverSession(PluginCall call) {
    try {
      // Do not clear the tracking store: an active foreground tracking service
      // owns its own credentials until the trip is stopped.
      new SecureTrackingStore(getContext()).put("driverRefreshToken", "");
      call.resolve();
    } catch (Exception error) { call.reject("SESSION_STORE_CLEAR_FAILED", error.getMessage(), error); }
  }

  @PluginMethod
  public void permissions(PluginCall call) {
    JSObject result = new JSObject();
    result.put("location", getPermissionState("location").toString());
    result.put("notification", Build.VERSION.SDK_INT >= 33 ? getPermissionState("notification").toString() : "granted");
    result.put("backgroundLocation", Build.VERSION.SDK_INT >= 29 ? getPermissionState("backgroundLocation").toString() : "granted");
    call.resolve(result);
  }

  @PluginMethod
  public void requestReadyPermissions(PluginCall call) {
    if (getPermissionState("location") != com.getcapacitor.PermissionState.GRANTED) { requestPermissionForAlias("location", call, "permissionCallback"); return; }
    if (Build.VERSION.SDK_INT >= 33 && getPermissionState("notification") != com.getcapacitor.PermissionState.GRANTED) { requestPermissionForAlias("notification", call, "permissionCallback"); return; }
    permissionCallback(call);
  }

  @PermissionCallback
  public void permissionCallback(PluginCall call) {
    if (Build.VERSION.SDK_INT >= 29 && getPermissionState("backgroundLocation") != com.getcapacitor.PermissionState.GRANTED) { requestPermissionForAlias("backgroundLocation", call, "backgroundPermissionCallback"); return; }
    resolveReadyPermissions(call);
  }

  @PermissionCallback
  public void backgroundPermissionCallback(PluginCall call) {
    resolveReadyPermissions(call);
  }

  private void resolveReadyPermissions(PluginCall call) {
    JSObject result = new JSObject();
    boolean ready = getPermissionState("location") == com.getcapacitor.PermissionState.GRANTED;
    boolean backgroundLocationGranted = Build.VERSION.SDK_INT < 29 || getPermissionState("backgroundLocation") == com.getcapacitor.PermissionState.GRANTED;
    result.put("ready", ready);
    result.put("backgroundLocationRequired", Build.VERSION.SDK_INT >= 29 && !backgroundLocationGranted);
    result.put("backgroundLocationGranted", backgroundLocationGranted);
    if (!ready) result.put("message", "Precise location is required before tracking can start.");
    call.resolve(result);
  }

  @PluginMethod
  public void openAppSettings(PluginCall call) {
    Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
    intent.setData(Uri.fromParts("package", getContext().getPackageName(), null));
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
    getContext().startActivity(intent);
    call.resolve();
  }

  @PluginMethod
  public void start(PluginCall call) {
    if (getPermissionState("location") != com.getcapacitor.PermissionState.GRANTED) { call.reject("LOCATION_PERMISSION_REQUIRED", "Grant precise location before starting tracking."); return; }
    String tripId = call.getString("tripId", ""); String sessionId = call.getString("sessionId", "");
    String apiBaseUrl = call.getString("apiBaseUrl", ""); String accessToken = call.getString("accessToken", ""); String refreshToken = call.getString("refreshToken", "");
    if (tripId.isEmpty() || sessionId.isEmpty() || apiBaseUrl.isEmpty() || accessToken.isEmpty() || refreshToken.isEmpty()) { call.reject("TRACKING_CONFIG_REQUIRED", "Tracking configuration is incomplete."); return; }
    Intent intent = new Intent(getContext(), DriverTrackingService.class);
    intent.setAction(DriverTrackingService.ACTION_START);
    intent.putExtra("tripId", tripId); intent.putExtra("sessionId", sessionId); intent.putExtra("apiBaseUrl", apiBaseUrl);
    intent.putExtra("accessToken", accessToken); intent.putExtra("refreshToken", refreshToken);
    intent.putExtra("intervalSec", call.getObject("policy", new JSObject()).getInteger("movingIntervalSec", 30));
    intent.putExtra("minDistanceM", call.getObject("policy", new JSObject()).getInteger("minDistanceM", 100));
    ContextCompat.startForegroundService(getContext(), intent);
    JSObject result = new JSObject(); result.put("started", true); call.resolve(result);
  }

  @PluginMethod
  public void stop(PluginCall call) {
    Intent intent = new Intent(getContext(), DriverTrackingService.class); intent.setAction(DriverTrackingService.ACTION_STOP); intent.putExtra("reason", call.getString("reason", "driver_stop"));
    getContext().startService(intent); JSObject result = new JSObject(); result.put("stopped", true); call.resolve(result);
  }

  @PluginMethod
  public void health(PluginCall call) {
    try {
      SecureTrackingStore store = new SecureTrackingStore(getContext()); EncryptedOutboxDb queue = new EncryptedOutboxDb(getContext());
      JSObject result = new JSObject(); result.put("state", store.get("state")); result.put("sessionId", store.get("sessionId")); result.put("queuedPoints", queue.count()); result.put("available", true); call.resolve(result);
    } catch (Exception error) { call.reject("TRACKING_HEALTH_FAILED", error.getMessage(), error); }
  }
}
