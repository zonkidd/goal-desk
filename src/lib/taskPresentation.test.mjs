import { strict as assert } from 'node:assert'

// 模拟 getTaskTimeInfo 函数的测试
console.log('测试 getTaskTimeInfo 辅助函数...\n')

// 辅助函数
function startOfDay(value) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate())
}

function getTaskTimeInfo(task, now = new Date()) {
  const today = startOfDay(now)
  const startDate = task.plannedStartAt || task.createdAt || now
  const startDay = startOfDay(startDate)

  const daysElapsed = Math.max(0, Math.floor((today.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24)))

  let daysRemaining = null
  let urgency = 'none'
  let endDate = null
  let totalDays = null
  let progressPercent = null

  if (task.dueDate) {
    endDate = task.dueDate
    const dueDay = startOfDay(task.dueDate)
    daysRemaining = Math.floor((dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (daysRemaining <= 2) urgency = 'critical'
    else if (daysRemaining <= 7) urgency = 'warning'
    else urgency = 'normal'

    totalDays = Math.max(1, Math.floor((dueDay.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24)))
    progressPercent = Math.min(100, Math.max(0, Math.round((daysElapsed / totalDays) * 100)))
  }

  return {
    daysElapsed,
    daysRemaining,
    urgency,
    startDate: startDay,
    todayDate: today,
    endDate,
    totalDays,
    progressPercent,
  }
}

// 测试用例 1：还剩 2 天（紧急）
console.log('✅ 测试 1: 还剩 2 天（紧急）')
const now1 = new Date('2026-06-13')
const task1 = {
  plannedStartAt: new Date('2026-06-10'),
  dueDate: new Date('2026-06-15'),
}
const result1 = getTaskTimeInfo(task1, now1)
assert.equal(result1.daysElapsed, 3)
assert.equal(result1.daysRemaining, 2)
assert.equal(result1.urgency, 'critical')
assert.equal(result1.totalDays, 5)
assert.equal(result1.progressPercent, 60)
console.log('  已推进:', result1.daysElapsed, '天')
console.log('  还剩:', result1.daysRemaining, '天')
console.log('  紧急度:', result1.urgency, '🔥')
console.log('  进度:', result1.progressPercent, '%\n')

// 测试用例 2：还剩 6 天（需关注）
console.log('✅ 测试 2: 还剩 6 天（需关注）')
const now2 = new Date('2026-06-13')
const task2 = {
  plannedStartAt: new Date('2026-06-12'),
  dueDate: new Date('2026-06-19'),
}
const result2 = getTaskTimeInfo(task2, now2)
assert.equal(result2.daysElapsed, 1)
assert.equal(result2.daysRemaining, 6)
assert.equal(result2.urgency, 'warning')
assert.equal(result2.totalDays, 7)
assert.equal(result2.progressPercent, 14)
console.log('  已推进:', result2.daysElapsed, '天')
console.log('  还剩:', result2.daysRemaining, '天')
console.log('  紧急度:', result2.urgency, '⏰')
console.log('  进度:', result2.progressPercent, '%\n')

// 测试用例 3：还剩 15 天（充裕）
console.log('✅ 测试 3: 还剩 15 天（充裕）')
const now3 = new Date('2026-06-13')
const task3 = {
  plannedStartAt: new Date('2026-06-11'),
  dueDate: new Date('2026-06-28'),
}
const result3 = getTaskTimeInfo(task3, now3)
assert.equal(result3.daysElapsed, 2)
assert.equal(result3.daysRemaining, 15)
assert.equal(result3.urgency, 'normal')
assert.equal(result3.totalDays, 17)
assert.equal(result3.progressPercent, 12)
console.log('  已推进:', result3.daysElapsed, '天')
console.log('  还剩:', result3.daysRemaining, '天')
console.log('  紧急度:', result3.urgency, '✅')
console.log('  进度:', result3.progressPercent, '%\n')

// 测试用例 4：无截止日期
console.log('✅ 测试 4: 无截止日期')
const now4 = new Date('2026-06-13')
const task4 = {
  plannedStartAt: new Date('2026-06-08'),
  dueDate: null,
}
const result4 = getTaskTimeInfo(task4, now4)
assert.equal(result4.daysElapsed, 5)
assert.equal(result4.daysRemaining, null)
assert.equal(result4.urgency, 'none')
assert.equal(result4.totalDays, null)
assert.equal(result4.progressPercent, null)
console.log('  已推进:', result4.daysElapsed, '天')
console.log('  还剩: 无截止日期')
console.log('  紧急度:', result4.urgency, '∞\n')

// 测试用例 5：今天是开始日
console.log('✅ 测试 5: 今天是开始日')
const now5 = new Date('2026-06-13')
const task5 = {
  plannedStartAt: new Date('2026-06-13'),
  dueDate: new Date('2026-06-20'),
}
const result5 = getTaskTimeInfo(task5, now5)
assert.equal(result5.daysElapsed, 0)
assert.equal(result5.daysRemaining, 7)
assert.equal(result5.urgency, 'warning')
console.log('  已推进:', result5.daysElapsed, '天')
console.log('  还剩:', result5.daysRemaining, '天\n')

// 测试用例 6：今天是截止日
console.log('✅ 测试 6: 今天是截止日')
const now6 = new Date('2026-06-13')
const task6 = {
  plannedStartAt: new Date('2026-06-10'),
  dueDate: new Date('2026-06-13'),
}
const result6 = getTaskTimeInfo(task6, now6)
assert.equal(result6.daysElapsed, 3)
assert.equal(result6.daysRemaining, 0)
assert.equal(result6.urgency, 'critical')
console.log('  已推进:', result6.daysElapsed, '天')
console.log('  还剩:', result6.daysRemaining, '天 🔥\n')

console.log('✨ 所有测试通过！')
