package com.jayalogistics.driver;

import android.content.Context;
import androidx.security.crypto.EncryptedSharedPreferences;
import androidx.security.crypto.MasterKey;

/** Stores only session configuration/tokens. Location records live separately in
 * EncryptedOutboxDb so an interrupted upload cannot lose a point. */
final class SecureTrackingStore {
  private static final String FILE = "driver_tracking_secure";
  private final android.content.SharedPreferences prefs;

  SecureTrackingStore(Context context) throws Exception {
    MasterKey key = new MasterKey.Builder(context).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build();
    prefs = EncryptedSharedPreferences.create(context, FILE, key,
      EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
      EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM);
  }

  void put(String key, String value) { prefs.edit().putString(key, value).apply(); }
  String get(String key) { return prefs.getString(key, ""); }
  long nextSequence() { long value = prefs.getLong("sequence", 0L) + 1L; prefs.edit().putLong("sequence", value).apply(); return value; }
  void clear() { prefs.edit().clear().apply(); }
}
