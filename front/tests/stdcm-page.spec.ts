import { test, expect } from '@playwright/test';
import { PlaywrightHomePage } from './home-page-model';
import { projects } from './assets/operationStudies/project.json';
import { studies } from './assets/operationStudies/study.json';
import { scenarios } from './assets/operationStudies/scenario.json';
import { light_rolling_stock, rolling_stock } from './assets/common/rollingStock.json';
import { PlaywrightSTDCMPage } from './stdcm-page-model';

// Describe the test suite for the STDCM page
test.describe('STDCM page', () => {
  // Declare the necessary variables for the test suite
  let playwrightHomePage: PlaywrightHomePage;
  let playwrightSTDCMPage: PlaywrightSTDCMPage;

  // This function will run before all the tests in this suite
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();

    // Create an instance of the PlaywrightHomePage class
    playwrightHomePage = new PlaywrightHomePage(page);

    // Create an instance of the PlaywrightSTDCMPage class
    playwrightSTDCMPage = new PlaywrightSTDCMPage(page);

    // Go to the home page of OSDR
    await playwrightHomePage.goToHomePage();

    await playwrightHomePage.goToSTDCMPage();

    // Intercept the list of projects request and return data test results
    await playwrightSTDCMPage.page.route('**/projects/*', async (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify(projects),
      });
    });

    // Intercept the list of studies request and return data test results
    await playwrightSTDCMPage.page.route('**/projects/*/studies/*', async (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify(studies),
      });
    });

    // Intercept the list of scenarios request and return data test results
    await playwrightSTDCMPage.page.route('**/projects/*/studies/*/scenarios/*', async (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify(scenarios),
      });
    });

    // Intercept the list of light rolling stock request and return data test results
    await playwrightSTDCMPage.page.route('**/light_rolling_stock/*', async (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify(light_rolling_stock),
      });
    });
    // Intercept a single rolling stock request and return data test results
    await playwrightSTDCMPage.page.route('**/rolling_stock/*/', async (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify(rolling_stock),
      });
    });

    await playwrightSTDCMPage.getScenarioExploratorModalClose();

    // Opens the scenario explorator and selects project, study and scenario
    await playwrightSTDCMPage.openScenarioExplorator();
    await playwrightSTDCMPage.getScenarioExploratorModalOpen();
    await playwrightSTDCMPage.clickItemScenarioExploratorByName(projects.results[0].name);
    await playwrightSTDCMPage.clickItemScenarioExploratorByName(studies.results[0].name);
    await playwrightSTDCMPage.clickItemScenarioExploratorByName(scenarios.results[0].name);
  });

  test('should be correctly displays the rolling stock list and select one', async () => {
    const rollingstocks = light_rolling_stock.results;
    const rollingStockTranslation =
      playwrightSTDCMPage.getmanageTrainScheduleTranslations('rollingstock');
    const rollingStockTranslationRegEx = new RegExp(rollingStockTranslation as string);
    const rollingstockItem = playwrightSTDCMPage.getRollingstockByTestId(
      `rollingstock${rollingstocks[0].id}`
    );

    // Check that no rollingstock is selected
    await expect(
      playwrightSTDCMPage.getRollingStockSelector.locator('.rollingstock-minicard')
    ).not.toBeVisible();
    await expect(playwrightSTDCMPage.getMissingParam).toContainText(rollingStockTranslationRegEx);

    await playwrightSTDCMPage.getRollingstockModalClose();
    await playwrightSTDCMPage.openRollingstockModal();
    await playwrightSTDCMPage.getRollingstockModalOpen();

    await playwrightSTDCMPage.page.waitForSelector('.rollingstock-container');

    const numberOfRollingstock = await playwrightSTDCMPage.getRollingStockListItem.count();

    expect(numberOfRollingstock).toEqual(rollingstocks.length);

    const infoCardText = await playwrightSTDCMPage.getRollingStockListItem
      .locator('.rollingstock-infos')
      .allTextContents();

    const footerCardText = await playwrightSTDCMPage.getRollingStockListItem
      .locator('.rollingstock-footer')
      .allTextContents();

    rollingstocks.forEach(async (rollingstock) => {
      const { metadata } = rollingstock;

      // Format rollingstock data for test
      const rollingstockSerie = metadata.series || metadata.reference;
      const rollingstockSubserie =
        metadata.series && metadata.series !== metadata.subseries
          ? metadata?.subseries
          : metadata?.detail;
      const infoTextFormat = `${rollingstockSerie}${rollingstockSubserie}${metadata?.family} / ${metadata?.type} / ${metadata?.grouping}${rollingstock.name}`;

      const rollingstockVolages = Object.keys(rollingstock.effort_curves.modes)
        .map((key) => `${key}V`)
        .join('');

      const rollingstockLength = `${rollingstock.length}m`;
      const rollingstockMass = `${Math.round(rollingstock.mass / 1000)}t`;
      const rollingstockMaxSpeed = `${Math.round(rollingstock.max_speed * 3.6)}km/h`;

      const footerTextFormat = `${rollingstockVolages}${rollingstockLength}${rollingstockMass}${rollingstockMaxSpeed}`;

      // Check if the rollingstocks info and footer are displayed correctly
      expect(infoCardText).toContain(infoTextFormat);
      expect(footerCardText).toContain(footerTextFormat);
    });

    // Check if rollingstock detail is close
    await expect(rollingstockItem).toHaveClass(/inactive/);
    await rollingstockItem.click();

    // Check if rollingstock detail is open
    await expect(rollingstockItem).toHaveClass(/active/);

    await rollingstockItem.locator('.rollingstock-footer-buttons > button').click();

    // Check that the rollingstock is selected
    await expect(
      playwrightSTDCMPage.getRollingStockSelector.locator('.rollingstock-minicard')
    ).toBeVisible();

    await expect(playwrightSTDCMPage.getMissingParam).not.toContainText(
      rollingStockTranslationRegEx
    );

    await playwrightHomePage.backToHomePage();
  });
});
