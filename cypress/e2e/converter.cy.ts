describe('Converter', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/latest/**', { fixture: 'latest-usd.json' }).as('latest');
    cy.intercept('GET', '**/pair/**', { statusCode: 500, body: {} }).as('pair');
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
    cy.get('[data-testid="converter-result"]').should('contain', '211.86USD');

    cy.get('.converter__amount input').invoke('val', 100).trigger('input');
    cy.get('[data-testid="converter-result"]').should('contain', '21.19USD');
  });

  it('swaps currencies', () => {
    cy.get('#converter-from option:selected').should('have.value', 'MYR');
    cy.get('#converter-to option:selected').should('have.value', 'USD');
    cy.get('[data-testid="converter-result"]').should('contain', '211.86USD');

    cy.get('[data-testid="swap-button"]').click();

    cy.get('#converter-from option:selected').should('have.value', 'USD');
    cy.get('#converter-to option:selected').should('have.value', 'MYR');
    cy.get('[data-testid="converter-result"]').should('contain', '4,720.00MYR');
  });
});
