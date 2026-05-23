import { TestBed } from '@angular/core/testing';

import { MachineState } from '../../core/enums';
import { GameStateService, ProductionService } from '../../core/services';
import { Processing } from './processing';

describe('Processing Angular component', () => {
  async function renderProcessing() {
    await TestBed.configureTestingModule({
      imports: [Processing],
    }).compileComponents();

    const fixture = TestBed.createComponent(Processing);
    const gameState = TestBed.inject(GameStateService);
    const productionService = TestBed.inject(ProductionService);
    fixture.detectChanges();

    return { fixture, gameState, productionService };
  }

  function textContent(fixture: ReturnType<typeof TestBed.createComponent<Processing>>): string {
    return fixture.nativeElement.textContent as string;
  }

  function queryButton(
    fixture: ReturnType<typeof TestBed.createComponent<Processing>>,
    label: string,
  ): HTMLButtonElement | undefined {
    return Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).find((btn) =>
      btn.textContent?.trim().includes(label),
    );
  }

  it('renders machine names and idle state for both machines', async () => {
    const { fixture } = await renderProcessing();
    const text = textContent(fixture);

    expect(text).toContain('Botanical Extractor');
    expect(text).toContain('Orbital Packager');
    expect(text).toContain('idle');
  });

  it('renders a recipe select for each idle machine', async () => {
    const { fixture } = await renderProcessing();
    const selects = fixture.nativeElement.querySelectorAll('select') as NodeListOf<HTMLSelectElement>;

    expect(selects.length).toBe(2);
  });

  it('botanical extractor select lists its two compatible recipes', async () => {
    const { fixture } = await renderProcessing();
    const text = textContent(fixture);

    expect(text).toContain('Aqua Sprout to Nutrient Mix');
    expect(text).toContain('Luma Moss to Glow Pigment');
  });

  it('orbital packager select lists its compatible recipe', async () => {
    const { fixture } = await renderProcessing();
    const text = textContent(fixture);

    expect(text).toContain('Protein Leaf to Biofood Pack');
  });

  it('start buttons are disabled when no recipe is selected', async () => {
    const { fixture } = await renderProcessing();
    const startBtns = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).filter((btn) => btn.textContent?.trim().includes('Start'));

    expect(startBtns.length).toBeGreaterThan(0);
    startBtns.forEach((btn) => expect(btn.disabled).toBe(true));
  });

  it('start button stays disabled when recipe selected but inputs not in inventory', async () => {
    const { fixture } = await renderProcessing();
    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    select.value = 'recipe_aqua_sprout_to_nutrient_mix';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const startBtn = queryButton(fixture, 'Start');
    expect(startBtn?.disabled).toBe(true);
  });

  it('start button is enabled when recipe selected and inputs/resources are affordable', async () => {
    const { fixture, gameState } = await renderProcessing();
    gameState.updateInventory((inv) => ({ ...inv, items: { ...inv.items, aqua_sprout: 2 } }));
    gameState.updateResources((res) => ({
      ...res,
      values: { ...res.values, water: 2, energy: 5, nutrients: 1 },
    }));

    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    select.value = 'recipe_aqua_sprout_to_nutrient_mix';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const startBtn = queryButton(fixture, 'Start');
    expect(startBtn?.disabled).toBe(false);
  });

  it('clicking start calls productionService.startRecipe and shows success feedback', async () => {
    const { fixture, gameState, productionService } = await renderProcessing();
    const spy = vi.spyOn(productionService, 'startRecipe').mockReturnValue({ success: true });

    gameState.updateInventory((inv) => ({ ...inv, items: { ...inv.items, aqua_sprout: 2 } }));
    gameState.updateResources((res) => ({
      ...res,
      values: { ...res.values, water: 2, energy: 5, nutrients: 1 },
    }));

    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    select.value = 'recipe_aqua_sprout_to_nutrient_mix';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    queryButton(fixture, 'Start')?.click();
    fixture.detectChanges();

    expect(spy).toHaveBeenCalledWith('machine_botanical_extractor_01', 'recipe_aqua_sprout_to_nutrient_mix');
    expect(textContent(fixture)).toContain('Started!');
  });

  it('shows error feedback when startRecipe returns failure', async () => {
    const { fixture, gameState, productionService } = await renderProcessing();
    vi.spyOn(productionService, 'startRecipe').mockReturnValue({
      success: false,
      code: 'insufficient_inputs',
      message: 'Not enough aqua_sprout.',
    });

    gameState.updateInventory((inv) => ({ ...inv, items: { ...inv.items, aqua_sprout: 2 } }));
    gameState.updateResources((res) => ({
      ...res,
      values: { ...res.values, water: 2, energy: 5, nutrients: 1 },
    }));

    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    select.value = 'recipe_aqua_sprout_to_nutrient_mix';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    queryButton(fixture, 'Start')?.click();
    fixture.detectChanges();

    expect(textContent(fixture)).toContain('Not enough aqua_sprout.');
  });

  it('renders running machine with recipe name, countdown, and progress bar', async () => {
    const { fixture, gameState } = await renderProcessing();
    gameState.updateMachines((machines) =>
      machines.map((m) =>
        m.id === 'machine_botanical_extractor_01'
          ? {
              ...m,
              state: MachineState.Running,
              currentRecipeId: 'recipe_aqua_sprout_to_nutrient_mix',
              remainingSeconds: 30,
              durationSeconds: 75,
            }
          : m,
      ),
    );
    fixture.detectChanges();

    const text = textContent(fixture);
    expect(text).toContain('Aqua Sprout to Nutrient Mix');
    expect(text).toContain('30s remaining');
    expect(text).toContain('running');

    const progressBar = fixture.nativeElement.querySelector('[role="progressbar"]') as HTMLElement;
    expect(progressBar).not.toBeNull();
    // durationSeconds=75, remaining=30 → 60% progress
    expect(progressBar.getAttribute('aria-valuenow')).toBe('60');
  });

  it('hides recipe select and start button for running machine', async () => {
    const { fixture, gameState } = await renderProcessing();
    gameState.updateMachines((machines) =>
      machines.map((m) =>
        m.id === 'machine_botanical_extractor_01'
          ? { ...m, state: MachineState.Running, currentRecipeId: 'recipe_aqua_sprout_to_nutrient_mix', remainingSeconds: 10, durationSeconds: 75 }
          : m,
      ),
    );
    fixture.detectChanges();

    // Only the idle Orbital Packager should have a select now
    const selects = fixture.nativeElement.querySelectorAll('select') as NodeListOf<HTMLSelectElement>;
    expect(selects.length).toBe(1);
  });

  it('renders completed machine with output item name and collect button', async () => {
    const { fixture, gameState } = await renderProcessing();
    gameState.updateMachines((machines) =>
      machines.map((m) =>
        m.id === 'machine_botanical_extractor_01'
          ? {
              ...m,
              state: MachineState.Completed,
              currentRecipeId: 'recipe_aqua_sprout_to_nutrient_mix',
              remainingSeconds: 0,
              durationSeconds: 75,
              outputPending: [{ itemId: 'nutrient_mix', quantity: 1 }],
            }
          : m,
      ),
    );
    fixture.detectChanges();

    const text = textContent(fixture);
    expect(text).toContain('completed');
    expect(text).toContain('Nutrient Mix');

    const collectBtn = queryButton(fixture, 'Collect');
    expect(collectBtn).not.toBeUndefined();
  });

  it('clicking collect calls productionService.collectOutput and shows success feedback', async () => {
    const { fixture, gameState, productionService } = await renderProcessing();
    const spy = vi.spyOn(productionService, 'collectOutput').mockReturnValue({ success: true });

    gameState.updateMachines((machines) =>
      machines.map((m) =>
        m.id === 'machine_botanical_extractor_01'
          ? { ...m, state: MachineState.Completed, outputPending: [{ itemId: 'nutrient_mix', quantity: 1 }] }
          : m,
      ),
    );
    fixture.detectChanges();

    queryButton(fixture, 'Collect')?.click();
    fixture.detectChanges();

    expect(spy).toHaveBeenCalledWith('machine_botanical_extractor_01');
    expect(textContent(fixture)).toContain('Collected!');
  });

  it('shows error feedback when collectOutput returns failure', async () => {
    const { fixture, gameState, productionService } = await renderProcessing();
    vi.spyOn(productionService, 'collectOutput').mockReturnValue({
      success: false,
      code: 'inventory_full',
      message: 'Inventory is full.',
    });

    gameState.updateMachines((machines) =>
      machines.map((m) =>
        m.id === 'machine_botanical_extractor_01'
          ? { ...m, state: MachineState.Completed, outputPending: [{ itemId: 'nutrient_mix', quantity: 1 }] }
          : m,
      ),
    );
    fixture.detectChanges();

    queryButton(fixture, 'Collect')?.click();
    fixture.detectChanges();

    expect(textContent(fixture)).toContain('Inventory is full.');
  });
});
