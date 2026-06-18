#!/usr/bin/env node

/**
 * Tauri 种子数据脚本快速测试
 *
 * 这个脚本会在 Tauri 应用中执行一个简化版的测试：
 * 1. 创建 1 个领域
 * 2. 创建 1 个目标
 * 3. 为目标创建 1 个任务
 *
 * 如果成功，说明完整的种子数据脚本应该也能正常工作。
 */

console.log('🧪 Tauri 种子数据脚本快速测试\n');
console.log('📝 使用说明：');
console.log('   1. 确保 Tauri 应用正在运行 (npm run tauri:dev)');
console.log('   2. 打开应用的开发者工具');
console.log('   3. 复制下面的测试代码到控制台执行\n');
console.log('━'.repeat(60));
console.log();

const testCode = `
(async function() {
  console.log('🧪 开始快速测试...');

  // 检查 Tauri 环境
  if (!window.__TAURI__) {
    console.error('❌ 错误：必须在 Tauri 应用中运行！');
    return;
  }

  const { invoke } = window.__TAURI__.core;

  try {
    // 0. 清空旧数据
    console.log('\\\\n0️⃣ 清空旧数据...');
    await invoke('reset_all_data');
    console.log('✅ 旧数据已清空');

    // 1. 创建测试领域
    console.log('\\\\n1️⃣ 创建测试领域...');
    const area = await invoke('create_area', { title: '测试领域' });
    console.log('✅ 领域创建成功:', area);

    // 2. 创建测试目标
    console.log('\\n2️⃣ 创建测试目标...');
    const goal = await invoke('create_goal', {
      title: '测试目标',
      area: '测试领域',
      description: '这是一个测试目标',
      status: 'ACTIVE'
    });
    console.log('✅ 目标创建成功:', goal);

    // 3. 创建测试任务
    console.log('\\n3️⃣ 创建测试任务...');
    const task = await invoke('create_task_for_goal', {
      goalId: goal.id,
      title: '测试任务'
    });
    console.log('✅ 任务创建成功:', task);

    console.log('\\n🎉 快速测试完成！所有 Tauri commands 工作正常。');
    console.log('\\n✅ 现在可以安全地运行完整的 seed-tauri-data.js 脚本了。');
    console.log('\\n💡 提示：刷新页面查看刚才创建的测试数据。');

  } catch (error) {
    console.error('\\n❌ 测试失败:', error);
    console.log('\\n请检查：');
    console.log('  1. Tauri 应用是否正常运行');
    console.log('  2. 后端 commands 是否正确注册');
    console.log('  3. 数据库是否可写');
  }
})();
`;

console.log(testCode);
console.log();
console.log('━'.repeat(60));
console.log('\n✅ 测试代码已生成，复制上面的代码到 Tauri 应用控制台执行即可。\n');
