describe('Offline', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/latest/**', { statusCode: 500 }).as('latest');
    cy.visit('/', {
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

  it('shows offline indicator on API failure', () => {
    cy.get('app-offline-indicator app-badge .badge')
      .should('have.class', 'badge--negative')
      .and('contain', 'Offline');
  });
});
