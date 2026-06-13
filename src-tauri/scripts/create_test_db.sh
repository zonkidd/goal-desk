#!/bin/bash
# 创建旧版测试数据库的脚本
# 用于手动验证数据迁移

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC_TAURI_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
FIXTURE_SQL="$SRC_TAURI_DIR/tests/fixtures/legacy_db.sql"
TEST_DB="$SRC_TAURI_DIR/test_legacy_migration.db"

echo "🗄️  创建旧版测试数据库..."

# 删除已存在的测试数据库
if [ -f "$TEST_DB" ]; then
    echo "删除现有测试数据库: $TEST_DB"
    rm "$TEST_DB"
fi

# 使用 fixture SQL 创建数据库
echo "执行 SQL: $FIXTURE_SQL"
sqlite3 "$TEST_DB" < "$FIXTURE_SQL"

echo ""
echo "✅ 旧版数据库创建完成: $TEST_DB"
echo ""
echo "📊 数据统计："
echo "-------------------"

# 显示统计信息
echo "Areas 数量:"
sqlite3 "$TEST_DB" "SELECT COUNT(*) FROM areas;"

echo ""
echo "Goals 数量:"
sqlite3 "$TEST_DB" "SELECT COUNT(*) FROM goals;"

echo ""
echo "孤儿 Goals 数量 (area_id IS NULL 或悬空引用):"
sqlite3 "$TEST_DB" "SELECT COUNT(*) FROM goals WHERE area_id IS NULL OR area_id NOT IN (SELECT id FROM areas);"

echo ""
echo "正常关联的 Goals 数量:"
sqlite3 "$TEST_DB" "SELECT COUNT(*) FROM goals WHERE area_id IS NOT NULL AND area_id IN (SELECT id FROM areas);"

echo ""
echo "-------------------"
echo ""
echo "📝 Areas 列表:"
sqlite3 "$TEST_DB" "SELECT id, title FROM areas;"

echo ""
echo "📝 Goals 列表 (前10个):"
sqlite3 "$TEST_DB" "SELECT id, title, area_id FROM goals LIMIT 10;"

echo ""
echo "💡 下一步："
echo "1. 将此数据库复制到应用数据目录："
echo "   macOS: ~/Library/Application Support/com.example.goal-desk/"
echo ""
echo "2. 或者在测试中使用此数据库路径"
echo ""
echo "3. 启动应用，验证迁移逻辑"
echo ""
echo "4. 迁移后应该有 4 个 areas（原有 3 个 + '未分类'）"
echo "   所有孤儿 goals 应该移到'未分类'"
