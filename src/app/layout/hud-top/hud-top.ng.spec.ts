import { TestBed } from '@angular/core/testing';
import { GameSpeed } from '../../core/enums';
import { GameStateService, ResourceService } from '../../core/services';
import { HudTop } from './hud-top';

function visibleText(fixture: { nativeElement: HTMLElement }): string {
  return fixture.nativeElement.textContent ?? '';
}

function clickButton(fixture: { nativeElement: HTMLElement; detectChanges: () => void }, label: string): void {
  const button = Array.from(fixture.nativeElement.querySelectorAll('button')).find((element) =>
    element.textContent?.includes(label),
  ) as HTMLButtonElement | undefined;

  expect(button).toBeTruthy();

  button?.click();
  fixture.detectChanges();
}

function expectButton(fixture: { nativeElement: HTMLElement }, label: string): void {
  const button = Array.from(fixture.nativeElement.querySelectorAll('button')).find((element) =>
    element.textContent?.trim() === label,
  );

  expect(button).toBeTruthy();
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
    expect(fixture.nativeElement.querySelectorAll('.hud-top__resource-card')).toHaveLength(4);
    expect(fixture.nativeElement.querySelectorAll('.hud-top__system-card')).toHaveLength(6);
    expect(text).toContain('Credits');
    expect(text).toContain('200');
    expect(text).toContain('Energy');
    expect(text).toContain('100 / 100');
    expect(text).toContain('Water');
    expect(text).toContain('Nutrients');
    expect(text).toContain('20 / 100');
    expect(text).toContain('Oxygen');
    expect(text).toContain('92%');
    expect(text).toContain('Robots');
    expect(text).toContain('Storage');
    expect(text).toContain('Research');
    expect(text).toContain('Contracts');
    expect(text).toContain('Available');
    expect(text).toContain('Shipments');
    expect(text).toContain('Catalog');
    expect(resourceIconSources(fixture)).toEqual([
      'assets/ui/icons/resources/ui_icon_credits.png',
      'assets/ui/icons/resources/ui_icon_energy.png',
      'assets/ui/icons/resources/ui_icon_water.png',
      'assets/ui/icons/resources/ui_icon_nutrients.png',
    ]);
    expect(systemIconSources(fixture)).toEqual([
      'assets/ui/icons/resources/ui_icon_oxygen.png',
      'assets/ui/icons/actions/ui_icon_robots.png',
      'assets/ui/icons/actions/ui_icon_storage.png',
      'assets/ui/icons/actions/ui_icon_investigation.png',
      'assets/ui/icons/actions/ui_icon_contracts.png',
      'assets/ui/icons/actions/ui_icon_shipments.png',
    ]);
  });

  it('routes valid placeholder actions through ResourceService and rerenders balances', async () => {
    await TestBed.configureTestingModule({
      imports: [HudTop],
    }).compileComponents();

    const fixture = TestBed.createComponent(HudTop);
    const resourceService = TestBed.inject(ResourceService);
    const addSpy = vi.spyOn(resourceService, 'add');
    const consumeSpy = vi.spyOn(resourceService, 'consume');

    fixture.detectChanges();

    clickButton(fixture, 'Collect 25 credits');
    expect(addSpy).toHaveBeenCalledWith('credits', 25);
    expect(visibleText(fixture)).toContain('225');
    expect(fixture.nativeElement.querySelector('[role="status"]')?.textContent).toContain('Collect 25 credits applied.');

    clickButton(fixture, 'Spend 50 credits');
    expect(consumeSpy).toHaveBeenCalledWith('credits', 50);
    expect(visibleText(fixture)).toContain('175');
    expect(fixture.nativeElement.querySelector('[role="status"]')?.textContent).toContain('Spend 50 credits applied.');
  });

  it('preserves displayed state and exposes alert feedback when a service action fails', async () => {
    await TestBed.configureTestingModule({
      imports: [HudTop],
    }).compileComponents();

    const fixture = TestBed.createComponent(HudTop);
    const resourceService = TestBed.inject(ResourceService);
    const addSpy = vi.spyOn(resourceService, 'add');
    const waterBefore = resourceService.getAmount('water');

    fixture.detectChanges();
    clickButton(fixture, 'Overfill water');

    expect(addSpy).toHaveBeenCalledWith('water', 1);
    expect(resourceService.getAmount('water')).toBe(waterBefore);
    expect(visibleText(fixture)).toContain('Water');
    expect(visibleText(fixture)).toContain('100 / 100');
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
      'Adding 1 water would exceed the cap of 100.',
    );
  });
});
