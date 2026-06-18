#!/usr/bin/env node

/**
 * 验证种子数据脚本
 *
 * 使用方法：
 * node scripts/verify-seed.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 开始验证种子数据脚本...\n');

// 检查文件是否存在
const browserScriptPath = path.join(__dirname, 'seed-browser-data.js');
const tauriScriptPath = path.join(__dirname, 'seed-tauri-data.js');
const readmePath = path.join(__dirname, 'README.md');

let hasError = false;

// 验证文件存在性
console.log('📁 检查文件存在性...');
const files = [
  { path: browserScriptPath, name: 'seed-browser-data.js' },
  { path: tauriScriptPath, name: 'seed-tauri-data.js' },
  { path: readmePath, name: 'README.md' }
];

files.forEach(file => {
  if (fs.existsSync(file.path)) {
    console.log(`  ✅ ${file.name} 存在`);
  } else {
    console.log(`  ❌ ${file.name} 不存在`);
    hasError = true;
  }
});
console.log();

// 验证浏览器模式脚本
console.log('🌐 验证浏览器模式脚本 (seed-browser-data.js)...');
try {
  const browserContent = fs.readFileSync(browserScriptPath, 'utf-8');

  const browserChecks = [
    { pattern: /localStorage\.setItem/g, name: 'localStorage 写入' },
    { pattern: /goal-desk-browser-tasks/g, name: '任务数据键名' },
    { pattern: /goal-desk-browser-goals/g, name: '目标数据键名' },
    { pattern: /goal-desk-browser-areas/g, name: '领域数据键名' },
    { pattern: /generateUUID/g, name: 'UUID 生成函数' },
    { pattern: /createTimestamp/g, name: '时间戳生成函数' },
  ];

  browserChecks.forEach(check => {
    const matches = browserContent.match(check.pattern);
    if (matches && matches.length > 0) {
      console.log(`  ✅ ${check.name}: ${matches.length} 处`);
    } else {
      console.log(`  ❌ ${check.name}: 未找到`);
      hasError = true;
    }
  });

  // 统计数据定义
  const areaMatches = browserContent.match(/title:\s*['"][一-龥]+['"]/g);
  const goalMatches = browserContent.match(/title:\s*['"].*?['"],\s*area:/g);
  const taskMatches = browserContent.match(/title:\s*['"].*?['"],\s*content:/g);

  console.log(`\n  📊 数据统计:`);
  console.log(`     领域: ${areaMatches ? areaMatches.length : 0} 个`);
  console.log(`     目标: ${goalMatches ? goalMatches.length : 0} 个`);
  console.log(`     任务: ${taskMatches ? taskMatches.length : 0} 个`);

} catch (error) {
  console.log(`  ❌ 读取失败: ${error.message}`);
  hasError = true;
}
console.log();

// 验证 Tauri 模式脚本
console.log('🖥️  验证 Tauri 模式脚本 (seed-tauri-data.js)...');
try {
  const tauriContent = fs.readFileSync(tauriScriptPath, 'utf-8');

  const tauriChecks = [
    { pattern: /window\.__TAURI__/g, name: 'Tauri 环境检测' },
    { pattern: /invoke\(/g, name: 'Tauri invoke 调用' },
    { pattern: /create_area/g, name: '创建领域 command' },
    { pattern: /create_goal/g, name: '创建目标 command' },
    { pattern: /create_task_for_goal/g, name: '创建任务 command' },
    { pattern: /capture_task/g, name: '捕获任务 command' },
    { pattern: /update_task_fields/g, name: '更新任务字段 command' },
    { pattern: /update_task_status/g, name: '更新任务状态 command' },
  ];

  tauriChecks.forEach(check => {
    const matches = tauriContent.match(check.pattern);
    if (matches && matches.length > 0) {
      console.log(`  ✅ ${check.name}: ${matches.length} 处`);
    } else {
      console.log(`  ❌ ${check.name}: 未找到`);
      hasError = true;
    }
  });

  // 统计数据定义
  const areaDefsMatch = tauriContent.match(/areaDefinitions\s*=\s*\[([\s\S]*?)\]/);
  const goalDefsMatch = tauriContent.match(/goalDefinitions\s*=\s*\[([\s\S]*?)\]/);
  const inboxDefsMatch = tauriContent.match(/inboxTaskDefinitions\s*=\s*\[([\s\S]*?)\]/);

  if (areaDefsMatch) {
    const areas = areaDefsMatch[1].match(/['"][^'"]+['"]/g);
    console.log(`\n  📊 数据统计:`);
    console.log(`     领域: ${areas ? areas.length : 0} 个`);
  }

  if (goalDefsMatch) {
    const goals = goalDefsMatch[1].match(/title:\s*['"]/g);
    console.log(`     目标: ${goals ? goals.length : 0} 个`);
  }

  if (inboxDefsMatch) {
    const tasks = inboxDefsMatch[1].match(/title:\s*['"]/g);
    console.log(`     收件箱任务: ${tasks ? tasks.length : 0} 个`);
  }

} catch (error) {
  console.log(`  ❌ 读取失败: ${error.message}`);
  hasError = true;
}
console.log();

// 验证 README
console.log('📖 验证 README.md...');
try {
  const readmeContent = fs.readFileSync(readmePath, 'utf-8');

  const readmeChecks = [
    { pattern: /浏览器模式/g, name: '浏览器模式说明' },
    { pattern: /Tauri 模式/g, name: 'Tauri 模式说明' },
    { pattern: /seed-browser-data\.js/g, name: '浏览器脚本引用' },
    { pattern: /seed-tauri-data\.js/g, name: 'Tauri 脚本引用' },
    { pattern: /localStorage/g, name: 'localStorage 说明' },
    { pattern: /SQLite/g, name: 'SQLite 说明' },
  ];

  readmeChecks.forEach(check => {
    const matches = readmeContent.match(check.pattern);
    if (matches && matches.length > 0) {
      console.log(`  ✅ ${check.name}: ${matches.length} 处`);
    } else {
      console.log(`  ⚠️  ${check.name}: 未找到`);
    }
  });

} catch (error) {
  console.log(`  ❌ 读取失败: ${error.message}`);
  hasError = true;
}
console.log();

// 最终结果
if (hasError) {
  console.log('❌ 验证失败：发现错误或缺失项');
  process.exit(1);
} else {
  console.log('✅ 验证通过：所有检查项均正常');
  console.log('\n📝 下一步：');
  console.log('   1. 浏览器模式测试: npm run dev，然后在控制台执行 seed-browser-data.js');
  console.log('   2. Tauri 模式测试: npm run tauri:dev，然后在控制台执行 seed-tauri-data.js');
  process.exit(0);
}
