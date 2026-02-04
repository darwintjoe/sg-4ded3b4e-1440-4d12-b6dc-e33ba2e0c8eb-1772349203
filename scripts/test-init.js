/**
 * Quick Initialization Test
 * Tests the app startup sequence to identify bottlenecks
 */

console.log("🚀 Starting initialization test...\n");

// Test 1: IndexedDB availability
console.log("1️⃣ Testing IndexedDB availability...");
if (typeof indexedDB === 'undefined') {
  console.error("❌ IndexedDB not available (running in Node.js)");
  console.log("ℹ️  This test must run in a browser environment");
  process.exit(1);
} else {
  console.log("✅ IndexedDB available\n");
}

// Test 2: Check if server is responsive
console.log("2️⃣ Testing server responsiveness...");
fetch('http://localhost:3000')
  .then(res => {
    if (res.ok) {
      console.log("✅ Server is responsive\n");
      return res.text();
    }
    throw new Error(`Server returned ${res.status}`);
  })
  .then(html => {
    console.log("3️⃣ Checking page content...");
    if (html.includes('SELL MORE')) {
      console.log("✅ Page content loads correctly\n");
    } else {
      console.log("⚠️  Page content unexpected\n");
    }
    
    console.log("✅ All server-side tests passed!");
    console.log("\n📱 Next step: Open http://localhost:3000 in browser");
    console.log("   Watch the loading screen - it should show:");
    console.log("   • 'Connecting to database...'");
    console.log("   • 'Loading settings...'");
    console.log("   • 'Verifying session...'");
    console.log("   • 'Ready!'");
    console.log("\n   If it hangs at a specific message, that's the bottleneck!");
  })
  .catch(err => {
    console.error("❌ Test failed:", err.message);
    process.exit(1);
  });