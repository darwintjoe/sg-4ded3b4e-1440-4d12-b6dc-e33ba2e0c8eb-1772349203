/**
 * Server-side Health Check Runner
 * Simulates critical app functionality without browser
 */

console.log("🏥 SELL MORE - Machine UAT Health Check");
console.log("=" .repeat(60));
console.log("");

const tests = [
  {
    name: "Server Health",
    test: async () => {
      const http = require('http');
      return new Promise((resolve, reject) => {
        const req = http.get('http://localhost:3000', (res) => {
          if (res.statusCode === 200) {
            resolve("Server responding on port 3000");
          } else {
            reject(new Error(`Server returned status ${res.statusCode}`));
          }
        });
        req.on('error', reject);
        req.setTimeout(5000, () => reject(new Error("Server timeout")));
      });
    }
  },
  {
    name: "Testing Page Available",
    test: async () => {
      const http = require('http');
      return new Promise((resolve, reject) => {
        const req = http.get('http://localhost:3000/testing', (res) => {
          if (res.statusCode === 200) {
            resolve("Testing page accessible");
          } else {
            reject(new Error(`Testing page returned status ${res.statusCode}`));
          }
        });
        req.on('error', reject);
        req.setTimeout(5000, () => reject(new Error("Testing page timeout")));
      });
    }
  },
  {
    name: "Static Assets",
    test: async () => {
      const fs = require('fs');
      const path = require('path');
      const publicDir = path.join(process.cwd(), 'public');
      if (!fs.existsSync(publicDir)) {
        throw new Error("Public directory missing");
      }
      const files = fs.readdirSync(publicDir);
      return `Found ${files.length} files in public directory`;
    }
  },
  {
    name: "Critical Files Present",
    test: async () => {
      const fs = require('fs');
      const path = require('path');
      const criticalFiles = [
        'src/lib/db.ts',
        'src/lib/app-health-check.ts',
        'src/contexts/AppContext.tsx',
        'src/pages/index.tsx',
        'src/pages/testing.tsx'
      ];
      
      for (const file of criticalFiles) {
        const filePath = path.join(process.cwd(), file);
        if (!fs.existsSync(filePath)) {
          throw new Error(`Missing critical file: ${file}`);
        }
      }
      
      return `All ${criticalFiles.length} critical files present`;
    }
  },
  {
    name: "TypeScript Build",
    test: async () => {
      const { exec } = require('child_process');
      return new Promise((resolve, reject) => {
        exec('npx tsc --noEmit', (error, stdout, stderr) => {
          if (error) {
            reject(new Error(`TypeScript errors: ${stderr}`));
          } else {
            resolve("TypeScript compilation successful");
          }
        });
      });
    }
  }
];

async function runTests() {
  let passed = 0;
  let failed = 0;
  const results = [];

  for (const test of tests) {
    const startTime = Date.now();
    try {
      console.log(`⏳ Running: ${test.name}...`);
      const message = await test.test();
      const duration = Date.now() - startTime;
      console.log(`✅ PASS (${duration}ms): ${test.name}`);
      console.log(`   ${message}`);
      passed++;
      results.push({ name: test.name, status: "PASS", duration, message });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`❌ FAIL (${duration}ms): ${test.name}`);
      console.log(`   Error: ${error.message}`);
      failed++;
      results.push({ name: test.name, status: "FAIL", duration, message: error.message });
    }
    console.log("");
  }

  console.log("=" .repeat(60));
  console.log("📊 MACHINE UAT REPORT");
  console.log("=" .repeat(60));
  console.log(`Total Tests: ${tests.length}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);
  console.log(`Pass Rate: ${((passed / tests.length) * 100).toFixed(1)}%`);
  console.log("");

  if (failed > 0) {
    console.log("⚠️  FAILED TESTS:");
    results.filter(r => r.status === "FAIL").forEach(r => {
      console.log(`   - ${r.name}: ${r.message}`);
    });
    console.log("");
  }

  console.log("=" .repeat(60));
  console.log("");

  if (failed === 0) {
    console.log("🎉 ALL TESTS PASSED - System Ready for Human UAT");
    console.log("");
    console.log("Next Steps:");
    console.log("1. Open browser: http://localhost:3000");
    console.log("2. Navigate to: http://localhost:3000/testing");
    console.log("3. Click 'Run Health Check' button");
    console.log("4. Verify all browser-based tests pass");
    console.log("");
    return 0;
  } else {
    console.log("❌ SYSTEM NOT READY - Fix failed tests before human UAT");
    console.log("");
    return 1;
  }
}

runTests()
  .then(code => process.exit(code))
  .catch(err => {
    console.error("💥 Fatal error:", err);
    process.exit(1);
  });