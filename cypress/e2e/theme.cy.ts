describe('Theme', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('toggles and persists theme', () => {
    cy.get('html')
      .invoke('attr', 'data-theme')
      .then((initial) => {
        const expected = initial === 'light' ? 'dark' : 'light';

        cy.get('.nav-bar__toggle').click();
        cy.get('html').should('have.attr', 'data-theme', expected);

        cy.reload();
        cy.get('html').should('have.attr', 'data-theme', expected);
      });
  });
});
