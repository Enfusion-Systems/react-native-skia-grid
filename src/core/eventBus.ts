import type { Unsubscribe } from "./types";

type Listener<E> = (event: E) => void;

export class EventBus<E extends { type: string }> {
  private byType = new Map<string, Set<Listener<E>>>();
  private all = new Set<Listener<E>>();

  on(type: string, listener: Listener<E>): Unsubscribe {
    let set = this.byType.get(type);
    if (!set) {
      set = new Set();
      this.byType.set(type, set);
    }
    set.add(listener);
    return () => {
      set?.delete(listener);
    };
  }

  onAny(listener: Listener<E>): Unsubscribe {
    this.all.add(listener);
    return () => {
      this.all.delete(listener);
    };
  }

  emit(event: E): void {
    this.byType.get(event.type)?.forEach((l) => l(event));
    this.all.forEach((l) => l(event));
  }

  dispose(): void {
    this.byType.clear();
    this.all.clear();
  }
}
