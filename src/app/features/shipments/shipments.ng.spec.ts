import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ContractState, ShipmentState } from '../../core/enums';
import { GameStateService } from '../../core/services/game-state.service';
import { ShipmentService } from '../../core/services/shipment.service';
import { Shipments } from './shipments';

describe('Shipments panel', () => {
  let fixture: ComponentFixture<Shipments>;
  let el: HTMLElement;
  let shipmentService: ShipmentService;
  let gameState: GameStateService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Shipments] }).compileComponents();
    fixture = TestBed.createComponent(Shipments);
    el = fixture.nativeElement;
    shipmentService = TestBed.inject(ShipmentService);
    gameState = TestBed.inject(GameStateService);
    fixture.detectChanges();
  });

  function rewardFor(itemId: string): string | undefined {
    return el
      .querySelector<HTMLElement>(`[data-testid="catalog-row"][data-item-id="${itemId}"] [data-testid="item-reward"]`)
      ?.textContent
      ?.trim();
  }

  it('renders each catalog item name and cost', () => {
    const rows = el.querySelectorAll('.shipments__catalog-row');
    expect(rows.length).toBeGreaterThan(0);
    expect(el.textContent).toContain('Protein Leaf Seed Pack');
    expect(el.textContent).not.toContain('Aqua Sprout Seed Pack');
    expect(el.textContent).not.toContain('Luma Moss Spore Pack');
    expect(el.textContent).toContain('35 cr');
  });

  it('shows reward quantity label for item-based shipment', () => {
    expect(rewardFor('shipment_seed_protein_leaf_pack')).toBe('×4 Protein Leaf Seed');
  });

  it('shows reward quantity label for resource-based shipment (Water Supply)', () => {
    expect(rewardFor('shipment_water_supply')).toBe('×25 Water');
  });

  it('shows reward quantity label for the nutrient resource shipment', () => {
    expect(rewardFor('shipment_nutrient_pack')).toBe('×20 Nutrients');
  });

  it('reveals the aqua sprout shipment after the starter contract is completed', () => {
    gameState.updateContracts((contracts) =>
      contracts.map((contract) =>
        contract.id === 'contract_contract_starter_biofood_01'
          ? { ...contract, state: ContractState.Completed }
          : contract,
      ),
    );

    fixture.detectChanges();

    expect(el.textContent).toContain('Aqua Sprout Seed Pack');
  });

  it('buy button is disabled when insufficient credits', () => {
    gameState.updateResources((r) => ({ ...r, values: { ...r.values, credits: 0 } }));
    fixture.detectChanges();
    const buyBtns = el.querySelectorAll<HTMLButtonElement>('[data-testid="buy-btn"]');
    expect(buyBtns.length).toBeGreaterThan(0);
    buyBtns.forEach((btn) => expect(btn.disabled).toBe(true));
  });

  it('buy button is enabled when sufficient credits', () => {
    gameState.updateResources((r) => ({ ...r, values: { ...r.values, credits: 1000 } }));
    fixture.detectChanges();
    const buyBtn = el.querySelector<HTMLButtonElement>('[data-testid="buy-btn"]');
    expect(buyBtn).not.toBeNull();
    expect(buyBtn!.disabled).toBe(false);
  });

  it('shows countdown seconds for InTransit shipment', () => {
    gameState.updateShipments(() => [
      {
        id: 'test-1',
        catalogItemId: 'shipment_seed_protein_leaf_pack',
        state: ShipmentState.InTransit,
        remainingSeconds: 42,
      },
    ]);
    fixture.detectChanges();
    expect(el.textContent).toContain('42');
  });

  it('shows Receive button only for Delivered shipment', () => {
    gameState.updateShipments(() => [
      {
        id: 'test-2',
        catalogItemId: 'shipment_seed_protein_leaf_pack',
        state: ShipmentState.Delivered,
        remainingSeconds: 0,
      },
    ]);
    fixture.detectChanges();
    const receiveBtn = el.querySelector('[data-testid="receive-btn"]');
    expect(receiveBtn).not.toBeNull();
  });

  it('buy button click calls buyShipment with item id', () => {
    const spy = vi.spyOn(shipmentService, 'buyShipment');
    gameState.updateResources((r) => ({ ...r, values: { ...r.values, credits: 1000 } }));
    fixture.detectChanges();
    const buyBtn = el.querySelector<HTMLButtonElement>('[data-testid="buy-btn"]');
    buyBtn!.click();
    fixture.detectChanges();
    expect(spy).toHaveBeenCalled();
  });

  it('receive button click calls receiveShipment with shipment id', () => {
    const spy = vi.spyOn(shipmentService, 'receiveShipment');
    gameState.updateShipments(() => [
      {
        id: 'ship-x',
        catalogItemId: 'shipment_seed_protein_leaf_pack',
        state: ShipmentState.Delivered,
        remainingSeconds: 0,
      },
    ]);
    fixture.detectChanges();
    const receiveBtn = el.querySelector<HTMLButtonElement>('[data-testid="receive-btn"]');
    receiveBtn!.click();
    fixture.detectChanges();
    expect(spy).toHaveBeenCalledWith('ship-x');
  });

  it('getRewardLabel returns empty string when catalog item has no item or resource', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const label = (fixture.componentInstance as any).getRewardLabel({ id: 'x', name: 'X', cost: { resourceId: 'credits', quantity: 10 }, durationSeconds: 30 });
    expect(label).toBe('');
  });

  it('getRewardLabel falls back to raw id when definition is not found', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const comp = fixture.componentInstance as any;
    expect(comp.getRewardLabel({ id: 'x', name: 'X', item: { itemId: 'unknown_item_xyz', quantity: 7 }, cost: { resourceId: 'credits', quantity: 10 }, durationSeconds: 30 })).toBe('×7 unknown_item_xyz');
    expect(comp.getRewardLabel({ id: 'y', name: 'Y', resource: { resourceId: 'unknown_res_xyz', quantity: 5 }, cost: { resourceId: 'credits', quantity: 10 }, durationSeconds: 30 })).toBe('×5 unknown_res_xyz');
  });
});
