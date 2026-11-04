package com.jayalogistics.driver;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.location.Location;
import android.location.LocationManager;
import android.os.BatteryManager;
import android.os.Build;
import android.os.IBinder;
import androidx.annotation.Nullable;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;
import androidx.core.location.LocationManagerCompat;
import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationCallback;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationResult;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Locale;
import java.util.TimeZone;
import java.util.UUID;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

public class DriverTrackingService extends Service {
  static final String ACTION_START = "com.jayalogistics.driver.START_TRACKING";
  static final String ACTION_RESUME = "com.jayalogistics.driver.RESUME_TRACKING";
  private static final int NOTIFICATION_ID = 701;
  private static final String CHANNEL = "driver_tracking";
  private FusedLocationProviderClient locationClient;
  private LocationCallback callback;
  private ScheduledExecutorService executor;
  private SecureTrackingStore store;
  private EncryptedOutboxDb queue;
  private volatile String sessionId = "";
  private boolean sampling;
  private long stationarySince;
  private long lastSampleAt;
  private Location lastSample;
  private volatile String samplingMode = "unknown";
  private int movingInterval = 30;
  private int slowInterval = 60;
  private int stationaryInterval = 300;
  private int overnightInterval = 900;
  private int minDistance = 100;

  @Override public void onCreate() {
    super.onCreate();
    executor = Executors.newSingleThreadScheduledExecutor();
    locationClient = LocationServices.getFusedLocationProviderClient(this);
    try {
      store = new SecureTrackingStore(this);
      queue = new EncryptedOutboxDb(this);
    } catch (Exception error) {
      stopSelf();
      return;
    }
    callback = new LocationCallback() {
      @Override public void onLocationResult(LocationResult result) {
        for (Location location : result.getLocations()) persist(location);
      }
    };
    if (Build.VERSION.SDK_INT >= 26) {
      NotificationChannel channel = new NotificationChannel(CHANNEL, "Driver trip tracking", NotificationManager.IMPORTANCE_LOW);
      getSystemService(NotificationManager.class).createNotificationChannel(channel);
    }
    executor.scheduleWithFixedDelay(this::flush, 0, 30, TimeUnit.SECONDS);
  }

  @Override public int onStartCommand(Intent intent, int flags, int startId) {
    if (store == null) return START_NOT_STICKY;
    if (intent != null && ACTION_START.equals(intent.getAction())) {
      String nextSession = intent.getStringExtra("sessionId");
      if (!sessionId.isEmpty() && !sessionId.equals(nextSession)) return START_STICKY;
      store.put("tripId", intent.getStringExtra("tripId"));
      store.put("apiBaseUrl", intent.getStringExtra("apiBaseUrl").replaceAll("/$", ""));
      store.put("trackingToken", intent.getStringExtra("trackingToken"));
      store.put("sessionId", nextSession);
      store.put("state", "waiting");
      store.put("lastUploadAt", "");
      movingInterval = intent.getIntExtra("intervalSec", 30);
      slowInterval = intent.getIntExtra("slowIntervalSec", 60);
      stationaryInterval = intent.getIntExtra("stationaryIntervalSec", 300);
      overnightInterval = intent.getIntExtra("overnightIntervalSec", 900);
      minDistance = intent.getIntExtra("minDistanceM", 100);
      store.put("policy", movingInterval + "," + slowInterval + "," + stationaryInterval + "," + overnightInterval + "," + minDistance);
      sessionId = nextSession;
      startForeground(NOTIFICATION_ID, notification("Waiting for GPS"));
      requestLocations();
    } else if (sessionId.isEmpty() && (intent == null || ACTION_RESUME.equals(intent.getAction())) && !store.get("trackingToken").isEmpty()) {
      String[] policy = store.get("policy").split(",");
      if (policy.length == 5) {
        movingInterval = Integer.parseInt(policy[0]);
        slowInterval = Integer.parseInt(policy[1]);
        stationaryInterval = Integer.parseInt(policy[2]);
        overnightInterval = Integer.parseInt(policy[3]);
        minDistance = Integer.parseInt(policy[4]);
      }
      sessionId = store.get("sessionId");
      store.put("state", "waiting");
      startForeground(NOTIFICATION_ID, notification("Checking trip status"));
    }
    if (sessionId.isEmpty()) {
      stopSelf();
      return START_NOT_STICKY;
    }
    executor.execute(this::flush);
    return START_STICKY;
  }

