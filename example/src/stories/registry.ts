import type { ComponentType } from "react";

import { BasicStory } from "./basic";
import { CellEditingStory } from "./cellEditing";
import { CustomRenderersStory } from "./customRenderers";
import { EmptyAndEdgeStory } from "./emptyAndEdge";
import { EnterpriseStory } from "./enterprise";
import { FilteringStory } from "./filtering";
import { GroupingStory } from "./grouping";
import { ImperativeApiStory } from "./imperativeApi";
import { PinningStory } from "./pinning";
import { SelectionStory } from "./selection";
import { SlotsStory } from "./slots";
import { SortingStory } from "./sorting";
import { ThemingDensityStory } from "./themingDensity";

export type StoryDef = {
  /** Stable id — also the nav route name and the Detox `launchArgs.story` value. */
  id: string;
  title: string;
  description: string;
  Component: ComponentType;
};

/**
 * Single source of truth for the showcase: drives both the Stories list screen
 * and the native-stack routes. Keep ids in sync with e2e specs / launchStory().
 */
export const STORIES: StoryDef[] = [
  { id: "basic", title: "Basic grid", description: "5 columns × 100 rows, single select, runtime data-size controls.", Component: BasicStory },
  { id: "sorting", title: "Sorting", description: "Single + multi-column sort via the header action sheet.", Component: SortingStory },
  { id: "filtering", title: "Filtering", description: "Set / text / number / date filters.", Component: FilteringStory },
  { id: "pinning", title: "Pinning", description: "Pin columns left / right; stay fixed on horizontal scroll.", Component: PinningStory },
  { id: "grouping", title: "Grouping & aggregation", description: "Group by a column; sum / avg aggregations.", Component: GroupingStory },
  { id: "selection", title: "Selection", description: "Multi-row selection with checkboxes + select-all.", Component: SelectionStory },
  { id: "cellEditing", title: "Cell editing", description: "Editable cells; reports editingCell.", Component: CellEditingStory },
  { id: "themingDensity", title: "Theming & density", description: "Swap theme + density at run-time.", Component: ThemingDensityStory },
  { id: "slots", title: "Slot overrides", description: "Replace built-in UI components via the slots prop.", Component: SlotsStory },
  { id: "customRenderers", title: "Custom cell rendering", description: "valueFormatter + redIfNegative.", Component: CustomRenderersStory },
  { id: "imperativeApi", title: "Imperative API", description: "Drive the grid through its ref (SkiaGridAPI).", Component: ImperativeApiStory },
  { id: "enterprise", title: "Enterprise (large data)", description: "1k–10k rows, pinned + filter + sort + group.", Component: EnterpriseStory },
  { id: "emptyAndEdge", title: "Empty & edge cases", description: "0 / 1 / 100 rows, noDataText.", Component: EmptyAndEdgeStory },
];

export const STORY_IDS = STORIES.map((s) => s.id);
