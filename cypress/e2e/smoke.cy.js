describe('Smoke', () => {
  it('loads the home page', () => {
    cy.visit('/');
    cy.contains('CurrencyDashboard');
    cy.get('.home__sidebar app-converter').should('exist');
  });
});
