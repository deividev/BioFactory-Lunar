import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ContractState } from '../enums';
import { AlertService } from './alert.service';
import { ContractService } from './contract.service';
import { GameStateService } from './game-state.service';
import { InventoryService } from './inventory.service';
import { ResourceService } from './resource.service';
import { TutorialService } from './tutorial.service';

// Instance IDs follow the pattern: contract_${definitionId}_01
const STARTER_BIOFOOD_ID = 'contract_contract_starter_biofood_01';
const GREENHOUSE_PROTEIN_ID = 'contract_contract_greenhouse_protein_01';
const MIXED_BIO_SAMPLE_ID = 'contract_contract_mixed_bio_sample_01';

describe('ContractService', () => {
  let gameState: GameStateService;
  let inventory: InventoryService;
  let resources: ResourceService;
  let alerts: AlertService;
  let tutorial: TutorialService;
  let service: ContractService;

  beforeEach(() => {
    gameState = new GameStateService();
    inventory = new InventoryService(gameState);
    resources = new ResourceService(gameState);
    alerts = new AlertService(gameState);
    tutorial = new TutorialService(gameState);
    service = new ContractService(gameState, inventory, resources, alerts, tutorial);
  });

  // ── acceptContract ────────────────────────────────────────────────────────

  describe('acceptContract', () => {
    it('moves an Available contract to Active and returns success', () => {
      const result = service.acceptContract(STARTER_BIOFOOD_ID);

      expect(result.success).toBe(true);
      const updated = gameState.contracts().find((c) => c.id === STARTER_BIOFOOD_ID);
      expect(updated!.state).toBe(ContractState.Active);
    });

    it('does not mutate other contracts when accepting one', () => {
      service.acceptContract(STARTER_BIOFOOD_ID);

      const contracts = gameState.contracts();
      const others = contracts.filter((c) => c.id !== STARTER_BIOFOOD_ID);
      expect(others.every((c) => c.state === ContractState.Available)).toBe(true);
    });

    it('returns unknown_contract when the instance ID does not exist', () => {
      const result = service.acceptContract('contract_does_not_exist');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('unknown_contract');
      }
    });

    it('returns invalid_state when contract is already Active', () => {
      service.acceptContract(STARTER_BIOFOOD_ID);
      const result = service.acceptContract(STARTER_BIOFOOD_ID);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('invalid_state');
      }
    });

    it('returns invalid_state when contract is already Completed', () => {
      service.acceptContract(STARTER_BIOFOOD_ID);
      gameState.updateContracts((contracts) =>
        contracts.map((c) => (c.id === STARTER_BIOFOOD_ID ? { ...c, state: ContractState.Completed } : c)),
      );

      const result = service.acceptContract(STARTER_BIOFOOD_ID);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('invalid_state');
      }
    });

    it('emits a success alert when accepting a valid contract', () => {
      const successSpy = vi.spyOn(alerts, 'addSuccess');

      service.acceptContract(STARTER_BIOFOOD_ID);

      expect(successSpy).toHaveBeenCalledWith('Contract accepted.');
    });

    it('does not emit an alert when accepting fails', () => {
      const successSpy = vi.spyOn(alerts, 'addSuccess');
      const warnSpy = vi.spyOn(alerts, 'addWarning');

      service.acceptContract('contract_does_not_exist');

      expect(successSpy).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('advances the tutorial to accept_first_contract on success', () => {
      const stepSpy = vi.spyOn(tutorial, 'completeStep');

      service.acceptContract(STARTER_BIOFOOD_ID);

      expect(stepSpy).toHaveBeenCalledWith('accept_first_contract');
    });

    it('does not advance the tutorial when accepting fails', () => {
      const stepSpy = vi.spyOn(tutorial, 'completeStep');

      service.acceptContract('contract_does_not_exist');

      expect(stepSpy).not.toHaveBeenCalled();
    });
  });

  // ── deliverContract ───────────────────────────────────────────────────────

  describe('deliverContract', () => {
    it('consumes required items, grants rewards, and marks contract Completed on success', () => {
      // Setup: accept contract and give inventory items
      service.acceptContract(STARTER_BIOFOOD_ID);
      gameState.updateInventory((inv) => ({
        ...inv,
        items: { ...inv.items, biofood_pack: 1 },
      }));
      const creditsBefore = resources.getAmount('credits');

      const result = service.deliverContract(STARTER_BIOFOOD_ID);

      expect(result.success).toBe(true);
      expect(inventory.getQuantity('biofood_pack')).toBe(0);
      expect(resources.getAmount('credits')).toBe(creditsBefore + 80);
      const contract = gameState.contracts().find((c) => c.id === STARTER_BIOFOOD_ID);
      expect(contract!.state).toBe(ContractState.Completed);
    });

    it('returns unknown_contract when the instance ID does not exist', () => {
      const result = service.deliverContract('contract_does_not_exist');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('unknown_contract');
      }
    });

    it('returns unknown_contract when the contract instance has an orphaned definition ID', () => {
      // Inject a contract instance whose definitionId is not in CONTRACT_DEFINITIONS
      gameState.updateContracts((contracts) => [
        ...contracts,
        { id: 'contract_orphan_01', definitionId: 'def_does_not_exist', state: ContractState.Active, progressItems: {} },
      ]);

      const result = service.deliverContract('contract_orphan_01');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('unknown_contract');
      }
    });

    it('returns invalid_state when contract is Available (not Active)', () => {
      gameState.updateInventory((inv) => ({
        ...inv,
        items: { ...inv.items, biofood_pack: 1 },
      }));

      const result = service.deliverContract(STARTER_BIOFOOD_ID);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('invalid_state');
      }
    });

    it('returns invalid_state when contract is already Completed', () => {
      service.acceptContract(STARTER_BIOFOOD_ID);
      gameState.updateContracts((contracts) =>
        contracts.map((c) => (c.id === STARTER_BIOFOOD_ID ? { ...c, state: ContractState.Completed } : c)),
      );

      const result = service.deliverContract(STARTER_BIOFOOD_ID);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('invalid_state');
      }
    });

    it('returns insufficient_items and does NOT mutate inventory, resources, or contract state when items are missing', () => {
      service.acceptContract(STARTER_BIOFOOD_ID);
      // No biofood_pack in inventory
      const creditsBefore = resources.getAmount('credits');
      const biofoodBefore = inventory.getQuantity('biofood_pack');

      const result = service.deliverContract(STARTER_BIOFOOD_ID);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('insufficient_items');
      }
      expect(inventory.getQuantity('biofood_pack')).toBe(biofoodBefore);
      expect(resources.getAmount('credits')).toBe(creditsBefore);
      const contract = gameState.contracts().find((c) => c.id === STARTER_BIOFOOD_ID);
      expect(contract!.state).toBe(ContractState.Active);
    });

    it('returns insufficient_items when partially meeting a multi-item contract', () => {
      service.acceptContract(MIXED_BIO_SAMPLE_ID);
      // Provide biofood_pack but not nutrient_mix
      gameState.updateInventory((inv) => ({
        ...inv,
        items: { ...inv.items, biofood_pack: 1 },
      }));

      const result = service.deliverContract(MIXED_BIO_SAMPLE_ID);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('insufficient_items');
      }
      // biofood_pack must NOT have been consumed
      expect(inventory.getQuantity('biofood_pack')).toBe(1);
    });

    it('consumes all items for a multi-item contract and grants the correct reward', () => {
      service.acceptContract(MIXED_BIO_SAMPLE_ID);
      gameState.updateInventory((inv) => ({
        ...inv,
        items: { ...inv.items, biofood_pack: 1, nutrient_mix: 1 },
      }));
      const creditsBefore = resources.getAmount('credits');

      const result = service.deliverContract(MIXED_BIO_SAMPLE_ID);

      expect(result.success).toBe(true);
      expect(inventory.getQuantity('biofood_pack')).toBe(0);
      expect(inventory.getQuantity('nutrient_mix')).toBe(0);
      expect(resources.getAmount('credits')).toBe(creditsBefore + 150);
    });

    it('does not mutate other contracts when completing one', () => {
      service.acceptContract(STARTER_BIOFOOD_ID);
      gameState.updateInventory((inv) => ({
        ...inv,
        items: { ...inv.items, biofood_pack: 1 },
      }));

      service.deliverContract(STARTER_BIOFOOD_ID);

      const others = gameState.contracts().filter((c) => c.id !== STARTER_BIOFOOD_ID);
      expect(others.every((c) => c.state === ContractState.Available)).toBe(true);
    });

    it('emits a success alert when delivering successfully', () => {
      service.acceptContract(STARTER_BIOFOOD_ID);
      gameState.updateInventory((inv) => ({
        ...inv,
        items: { ...inv.items, biofood_pack: 1 },
      }));
      const successSpy = vi.spyOn(alerts, 'addSuccess');

      service.deliverContract(STARTER_BIOFOOD_ID);

      expect(successSpy).toHaveBeenCalledWith('Contract delivered!');
    });

    it('emits a warning alert when items are insufficient', () => {
      service.acceptContract(STARTER_BIOFOOD_ID);
      const warnSpy = vi.spyOn(alerts, 'addWarning');

      service.deliverContract(STARTER_BIOFOOD_ID);

      expect(warnSpy).toHaveBeenCalledWith('Not enough items to deliver this contract.');
    });

    it('does not emit a success alert when delivery fails', () => {
      service.acceptContract(STARTER_BIOFOOD_ID);
      const successSpy = vi.spyOn(alerts, 'addSuccess');

      service.deliverContract(STARTER_BIOFOOD_ID); // no items

      expect(successSpy).not.toHaveBeenCalledWith('Contract delivered!');
    });

    it('advances the tutorial to deliver_contract on delivery success', () => {
      service.acceptContract(STARTER_BIOFOOD_ID);
      gameState.updateInventory((inv) => ({
        ...inv,
        items: { ...inv.items, biofood_pack: 1 },
      }));
      const stepSpy = vi.spyOn(tutorial, 'completeStep');

      service.deliverContract(STARTER_BIOFOOD_ID);

      expect(stepSpy).toHaveBeenCalledWith('deliver_contract');
    });

    it('does not advance the tutorial when delivery fails', () => {
      service.acceptContract(STARTER_BIOFOOD_ID);
      const stepSpy = vi.spyOn(tutorial, 'completeStep');

      service.deliverContract(STARTER_BIOFOOD_ID); // no items

      expect(stepSpy).not.toHaveBeenCalled();
    });
  });

  // ── getProgress ───────────────────────────────────────────────────────────

  describe('getProgress', () => {
    it('returns null for an unknown instance ID', () => {
      const result = service.getProgress('contract_does_not_exist');
      expect(result).toBeNull();
    });

    it('returns progress with zero available when inventory is empty', () => {
      const result = service.getProgress(STARTER_BIOFOOD_ID);

      expect(result).not.toBeNull();
      expect(result!.instanceId).toBe(STARTER_BIOFOOD_ID);
      expect(result!.definitionId).toBe('contract_starter_biofood');
      expect(result!.state).toBe(ContractState.Available);
      expect(result!.items).toEqual([{ itemId: 'biofood_pack', required: 1, available: 0 }]);
    });

    it('reflects current inventory quantities in available counts', () => {
      gameState.updateInventory((inv) => ({
        ...inv,
        items: { ...inv.items, biofood_pack: 1 },
      }));

      const result = service.getProgress(STARTER_BIOFOOD_ID);

      expect(result!.items).toEqual([{ itemId: 'biofood_pack', required: 1, available: 1 }]);
    });

    it('reflects the contract state in the progress report', () => {
      service.acceptContract(STARTER_BIOFOOD_ID);

      const result = service.getProgress(STARTER_BIOFOOD_ID);

      expect(result!.state).toBe(ContractState.Active);
    });

    it('returns multi-item progress for contracts with multiple requirements', () => {
      gameState.updateInventory((inv) => ({
        ...inv,
        items: { ...inv.items, biofood_pack: 1 },
      }));

      const result = service.getProgress(MIXED_BIO_SAMPLE_ID);

      expect(result!.items).toEqual([
        { itemId: 'biofood_pack', required: 1, available: 1 },
        { itemId: 'nutrient_mix', required: 1, available: 0 },
      ]);
    });
  });

  // ── isCompletable ─────────────────────────────────────────────────────────

  describe('isCompletable', () => {
    it('returns false for an unknown instance ID', () => {
      expect(service.isCompletable('contract_does_not_exist')).toBe(false);
    });

    it('returns false when contract is Available (not Active)', () => {
      gameState.updateInventory((inv) => ({
        ...inv,
        items: { ...inv.items, biofood_pack: 1 },
      }));

      expect(service.isCompletable(STARTER_BIOFOOD_ID)).toBe(false);
    });

    it('returns false when contract is Active but items are insufficient', () => {
      service.acceptContract(STARTER_BIOFOOD_ID);

      expect(service.isCompletable(STARTER_BIOFOOD_ID)).toBe(false);
    });

    it('returns true when contract is Active and all required items are present', () => {
      service.acceptContract(STARTER_BIOFOOD_ID);
      gameState.updateInventory((inv) => ({
        ...inv,
        items: { ...inv.items, biofood_pack: 1 },
      }));

      expect(service.isCompletable(STARTER_BIOFOOD_ID)).toBe(true);
    });

    it('returns false when contract is Completed', () => {
      service.acceptContract(STARTER_BIOFOOD_ID);
      gameState.updateInventory((inv) => ({
        ...inv,
        items: { ...inv.items, biofood_pack: 1 },
      }));
      service.deliverContract(STARTER_BIOFOOD_ID);

      expect(service.isCompletable(STARTER_BIOFOOD_ID)).toBe(false);
    });

    it('returns true for multi-item contract only when ALL required items are present', () => {
      service.acceptContract(MIXED_BIO_SAMPLE_ID);
      gameState.updateInventory((inv) => ({
        ...inv,
        items: { ...inv.items, biofood_pack: 1 },
      }));
      expect(service.isCompletable(MIXED_BIO_SAMPLE_ID)).toBe(false);

      gameState.updateInventory((inv) => ({
        ...inv,
        items: { ...inv.items, nutrient_mix: 1 },
      }));
      expect(service.isCompletable(MIXED_BIO_SAMPLE_ID)).toBe(true);
    });
  });

  // ── save/load round-trip ─────────────────────────────────────────────────

  describe('save/load round-trip', () => {
    it('preserves Active contract state and delivers correctly after save/load', () => {
      service.acceptContract(STARTER_BIOFOOD_ID);
      gameState.updateInventory((inv) => ({
        ...inv,
        items: { ...inv.items, biofood_pack: 1 },
      }));

      const saveData = gameState.toSaveData('2026-05-23T10:00:00.000Z');

      const targetGameState = new GameStateService();
      const targetInventory = new InventoryService(targetGameState);
      const targetResources = new ResourceService(targetGameState);
      const targetAlerts = new AlertService(targetGameState);
      const targetTutorial = new TutorialService(targetGameState);
      const targetService = new ContractService(targetGameState, targetInventory, targetResources, targetAlerts, targetTutorial);
      targetGameState.loadFromSave(saveData);

      expect(targetGameState.contracts().find((c) => c.id === STARTER_BIOFOOD_ID)!.state).toBe(ContractState.Active);
      expect(targetService.isCompletable(STARTER_BIOFOOD_ID)).toBe(true);

      const result = targetService.deliverContract(STARTER_BIOFOOD_ID);
      expect(result.success).toBe(true);
      expect(targetGameState.contracts().find((c) => c.id === STARTER_BIOFOOD_ID)!.state).toBe(ContractState.Completed);
    });

    it('preserves Completed contract state after save/load without allowing re-delivery', () => {
      service.acceptContract(GREENHOUSE_PROTEIN_ID);
      gameState.updateInventory((inv) => ({
        ...inv,
        items: { ...inv.items, protein_leaf: 4 },
      }));
      service.deliverContract(GREENHOUSE_PROTEIN_ID);

      const saveData = gameState.toSaveData('2026-05-23T10:00:00.000Z');
      const targetGameState = new GameStateService();
      const targetInventory = new InventoryService(targetGameState);
      const targetResources = new ResourceService(targetGameState);
      const targetAlerts = new AlertService(targetGameState);
      const targetTutorial = new TutorialService(targetGameState);
      const targetService = new ContractService(targetGameState, targetInventory, targetResources, targetAlerts, targetTutorial);
      targetGameState.loadFromSave(saveData);

      expect(targetGameState.contracts().find((c) => c.id === GREENHOUSE_PROTEIN_ID)!.state).toBe(ContractState.Completed);
      expect(targetService.isCompletable(GREENHOUSE_PROTEIN_ID)).toBe(false);

      const result = targetService.deliverContract(GREENHOUSE_PROTEIN_ID);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('invalid_state');
      }
    });
  });
});
