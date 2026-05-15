import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PhaserGame, PHASER_GAME_FACTORY } from '../../game/phaser/phaser-game';
import { GameShell } from './game-shell';

@Component({
  selector: 'app-phaser-game',
  template: '<div aria-label="Stub Phaser visual layer">Stub Phaser layer</div>'
})
class StubPhaserGame {}

describe('GameShell Angular component', () => {
  it('renders user-visible shell and visual layer status text', async () => {
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
    expect(text).toContain('Angular shell ready');
    expect(text).toContain('Stub Phaser layer');
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
