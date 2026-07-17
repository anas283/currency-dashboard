describe('Rates', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/latest/**', { fixture: 'latest-usd.json' }).as('latest');
    cy.visit('/rates', {
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

  it('populates the table', () => {
    cy.get('.rates-table__row').should('have.length', 30);
    cy.get('.rates-table__row').first().find('.rates-table__code').should('contain', 'USD');
  });

  it('filters rows by search', () => {
    cy.get('.rates-table__search input').type('EUR');
    cy.get('.rates-table__row').should('have.length', 1);
    cy.get('.rates-table__code').should('contain', 'EUR');

    cy.get('.rates-table__search input').clear().type('Euro');
    cy.get('.rates-table__row').should('have.length', 1);
  });

  it('toggles sort', () => {
    cy.get('.rates-table__row').should('have.length', 30);

    cy.get('th[appsortheader][sortKey="code"] .sort-header__button').click();
    cy.get('.rates-table__row').first().find('.rates-table__code').should('contain', 'AED');

    cy.get('th[appsortheader][sortKey="code"] .sort-header__button').click();
    cy.get('.rates-table__row').first().find('.rates-table__code').should('contain', 'ZAR');

    cy.get('th[appsortheader][sortKey="code"] .sort-header__button').click();
    cy.get('.rates-table__row').first().find('.rates-table__code').should('contain', 'USD');
  });

  it('toggles Top 30 / All', () => {
    cy.get('.rates-table__row').should('have.length', 30);
    cy.get('.rates-table__toggle button').contains('All').click();
    cy.get('.rates-table__row').should('have.length', 33);
    cy.get('.rates-table__toggle button').contains('Top 30').click();
    cy.get('.rates-table__row').should('have.length', 30);
  });

  it('navigates to trends on row click', () => {
    cy.contains('.rates-table__row', 'EUR').click();
    cy.url().should('include', '/trends');
    cy.url().should('include', 'target=EUR');
  });
});
