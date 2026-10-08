package com.jayalogistics.driver;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.util.ArrayList;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/** SQLite queue whose payload column is AES-GCM ciphertext backed by Android Keystore.
 * The database stores no raw coordinates or bearer tokens. */
final class EncryptedOutboxDb extends SQLiteOpenHelper {
  static final class Row { String id; String json; Row(String id, String json) { this.id = id; this.json = json; } }
  private static final String KEY_ALIAS = "jaya_driver_outbox_key";
  EncryptedOutboxDb(Context context) { super(context, "driver_tracking_outbox.db", null, 1); }
  @Override public void onCreate(SQLiteDatabase db) { db.execSQL("CREATE TABLE outbox (id TEXT PRIMARY KEY, created_at INTEGER NOT NULL, payload TEXT NOT NULL)"); }
  @Override public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {}

  void enqueue(String id, String json) throws Exception {
    ContentValues values = new ContentValues(); values.put("id", id); values.put("created_at", System.currentTimeMillis()); values.put("payload", encrypt(json));
    getWritableDatabase().insertWithOnConflict("outbox", null, values, SQLiteDatabase.CONFLICT_IGNORE);
  }
  ArrayList<Row> read(int max) throws Exception {
    ArrayList<Row> rows = new ArrayList<>();
    try (Cursor cursor = getReadableDatabase().query("outbox", new String[]{"id", "payload"}, null, null, null, null, "created_at ASC", String.valueOf(max))) {
      while (cursor.moveToNext()) rows.add(new Row(cursor.getString(0), decrypt(cursor.getString(1))));
    }
    return rows;
  }
  void delete(ArrayList<String> ids) {
    SQLiteDatabase db = getWritableDatabase();
    for (String id : ids) db.delete("outbox", "id=?", new String[]{id});
  }
  int count() { try (Cursor c = getReadableDatabase().rawQuery("SELECT COUNT(*) FROM outbox", null)) { c.moveToFirst(); return c.getInt(0); } }
  private SecretKey key() throws Exception {
    KeyStore store = KeyStore.getInstance("AndroidKeyStore"); store.load(null);
    if (store.containsAlias(KEY_ALIAS)) return ((KeyStore.SecretKeyEntry) store.getEntry(KEY_ALIAS, null)).getSecretKey();
    KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
    generator.init(new KeyGenParameterSpec.Builder(KEY_ALIAS, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());
    return generator.generateKey();
  }
  private String encrypt(String plain) throws Exception {
    Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding"); cipher.init(Cipher.ENCRYPT_MODE, key());
    return Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP) + "." + Base64.encodeToString(cipher.doFinal(plain.getBytes(StandardCharsets.UTF_8)), Base64.NO_WRAP);
  }
  private String decrypt(String encoded) throws Exception {
    String[] split = encoded.split("\\.", 2); Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
    cipher.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(128, Base64.decode(split[0], Base64.NO_WRAP)));
    return new String(cipher.doFinal(Base64.decode(split[1], Base64.NO_WRAP)), StandardCharsets.UTF_8);
  }
}
