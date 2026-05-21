import { effect, Injectable } from '@angular/core';

import { CROP_DEFINITIONS } from '../data';
import { CropSlotState } from '../enums';
import type { ActionResult, CropSlot } from '../models';
import { AlertService } from './alert.service';
import { GameClockService } from './game-clock.service';
import { GameStateService } from './game-state.service';
import { InventoryService } from './inventory.service';
import { ResourceService } from './resource.service';
import { PhaserBridgeService } from '../../game/bridge/phaser-bridge.service';

export type CropActionFailureCode =
  | 'slot_not_found'
  | 'slot_not_empty'
  | 'slot_not_ready'
  | 'crop_not_found'
  | 'insufficient_seed'
  | 'insufficient_resources'
  | 'inventory_full';

export type CropActionResult = ActionResult<CropActionFailureCode>;

const CROP_DEFINITION_BY_ID = new Map(CROP_DEFINITIONS.map((def) => [def.id, def]));

const GREENHOUSE_MODULE_ID = 'module_greenhouse_basic_01';

const SUCCESS: CropActionResult = { success: true };

@Injectable({ providedIn: 'root' })
export class CropService {
  constructor(
    private readonly gameState: GameStateService,
    private readonly gameClock: GameClockService,
    private readonly inventory: InventoryService,
    private readonly resources: ResourceService,
    private readonly alerts: AlertService,
    private readonly bridge: PhaserBridgeService,
  ) {
    effect(() => {
      const tick = this.gameClock.lastTick();
      if (tick === undefined) return;
      this.processTick(tick.deltaGameSeconds);
    });
  }

  plantCrop(slotId: string, cropId: string): CropActionResult {
    const greenhouse = this.gameState.greenhouse();
    const slot = greenhouse.slots.find((s) => s.id === slotId);

    if (slot === undefined) {
      return { success: false, code: 'slot_not_found', message: `Slot not found: ${slotId}` };
    }

    if (slot.state !== CropSlotState.Empty) {
      return { success: false, code: 'slot_not_empty', message: `Slot ${slotId} is not empty.` };
    }

    const cropDef = CROP_DEFINITION_BY_ID.get(cropId);

    if (cropDef === undefined) {
      return { success: false, code: 'crop_not_found', message: `Unknown crop: ${cropId}` };
    }

    if (this.inventory.getQuantity(cropDef.seedItemId) < 1) {
      return {
        success: false,
        code: 'insufficient_seed',
        message: `No seed available for ${cropId}: requires 1 ${cropDef.seedItemId}.`,
      };
    }

    if (!this.resources.canAfford(cropDef.resourceCosts)) {
      return {
        success: false,
        code: 'insufficient_resources',
        message: `Insufficient resources to plant ${cropId}.`,
      };
    }

    // All checks passed — commit mutations
    this.inventory.consumeItem(cropDef.seedItemId, 1);

    for (const cost of cropDef.resourceCosts) {
      this.resources.consume(cost.resourceId, cost.quantity);
    }

    this.gameState.updateGreenhouse((gh) => ({
      ...gh,
      slots: gh.slots.map((s) =>
        s.id === slotId
          ? { ...s, state: CropSlotState.Planted, cropId, remainingSeconds: cropDef.growthSeconds }
          : s,
      ),
    }));

    return SUCCESS;
  }

  processTick(deltaGameSeconds: number): void {
    if (deltaGameSeconds <= 0) return;

    const slots = this.gameState.greenhouse().slots;
    const hasPlantedSlots = slots.some((slot) => slot.state === CropSlotState.Planted);

    if (!hasPlantedSlots) {
      return;
    }

    const readySlotIds: string[] = [];

    this.gameState.updateGreenhouse((gh) => ({
      ...gh,
      slots: gh.slots.map((slot) => {
        if (slot.state !== CropSlotState.Planted || slot.remainingSeconds === undefined) {
          return slot;
        }

        const next = Math.max(0, slot.remainingSeconds - deltaGameSeconds);

        if (next === 0) {
          readySlotIds.push(slot.id);
          return { ...slot, state: CropSlotState.Ready, remainingSeconds: 0 };
        }

        return { ...slot, remainingSeconds: next };
      }),
    }));

    for (const slotId of readySlotIds) {
      const slot = slots.find((s) => s.id === slotId);
      const cropName = slot?.cropId ? (CROP_DEFINITION_BY_ID.get(slot.cropId)?.name ?? slot.cropId) : slotId;
      this.alerts.addSuccess(`${cropName} is ready to harvest!`);
      this.bridge.notifyCropReady(GREENHOUSE_MODULE_ID);
    }
  }

  harvestCrop(slotId: string): CropActionResult {
    const greenhouse = this.gameState.greenhouse();
    const slot = greenhouse.slots.find((s) => s.id === slotId);

    if (slot === undefined) {
      return { success: false, code: 'slot_not_found', message: `Slot not found: ${slotId}` };
    }

    if (slot.state !== CropSlotState.Ready) {
      return { success: false, code: 'slot_not_ready', message: `Slot ${slotId} is not ready to harvest.` };
    }

    const cropDef = slot.cropId !== undefined ? CROP_DEFINITION_BY_ID.get(slot.cropId) : undefined;

    if (cropDef === undefined) {
      return { success: false, code: 'crop_not_found', message: `No crop definition for slot ${slotId}.` };
    }

    const { itemId, quantity } = cropDef.baseYield;

    if (this.inventory.remainingCapacity() < quantity) {
      this.alerts.addWarning(`Not enough inventory space to harvest ${cropDef.name}.`);
      return { success: false, code: 'inventory_full', message: `Inventory full: cannot harvest ${cropDef.name}.` };
    }

    this.inventory.addItem(itemId, quantity);

    this.gameState.updateGreenhouse((gh) => ({
      ...gh,
      slots: gh.slots.map((s): CropSlot =>
        s.id === slotId
          ? { id: s.id, state: CropSlotState.Empty }
          : s,
      ),
    }));

    return SUCCESS;
  }
}
