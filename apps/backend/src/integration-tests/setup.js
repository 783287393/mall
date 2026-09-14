// Jest setup for integration tests.
// loadEnv("test", ...) in jest.config.js already loaded apps/backend/.env.test,
// which carries the DB_* credentials the Medusa test runner needs to create and
// connect to its per-run test database.

process.env.LOG_LEVEL = process.env.LOG_LEVEL || "error"

module.exports = () => {}
