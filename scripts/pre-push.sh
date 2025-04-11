set -e

echo "Running lint check..."
pnpm run lint || { echo "Lint check failed. Please fix the issues before pushing."; exit 1; }

echo "Running tests..."
pnpm run test || { echo "Tests failed. Please fix the issues before pushing."; exit 1; }

echo "All checks passed! Ready to push."
