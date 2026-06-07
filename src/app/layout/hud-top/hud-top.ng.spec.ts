import { TestBed } from '@angular/core/testing';
import { ContractState, ShipmentState } from '../../core/enums';
import { GameStateService } from '../../core/services';
import { HudTop } from './hud-top';

function visibleText(fixture: { nativeElement: HTMLElement }): string {
  return fixture.nativeElement.textContent ?? '';
}

function resourceIconSources(fixture: { nativeElement: HTMLElement }): string[] {
  return Array.from(fixture.nativeElement.querySelectorAll('.hud-top__resource-card .hud-top__card-icon')).map((element) =>
    element.getAttribute('src') ?? '',
  );
}

function systemIconSources(fixture: { nativeElement: HTMLElement }): string[] {
  return Array.from(fixture.nativeElement.querySelectorAll('.hud-top__system-card .hud-top__card-icon')).map((element) =>
    element.getAttribute('src') ?? '',
  );
}

describe('HudTop Angular component', () => {
  it('renders a screenshot-inspired command bar with resource and system cards', async () => {
    await TestBed.configureTestingModule({
      imports: [HudTop],
    }).compileComponents();

    const fixture = TestBed.createComponent(HudTop);
    fixture.detectChanges();
    const text = visibleText(fixture);

    expect(text).toMatch(/Biofactory\s+Lunar/);
    expect(text).not.toContain('HUD placeholder online');
    expect(text).not.toContain('Angular shell ready');
    expect(fixture.nativeElement.querySelector('.hud-top__brand-card')).toBeInstanceOf(HTMLElement);
    expect(fixture.nativeElement.querySelector('.hud-top__telemetry-strip')).toBeInstanceOf(HTMLElement);
    expect(fixture.nativeElement.querySelectorAll('.hud-top__resource-card')).toHaveLength(5);
    expect(fixture.nativeElement.querySelectorAll('.hud-top__system-card')).toHaveLength(3);
    expect(text).toContain('Credits');
    expect(text).toContain('150');
    expect(text).toContain('Energy');
    expect(text).toContain('55 / 100');
    expect(text).toContain('Water');
    expect(text).toContain('60 / 100');
    expect(text).toContain('Nutrients');
    expect(text).toContain('35 / 100');
    expect(text).toContain('Oxygen');
    expect(text).toContain('45 / 100');
    expect(text).toContain('Storage');
    expect(text).toContain('0 / 12');
    expect(text).toContain('Contracts');
    expect(text).toContain('available');
    expect(text).toContain('Shipments');
    expect(resourceIconSources(fixture)).toEqual([
      'assets/ui/icons/resources/ui_icon_credits.png',
      'assets/ui/icons/resources/ui_icon_energy.png',
      'assets/ui/icons/resources/ui_icon_water.png',
      'assets/ui/icons/resources/ui_icon_nutrients.png',
      'assets/ui/icons/resources/ui_icon_oxygen.png',
    ]);
    expect(systemIconSources(fixture)).toEqual([
      'assets/ui/icons/actions/ui_icon_storage.png',
      'assets/ui/icons/actions/ui_icon_contracts.png',
      'assets/ui/icons/actions/ui_icon_shipments.png',
    ]);
  });

  it('renders real contract and shipment telemetry instead of catalog placeholders', async () => {
    await TestBed.configureTestingModule({
      imports: [HudTop],
    }).compileComponents();

    const fixture = TestBed.createComponent(HudTop);
    const gameState = TestBed.inject(GameStateService);

    gameState.updateContracts((contracts) =>
      contracts.map((contract, index) => ({
        ...contract,
        state: index < 2 ? ContractState.Active : index < 5 ? ContractState.Available : ContractState.Completed,
      })),
    );
    gameState.updateShipments(() => [
      { id: 'ship_1', catalogItemId: 'shipment_seed_protein_leaf_pack', state: ShipmentState.InTransit, remainingSeconds: 20 },
      { id: 'ship_2', catalogItemId: 'shipment_water_supply', state: ShipmentState.Delivered, remainingSeconds: 0 },
    ]);

    fixture.detectChanges();

    const text = visibleText(fixture);
    expect(text).toContain('2');
    expect(text).toContain('3 available');
    expect(text).toContain('1');
    expect(text).toContain('1 delivered');
  });

  it('hides the finale contract from the HUD available count until onboarding is complete', async () => {
    await TestBed.configureTestingModule({
      imports: [HudTop],
    }).compileComponents();

    const fixture = TestBed.createComponent(HudTop);
    const gameState = TestBed.inject(GameStateService);

    gameState.updateContracts((contracts) =>
      contracts.map((contract) => ({
        ...contract,
        state: ContractState.Available,
      })),
    );

    fixture.detectChanges();

    expect(visibleText(fixture)).toContain('9 available');

    gameState.updateTutorial((tutorial) => ({
      ...tutorial,
      activeStepId: undefined,
    }));
    fixture.detectChanges();

    expect(visibleText(fixture)).toContain('10 available');
  });

  it('does not expose resource debug action buttons in the demo HUD', async () => {
    await TestBed.configureTestingModule({
      imports: [HudTop],
    }).compileComponents();

    const fixture = TestBed.createComponent(HudTop);
    fixture.detectChanges();

    expect(visibleText(fixture)).not.toContain('Collect 25 credits');
    expect(visibleText(fixture)).not.toContain('Spend 50 credits');
    expect(visibleText(fixture)).not.toContain('Overfill water');
    expect(fixture.nativeElement.querySelectorAll('button')).toHaveLength(0);
  });
});
