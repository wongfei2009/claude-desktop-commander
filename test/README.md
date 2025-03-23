# Claude Desktop Commander Tests

This directory contains the test suite for Claude Desktop Commander. The tests are organized into unit and integration tests to ensure both individual components and the whole system work as expected.

## Test Structure

```
test/
├── README.md                   # This file
├── test.js                     # Main test runner
├── unit/                       # Unit tests for individual components
│   └── edit.test.js            # Tests for edit tools
├── integration/                # Integration tests for system functionality
│   ├── terminal.test.js        # Tests for terminal commands
│   └── filesystem.test.js      # Tests for filesystem operations
```

## Running Tests

You can run tests using npm scripts:

### Run All Tests
```bash
npm test
```

### Run Only Unit Tests
```bash
npm run test:unit
```

### Run Only Integration Tests
```bash
npm run test:integration
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run with Coverage
```bash
npm run test:coverage
```

### Run a Specific Test File
```bash
node test/test.js test/unit/edit.test.js
```

## Writing New Tests

### Unit Tests

Unit tests should test individual functions or modules in isolation. They should be:
- Fast
- Independent
- Free of external dependencies when possible

Example:
```javascript
describe('Module Name', () => {
  describe('functionName', () => {
    it('should do something specific', async () => {
      // Arrange
      const input = 'test input';
      
      // Act
      const result = await functionName(input);
      
      // Assert
      assert.equal(result, 'expected output');
    });
  });
});
```

### Integration Tests

Integration tests should test how multiple components work together. They may:
- Access the filesystem
- Execute commands
- Test entire workflows

Always clean up after integration tests to avoid affecting other tests or leaving test artifacts.

## Best Practices

1. **Test in isolation**: Each test should be independent of others
2. **Clean up after tests**: Use `beforeEach` and `afterEach` to set up and clean up test environments
3. **Mock external dependencies**: Use stubs or mocks for external services when appropriate
4. **Test edge cases**: Include tests for error conditions and edge cases
5. **Be specific**: Test names should clearly describe what is being tested
6. **Keep tests simple**: Each test should test one specific behavior

## Contributing Tests

When adding a new feature or fixing a bug:
1. Add tests that would have caught the bug
2. Ensure all tests pass before submitting a pull request
3. Follow the existing test organization and naming conventions
