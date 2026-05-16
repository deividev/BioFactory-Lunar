import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PhaserGame, PHASER_GAME_FACTORY } from '../../game/phaser/phaser-game';
import { ResourceService } from '../../core/services';
import { GameShell } from './game-shell';

@Component({
  selector: 'app-phaser-game',
  template: '<div aria-label="Stub Phaser visual layer">Stub Phaser layer</div>'
})
class StubPhaserGame {}

describe('GameShell Angular component', () => {
  it('composes the state-backed HUD and preserves the Phaser visual host', async () => {
    await TestBed.configureTestingModule({
      imports: [GameShell]
    })
      .overrideComponent(GameShell, {
        remove: { imports: [PhaserGame] },
        add: { imports: [StubPhaserGame] }
      })
      .compileComponents();

    const fixture = TestBed.createComponent(GameShell);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Biofactory: Lunar');
    expect(text).toContain('HUD placeholder online');
    expect(text).toContain('Credits');
    expect(text).toContain('200');
    expect(text).toContain('Storage placeholder online');
    expect(text).toContain('Protein Leaf Seed');
    expect(text).toContain('Stub Phaser layer');
  });

  it('lets HUD actions update resource state through ResourceService inside the shell', async () => {
    await TestBed.configureTestingModule({
      imports: [GameShell]
    })
      .overrideComponent(GameShell, {
        remove: { imports: [PhaserGame] },
        add: { imports: [StubPhaserGame] }
      })
      .compileComponents();

    const fixture = TestBed.createComponent(GameShell);
    const resourceService = TestBed.inject(ResourceService);
    const addSpy = vi.spyOn(resourceService, 'add');

    fixture.detectChanges();

    const collectCredits = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).find((button) =>
      button.textContent?.includes('Collect 25 credits'),
    );

    expect(collectCredits).toBeTruthy();

    collectCredits?.click();
    fixture.detectChanges();

    expect(addSpy).toHaveBeenCalledWith('credits', 25);
    expect(resourceService.getAmount('credits')).toBe(225);
    expect(fixture.nativeElement.textContent).toContain('225');
    expect(fixture.nativeElement.textContent).toContain('Stub Phaser layer');
  });

  it('renders the real Phaser host when a safe Phaser factory is provided', async () => {
    await TestBed.configureTestingModule({
      imports: [GameShell],
      providers: [
        {
          provide: PHASER_GAME_FACTORY,
          useValue: () => ({ destroy: () => undefined })
        }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(GameShell);
    fixture.detectChanges();

    const phaserHost = fixture.nativeElement.querySelector('#phaser-container') as HTMLElement | null;
    expect(phaserHost?.getAttribute('aria-label')).toBe('Phaser visual layer placeholder');
  });
});
