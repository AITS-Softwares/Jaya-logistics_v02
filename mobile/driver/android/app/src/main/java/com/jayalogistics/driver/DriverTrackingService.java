package com.jayalogistics.driver;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.location.Location;
import android.os.Build;
import android.os.IBinder;
import androidx.annotation.Nullable;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;
import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationCallback;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationResult;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.UUID;
import java.text.SimpleDateFormat;
import java.util.Locale;
import java.util.TimeZone;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class DriverTrackingService extends Service {
  static final String ACTION_START = "com.jayalogistics.driver.START_TRACKING";
  static final String ACTION_STOP = "com.jayalogistics.driver.STOP_TRACKING";
  private static final int NOTIFICATION_ID = 701;
  private FusedLocationProviderClient locationClient; private LocationCallback callback; private ExecutorService executor;
  private SecureTrackingStore store; private EncryptedOutboxDb queue;

  @Override public void onCreate() {
    super.onCreate(); executor = Executors.newSingleThreadExecutor(); locationClient = LocationServices.getFusedLocationProviderClient(this);
    try { store = new SecureTrackingStore(this); queue = new EncryptedOutboxDb(this); } catch (Exception error) { stopSelf(); }
    callback = new LocationCallback() { @Override public void onLocationResult(LocationResult result) { for (Location location : result.getLocations()) persist(location); } };
    createChannel();
  }

  @Override public int onStartCommand(Intent intent, int flags, int startId) {
    if (intent == null) return START_NOT_STICKY;
    if (ACTION_STOP.equals(intent.getAction())) { stopTracking(intent.getStringExtra("reason")); return START_NOT_STICKY; }
    if (ACTION_START.equals(intent.getAction())) {
      try {
        store.put("tripId", intent.getStringExtra("tripId")); store.put("sessionId", intent.getStringExtra("sessionId")); store.put("apiBaseUrl", intent.getStringExtra("apiBaseUrl").replaceAll("/$", ""));
        store.put("accessToken", intent.getStringExtra("accessToken")); store.put("refreshToken", intent.getStringExtra("refreshToken")); store.put("state", "active");
        startForeground(NOTIFICATION_ID, notification()); requestLocations(intent.getIntExtra("intervalSec", 30), intent.getIntExtra("minDistanceM", 100)); flush();
      } catch (Exception error) { stopSelf(); }
    }
    return START_STICKY;
  }

  private void requestLocations(int intervalSec, int minDistanceM) {
    if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) { stopSelf(); return; }
    LocationRequest request = new LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, Math.max(15000L, intervalSec * 1000L)).setMinUpdateDistanceMeters(Math.max(25, minDistanceM)).setWaitForAccurateLocation(false).build();
    locationClient.requestLocationUpdates(request, callback, getMainLooper());
  }
  private void persist(Location location) {
    try {
      JSONObject point = new JSONObject(); point.put("sequence", store.nextSequence()); point.put("idempotencyKey", UUID.randomUUID().toString()); point.put("latitude", location.getLatitude()); point.put("longitude", location.getLongitude()); point.put("accuracyM", location.getAccuracy());
      if (location.hasSpeed()) point.put("speedMps", location.getSpeed()); if (location.hasBearing()) point.put("bearingDeg", location.getBearing()); if (location.hasAltitude()) point.put("altitudeM", location.getAltitude());
      SimpleDateFormat iso = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US); iso.setTimeZone(TimeZone.getTimeZone("UTC")); point.put("recordedAt", iso.format(new java.util.Date(location.getTime()))); point.put("provider", location.getProvider() == null ? "fused" : location.getProvider());
      if (Build.VERSION.SDK_INT >= 31) point.put("isMocked", location.isMock());
      queue.enqueue(point.getString("idempotencyKey"), point.toString()); flush();
    } catch (Exception ignored) { }
  }
  private void flush() { executor.execute(() -> { try { ArrayList<EncryptedOutboxDb.Row> rows = queue.read(100); if (rows.isEmpty()) return; JSONArray points = new JSONArray(); for (EncryptedOutboxDb.Row row : rows) points.put(new JSONObject(row.json)); JSONObject body = new JSONObject(); body.put("tripId", store.get("tripId")); body.put("sessionId", store.get("sessionId")); body.put("points", points); JSONObject response = post("/api/mobile/v1/tracking/batches", body, store.get("accessToken")); if (response == null) return; ArrayList<String> remove = new ArrayList<>(); JSONArray accepted = response.optJSONObject("data").optJSONArray("acceptedIdempotencyKeys"); JSONArray existing = response.optJSONObject("data").optJSONArray("existingIdempotencyKeys"); if (accepted != null) for (int i=0;i<accepted.length();i++) remove.add(accepted.getString(i)); if (existing != null) for (int i=0;i<existing.length();i++) remove.add(existing.getString(i)); queue.delete(remove); } catch (Exception ignored) { } }); }
  private JSONObject post(String path, JSONObject body, String token) throws Exception { for (int attempt = 0; attempt < 2; attempt++) { HttpURLConnection connection = (HttpURLConnection) new URL(store.get("apiBaseUrl") + path).openConnection(); connection.setConnectTimeout(15000); connection.setReadTimeout(20000); connection.setRequestMethod("POST"); connection.setRequestProperty("Authorization", "Bearer " + token); connection.setRequestProperty("Content-Type", "application/json"); connection.setDoOutput(true); try (OutputStream output = connection.getOutputStream()) { output.write(body.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8)); } int code = connection.getResponseCode(); if (code == 401 && attempt == 0) { token = refreshAccessToken(); if (!token.isEmpty()) continue; } if (code != 200) return null; try (BufferedReader reader = new BufferedReader(new java.io.InputStreamReader(connection.getInputStream()))) { StringBuilder text = new StringBuilder(); String line; while ((line=reader.readLine()) != null) text.append(line); return new JSONObject(text.toString()); } } return null; }
  private String refreshAccessToken() { try { HttpURLConnection connection = (HttpURLConnection) new URL(store.get("apiBaseUrl") + "/api/mobile/v1/auth/refresh").openConnection(); connection.setConnectTimeout(15000); connection.setReadTimeout(20000); connection.setRequestMethod("POST"); connection.setRequestProperty("Content-Type", "application/json"); connection.setDoOutput(true); JSONObject body = new JSONObject(); body.put("refreshToken", store.get("refreshToken")); try (OutputStream output = connection.getOutputStream()) { output.write(body.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8)); } if (connection.getResponseCode() != 200) return ""; try (BufferedReader reader = new BufferedReader(new java.io.InputStreamReader(connection.getInputStream()))) { StringBuilder text = new StringBuilder(); String line; while ((line=reader.readLine()) != null) text.append(line); JSONObject data = new JSONObject(text.toString()).optJSONObject("data"); if (data == null) return ""; store.put("accessToken", data.optString("accessToken")); store.put("refreshToken", data.optString("refreshToken")); return data.optString("accessToken"); } } catch (Exception ignored) { return ""; } }
  private void stopTracking(String reason) { try { locationClient.removeLocationUpdates(callback); store.put("state", "ended"); executor.execute(() -> { try { JSONObject body = new JSONObject(); body.put("sessionId", store.get("sessionId")); body.put("reason", reason == null ? "driver_stop" : reason); post("/api/mobile/v1/tracking/stop", body, store.get("accessToken")); } catch (Exception ignored) {} }); } finally { stopForeground(STOP_FOREGROUND_REMOVE); stopSelf(); } }
  private Notification notification() { Intent open = new Intent(this, MainActivity.class); PendingIntent pending = PendingIntent.getActivity(this, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE); return new NotificationCompat.Builder(this, "driver_tracking").setSmallIcon(android.R.drawable.ic_menu_mylocation).setContentTitle("Jaya Logistics tracking active").setContentText("Your trip location is being shared while this trip is active.").setContentIntent(pending).setOngoing(true).setCategory(NotificationCompat.CATEGORY_SERVICE).build(); }
  private void createChannel() { if (Build.VERSION.SDK_INT >= 26) { NotificationChannel channel = new NotificationChannel("driver_tracking", "Driver trip tracking", NotificationManager.IMPORTANCE_LOW); getSystemService(NotificationManager.class).createNotificationChannel(channel); } }
  @Nullable @Override public IBinder onBind(Intent intent) { return null; }
  @Override public void onDestroy() { if (locationClient != null) locationClient.removeLocationUpdates(callback); if (executor != null) executor.shutdown(); super.onDestroy(); }
}
