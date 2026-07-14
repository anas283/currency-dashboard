# Tranglo Front End Project Assessment — Spec

**Project:** Currency Exchange Rate Dashboard
**Time Frame:** 5 days
**Stack:** Angular

## Overview

Build a Currency Exchange Rate Dashboard application with real-time rates, historical trend analysis, currency conversion, filtering/search, offline support, and dynamic theming — following Angular best practices with full test coverage and CI/CD.

---

## 1. Core Features

### 1.1 Real-Time Exchange Rates
- Fetch real-time exchange rates from a public API (e.g., ExchangeRateAPI).
- Display rates in a **sortable table** with columns:
  - Currency code
  - Exchange rate
  - Base currency

### 1.2 Historical Trends Analysis
- Allow users to compare exchange rate trends for **up to 3 selected currencies** over the past month.
- Toggle to switch data aggregation: **daily / weekly / monthly**.
- Display trend as a **dynamic chart** (Chart.js or D3.js).

### 1.3 Currency Conversion Calculator
- Input: amount + two currencies (from / to).
- Calculate equivalent value using latest exchange rates.

### 1.4 Filtering and Search
- Filter by currency.
- Search bar to quickly find specific currencies.

---

## 2. Advanced Features

### 2.1 Real-Time Updates
- Use WebSockets or a polling mechanism to refresh exchange rates in real time.
- Optimize polling intervals to reduce API calls without compromising UX.

### 2.2 Offline Mode
- Cache last fetched exchange rates and historical data using **IndexedDB** or **localStorage**.
- Allow interaction with cached data when offline.
- Clearly indicate when displayed data is not live.

### 2.3 Dynamic Theming
- Toggle between **light** and **dark** themes.

---

## 3. Quality Requirements

### 3.1 Code Structure
- Modular architecture.
- Angular best practices: reusable components, separation of concerns.

### 3.2 Testing
- Unit tests for services, components, and utilities using **Jasmine** and **Karma**.
- E2E tests using **Cypress** or **Protractor**, covering key user interactions.

### 3.3 CI/CD Integration
- Basic CI/CD pipeline script to: lint → test → build → deploy to staging.

### 3.4 Documentation
- `README.md` with:
  - Setup instructions
  - Architecture decisions
  - Usage details

---

## 4. Deliverables

- [ ] Working Angular project hosted on GitHub.
- [ ] Unit and E2E test cases included in the repository.
- [ ] A workable version of the application.
- [ ] Email the GitHub link to Tranglo before the interview.
