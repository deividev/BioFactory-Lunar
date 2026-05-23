import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ContractState } from '../../core/enums';
import { ContractService } from '../../core/services/contract.service';
import { GameStateService } from '../../core/services/game-state.service';
import { Contracts } from './contracts';

// Instance IDs follow the pattern: contract_${definitionId}_01
const STARTER_BIOFOOD_ID = 'contract_contract_starter_biofood_01';

describe('Contracts panel', () => {
  let fixture: ComponentFixture<Contracts>;
  let el: HTMLElement;
  let contractService: ContractService;
  let gameState: GameStateService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Contracts] }).compileComponents();
    fixture = TestBed.createComponent(Contracts);
    el = fixture.nativeElement;
    contractService = TestBed.inject(ContractService);
    gameState = TestBed.inject(GameStateService);
    fixture.detectChanges();
  });

  // ── Available section ──────────────────────────────────────────────────────

  it('does not render "placeholder online" text', () => {
    expect(el.textContent).not.toContain('placeholder online');
  });

  it('renders contract names in the Available section', () => {
    const section = el.querySelector('[aria-label="Available contracts"]');
    expect(section).not.toBeNull();
    expect(section!.textContent).toContain('Starter Biofood Delivery');
  });

  it('shows an Accept button for each available contract', () => {
    const buttons = el.querySelectorAll<HTMLButtonElement>('[data-testid="accept-btn"]');
    expect(buttons.length).toBe(6);
  });

  it('Accept button click calls contractService.acceptContract with the instance ID', () => {
    const spy = vi.spyOn(contractService, 'acceptContract');
    const btn = el.querySelector<HTMLButtonElement>(
      `[data-testid="accept-btn"][data-contract-id="${STARTER_BIOFOOD_ID}"]`,
    );
    expect(btn).not.toBeNull();
    btn!.click();
    fixture.detectChanges();
    expect(spy).toHaveBeenCalledWith(STARTER_BIOFOOD_ID);
  });

  // ── Active section ────────────────────────────────────────────────────────

  it('Active section shows contract name after accepting', () => {
    gameState.updateContracts((cs) =>
      cs.map((c) => (c.id === STARTER_BIOFOOD_ID ? { ...c, state: ContractState.Active } : c)),
    );
    fixture.detectChanges();
    const section = el.querySelector('[aria-label="Active contracts"]');
    expect(section).not.toBeNull();
    expect(section!.textContent).toContain('Starter Biofood Delivery');
  });

  it('Active section shows progress items for each active contract', () => {
    gameState.updateContracts((cs) =>
      cs.map((c) => (c.id === STARTER_BIOFOOD_ID ? { ...c, state: ContractState.Active } : c)),
    );
    fixture.detectChanges();
    const progressItems = el.querySelectorAll('[data-testid="progress-item"]');
    expect(progressItems.length).toBeGreaterThan(0);
    const progressText = Array.from(progressItems)
      .map((p) => p.textContent)
      .join(' ');
    expect(progressText).toContain('Biofood Pack');
  });

  it('Deliver button is disabled when inventory is insufficient', () => {
    gameState.updateContracts((cs) =>
      cs.map((c) => (c.id === STARTER_BIOFOOD_ID ? { ...c, state: ContractState.Active } : c)),
    );
    fixture.detectChanges();
    const deliverBtn = el.querySelector<HTMLButtonElement>(
      `[data-testid="deliver-btn"][data-contract-id="${STARTER_BIOFOOD_ID}"]`,
    );
    expect(deliverBtn).not.toBeNull();
    expect(deliverBtn!.disabled).toBe(true);
  });

  it('Deliver button is enabled when inventory satisfies requirements', () => {
    gameState.updateContracts((cs) =>
      cs.map((c) => (c.id === STARTER_BIOFOOD_ID ? { ...c, state: ContractState.Active } : c)),
    );
    gameState.updateInventory((inv) => ({ ...inv, items: { ...inv.items, biofood_pack: 1 } }));
    fixture.detectChanges();
    const deliverBtn = el.querySelector<HTMLButtonElement>(
      `[data-testid="deliver-btn"][data-contract-id="${STARTER_BIOFOOD_ID}"]`,
    );
    expect(deliverBtn).not.toBeNull();
    expect(deliverBtn!.disabled).toBe(false);
  });

  it('Deliver button click calls contractService.deliverContract with the instance ID', () => {
    const spy = vi.spyOn(contractService, 'deliverContract');
    gameState.updateContracts((cs) =>
      cs.map((c) => (c.id === STARTER_BIOFOOD_ID ? { ...c, state: ContractState.Active } : c)),
    );
    gameState.updateInventory((inv) => ({ ...inv, items: { ...inv.items, biofood_pack: 1 } }));
    fixture.detectChanges();
    const deliverBtn = el.querySelector<HTMLButtonElement>(
      `[data-testid="deliver-btn"][data-contract-id="${STARTER_BIOFOOD_ID}"]`,
    );
    expect(deliverBtn).not.toBeNull();
    deliverBtn!.click();
    fixture.detectChanges();
    expect(spy).toHaveBeenCalledWith(STARTER_BIOFOOD_ID);
  });

  // ── Completed section ─────────────────────────────────────────────────────

  it('Completed section shows contract name after completing', () => {
    gameState.updateContracts((cs) =>
      cs.map((c) => (c.id === STARTER_BIOFOOD_ID ? { ...c, state: ContractState.Completed } : c)),
    );
    fixture.detectChanges();
    const section = el.querySelector('[aria-label="Completed contracts"]');
    expect(section).not.toBeNull();
    expect(section!.textContent).toContain('Starter Biofood Delivery');
  });
});
