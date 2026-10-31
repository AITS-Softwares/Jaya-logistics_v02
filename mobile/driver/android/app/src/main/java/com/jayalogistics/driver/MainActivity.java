package com.jayalogistics.driver;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(DriverTrackingPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
