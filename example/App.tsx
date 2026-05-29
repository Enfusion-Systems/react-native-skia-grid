import * as React from "react";
import { StatusBar, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { BasicScene } from "./src/scenes/basic";

/**
 * Detox host app. Single scene for Week 1 (smoke). Additional scenes
 * (enterprise, grouped, editable) land alongside their respective specs in
 * Weeks 2-5 per docs/skia-grid-refactor.md §3.5.
 *
 * Scene switching by launchArgs lands with the second scene; today there's
 * nothing to switch between.
 */
export default function App(): React.ReactElement {
  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        <StatusBar barStyle="light-content" />
        <BasicScene />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0c0c0e" },
});
