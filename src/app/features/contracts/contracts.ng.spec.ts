import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  areDemoUnlockRequirementsMet,
  DEMO_FINALE_CONTRACT_INSTANCE_ID,
  getDemoUnlockRequirementTarget,
} from '../../core/data';
import { ContractState } from '../../core/enums';
import { ContractService } from '../../core/services/contract.service';
import { GameStateService } from '../../core/services/game-state.service';
import { Contracts } from './contracts';

// Instance IDs follow the pattern: contract_${definitionId}_01
const STARTER_BIOFOOD_ID = 'contract_contract_starter_biofood_01';
const OPEN_PROTEIN_BUYBACK_ID = 'contract_contract_open_protein_buyback_01';

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

  it('returns null for unknown unlock requirement prefixes', () => {
    expect(getDemoUnlockRequirementTarget('mystery:unknown')).toBeNull();
  });

  it('treats invalid unlock requirements as unmet', () => {
    expect(areDemoUnlockRequirementsMet(['mystery:unknown'], {
      completedContractIds: ['contract_contract_starter_biofood_01'],
      infrastructureUpgradeIds: ['water_recycler_i'],
    })).toBe(false);
  });

  it('renders contract names in the Available section', () => {
    const section = el.querySelector('[aria-label="Available contracts"]');
    expect(section).not.toBeNull();
    expect(section!.textContent).toContain('Starter Protein Delivery');
  });

  it('explains the starter contract production path before acceptance', () => {
    const section = el.querySelector('[aria-label="Available contracts"]');

    expect(section?.textContent).toContain('plant and harvest 2 Protein Leaf');
    expect(section?.textContent).toContain('Deliver: 2x Protein Leaf');
  });

  it('shows an Accept button for each available contract', () => {
    const buttons = el.querySelectorAll<HTMLButtonElement>('[data-testid="accept-btn"]');
    expect(buttons.length).toBe(1);
  });

  it('keeps follow-up contracts hidden until their unlock requirement is met', () => {
    expect(el.textContent).not.toContain('Hydroponic Sample Request');
    expect(el.textContent).not.toContain('Processed Biofood Batch');
  });

  it('reveals the next contract tier after the starter contract is completed', () => {
    gameState.updateContracts((contracts) =>
      contracts.map((contract) =>
        contract.id === STARTER_BIOFOOD_ID
          ? { ...contract, state: ContractState.Completed }
          : contract,
      ),
    );
    fixture.detectChanges();

    expect(el.textContent).toContain('Open Protein Buyback');
    expect(el.textContent).toContain('Hydroponic Sample Request');
    expect(el.textContent).toContain('Processed Biofood Batch');
    expect(el.textContent).toContain('Source: run Protein Leaf to Biofood Pack in Orbital Packager using 2x Protein Leaf.');
  });

  it('keeps the repeatable fallback contract on the board instead of moving it to Completed', () => {
    gameState.updateContracts((contracts) =>
      contracts.map((contract) => (
        contract.id === STARTER_BIOFOOD_ID
          ? { ...contract, state: ContractState.Completed }
          : contract
      )),
    );
    fixture.detectChanges();

    const acceptButton = el.querySelector<HTMLButtonElement>(
      `[data-testid="accept-btn"][data-contract-id="${OPEN_PROTEIN_BUYBACK_ID}"]`,
    );
    expect(acceptButton).not.toBeNull();

    gameState.updateContracts((contracts) =>
      contracts.map((contract) => (
        contract.id === OPEN_PROTEIN_BUYBACK_ID
          ? { ...contract, state: ContractState.Active }
          : contract
      )),
    );
    gameState.updateInventory((inventory) => ({
      ...inventory,
      items: { ...inventory.items, protein_leaf: 2 },
    }));
    fixture.detectChanges();

    const deliverButton = el.querySelector<HTMLButtonElement>(
      `[data-testid="deliver-btn"][data-contract-id="${OPEN_PROTEIN_BUYBACK_ID}"]`,
    );
    expect(deliverButton).not.toBeNull();
    deliverButton!.click();
    fixture.detectChanges();

    expect(el.textContent).toContain('Open Protein Buyback');
    const completedSection = el.querySelector('[aria-label="Completed contracts"]');
    expect(completedSection?.textContent ?? '').not.toContain('Open Protein Buyback');
  });

  it('hides the finale contract while the tutorial is still active', () => {
    const finaleButton = el.querySelector<HTMLButtonElement>(
      `[data-testid="accept-btn"][data-contract-id="${DEMO_FINALE_CONTRACT_INSTANCE_ID}"]`,
    );

    expect(finaleButton).toBeNull();
  });

  it('shows the finale contract after the tutorial is complete', () => {
    gameState.updateTutorial((tutorial) => ({
      ...tutorial,
      activeStepId: undefined,
    }));
    fixture.detectChanges();

    const finaleButton = el.querySelector<HTMLButtonElement>(
      `[data-testid="accept-btn"][data-contract-id="${DEMO_FINALE_CONTRACT_INSTANCE_ID}"]`,
    );

    expect(finaleButton).not.toBeNull();
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
    expect(section!.textContent).toContain('Starter Protein Delivery');
    expect(section!.textContent).toContain('plant and harvest 2 Protein Leaf');
  });

  it('shows production hints for active processed-item contracts', () => {
    gameState.updateContracts((contracts) =>
      contracts.map((contract) => {
        if (contract.id === STARTER_BIOFOOD_ID) {
          return { ...contract, state: ContractState.Completed };
        }

        if (contract.id === 'contract_contract_greenhouse_protein_01') {
          return { ...contract, state: ContractState.Active };
        }

        return contract;
      }),
    );
    fixture.detectChanges();

    const section = el.querySelector('[aria-label="Active contracts"]');

    expect(section?.textContent).toContain('Processed Biofood Batch');
    expect(section?.textContent).toContain('Source: run Protein Leaf to Biofood Pack in Orbital Packager using 2x Protein Leaf.');
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
    expect(progressText).toContain('Protein Leaf');
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
    gameState.updateInventory((inv) => ({ ...inv, items: { ...inv.items, protein_leaf: 2 } }));
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
    gameState.updateInventory((inv) => ({ ...inv, items: { ...inv.items, protein_leaf: 2 } }));
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
    expect(section!.textContent).toContain('Starter Protein Delivery');
  });
});
