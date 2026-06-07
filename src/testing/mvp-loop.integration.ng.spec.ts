/**
 * MVP Loop Integration Spec
 *
 * Walks the full Milestone 12 tutorial loop from fresh state through delivery
 * and validates save/load continuity. Uses direct service calls to advance
 * state instead of UI interaction, keeping the spec focused on service-layer
 * integration rather than component rendering.
 */
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { CropSlotState, ShipmentState } from '../app/core/enums';
import {
  ContractService,
  CropService,
  DEFAULT_SAVE_STORAGE_KEY,
  GameStateService,
  ProductionService,
  SaveService,
  ShipmentService,
  TutorialService,
} from '../app/core/services';

// ── fixed IDs derived from data / initial-state factory ────────────────────

const CONTRACT_ID = 'contract_contract_starter_biofood_01';
const SHIPMENT_CATALOG_ID = 'shipment_seed_protein_leaf_pack';
const CROP_SLOT_ID = 'crop_slot_01';
const CROP_ID = 'protein_leaf';
const MACHINE_ID = 'machine_orbital_packager_01';
const RECIPE_ID = 'recipe_protein_leaf_to_biofood_pack';

// ── test helpers ─────────────────────────────────────────────────────────────

function getServices(): {
  gameState: GameStateService;
  tutorial: TutorialService;
  contractService: ContractService;
  shipmentService: ShipmentService;
  cropService: CropService;
  productionService: ProductionService;
  saveService: SaveService;
} {
  return {
    gameState: TestBed.inject(GameStateService),
    tutorial: TestBed.inject(TutorialService),
    contractService: TestBed.inject(ContractService),
    shipmentService: TestBed.inject(ShipmentService),
    cropService: TestBed.inject(CropService),
    productionService: TestBed.inject(ProductionService),
    saveService: TestBed.inject(SaveService),
  };
}

// ── suite ─────────────────────────────────────────────────────────────────────

