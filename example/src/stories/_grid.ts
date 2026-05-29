import { createGridComp } from "react-native-skia-grid";

import type { Row } from "../seededData";

/**
 * One `Row`-typed Grid component shared by every story. `createGridComp<T>()`
 * returns a `forwardRef<SkiaGridAPI<T> | null, SkiaGridProps<T>>`, so stories
 * get full prop + imperative-ref typing for free. Only one story is mounted at
 * a time (native-stack), so sharing a single component instance is safe.
 */
export const Grid = createGridComp<Row>();
