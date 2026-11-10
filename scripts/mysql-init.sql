-- Runs once when the local MySQL container is first created (docker-compose.yml).
-- Tests use their own database so `npm test` never touches your local data.
CREATE DATABASE IF NOT EXISTS studio_test;
GRANT ALL PRIVILEGES ON studio_test.* TO 'studio'@'%';
