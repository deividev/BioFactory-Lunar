import { TestBed } from '@angular/core/testing';
import { GameSpeed } from '../../core/enums';
import { GameClockService, ResourceService } from '../../core/services';
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
    expect(text).toContain('Game clock');
    expect(text).toContain('Day 1');
    expect(text).toContain('00:00');
    expect(text).toContain('Speed x1');
  });

  it('renders speed controls for pause, resume, x1, x2, and x4', async () => {
    await TestBed.configureTestingModule({
      imports: [HudTop],
    }).compileComponents();

    const fixture = TestBed.createComponent(HudTop);
    fixture.detectChanges();

    expectButton(fixture, 'Pause');
    expectButton(fixture, 'Resume');
    expectButton(fixture, 'x1');
    expectButton(fixture, 'x2');
    expectButton(fixture, 'x4');
  });

  it('routes clock controls through GameClockService and rerenders the active speed', async () => {
    await TestBed.configureTestingModule({
      imports: [HudTop],
    }).compileComponents();

    const fixture = TestBed.createComponent(HudTop);
    const gameClock = TestBed.inject(GameClockService);
    const setSpeedSpy = vi.spyOn(gameClock, 'setSpeed');
    const pauseSpy = vi.spyOn(gameClock, 'pause');
    const resumeSpy = vi.spyOn(gameClock, 'resume');

    fixture.detectChanges();

    clickButton(fixture, 'x2');
    expect(setSpeedSpy).toHaveBeenCalledWith(GameSpeed.X2);
    expect(visibleText(fixture)).toContain('Speed x2');

    clickButton(fixture, 'Pause');
    expect(pauseSpy).toHaveBeenCalled();
    expect(visibleText(fixture)).toContain('Speed paused');

    clickButton(fixture, 'Resume');
    expect(resumeSpy).toHaveBeenCalled();
    expect(visibleText(fixture)).toContain('Speed x1');
  });

  it('starts and stops runtime clock ticking with the HUD lifecycle', async () => {
    await TestBed.configureTestingModule({
      imports: [HudTop],
    }).compileComponents();

    const gameClock = TestBed.inject(GameClockService);
    const startSpy = vi.spyOn(gameClock, 'start');
    const stopSpy = vi.spyOn(gameClock, 'stop');

    const fixture = TestBed.createComponent(HudTop);
    fixture.detectChanges();

    expect(startSpy).toHaveBeenCalledOnce();

    fixture.destroy();

    expect(stopSpy).toHaveBeenCalledOnce();
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
