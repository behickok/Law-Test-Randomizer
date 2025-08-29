from playwright.sync_api import sync_playwright, Page, expect
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    print("Navigating to login page...")
    page.goto("http://localhost:5173/login")
    page.wait_for_load_state('networkidle')
    print("Login page loaded.")
    page.screenshot(path="jules-scratch/verification/login_page_2.png")


    print("Clicking signup button...")
    page.locator('button:has-text("Don\'t have an account? Sign up")').click()
    print("Signup button clicked.")

    print("Filling signup form...")
    page.locator('input#name-input').fill('Test Teacher')
    page.locator('input[type="radio"][value="teacher"]').click()
    page.locator('input#pin-input').fill('1234')
    print("Signup form filled.")

    print("Clicking create account button...")
    page.locator('button:has-text("Create Account")').click()

    print("Waiting for navigation to main page...")
    page.wait_for_url("http://localhost:5173/")
    page.wait_for_load_state('networkidle')
    print("Main page loaded.")

    test_data = """
[SECTION:Constitutional Law:3]
1,"When must an appellate court have subject-matter jurisdiction?","When the notice of appeal is filed","When oral argument occurs","When a decision is issued","All of the above",d
2,"What is the primary source of law in most legal systems?",Constitution,Statutes,"Case Law",Regulations,a
"""

    print("Filling test data...")
    textarea = page.locator('textarea#test-data')
    expect(textarea).to_be_visible()
    textarea.fill(test_data)
    print("Test data filled.")

    print("Waiting for preview to update...")
    time.sleep(1) # a small delay to ensure the effect has time to run

    print("Taking screenshot...")
    preview_section = page.locator('div.preview-section')
    expect(preview_section).to_be_visible()
    preview_section.screenshot(path="jules-scratch/verification/verification.png")
    print("Screenshot taken.")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
