#!/usr/bin/env bash
# Installs the PostgreSQL client tools (pg_dump, pg_restore, psql) of one major version and puts
# them first on PATH. pg_dump must be the same major version as the server it restores into:
# a newer client writes settings an older server rejects (for example "transaction_timeout").
#   bash scripts/ci/install-pg-client.sh 16
set -euo pipefail
major="${1:?usage: install-pg-client.sh <major version>}"
if [ ! -x "/usr/lib/postgresql/${major}/bin/pg_dump" ]; then
  sudo install -d /usr/share/postgresql-common/pgdg
  sudo curl -fsSL -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc https://www.postgresql.org/media/keys/ACCC4CF8.asc
  echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" | sudo tee /etc/apt/sources.list.d/pgdg.list >/dev/null
  sudo apt-get update -qq
  sudo apt-get install -y -qq "postgresql-client-${major}"
fi
echo "/usr/lib/postgresql/${major}/bin" >> "${GITHUB_PATH:-/dev/null}"
"/usr/lib/postgresql/${major}/bin/pg_dump" --version
