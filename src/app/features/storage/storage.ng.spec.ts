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

  it('renders current inventory quantities and capacity from InventoryService', async () => {
    const { fixture } = await renderStorage();
    const text = textContent(fixture);

    expect(text).toContain('Storage placeholder online');
    expect(text).toContain('Inventory');
    expect(text).toContain('Used capacity');
    expect(text).toContain('2 / 100');
    expect(text).toContain('Protein Leaf Seed');
    expect(text).toContain('2');
    expect(text).toContain('Biofood Pack');
    expect(text).toContain('0');
  });

  it('updates item quantities and capacity through InventoryService actions', async () => {
    const { fixture, inventoryService } = await renderStorage();
    const addSpy = vi.spyOn(inventoryService, 'addItem');
    const consumeSpy = vi.spyOn(inventoryService, 'consumeItem');

    clickButton(fixture, 'Add 3 protein seeds');

    expect(addSpy).toHaveBeenCalledWith('seed_protein_leaf', 3);
    expect(inventoryService.getQuantity('seed_protein_leaf')).toBe(5);
    expect(textContent(fixture)).toContain('5 / 100');
    expect(textContent(fixture)).toContain('Add 3 protein seeds applied.');

    clickButton(fixture, 'Consume 1 protein seed');

    expect(consumeSpy).toHaveBeenCalledWith('seed_protein_leaf', 1);
    expect(inventoryService.getQuantity('seed_protein_leaf')).toBe(4);
    expect(textContent(fixture)).toContain('4 / 100');
    expect(textContent(fixture)).toContain('Consume 1 protein seed applied.');
  });

  it('preserves inventory state and exposes feedback after rejected storage actions', async () => {
    const { fixture, inventoryService } = await renderStorage();

    clickButton(fixture, 'Overfill storage');

    expect(inventoryService.getQuantity('biofood_pack')).toBe(0);
    expect(inventoryService.usedCapacity()).toBe(2);
    expect(textContent(fixture)).toContain('2 / 100');
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
      'Adding 99 biofood_pack would exceed inventory capacity of 100.',
    );
  });
});
