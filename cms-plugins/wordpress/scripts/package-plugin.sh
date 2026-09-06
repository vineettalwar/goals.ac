#!/usr/bin/env bash
# Build an installable WordPress plugin zip for goals.ac (BLOCK-1).
#
# Output:
#   cms-plugins/wordpress/dist/goals-ac.zip
#   artifacts/marketing-persona-app/public/downloads/goals-ac.zip
#
# The zip root folder is `goals-ac/` (matches readme.txt install steps).
# Composer installs --no-dev with the shared contract copied in (no path symlink).

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
PLUGIN_SRC="$ROOT/cms-plugins/wordpress"
SHARED_SRC="$ROOT/cms-plugins/shared"
BUILD_ROOT="$PLUGIN_SRC/dist/build"
PLUGIN_DIR="$BUILD_ROOT/goals-ac"
ZIP_OUT="$PLUGIN_SRC/dist/goals-ac.zip"
PUBLIC_DIR="$ROOT/artifacts/marketing-persona-app/public/downloads"
PUBLIC_ZIP="$PUBLIC_DIR/goals-ac.zip"

command -v composer >/dev/null || { echo "composer is required" >&2; exit 1; }
command -v zip >/dev/null || { echo "zip is required" >&2; exit 1; }
command -v rsync >/dev/null || { echo "rsync is required" >&2; exit 1; }
command -v php >/dev/null || { echo "php is required" >&2; exit 1; }

rm -rf "$BUILD_ROOT" "$ZIP_OUT"
mkdir -p "$PLUGIN_DIR" "$PUBLIC_DIR"

rsync -a \
  --exclude '.git/' \
  --exclude 'node_modules/' \
  --exclude 'vendor/' \
  --exclude 'dist/' \
  --exclude 'tests/' \
  --exclude 'scripts/' \
  --exclude '.wp-env.json' \
  --exclude '.wp-env.override.json' \
  --exclude 'phpcs.xml' \
  --exclude 'phpcs.xml.dist' \
  --exclude 'phpunit.xml' \
  --exclude 'package.json' \
  --exclude 'composer.lock' \
  --exclude '.DS_Store' \
  --exclude '*.md' \
  "$PLUGIN_SRC/" "$PLUGIN_DIR/"

find "$PLUGIN_DIR" -name '*.md' -not -name 'readme.txt' -delete 2>/dev/null || true

mkdir -p "$PLUGIN_DIR/packages"
rsync -a \
  --exclude '.git/' \
  --exclude 'vendor/' \
  --exclude 'tests/' \
  --exclude 'phpcs.xml' \
  --exclude '*.md' \
  "$SHARED_SRC/" "$PLUGIN_DIR/packages/shared-contract/"

python3 - "$PLUGIN_DIR" <<'PY'
import json
import sys
from pathlib import Path

plugin = Path(sys.argv[1])
composer_path = plugin / "composer.json"
data = json.loads(composer_path.read_text())
data["repositories"] = [
    {
        "type": "path",
        "url": "./packages/shared-contract",
        "options": {"symlink": False},
    }
]
data.pop("require-dev", None)
composer_path.write_text(json.dumps(data, indent=2) + "\n")
PY

(
  cd "$PLUGIN_DIR"
  composer install --no-dev --optimize-autoloader --no-interaction --prefer-dist
)

php -r "
require '$PLUGIN_DIR/vendor/autoload.php';
foreach (['GoalsAC\\\\Shared\\\\NonceStore', 'GoalsAC\\\\Shared\\\\KeyStore'] as \$c) {
  if (!interface_exists(\$c) && !class_exists(\$c)) {
    fwrite(STDERR, \"Missing \$c after composer install\n\");
    exit(1);
  }
}
echo \"autoload ok\n\";
"

(
  cd "$BUILD_ROOT"
  zip -rq "$ZIP_OUT" goals-ac \
    -x '*/.DS_Store' \
    -x '*/phpunit.xml' \
    -x '*/tests/*'
)

cp "$ZIP_OUT" "$PUBLIC_ZIP"

echo "Built $ZIP_OUT"
echo "Copied $PUBLIC_ZIP"
unzip -l "$ZIP_OUT" | head -40
