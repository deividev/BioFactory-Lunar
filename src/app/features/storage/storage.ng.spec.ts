import { TestBed } from '@angular/core/testing';

import { InventoryService } from '../../core/services';
import { Storage } from './storage';

describe('Storage Angular component', () => {
  async function renderStorage() {
    await TestBed.configureTestingModule({
      imports: [Storage],
    }).compileComponents();

    const fixture = TestBed.createComponent(Storage);
    const inventoryService = TestBed.inject(InventoryService);
    fixture.detectChanges();

    return { fixture, inventoryService };
  }

  function textContent(fixture: ReturnType<typeof TestBed.createComponent<Storage>>): string {
    return fixture.nativeElement.textContent;
  }

  function clickButton(fixture: ReturnType<typeof TestBed.createComponent<Storage>>, label: string): void {
    const button = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).find(
      (candidate) => candidate.textContent?.includes(label),
    );

    expect(button).toBeInstanceOf(HTMLButtonElement);

    button?.click();
    fixture.detectChanges();
  }

  function iconSources(fixture: ReturnType<typeof TestBed.createComponent<Storage>>, selector: string): string[] {
    return Array.from(fixture.nativeElement.querySelectorAll(selector) as NodeListOf<HTMLImageElement>).map(
      (element) => element.getAttribute('src') ?? '',
    );
  }

  it('renders current inventory quantities and capacity from InventoryService', async () => {
    const { fixture } = await renderStorage();
    const text = textContent(fixture);

    expect(text).not.toContain('Storage placeholder online');
    expect(text).toContain('Storage');
    expect(text).toContain('Inventory');
    expect(text).toContain('Used capacity');
    expect(text).toContain('Shipments');
    expect(text).toContain('0 / 100');
    expect(text).toContain('Protein Leaf Seed');
    expect(text).toContain('0');
    expect(text).toContain('Biofood Pack');
    expect(text).toContain('0');
    expect(iconSources(fixture, '.storage__item-icon')).toEqual([
      'assets/ui/icons/seeds/ui_icon_seed_protein_leaf.png',
      'assets/ui/icons/seeds/ui_icon_seed_aqua_sprout.png',
      'assets/ui/icons/seeds/ui_icon_spore_luma_moss.png',
      'assets/ui/icons/inventory/ui_icon_protein_leaf.png',
      'assets/ui/icons/inventory/ui_icon_aqua_sprout.png',
      'assets/ui/icons/inventory/ui_icon_luma_moss.png',
      'assets/ui/icons/inventory/ui_icon_biofood_pack.png',
      'assets/ui/icons/inventory/ui_icon_nutrient_mix.png',
      'assets/ui/icons/inventory/ui_icon_glow_pigment.png',
    ]);
    expect(iconSources(fixture, '.storage__action-icon')).toEqual([
      'assets/ui/icons/actions/ui_icon_action_buy.png',
      'assets/ui/icons/actions/ui_icon_action_plant.png',
      'assets/ui/icons/ui_icon_state_blocked.png',
    ]);
    expect(iconSources(fixture, '.storage__workflow-icon')).toEqual([
      'assets/ui/icons/actions/ui_icon_shipments.png',
      'assets/ui/icons/actions/ui_icon_action_plant.png',
      'assets/ui/icons/actions/ui_icon_action_harvest.png',
      'assets/ui/icons/actions/ui_icon_action_process.png',
    ]);
    expect(iconSources(fixture, '.storage__feedback-icon')).toEqual(['assets/ui/icons/ui_icon_state_success.png']);
  });

  it('updates item quantities and capacity through InventoryService actions', async () => {
    const { fixture, inventoryService } = await renderStorage();
    const addSpy = vi.spyOn(inventoryService, 'addItem');
    const consumeSpy = vi.spyOn(inventoryService, 'consumeItem');

    clickButton(fixture, 'Add 3 protein seeds');

    expect(addSpy).toHaveBeenCalledWith('seed_protein_leaf', 3);
    expect(inventoryService.getQuantity('seed_protein_leaf')).toBe(3);
    expect(textContent(fixture)).toContain('3 / 100');
    expect(textContent(fixture)).toContain('Add 3 protein seeds applied.');

    clickButton(fixture, 'Consume 1 protein seed');

    expect(consumeSpy).toHaveBeenCalledWith('seed_protein_leaf', 1);
    expect(inventoryService.getQuantity('seed_protein_leaf')).toBe(2);
    expect(textContent(fixture)).toContain('2 / 100');
    expect(textContent(fixture)).toContain('Consume 1 protein seed applied.');
  });

  it('preserves inventory state and exposes feedback after rejected storage actions', async () => {
    const { fixture, inventoryService } = await renderStorage();
    inventoryService.addItem('seed_protein_leaf', 2);
    fixture.detectChanges();

    clickButton(fixture, 'Overfill storage');

    expect(inventoryService.getQuantity('biofood_pack')).toBe(0);
    expect(inventoryService.usedCapacity()).toBe(2);
    expect(textContent(fixture)).toContain('2 / 100');
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
      'Adding 99 biofood_pack would exceed inventory capacity of 100.',
    );
    expect(iconSources(fixture, '.storage__feedback-icon')).toEqual(['assets/ui/icons/ui_icon_state_warning.png']);
  });
});
