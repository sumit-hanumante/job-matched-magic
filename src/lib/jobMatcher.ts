
console.log("Loading jobMatcher.ts module");

// Export all functions from the new refactored files
export * from "./matchers/calculateMatchers";
export * from "./matchers/vectorMatchers";
export * from "./matchers/jobMatchingService";

// Log what's being exported
console.log("Exporting from jobMatcher.ts:", {
  calculateMatchers: "./matchers/calculateMatchers",
  vectorMatchers: "./matchers/vectorMatchers",
  jobMatchingService: "./matchers/jobMatchingService"
});
