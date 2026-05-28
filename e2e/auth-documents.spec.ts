import { test, expect } from '@playwright/test';

test.describe('Auth + Documents Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  test('login, create document, chat with AI, and verify persistence', { timeout: 180000 }, async ({ page }) => {
    // Step 1: Navigate to / - should show login page
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Consul' })).toBeVisible();
    await expect(page.getByText('Enter your credentials to access your account.')).toBeVisible();

    // Step 2: Login with admin/admin
    await page.getByPlaceholder('admin').fill('admin');
    await page.getByPlaceholder('**************').fill('admin');
    await page.getByRole('button', { name: 'Sign in' }).click();

    // Step 3: Verify we navigated to /documents
    await expect(page.getByRole('heading', { name: 'Documents' })).toBeVisible();

    // Step 4: Create a document via Sheet
    await page.getByRole('button', { name: /new document/i }).click();
    await expect(page.getByRole('heading', { name: 'Create Document' })).toBeVisible();

    const docTitle = `Test Doc ${Date.now()}`;
    await page.getByPlaceholder('Document title...').fill(docTitle);
    await page.getByRole('button', { name: 'Create Document' }).click();

    // Step 5: Verify we navigated to /documents/[id]
    await expect(page.locator('h1').filter({ hasText: docTitle })).toBeVisible();
    await expect(page.getByText('Hello! I\'m Consul')).toBeVisible();

    // Get the document ID from URL
    const docUrl = page.url();
    const docId = docUrl.split('/').pop()!;

    // Step 6: Send a chat message via Enter key
    const message = 'Write a short paragraph about artificial intelligence.';
    await page.getByPlaceholder(/Type your message/).fill(message);
    await page.getByPlaceholder(/Type your message/).press('Enter');

    // Step 7: Verify the user message appears (optimistic update)
    await expect(page.getByText(message)).toBeVisible();
    await page.screenshot({ path: 'test-screenshots/chat-message-sent.png', fullPage: false });

    // Step 8: Poll the API until the messages are persisted
    let persisted = false;
    for (let i = 0; i < 120; i++) {
      await page.waitForTimeout(1000);
      try {
        const res = await page.request.get(`/api/documents/${docId}?t=${Date.now()}`);
        const data = await res.json();
        if (data.chatMessages?.length > 1) {
          persisted = true;
          break;
        }
      } catch {}
    }
    expect(persisted).toBeTruthy();

    // Step 9: Refresh and verify persistence
    await page.reload();
    await expect(page.locator('h1').filter({ hasText: docTitle })).toBeVisible();
    await expect(page.getByText(message)).toBeVisible();
    await page.screenshot({ path: 'test-screenshots/after-refresh.png', fullPage: false });

    // Step 10: Navigate back to /documents and verify doc in list
    await page.locator('svg').first().click();
    await expect(page.getByRole('heading', { name: 'Documents' })).toBeVisible();
    await expect(page.getByText(docTitle)).toBeVisible();

    // Step 11: Logout
    await page.getByText('Logout').click();
    await expect(page.getByRole('heading', { name: 'Welcome to Consul' })).toBeVisible();
    await expect(page.getByText('Enter your credentials to access your account.')).toBeVisible();
  });

  test('redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/documents');
    await page.waitForURL('/');
    await expect(page.getByRole('heading', { name: 'Welcome to Consul' })).toBeVisible();
    await expect(page.getByText('Enter your credentials to access your account.')).toBeVisible();
  });
});
