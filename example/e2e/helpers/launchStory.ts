/**
 * Navigate the app to a showcase story WITHOUT relaunching it.
 *
 * The whole suite runs against a SINGLE app instance: the first call cold-
 * launches the app (`newInstance: false` launches only if it isn't already
 * running); every later call is a no-op launch + in-app navigation. We go back
 * to the Stories list (the "Stories" header button, testID `nav-home`) and tap
 * the story's card, which gives a fresh mount of that story. The app persists
 * the active story (lastStory), so a per-test `device.reloadReactNative()`
 * reset still lands back on the right story.
 */
async function goHome(): Promise<void> {
  try {
    await element(by.id("nav-home")).tap();
  } catch {
    // No Home button on the Stories list itself — already home.
  }
}

export async function launchStory(story: string): Promise<void> {
  await device.launchApp({ newInstance: false });
  await goHome();
  // The list scrolls; make sure the card is on-screen before tapping it.
  const link = element(by.id(`story-link-${story}`));
  await waitFor(link)
    .toBeVisible()
    .whileElement(by.id("stories-list"))
    .scroll(260, "down");
  await link.tap();
}
