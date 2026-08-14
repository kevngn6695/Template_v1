const { execSync } = require("child_process");
const readLine = require("readline");

console.log("🚀 Git Auto Push with Custom Message\n");

const rl = readLine.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("Enter your commit message: ", (commitMessage) => {
  try {
    execSync("git add .", { stdio: "inherit" });
    execSync(`git commit -m "${commitMessage}"`, { stdio: "inherit" });
    execSync("git push", { stdio: "inherit" });
    console.log("\n✅ Changes pushed successfully!");
  } catch (error) {
    console.error("\n❌ Error pushing changes:", error.message);
  } finally {
    rl.close();
  }
});
