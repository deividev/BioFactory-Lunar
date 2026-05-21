import { computed, Injectable, signal, type Signal } from '@angular/core';

import type {
  Alert,
  ClockState,
  ContractInstance,
  GameState,
  GreenhouseState,
  InventoryState,
  MachineInstance,
  ResourceState,
  SaveData,
  ShipmentInstance,
  UIState,
} from '../models';
import { CURRENT_SAVE_VERSION } from '../models';
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
  readonly clock: Signal<DeepReadonly<ClockState>> = computed(() => deepFreeze(cloneState(this.#state().clock)));
  readonly ui: Signal<DeepReadonly<UIState>> = computed(() => deepFreeze(cloneState(this.#state().ui)));
  readonly greenhouse: Signal<DeepReadonly<GreenhouseState>> = computed(() => deepFreeze(cloneState(this.#state().greenhouse)));
  readonly machines: Signal<DeepReadonly<MachineInstance[]>> = computed(() => deepFreeze(cloneState(this.#state().machines)));
  readonly contracts: Signal<DeepReadonly<ContractInstance[]>> = computed(() => deepFreeze(cloneState(this.#state().contracts)));
  readonly shipments: Signal<DeepReadonly<ShipmentInstance[]>> = computed(() => deepFreeze(cloneState(this.#state().shipments)));
  readonly alerts: Signal<DeepReadonly<Alert[]>> = computed(() => deepFreeze(cloneState(this.#state().alerts)));

  getSnapshot(): GameState {
    return cloneState(this.#state());
  }

  reset(): void {
    this.#state.set(createInitialGameState());
  }

  toSaveData(savedAt = new Date().toISOString()): SaveData {
    const state = this.getSnapshot();

    return {
      saveVersion: CURRENT_SAVE_VERSION,
      savedAt,
      meta: state.meta,
      clock: state.clock,
      resources: state.resources,
      inventory: state.inventory,
      greenhouse: state.greenhouse,
      machines: state.machines,
      contracts: state.contracts,
      shipments: state.shipments,
      modules: state.modules,
      robots: state.robots,
      research: state.research,
      events: state.events,
      alerts: state.alerts,
      tutorial: state.tutorial,
      settings: state.settings,
    };
  }

  loadFromSave(saveData: SaveData): void {
    this.#state.set(
      cloneState({
        meta: saveData.meta,
        clock: saveData.clock,
        resources: saveData.resources,
        inventory: saveData.inventory,
        greenhouse: saveData.greenhouse,
        machines: saveData.machines,
        contracts: saveData.contracts,
        shipments: saveData.shipments,
        modules: saveData.modules,
        robots: saveData.robots,
        research: saveData.research,
        events: saveData.events,
        alerts: saveData.alerts,
        tutorial: saveData.tutorial,
        settings: saveData.settings,
        ui: createInitialGameState().ui,
      }),
    );
  }

  updateResources(updater: (resources: ResourceState) => ResourceState): void {
    this.#state.update((state) => ({
      ...state,
      resources: cloneState(updater(cloneState(state.resources))),
    }));
  }

  updateClock(updater: (clock: ClockState) => ClockState): void {
    this.#state.update((state) => ({
      ...state,
      clock: cloneState(updater(cloneState(state.clock))),
    }));
  }

  updateInventory(updater: (inventory: InventoryState) => InventoryState): void {
    this.#state.update((state) => ({
      ...state,
      inventory: cloneState(updater(cloneState(state.inventory))),
    }));
  }

  updateShipments(updater: (shipments: ShipmentInstance[]) => ShipmentInstance[]): void {
    this.#state.update((state) => ({
      ...state,
      shipments: cloneState(updater(cloneState(state.shipments))),
    }));
  }

  updateUi(updater: (ui: UIState) => UIState): void {
    this.#state.update((state) => ({
      ...state,
      ui: cloneState(updater(cloneState(state.ui))),
    }));
  }

  updateAlerts(updater: (alerts: Alert[]) => Alert[]): void {
    this.#state.update((state) => ({
      ...state,
      alerts: cloneState(updater(cloneState(state.alerts))),
    }));
  }
}
