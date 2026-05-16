import { computed, Injectable, signal, type Signal } from '@angular/core';

import type { GameState, InventoryState, ResourceState } from '../models';
import { createInitialGameState } from '../state';

type DeepReadonly<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends readonly (infer Item)[]
    ? ReadonlyArray<DeepReadonly<Item>>
    : T extends object
      ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
      : T;

function cloneState<T>(value: T): T {
  return structuredClone(value);
}

function deepFreeze<T>(value: T): DeepReadonly<T> {
  if (value === null || typeof value !== 'object') {
    return value as DeepReadonly<T>;
  }

  Object.freeze(value);

  for (const nestedValue of Object.values(value)) {
    deepFreeze(nestedValue);
  }

  return value as DeepReadonly<T>;
}

@Injectable({ providedIn: 'root' })
export class GameStateService {
  readonly #state = signal<GameState>(createInitialGameState());

  readonly resources: Signal<DeepReadonly<ResourceState>> = computed(() => deepFreeze(cloneState(this.#state().resources)));
  readonly inventory: Signal<DeepReadonly<InventoryState>> = computed(() => deepFreeze(cloneState(this.#state().inventory)));

  getSnapshot(): GameState {
    return cloneState(this.#state());
  }

  reset(): void {
    this.#state.set(createInitialGameState());
  }

  updateResources(updater: (resources: ResourceState) => ResourceState): void {
    this.#state.update((state) => ({
      ...state,
      resources: cloneState(updater(cloneState(state.resources))),
    }));
  }

  updateInventory(updater: (inventory: InventoryState) => InventoryState): void {
    this.#state.update((state) => ({
      ...state,
      inventory: cloneState(updater(cloneState(state.inventory))),
    }));
  }
}