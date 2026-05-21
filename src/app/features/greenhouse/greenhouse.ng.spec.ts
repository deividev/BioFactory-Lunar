import { TestBed } from '@angular/core/testing';

import { CropSlotState } from '../../core/enums';
import { CropService, GameStateService } from '../../core/services';
import { Greenhouse } from './greenhouse';

describe('Greenhouse Angular component', () => {
  async function renderGreenhouse() {
    await TestBed.configureTestingModule({
      imports: [Greenhouse],
    }).compileComponents();

    const fixture = TestBed.createComponent(Greenhouse);
    const gameState = TestBed.inject(GameStateService);
    const cropService = TestBed.inject(CropService);
    fixture.detectChanges();

    return { fixture, gameState, cropService };
  }

  function textContent(fixture: ReturnType<typeof TestBed.createComponent<Greenhouse>>): string {
    return fixture.nativeElement.textContent as string;
  }

  function queryButton(
    fixture: ReturnType<typeof TestBed.createComponent<Greenhouse>>,
    label: string,
  ): HTMLButtonElement | undefined {
    return Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((btn) => btn.textContent?.trim().includes(label));
  }

  it('renders four slot cards with IDs and empty state crop selectors', async () => {
    const { fixture } = await renderGreenhouse();
    const text = textContent(fixture);

    expect(text).toContain('crop_slot_01');
    expect(text).toContain('crop_slot_02');
    expect(text).toContain('crop_slot_03');
    expect(text).toContain('crop_slot_04');
    expect(text).toContain('Protein Leaf');
    expect(text).toContain('Aqua Sprout');
    expect(text).toContain('Luma Moss');
    expect((fixture.nativeElement.querySelectorAll('select') as NodeListOf<HTMLSelectElement>).length).toBe(4);
  });

  it('plant button calls CropService.plantCrop with slot and selected crop, shows success feedback', async () => {
    const { fixture, cropService } = await renderGreenhouse();
    const plantSpy = vi.spyOn(cropService, 'plantCrop').mockReturnValue({ success: true });

    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    select.value = 'protein_leaf';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    queryButton(fixture, 'Plant')?.click();
    fixture.detectChanges();

    expect(plantSpy).toHaveBeenCalledWith('crop_slot_01', 'protein_leaf');
    expect(textContent(fixture)).toContain('Planted!');
  });

  it('shows error feedback when no crop is selected before clicking plant', async () => {
    const { fixture } = await renderGreenhouse();

    queryButton(fixture, 'Plant')?.click();
    fixture.detectChanges();

    expect(textContent(fixture)).toContain('Select a crop first.');
  });

  it('shows error feedback when CropService.plantCrop returns failure', async () => {
    const { fixture, cropService } = await renderGreenhouse();
    vi.spyOn(cropService, 'plantCrop').mockReturnValue({
      success: false,
      code: 'insufficient_seed',
      message: 'No seed available for protein_leaf.',
    });

    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    select.value = 'protein_leaf';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    queryButton(fixture, 'Plant')?.click();
    fixture.detectChanges();

    expect(textContent(fixture)).toContain('No seed available for protein_leaf.');
  });

  it('renders crop name, remaining seconds, and progress bar for a planted slot', async () => {
    const { fixture, gameState } = await renderGreenhouse();

    gameState.updateGreenhouse((gh) => ({
      ...gh,
      slots: gh.slots.map((slot) =>
        slot.id === 'crop_slot_01'
          ? { ...slot, state: CropSlotState.Planted, cropId: 'protein_leaf', remainingSeconds: 45 }
          : slot,
      ),
    }));
    fixture.detectChanges();

    const text = textContent(fixture);
    expect(text).toContain('Protein Leaf');
    expect(text).toContain('45s remaining');

    const progressBar = fixture.nativeElement.querySelector('[role="progressbar"]') as HTMLElement;
    expect(progressBar).not.toBeNull();
    // growthSeconds=90, remaining=45 → 50% progress
    expect(progressBar.getAttribute('aria-valuenow')).toBe('50');
  });

  it('renders ready state with crop name and a harvest button for a ready slot', async () => {
    const { fixture, gameState } = await renderGreenhouse();

    gameState.updateGreenhouse((gh) => ({
      ...gh,
      slots: gh.slots.map((slot) =>
        slot.id === 'crop_slot_02'
          ? { ...slot, state: CropSlotState.Ready, cropId: 'aqua_sprout', remainingSeconds: 0 }
          : slot,
      ),
    }));
    fixture.detectChanges();

    const text = textContent(fixture);
    expect(text).toContain('Aqua Sprout — Ready');
    expect(queryButton(fixture, 'Harvest')).not.toBeUndefined();
  });

  it('harvest button calls CropService.harvestCrop with slot ID and shows success feedback', async () => {
    const { fixture, gameState, cropService } = await renderGreenhouse();

    gameState.updateGreenhouse((gh) => ({
      ...gh,
      slots: gh.slots.map((slot) =>
        slot.id === 'crop_slot_01'
          ? { ...slot, state: CropSlotState.Ready, cropId: 'protein_leaf', remainingSeconds: 0 }
          : slot,
      ),
    }));
    fixture.detectChanges();

    const harvestSpy = vi.spyOn(cropService, 'harvestCrop').mockReturnValue({ success: true });
    queryButton(fixture, 'Harvest')?.click();
    fixture.detectChanges();

    expect(harvestSpy).toHaveBeenCalledWith('crop_slot_01');
    expect(textContent(fixture)).toContain('Harvested!');
  });

  it('shows error feedback when CropService.harvestCrop returns failure', async () => {
    const { fixture, gameState, cropService } = await renderGreenhouse();

    gameState.updateGreenhouse((gh) => ({
      ...gh,
      slots: gh.slots.map((slot) =>
        slot.id === 'crop_slot_01'
          ? { ...slot, state: CropSlotState.Ready, cropId: 'protein_leaf', remainingSeconds: 0 }
          : slot,
      ),
    }));
    fixture.detectChanges();

    vi.spyOn(cropService, 'harvestCrop').mockReturnValue({
      success: false,
      code: 'slot_not_ready',
      message: 'Slot crop_slot_01 is not ready to harvest.',
    });
    queryButton(fixture, 'Harvest')?.click();
    fixture.detectChanges();

    expect(textContent(fixture)).toContain('Slot crop_slot_01 is not ready to harvest.');
  });
});
