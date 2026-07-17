describe('Converter', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/latest/**', { fixture: 'latest-usd.json' }).as('latest');
    cy.visit('/converter', {
      onBeforeLoad(win) {
        const req = win.indexedDB.deleteDatabase('currency-cache');
        req.onsuccess = () => {};
        req.onerror = () => {};
        (win as any).__CYPRESS_ENV__ = {
          apiBase: 'https://v6.exchangerate-api.com/v6',
          apiKey: 'test-key',
          pollInterval: 60000,
          staleThreshold: 300000,
        };
      },
    });
    cy.wait('@latest');
  });

  it('converts amount', () => {
    cy.get('[data-testid="converter-result"]').should('contain', '0.92 EUR');

    cy.get('.converter__amount input').invoke('val', 100).trigger('input');
    cy.get('[data-testid="converter-result"]').should('contain', '92.00 EUR');
  });

  it('swaps currencies', () => {
    cy.get('#converter-from option:selected').should('have.value', 'USD');
    cy.get('#converter-to option:selected').should('have.value', 'EUR');
    cy.get('[data-testid="converter-result"]').should('contain', '0.92 EUR');

    cy.get('[data-testid="swap-button"]').click();

    cy.get('#converter-from option:selected').should('have.value', 'EUR');
    cy.get('#converter-to option:selected').should('have.value', 'USD');
    cy.get('[data-testid="converter-result"]').should('contain', '1.09 USD');
  });
});
