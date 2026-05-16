import { TestBed } from '@angular/core/testing';
import { ResourceService } from '../../core/services';
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

describe('HudTop Angular component', () => {
  it('renders the current resource balances from ResourceService', async () => {
    await TestBed.configureTestingModule({
      imports: [HudTop],
    }).compileComponents();

    const fixture = TestBed.createComponent(HudTop);
    fixture.detectChanges();
    const text = visibleText(fixture);

    expect(text).toContain('Biofactory: Lunar');
    expect(text).toContain('HUD placeholder online');
    expect(text).toContain('Credits');
    expect(text).toContain('200');
    expect(text).toContain('Energy');
    expect(text).toContain('100 / 100');
    expect(text).toContain('Water');
    expect(text).toContain('Nutrients');
    expect(text).toContain('20 / 100');
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