  private void requestLocations() {
    if (sampling || ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) return;
    sampling = true;
    LocationRequest request = new LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 30_000L)
      .setMaxUpdateAgeMillis(0).build();
    locationClient.requestLocationUpdates(request, callback, getMainLooper())
      .addOnFailureListener(error -> { sampling = false; store.put("state", "gps_unavailable"); });
  }

  private void persist(Location location) {
    long now = System.currentTimeMillis();
    float speed = location.hasSpeed() ? location.getSpeed() : 0;
    boolean moving = speed > 1 || (lastSample != null && lastSample.distanceTo(location) >= minDistance);
    if (moving || stationarySince == 0) stationarySince = now;
    long stationaryMs = now - stationarySince;
    samplingMode = stationaryMs >= 6 * 60 * 60_000L ? "overnight"
      : stationaryMs >= 10 * 60_000L ? "stationary" : speed >= 8f / 3.6f ? "moving" : "slow";
    int interval = stationaryMs >= 6 * 60 * 60_000L ? overnightInterval
      : stationaryMs >= 10 * 60_000L ? stationaryInterval
      : speed >= 8f / 3.6f ? movingInterval : slowInterval;
    if (lastSample != null && now - lastSampleAt < interval * 1000L && lastSample.distanceTo(location) < minDistance) return;

    try {
      JSONObject point = new JSONObject();
      point.put("sequence", store.nextSequence());
      point.put("idempotencyKey", UUID.randomUUID().toString());
      point.put("latitude", location.getLatitude());
      point.put("longitude", location.getLongitude());
      point.put("accuracyM", location.getAccuracy());
      if (location.hasSpeed()) point.put("speedMps", location.getSpeed());
      if (location.hasBearing()) point.put("bearingDeg", location.getBearing());
      if (location.hasAltitude()) point.put("altitudeM", location.getAltitude());
      SimpleDateFormat iso = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
      iso.setTimeZone(TimeZone.getTimeZone("UTC"));
      point.put("recordedAt", iso.format(new java.util.Date(location.getTime())));
      point.put("provider", location.getProvider() == null ? "fused" : location.getProvider());
      boolean mocked = Build.VERSION.SDK_INT >= 31 ? location.isMock() : location.isFromMockProvider();
      point.put("isMocked", mocked);
      Intent battery = registerReceiver(null, new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
      if (battery != null) {
        int level = battery.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
        int scale = battery.getIntExtra(BatteryManager.EXTRA_SCALE, -1);
        if (level >= 0 && scale > 0) point.put("batteryPct", Math.round(level * 100f / scale));
        point.put("isCharging", battery.getIntExtra(BatteryManager.EXTRA_PLUGGED, 0) != 0);
      }
      queue.enqueue(sessionId, point.getString("idempotencyKey"), point.toString());
      lastSample = location;
      lastSampleAt = now;
      if (!mocked && location.hasAccuracy() && location.getAccuracy() <= 100 && !"active".equals(store.get("state"))) {
        store.put("state", "active");
        getSystemService(NotificationManager.class).notify(NOTIFICATION_ID, notification("Tracking active"));
      }
    } catch (Exception error) {
      store.put("state", "gps_unavailable");
    }
  }

  private void flush() {
    String currentSession = sessionId;
    if (currentSession.isEmpty() || store == null) return;
    try {
      ArrayList<EncryptedOutboxDb.Row> rows = queue.read(currentSession, 100);
      JSONArray points = new JSONArray();
      for (EncryptedOutboxDb.Row row : rows) points.put(new JSONObject(row.json));
      JSONObject body = new JSONObject();
      body.put("tripId", store.get("tripId"));
      body.put("sessionId", currentSession);
      body.put("points", points);
      LocationManager manager = getSystemService(LocationManager.class);
      JSONObject health = new JSONObject();
      health.put("locationReady", manager != null && LocationManagerCompat.isLocationEnabled(manager)
        && ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED);
      health.put("samplingMode", samplingMode);
      health.put("queuedPoints", queue.count(currentSession));
      body.put("health", health);
      JSONObject response = postBatch(body);
      if (response == null) return;
      ArrayList<String> acknowledged = new ArrayList<>();
      for (String key : new String[]{"acceptedIdempotencyKeys", "existingIdempotencyKeys", "rejectedIdempotencyKeys"}) {
        JSONArray ids = response.optJSONArray(key);
        if (ids != null) for (int i = 0; i < ids.length(); i++) acknowledged.add(ids.getString(i));
      }
      queue.delete(acknowledged);
      if (!rows.isEmpty()) store.put("lastUploadAt", Long.toString(System.currentTimeMillis()));
      new android.os.Handler(getMainLooper()).post(() -> {
        if (!currentSession.equals(sessionId)) return;
        if (response.optBoolean("trackingEnded")) {
          locationClient.removeLocationUpdates(callback);
          sampling = false;
          store.put("state", "ending");
          if (rows.size() < 100) finishTracking();
        } else {
          requestLocations();
        }
      });
    } catch (Exception ignored) {
      // Keep unacknowledged points for the next scheduled attempt.
    }
  }

  private JSONObject postBatch(JSONObject body) throws Exception {
    HttpURLConnection connection = (HttpURLConnection) new URL(store.get("apiBaseUrl") + "/api/mobile/v1/tracking/batches").openConnection();
    try {
      connection.setConnectTimeout(15000);
      connection.setReadTimeout(20000);
      connection.setInstanceFollowRedirects(false);
      connection.setRequestMethod("POST");
      connection.setRequestProperty("X-Driver-Tracking-Token", store.get("trackingToken"));
      connection.setRequestProperty("Content-Type", "application/json");
      connection.setDoOutput(true);
      try (OutputStream output = connection.getOutputStream()) {
        output.write(body.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8));
      }
      int status = connection.getResponseCode();
      if (status == 401) {
        store.put("state", "gps_unavailable");
        return null;
      }
      if (status == 409) {
        new android.os.Handler(getMainLooper()).post(this::finishTracking);
        return null;
      }
      if (status != 200) return null;
      try (BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream()))) {
        StringBuilder text = new StringBuilder();
        String line;
        while ((line = reader.readLine()) != null) text.append(line);
        return new JSONObject(text.toString()).optJSONObject("data");
      }
    } finally {
      connection.disconnect();
    }
  }

  private void finishTracking() {
    sessionId = "";
    store.put("trackingToken", "");
    store.put("state", "ended");
    stopForeground(STOP_FOREGROUND_REMOVE);
    stopSelf();
  }

  private Notification notification(String title) {
    Intent open = new Intent(this, MainActivity.class);
    PendingIntent pending = PendingIntent.getActivity(this, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    return new NotificationCompat.Builder(this, CHANNEL)
      .setSmallIcon(android.R.drawable.ic_menu_mylocation).setContentTitle(title)
      .setContentText("Jaya Logistics trip location").setContentIntent(pending).setOngoing(true)
      .setCategory(NotificationCompat.CATEGORY_SERVICE).build();
  }

  @Nullable @Override public IBinder onBind(Intent intent) { return null; }

  @Override public void onDestroy() {
    if (callback != null) locationClient.removeLocationUpdates(callback);
    if (executor != null) executor.shutdownNow();
    super.onDestroy();
  }
}
