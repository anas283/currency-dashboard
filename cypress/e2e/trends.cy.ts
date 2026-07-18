function setupWindow(win: Cypress.AUTWindow): void {
  const req = win.indexedDB.deleteDatabase('currency-cache');
  req.onsuccess = () => {};
  req.onerror = () => {};
  (win as any).__CYPRESS_ENV__ = {
    apiBase: 'https://v6.exchangerate-api.com/v6',
    apiKey: 'test-key',
    pollInterval: 60000,
    staleThreshold: 300000,
  };
}

describe('Trends', () => {
  beforeEach(() => {
    cy.intercept('GET', /\/history\/[^/]+\/\d{4}\/\d{2}\/\d{2}$/, { fixture: 'history-usd.json' }).as('history');
    cy.intercept('GET', '**/latest/**', { fixture: 'latest-usd.json' }).as('latest');

    cy.visit('/trends', {
      onBeforeLoad: setupWindow,
    });

    cy.wait('@history');
    cy.wait('@latest');
  });

  it('loads and shows base currency', () => {
    cy.get('.trends__base').should('contain', 'MYR');
    cy.get('.trends__empty').should('contain', 'Select a currency to view trends.');
  });

  it('selects a currency and shows chart with data', () => {
    cy.get('[data-testid="currency-EUR"]').click();
    cy.get('.trends__chart', { timeout: 15000 }).should('exist');
    cy.get('.trends__chart app-chart').should('exist');
    cy.get('.trends__chart app-chart .chart-legend').should('contain', 'EUR');
    cy.get('.trends__chart + table.visually-hidden').as('trendsTable');
    cy.get('@trendsTable').should('exist');
    cy.get('@trendsTable').find('tbody tr').should('have.length', 1);
    cy.get('@trendsTable').find('tbody tr th').should('contain', 'EUR');
  });

  it('shows max-selection hint at limit', () => {
    cy.get('[data-testid="currency-EUR"]').click();
    cy.get('[data-testid="currency-GBP"]').click();
    cy.get('[data-testid="currency-JPY"]').click();

    cy.get('.trends__hint', { timeout: 15000 }).should('contain', 'up to 3 currencies');
    cy.get('[data-testid="currency-AUD"] button').should('be.disabled');
  });

  it('toggles aggregation and reduces data points', () => {
    cy.get('[data-testid="currency-EUR"]').click();
    cy.get('.trends__chart + table.visually-hidden thead th', { timeout: 15000 }).should('have.length.greaterThan', 10);

    cy.get('.trends__chart + table.visually-hidden thead th').then(($dailyThs) => {
      const dailyCount = $dailyThs.length;

      cy.get('[data-testid="aggregation-weekly"]').click();
      cy.get('.trends__chart + table.visually-hidden thead th', { timeout: 15000 }).should(($weeklyThs) => {
        expect($weeklyThs.length).to.be.lessThan(dailyCount);
      });
    });
  });

  it('pre-selects currency when navigating from rates', () => {
    cy.visit('/rates', {
      onBeforeLoad: setupWindow,
    });

    cy.wait('@latest');
    cy.contains('.rates-table__row', 'EUR').click();
    cy.url().should('include', '/trends');
    cy.url().should('include', 'target=EUR');

    cy.get('[data-testid="currency-EUR"] button', { timeout: 15000 }).should('have.class', 'btn--primary');
    cy.get('.trends__chart', { timeout: 15000 }).should('exist');
  });
});
