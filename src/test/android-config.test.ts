import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const APP_ID = "ca-app-pub-4072506919111365~3383451970";
const read = (p: string) => readFileSync(`${process.cwd()}/${p}`, "utf8");

describe("Android preserves the web app's original colors", () => {
  it("uses a light native theme and opts out of forced darkening", () => {
    const styles = read("android/app/src/main/res/values/styles.xml");
    expect(styles).toContain('parent="Theme.AppCompat.Light.NoActionBar"');
    expect(styles).toContain('<item name="android:forceDarkAllowed">false</item>');
    expect(styles).not.toContain("Theme.AppCompat.DayNight.NoActionBar");
  });

  it("disables both modern and legacy WebView darkening at startup with API guards", () => {
    const activity = read("android/app/src/main/java/app/lovable/quranreader/MainActivity.java");
    expect(activity).toContain("super.onCreate(savedInstanceState);\n        preserveWebColors();");
    expect(activity).toContain("Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q");
    expect(activity).toContain("webView.setForceDarkAllowed(false)");
    expect(activity).toContain("Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU");
    expect(activity).toContain("settings.setAlgorithmicDarkeningAllowed(false)");
    expect(activity).toContain("settings.setForceDark(WebSettings.FORCE_DARK_OFF)");
  });
});

describe("Android AdMob setup (app crashes on launch without it)", () => {
  it("manifest declares the AdMob application id entry", () => {
    expect(read("android/app/src/main/AndroidManifest.xml")).toContain(
      'android:name="com.google.android.gms.ads.APPLICATION_ID"\n            android:value="@string/admob_app_id"',
    );
  });
  it("the manifest id is the user's publisher app id", () => {
    expect(read("android/app/src/main/res/values/strings.xml")).toContain(`>${APP_ID}</string>`);
  });
  it("matches the id in the Capacitor config", () => {
    expect(read("capacitor.config.ts")).toContain(`appID: "${APP_ID}"`);
  });
});