describe('MVP loop integration', () => {
  beforeEach(() => {
    localStorage.removeItem(DEFAULT_SAVE_STORAGE_KEY);
    TestBed.configureTestingModule({});
  });

  // ── initial state ──────────────────────────────────────────────────────────

  it('starts from fresh state with the first tutorial step active', () => {
    const { tutorial } = getServices();
    expect(tutorial.tutorial().activeStepId).toBe('accept_first_contract');
    expect(tutorial.tutorial().completedStepIds).toHaveLength(0);
    expect(tutorial.isComplete()).toBe(false);
  });

  // ── step 1: accept contract ────────────────────────────────────────────────

  it('step 1 — accepting a contract completes accept_first_contract', () => {
    const { contractService, tutorial } = getServices();
    const result = contractService.acceptContract(CONTRACT_ID);
    expect(result.success).toBe(true);
    expect(tutorial.tutorial().completedStepIds).toContain('accept_first_contract');
    expect(tutorial.tutorial().activeStepId).toBe('buy_seeds');
  });

  it('ignores out-of-order but otherwise valid onboarding actions', () => {
    const { shipmentService, cropService, gameState, tutorial } = getServices();

    shipmentService.buyShipment(SHIPMENT_CATALOG_ID);
    gameState.updateInventory((inventory) => ({
      ...inventory,
      items: { ...inventory.items, seed_protein_leaf: 2 },
    }));
    const plantResult = cropService.plantCrop(CROP_SLOT_ID, CROP_ID);

    expect(plantResult.success).toBe(true);
    expect(tutorial.tutorial().completedStepIds).toEqual([]);
    expect(tutorial.tutorial().activeStepId).toBe('accept_first_contract');
  });

  // ── step 2: buy seeds ─────────────────────────────────────────────────────

  it('step 2 — buying a seed shipment completes buy_seeds', () => {
    const { contractService, shipmentService, tutorial } = getServices();
    contractService.acceptContract(CONTRACT_ID);
    shipmentService.buyShipment(SHIPMENT_CATALOG_ID);
    expect(tutorial.tutorial().completedStepIds).toContain('buy_seeds');
    expect(tutorial.tutorial().activeStepId).toBe('receive_seeds');
  });

  // ── step 3: receive seeds ─────────────────────────────────────────────────

  it('step 3 — receiving the delivered shipment completes receive_seeds', () => {
    const { contractService, shipmentService, gameState, tutorial } = getServices();
    contractService.acceptContract(CONTRACT_ID);
    shipmentService.buyShipment(SHIPMENT_CATALOG_ID);

    // force shipment to delivered state
    const shipmentId = gameState.shipments()[0]!.id;
    gameState.updateShipments((list) =>
      list.map((s) => (s.id === shipmentId ? { ...s, remainingSeconds: 0, state: ShipmentState.Delivered } : s)),
    );

    shipmentService.receiveShipment(shipmentId);
    expect(tutorial.tutorial().completedStepIds).toContain('receive_seeds');
    expect(tutorial.tutorial().activeStepId).toBe('plant_crop');
    // seeds should be in inventory
    expect(gameState.inventory().items['seed_protein_leaf']).toBeGreaterThan(0);
  });

  // ── step 4: plant crop ────────────────────────────────────────────────────

  it('step 4 — planting a crop completes plant_crop', () => {
    const { contractService, shipmentService, gameState, cropService, tutorial } = getServices();
    contractService.acceptContract(CONTRACT_ID);
    shipmentService.buyShipment(SHIPMENT_CATALOG_ID);
    const shipmentId = gameState.shipments()[0]!.id;
    gameState.updateShipments((list) =>
      list.map((s) => (s.id === shipmentId ? { ...s, remainingSeconds: 0, state: ShipmentState.Delivered } : s)),
    );
    shipmentService.receiveShipment(shipmentId);

    const result = cropService.plantCrop(CROP_SLOT_ID, CROP_ID);
    expect(result.success).toBe(true);
    expect(tutorial.tutorial().completedStepIds).toContain('plant_crop');
    expect(tutorial.tutorial().activeStepId).toBe('harvest_crop');
  });

  // ── step 5: harvest crop ──────────────────────────────────────────────────

  it('step 5 — harvesting a ready crop completes harvest_crop', () => {
    const { contractService, shipmentService, gameState, cropService, tutorial } = getServices();
    contractService.acceptContract(CONTRACT_ID);
    shipmentService.buyShipment(SHIPMENT_CATALOG_ID);
    const shipmentId = gameState.shipments()[0]!.id;
    gameState.updateShipments((list) =>
      list.map((s) => (s.id === shipmentId ? { ...s, remainingSeconds: 0, state: ShipmentState.Delivered } : s)),
    );
    shipmentService.receiveShipment(shipmentId);
    cropService.plantCrop(CROP_SLOT_ID, CROP_ID);

    // force crop to ready state
    gameState.updateGreenhouse((gh) => ({
      ...gh,
      slots: gh.slots.map((s) =>
        s.id === CROP_SLOT_ID ? { ...s, state: CropSlotState.Ready, remainingSeconds: 0 } : s,
      ),
    }));

    const result = cropService.harvestCrop(CROP_SLOT_ID);
    expect(result.success).toBe(true);
    expect(tutorial.tutorial().completedStepIds).toContain('harvest_crop');
    expect(tutorial.tutorial().activeStepId).toBe('deliver_contract');
    expect(gameState.inventory().items['protein_leaf']).toBeGreaterThan(0);
  });

  // ── step 6: deliver contract ──────────────────────────────────────────────

  it('step 6 — delivering with sufficient inventory completes deliver_contract', () => {
    const { contractService, shipmentService, gameState, cropService, tutorial } = getServices();
    contractService.acceptContract(CONTRACT_ID);
    shipmentService.buyShipment(SHIPMENT_CATALOG_ID);
    const shipmentId = gameState.shipments()[0]!.id;
    gameState.updateShipments((list) =>
      list.map((s) => (s.id === shipmentId ? { ...s, remainingSeconds: 0, state: ShipmentState.Delivered } : s)),
    );
    shipmentService.receiveShipment(shipmentId);
    cropService.plantCrop(CROP_SLOT_ID, CROP_ID);
    gameState.updateGreenhouse((gh) => ({
      ...gh,
      slots: gh.slots.map((s) =>
        s.id === CROP_SLOT_ID ? { ...s, state: CropSlotState.Ready, remainingSeconds: 0 } : s,
      ),
    }));
    cropService.harvestCrop(CROP_SLOT_ID);

    const result = contractService.deliverContract(CONTRACT_ID);
    expect(result.success).toBe(true);
    expect(tutorial.tutorial().completedStepIds).toContain('deliver_contract');
    expect(tutorial.tutorial().activeStepId).toBe('process_product');
  });

  // ── step 7: process product ───────────────────────────────────────────────

  it('step 7 — starting a recipe after the starter delivery completes process_product and finishes the tutorial', () => {
    const { contractService, shipmentService, gameState, cropService, productionService, tutorial } = getServices();
    contractService.acceptContract(CONTRACT_ID);
    shipmentService.buyShipment(SHIPMENT_CATALOG_ID);
    const shipmentId = gameState.shipments()[0]!.id;
    gameState.updateShipments((list) =>
      list.map((s) => (s.id === shipmentId ? { ...s, remainingSeconds: 0, state: ShipmentState.Delivered } : s)),
    );
    shipmentService.receiveShipment(shipmentId);
    cropService.plantCrop(CROP_SLOT_ID, CROP_ID);
    gameState.updateGreenhouse((gh) => ({
      ...gh,
      slots: gh.slots.map((s) =>
        s.id === CROP_SLOT_ID ? { ...s, state: CropSlotState.Ready, remainingSeconds: 0 } : s,
      ),
    }));
    cropService.harvestCrop(CROP_SLOT_ID);

    const deliverResult = contractService.deliverContract(CONTRACT_ID);
    expect(deliverResult.success).toBe(true);

    gameState.updateInventory((inv) => ({
      ...inv,
      items: { ...inv.items, protein_leaf: 2 },
    }));

    const result = productionService.startRecipe(MACHINE_ID, RECIPE_ID);
    expect(result.success).toBe(true);
    expect(tutorial.tutorial().completedStepIds).toContain('process_product');
    expect(tutorial.tutorial().activeStepId).toBeUndefined();
    expect(tutorial.isComplete()).toBe(true);
  });

  // ── save / load continuity ────────────────────────────────────────────────

  it('save/load continuity — tutorial progress survives a save/load round-trip', async () => {
    const { contractService, tutorial, saveService, gameState } = getServices();

    // advance tutorial by one step
    contractService.acceptContract(CONTRACT_ID);
    expect(tutorial.tutorial().activeStepId).toBe('buy_seeds');

    // save
    const saveResult = await saveService.saveGame();
    expect(saveResult.success).toBe(true);

    // reset to fresh state
    gameState.reset();
    expect(tutorial.tutorial().activeStepId).toBe('accept_first_contract');

    // load
    const loadResult = await saveService.loadGame();
    expect(loadResult.success).toBe(true);

    // tutorial step should be restored
    expect(tutorial.tutorial().activeStepId).toBe('buy_seeds');
    expect(tutorial.tutorial().completedStepIds).toContain('accept_first_contract');

    localStorage.removeItem(DEFAULT_SAVE_STORAGE_KEY);
  });

  it('save/load continuity — completed tutorial survives a save/load round-trip', async () => {
    const { contractService, shipmentService, gameState, cropService, productionService, tutorial, saveService } = getServices();
    // complete all 7 steps
    contractService.acceptContract(CONTRACT_ID);
    shipmentService.buyShipment(SHIPMENT_CATALOG_ID);
    const shipmentId = gameState.shipments()[0]!.id;
    gameState.updateShipments((list) =>
      list.map((s) => (s.id === shipmentId ? { ...s, remainingSeconds: 0, state: ShipmentState.Delivered } : s)),
    );
    shipmentService.receiveShipment(shipmentId);
    cropService.plantCrop(CROP_SLOT_ID, CROP_ID);
    gameState.updateGreenhouse((gh) => ({
      ...gh,
      slots: gh.slots.map((s) =>
        s.id === CROP_SLOT_ID ? { ...s, state: CropSlotState.Ready, remainingSeconds: 0 } : s,
      ),
    }));
    cropService.harvestCrop(CROP_SLOT_ID);
    contractService.deliverContract(CONTRACT_ID);
    gameState.updateInventory((inv) => ({
      ...inv,
      items: { ...inv.items, protein_leaf: 2 },
    }));
    productionService.startRecipe(MACHINE_ID, RECIPE_ID);

    expect(tutorial.isComplete()).toBe(true);

    // save
    await saveService.saveGame();
    gameState.reset();
    expect(tutorial.isComplete()).toBe(false);

    // load — tutorial should remain complete
    await saveService.loadGame();
    expect(tutorial.isComplete()).toBe(true);
    expect(tutorial.tutorial().activeStepId).toBeUndefined();

    localStorage.removeItem(DEFAULT_SAVE_STORAGE_KEY);
  });
});
