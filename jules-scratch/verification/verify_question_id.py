from playwright.sync_api import sync_playwright, expect, TimeoutError

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            # Login as teacher
            page.goto("http://localhost:5173/login", timeout=60000)
            page.wait_for_selector('input[type="email"]', timeout=30000)
            page.get_by_label("Email").fill("teacher@test.com")
            page.get_by_label("Password").fill("password")
            page.get_by_role("button", name="Log In").click()

            # Wait for navigation to the dashboard
            expect(page).to_have_url("http://localhost:5173/", timeout=30000)

            # Navigate to a test
            page.goto("http://localhost:5173/tests/1")

            # Wait for the page to load
            expect(page.get_by_role("heading", name="Manage Questions")).to_be_visible(timeout=30000)

            # Take a screenshot
            page.screenshot(path="jules-scratch/verification/verification.png")

        except TimeoutError:
            print("Timeout error during verification. The server might be slow to start.")
            print(page.content())
            page.screenshot(path="jules-scratch/verification/error.png")
        finally:
            browser.close()

if __name__ == "__main__":
    run_verification()
