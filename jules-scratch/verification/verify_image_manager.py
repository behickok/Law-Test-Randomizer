from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Listen for the response from the /api/query endpoint
    def log_response(response):
        if '/api/query' in response.url:
            print(f"Response from /api/query: {response.status} {response.status_text}")
            try:
                print(response.json())
            except Exception as e:
                print(f"Could not parse JSON response: {e}")


    page.on('response', log_response)

    # Navigate to the login page
    page.goto('http://localhost:5173/login')

    # Enter the teacher PIN and log in
    page.locator('input[type="password"]').fill('1111')

    page.screenshot(path='jules-scratch/verification/before-click.png')

    try:
        page.locator('button[type="submit"]').click(timeout=5000)
    except Exception as e:
        print(f"Error clicking login button: {e}")
        page.screenshot(path='jules-scratch/verification/after-click-error.png')


    # Wait for a short time to allow the response to be logged
    page.wait_for_timeout(5000)

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
