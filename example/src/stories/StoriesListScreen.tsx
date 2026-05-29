import * as React from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";

import { STORIES } from "./registry";

type Nav = { navigate: (name: string) => void };

/**
 * The showcase index. Each card deep-links to a story screen. `story-link-<id>`
 * testIDs let Detox navigate (specs normally deep-link via launchArgs instead).
 */
export function StoriesListScreen({
  navigation,
}: {
  navigation: Nav;
}): React.ReactElement {
  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      testID="stories-list"
    >
      {STORIES.map((s) => (
        <Pressable
          key={s.id}
          testID={`story-link-${s.id}`}
          style={styles.card}
          onPress={() => navigation.navigate(s.id)}
        >
          <Text style={styles.title}>{s.title}</Text>
          <Text style={styles.desc}>{s.description}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0c0c0e" },
  content: { padding: 12 },
  card: {
    backgroundColor: "#16161a",
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#2a2a30",
  },
  title: { color: "#e8e8ea", fontSize: 15, fontWeight: "700" },
  desc: { color: "#9a9aa2", fontSize: 12, marginTop: 3 },
});
