import { describe, expectTypeOf, it } from 'vitest';

import {
  AlertType,
  ContractState,
  CropSlotState,
  GameSpeed,
  MachineState,
  ModuleState,
  ModuleType,
  PanelType,
  ResourceCategory,
  RobotState,
} from '../enums';
import type {
  Alert,
  BaseModuleDefinition,
  BaseModuleInstance,
  ClockState,
  ContractDefinition,
  ContractInstance,
  CropDefinition,
  CropSlot,
  GameMetaState,
  GameState,
  GreenhouseState,
  InventoryState,
  ItemAmount,
  MachineDefinition,
  MachineInstance,
  ProductionResourceCostContext,
  RecipeDefinition,
  ResourceDefinition,
  ResourceState,
  SaveData,
  SettingsState,
  ShipmentCatalogItem,
  ShipmentInstance,
  TutorialState,
  UIState,
} from './index';

describe('game state model contracts', () => {
  it('types the static definitions required by Milestone 2', () => {
    expectTypeOf<ResourceDefinition>().toMatchTypeOf<{
      id: string;
      name: string;
      category: ResourceCategory;
    }>();
    expectTypeOf<CropDefinition>().toHaveProperty('seedItemId').toEqualTypeOf<string>();
    expectTypeOf<CropDefinition>().toHaveProperty('resourceCosts').toEqualTypeOf<{ resourceId: string; quantity: number }[]>();
    expectTypeOf<MachineDefinition>().toHaveProperty('acceptedRecipeIds').toEqualTypeOf<string[]>();
    expectTypeOf<RecipeDefinition>().toHaveProperty('output').toEqualTypeOf<{ itemId: string; quantity: number }>();
    expectTypeOf<RecipeDefinition>().toHaveProperty('resourceCosts').toEqualTypeOf<{ resourceId: string; quantity: number }[]>();
    expectTypeOf<ProductionResourceCostContext>().toMatchTypeOf<{
      productionId: string;
      moduleId?: string;
      resourceCosts: { resourceId: string; quantity: number }[];
    }>();
    expectTypeOf<ContractDefinition>().toHaveProperty('rewards').toEqualTypeOf<{ resourceId: string; quantity: number }[]>();
    expectTypeOf<ShipmentCatalogItem>().toHaveProperty('cost').toEqualTypeOf<{ resourceId: string; quantity: number }>();
    expectTypeOf<BaseModuleDefinition>().toHaveProperty('type').toEqualTypeOf<ModuleType>();
  });

  it('types the dynamic runtime sections required by GameState', () => {
    expectTypeOf<ClockState>().toHaveProperty('speed').toEqualTypeOf<GameSpeed>();
    expectTypeOf<ResourceState>().toHaveProperty('values').toEqualTypeOf<Record<string, number>>();
    expectTypeOf<InventoryState>().toHaveProperty('items').toEqualTypeOf<Record<string, number>>();
    expectTypeOf<CropSlot>().toHaveProperty('state').toEqualTypeOf<CropSlotState>();
    expectTypeOf<GreenhouseState>().toHaveProperty('slots').toEqualTypeOf<CropSlot[]>();
    expectTypeOf<MachineInstance>().toHaveProperty('state').toEqualTypeOf<MachineState>();
    expectTypeOf<MachineInstance>().toHaveProperty('durationSeconds').toEqualTypeOf<number | undefined>();
    expectTypeOf<MachineInstance>().toHaveProperty('outputPending').toEqualTypeOf<ItemAmount[] | undefined>();
    expectTypeOf<ContractInstance>().toHaveProperty('state').toEqualTypeOf<ContractState>();
    expectTypeOf<ShipmentInstance>().toHaveProperty('remainingSeconds').toEqualTypeOf<number>();
    expectTypeOf<BaseModuleInstance>().toHaveProperty('state').toEqualTypeOf<ModuleState>();
    expectTypeOf<Alert>().toHaveProperty('type').toEqualTypeOf<AlertType>();
  });

  it('types GameState and SaveData as explicit full contracts', () => {
    expectTypeOf<GameState>().toMatchTypeOf<{
      clock: ClockState;
      resources: ResourceState;
      inventory: InventoryState;
      greenhouse: GreenhouseState;
      machines: MachineInstance[];
      contracts: ContractInstance[];
      shipments: ShipmentInstance[];
      modules: BaseModuleInstance[];
      robots: { id: string; state: RobotState }[];
      alerts: Alert[];
      ui: UIState;
      settings: SettingsState;
      tutorial: TutorialState;
      meta: GameMetaState;
    }>();

    expectTypeOf<UIState>().toHaveProperty('activePanel').toEqualTypeOf<PanelType>();
    expectTypeOf<SaveData>().toMatchTypeOf<{
      saveVersion: number;
      savedAt: string;
      meta: GameMetaState;
      clock: ClockState;
      resources: ResourceState;
      inventory: InventoryState;
      greenhouse: GreenhouseState;
      machines: MachineInstance[];
      contracts: ContractInstance[];
      shipments: ShipmentInstance[];
      modules: BaseModuleInstance[];
      robots: { id: string; state: RobotState }[];
      alerts: Alert[];
      settings: SettingsState;
      tutorial: TutorialState;
    }>();
  });
});
