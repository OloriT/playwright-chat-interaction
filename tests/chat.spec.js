import { test, expect, chromium } from "@playwright/test"
import { faker } from "@faker-js/faker"

test("robust two-user chat test", async () => {
  const channelName = `test-${Date.now()}`

  // Generate unique realistic names
  const user1Name = faker.person.firstName()
  let user2Name = faker.person.firstName()

  // Ensure they are not the same
  while (user2Name === user1Name) {
    user2Name = faker.person.firstName()
  }

  const windowWidth = 800
  const windowHeight = 800

  // Launch side by side
  const browserUser1 = await chromium.launch({
    headless: true,
    args: [`--window-size=${windowWidth},${windowHeight}`, `--window-position=0,0`],
  })
  const browserUser2 = await chromium.launch({
    headless: true,
    args: [`--window-size=${windowWidth},${windowHeight}`, `--window-position=${windowWidth + 50},0`],
  })

  const page1 = await (
    await browserUser1.newContext({ viewport: { width: windowWidth, height: windowHeight } })
  ).newPage()
  const page2 = await (
    await browserUser2.newContext({ viewport: { width: windowWidth, height: windowHeight } })
  ).newPage()

  try {
    // Setup User 1
    await page1.goto("https://tlk.io/")
    await page1.fill('input[placeholder="channel"]', channelName)
    await page1.click("#join_button")
    await page1.waitForURL(`**/tlk.io/${channelName}`)

    // Set User 1 name
    await page1.fill('input[placeholder="Name"]', user1Name)
    await page1.press('input[placeholder="Name"]', "Enter")
    await page1.waitForTimeout(2000)

    // Setup User 2
    await page2.goto(`https://tlk.io/${channelName}`)
    await page2.fill('input[placeholder="Name"]', user2Name)
    await page2.press('input[placeholder="Name"]', "Enter")
    await page2.waitForTimeout(2000)

    // Verify both users are connected
    await expect(page1.locator("#user-counter")).toHaveText("2")
    await expect(page2.locator("#user-counter")).toHaveText("2")

    const conversations = [
      { user1: "Hey there! How's it going?", user2: "Hi! I'm doing great, thanks for asking!" },
      { user1: "What are you up to today?", user2: "Just working on some coding projects. You?" },
      { user1: "Same here! Working on some Playwright tests", user2: "Nice! Playwright is awesome for testing" },
      { user1: "Totally agree! The API is so clean", user2: "Yeah, much better than other testing tools" },
      { user1: "Have you tried the new features?", user2: "Not yet, but I've heard good things" },
      { user1: "You should definitely check them out", user2: "I will! Thanks for the recommendation" },
      { user1: "No problem! Always happy to help", user2: "Appreciate it! You're very kind" },
      { user1: "How long have you been coding?", user2: "About 5 years now. Started with JavaScript" },
      { user1: "That's awesome! I started with Python", user2: "Python is great for beginners!" },
      { user1: "Exactly! Very readable syntax", user2: "Makes learning programming much easier" },
    ]

    for (let i = 0; i < conversations.length; i++) {
      const { user1: msg1, user2: msg2 } = conversations[i]

      console.log(`[v0] Starting conversation round ${i + 1}`)

      // User 1 initiates conversation
      await page1.fill("#message_body", msg1)
      await page1.press("#message_body", "Enter")
      console.log(`[v0] ${user1Name} sent: ${msg1}`)

      // Wait for User 2 to receive the message
      await page2.waitForFunction((msg) => document.body.textContent.includes(msg), msg1, { timeout: 10000 })
      console.log(`[v0] ${user2Name} received ${user1Name}'s message`)

      // Add realistic delay before User 2 responds
      await page2.waitForTimeout(faker.number.int({ min: 1000, max: 3000 }))

      // User 2 responds to User 1's message
      await page2.fill("#message_body", msg2)
      await page2.press("#message_body", "Enter")
      console.log(`[v0] ${user2Name} replied: ${msg2}`)

      // Wait for User 1 to receive User 2's response
      await page1.waitForFunction((msg) => document.body.textContent.includes(msg), msg2, { timeout: 10000 })
      console.log(`[v0] ${user1Name} received ${user2Name}'s reply`)

      // Add realistic delay before next conversation
      await page1.waitForTimeout(faker.number.int({ min: 500, max: 2000 }))

      console.log(`[v0] Conversation round ${i + 1} completed successfully`)
    }

    const allMessages = conversations.flatMap((conv) => [conv.user1, conv.user2])

    for (const message of allMessages) {
      await expect(page1.locator("body")).toContainText(message)
      await expect(page2.locator("body")).toContainText(message)
    }

    console.log(`[v0] All ${conversations.length * 2} messages verified on both pages`)
  } finally {
    await browserUser1.close()
    await browserUser2.close()
  }
})
