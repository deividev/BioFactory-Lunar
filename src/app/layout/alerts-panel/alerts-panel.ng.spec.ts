import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AlertType } from '../../core/enums';
import { GameStateService } from '../../core/services';
import { AlertsPanel } from './alerts-panel';

describe('AlertsPanel Angular component', () => {
  it('renders the state-backed empty alert state', async () => {
    await TestBed.configureTestingModule({
      imports: [AlertsPanel],
    }).compileComponents();

    const fixture = TestBed.createComponent(AlertsPanel);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Alerts');
    expect(fixture.nativeElement.textContent).toContain('0');
    expect(fixture.nativeElement.textContent).toContain('No active alerts.');
  });

  it('renders active alerts and ignores dismissed alerts from state', async () => {
    const alerts = signal([
      {
        id: 'alert_energy_low',
        type: AlertType.Warning,
        message: 'Energy reserves low.',
        createdAt: '2026-01-01T00:00:00.000Z',
        dismissed: false,
      },
      {
        id: 'alert_old',
        type: AlertType.Info,
        message: 'Dismissed setup alert.',
        createdAt: '2026-01-01T00:00:00.000Z',
        dismissed: true,
      },
    ]);

    await TestBed.configureTestingModule({
      imports: [AlertsPanel],
      providers: [
        {
          provide: GameStateService,
          useValue: { alerts },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(AlertsPanel);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('1');
    expect(fixture.nativeElement.textContent).toContain('Energy reserves low.');
    expect(fixture.nativeElement.textContent).not.toContain('Dismissed setup alert.');
    expect(fixture.nativeElement.querySelector('[data-tone="warning"]')).toBeInstanceOf(HTMLElement);
  });
});
