/** @type {Detox.DetoxConfig} */
module.exports = {
  testRunner: {
    args: {
      $0: "jest",
      config: "e2e/jest.config.js",
    },
    jest: {
      setupTimeout: 120000,
    },
  },
  apps: {
    "ios.debug": {
      type: "ios.app",
      binaryPath:
        "ios/build/Build/Products/Debug-iphonesimulator/SkiaGridExample.app",
      build:
        "xcodebuild -workspace ios/SkiaGridExample.xcworkspace -scheme SkiaGridExample -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build",
    },
    "android.debug": {
      type: "android.apk",
      binaryPath:
        "android/app/build/outputs/apk/debug/app-debug.apk",
      testBinaryPath:
        "android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk",
      build:
        "cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug",
      reversePorts: [8081],
    },
  },
  devices: {
    "ios.sim": {
      type: "ios.simulator",
      device: {
        // Pin a specific simulator in CI to keep visual snapshots stable.
        // Detected booted device on this host: iPhone 17 Pro (iOS 26.2 runtime).
        type: "iPhone 17 Pro",
      },
    },
    "android.emu": {
      type: "android.emulator",
      device: {
        avdName: "Pixel_6_API_34",
      },
    },
  },
  configurations: {
    "ios.sim.debug": {
      device: "ios.sim",
      app: "ios.debug",
    },
    "android.emu.debug": {
      device: "android.emu",
      app: "android.debug",
    },
  },
  behavior: {
    init: {
      reinstallApp: true,
    },
  },
  artifacts: {
    rootDir: ".artifacts",
    plugins: {
      log: { enabled: true },
      screenshot: {
        enabled: true,
        keepOnlyFailedTestsArtifacts: false,
        takeWhen: {
          testStart: false,
          testDone: true,
          testFailure: true,
        },
      },
    },
  },
};
