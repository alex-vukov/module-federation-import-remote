import { test, expect } from "@playwright/test";

test("Remote entry file is fetched", async ({ page }) => {
  let remoteEntryFetched = false;
  await page.route(/remoteEntry.js/, async (route, request) => {
    remoteEntryFetched = true;
    await route.continue();
  });

  await page.goto("/");

  await expect.poll(() => remoteEntryFetched).toBe(true);
});

test("Calling remote function works", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByTestId("host-div")).toHaveText("It works!");
});
