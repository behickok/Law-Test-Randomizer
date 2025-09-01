from playwright.sync_api import sync_playwright, expect

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Go to login page
        page.goto("http://localhost:5173/login")

        # Enter PIN and login
        page.locator("#pin-input").fill("1111")

        # Wait for the button to be enabled
        login_button = page.get_by_role("button", name="Login")
        expect(login_button).to_be_enabled()
        login_button.click()

        # Wait for navigation to the dashboard and find the test
        page.wait_for_url("http://localhost:5173/")

        # Click on the "Manage" button for the first test in the list
        manage_button = page.locator('.test-actions a.btn-primary').first
        manage_button.click()

        # Wait for the test page to load
        page.wait_for_url(r"http://localhost:5173/tests/\d+")

        # Wait for the preview content to be visible, specifically looking for an image
        preview_image = page.locator('.preview-content img.question-image').first
        expect(preview_image).to_be_visible()

        # Take a screenshot of the test page
        page.screenshot(path="jules-scratch/verification/test_preview.png")

        browser.close()

if __name__ == "__main__":
    run()
