import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as React from "react";
import { LogBox, Pressable, Settings, StatusBar, Text } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { StoriesListScreen } from "./src/stories/StoriesListScreen";
import { STORIES } from "./src/stories/registry";

/**
 * Storybook-like host. Root providers (gesture handler, bottom-sheet modal,
 * safe area) wrap a native-stack navigator whose routes come from the story
 * registry. Default route is the Stories list; Detox can deep-link straight to
 * a story by launching with `launchArgs: { story: <id> }`, which iOS exposes via
 * NSUserDefaults and we read here with RN's `Settings`.
 */
// Suppress the dev LogBox notification toast — it floats over the bottom of the
// screen and obscures bottom-of-sheet controls (pin "Right", group, etc.),
// which also makes them unhittable for Detox. Showcase app only.
LogBox.ignoreAllLogs(true);

const Stack = createNativeStackNavigator();

function getInitialStory(): string | undefined {
  try {
    // `story` = explicit deep-link (launchArgs). `lastStory` = the story the
    // app was last on; lets a reloadReactNative reset land back on the same
    // story without a relaunch (so e2e runs one app instance + navigates).
    const explicit = Settings.get("story");
    if (typeof explicit === "string" && explicit.length > 0) return explicit;
    const last = Settings.get("lastStory");
    if (typeof last === "string" && last.length > 0) return last;
  } catch {
    // Settings is iOS-only; ignore on other platforms.
  }
  return undefined;
}

export default function App(): React.ReactElement {
  const initialStory = getInitialStory();

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <BottomSheetModalProvider>
          <StatusBar barStyle="light-content" />
          <NavigationContainer
            onStateChange={(state) => {
              // Persist the active story so a reload returns to it (single-
              // instance e2e). Skip the Stories list itself.
              const route = state?.routes?.[state.index ?? 0];
              if (route && route.name !== "Stories") {
                try {
                  Settings.set({ lastStory: route.name });
                } catch {
                  // iOS-only; ignore elsewhere.
                }
              }
            }}
          >
            <Stack.Navigator
              initialRouteName={initialStory ?? "Stories"}
              screenOptions={{
                headerStyle: { backgroundColor: "#0c0c0e" },
                headerTintColor: "#e8e8ea",
                headerTitleStyle: { fontSize: 15 },
                contentStyle: { backgroundColor: "#0c0c0e" },
              }}
            >
              <Stack.Screen
                name="Stories"
                component={StoriesListScreen}
                options={{ title: "Skia Grid — Stories" }}
              />
              {STORIES.map((story) => (
                <Stack.Screen
                  key={story.id}
                  name={story.id}
                  component={story.Component}
                  // A "Stories" header button (testID nav-home) lets e2e return
                  // to the list and switch stories without relaunching the app.
                  options={({ navigation }) => ({
                    title: story.title,
                    headerRight: () => (
                      <Pressable
                        testID="nav-home"
                        hitSlop={12}
                        onPress={() => navigation.navigate("Stories")}
                      >
                        <Text style={{ color: "#7fb2ff", fontSize: 14, fontWeight: "600" }}>
                          Stories
                        </Text>
                      </Pressable>
                    ),
                  })}
                />
              ))}
            </Stack.Navigator>
          </NavigationContainer>
        </BottomSheetModalProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
