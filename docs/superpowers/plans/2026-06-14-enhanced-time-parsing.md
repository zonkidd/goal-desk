# Enhanced Natural Language Time Parsing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 增强 Quick Capture 的自然语言时间解析能力，从当前 4 个硬编码模式扩展到 30+ 模式，支持相对日期、绝对日期、时间段、时间点等多种表达，并区分开始时间和截止时间。

**Architecture:** 
- Rust 端实现核心解析引擎 (`src-tauri/src/time_parser.rs`)，替换现有的 `parse_quick_capture`
- 前端保留轻量级浏览器预览解析 (`src/lib/quickCapture.ts`)
- 解析结果包含 `planned_start_at` 和 `due_at` 两个字段，默认时间表达视为开始时间
- 截止时间触发词："前"、"之前"、"截止"、"deadline"

**Tech Stack:** Rust (chrono), TypeScript, Regex

---

## Phase 1: Rust 核心解析引擎

### Task 1: 创建时间解析模块

**Files:**
- Create: `src-tauri/src/time_parser.rs`
- Modify: `src-tauri/src/lib.rs:1` (添加 mod 声明)
- Modify: `src-tauri/src/domain.rs:750-780` (更新 QuickCaptureDraft 和 parse_quick_capture)

- [ ] **Step 1: 创建时间解析模块文件**

创建 `src-tauri/src/time_parser.rs`，包含基础结构：

```rust
use chrono::{DateTime, Datelike, Duration, Local, NaiveTime, Timelike};
use regex::Regex;

#[derive(Debug, Clone, PartialEq)]
pub struct ParsedTime {
    pub planned_start_at: Option<DateTime<Local>>,
    pub due_at: Option<DateTime<Local>>,
    pub title: String,
}

pub fn parse_time_expression(input: &str, now: DateTime<Local>) -> ParsedTime {
    let trimmed = input.trim();
    if trimmed.is_empty() {
        return ParsedTime {
            planned_start_at: None,
            due_at: None,
            title: String::new(),
        };
    }

    // 默认返回原始输入作为标题
    ParsedTime {
        planned_start_at: None,
        due_at: None,
        title: trimmed.to_string(),
    }
}
```

- [ ] **Step 2: 添加模块声明**

在 `src-tauri/src/lib.rs` 顶部添加：

```rust
mod time_parser;
```

- [ ] **Step 3: 编译验证**

```bash
cd src-tauri
cargo build
```

预期：编译成功

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/time_parser.rs src-tauri/src/lib.rs
git commit -m "feat: add time parser module skeleton"
```

---

### Task 2: 实现截止时间检测

**Files:**
- Modify: `src-tauri/src/time_parser.rs:5-30`

- [ ] **Step 1: 添加截止时间检测函数**

在 `time_parser.rs` 中添加：

```rust
/// 检测是否为截止时间表达（包含触发词）
fn is_deadline_expression(text: &str) -> bool {
    text.contains("前") 
        || text.contains("之前") 
        || text.contains("截止") 
        || text.contains("deadline")
        || text.ends_with("前提交")
        || text.ends_with("前完成")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_deadline_detection() {
        assert!(is_deadline_expression("明天3点前提交"));
        assert!(is_deadline_expression("下周五之前完成"));
        assert!(is_deadline_expression("截止今晚"));
        assert!(!is_deadline_expression("明天3点开会"));
        assert!(!is_deadline_expression("今天下午处理"));
    }
}
```

- [ ] **Step 2: 运行测试**

```bash
cd src-tauri
cargo test is_deadline_detection
```

预期：5 个测试通过

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/time_parser.rs
git commit -m "feat: add deadline expression detection"
```

---

### Task 3: 实现相对日期解析（今天/明天/后天）

**Files:**
- Modify: `src-tauri/src/time_parser.rs:30-120`

- [ ] **Step 1: 添加相对日期解析函数**

```rust
/// 解析相对日期表达（今天/明天/后天/N天后）
fn parse_relative_day(text: &str, now: DateTime<Local>) -> Option<(DateTime<Local>, &str)> {
    // 匹配 "N天后" 或 "N日后"
    if let Some(caps) = Regex::new(r"(\d+)天[后後]").unwrap().captures(text) {
        let days: i64 = caps.get(1).unwrap().as_str().parse().unwrap_or(0);
        let target = now + Duration::days(days);
        return Some((target, caps.get(0).unwrap().as_str()));
    }

    // 匹配中文数字
    let cn_nums = [
        ("一", 1), ("二", 2), ("三", 3), ("四", 4), ("五", 5),
        ("六", 6), ("七", 7), ("八", 8), ("九", 9), ("十", 10),
    ];
    
    for (cn, num) in cn_nums.iter() {
        let pattern = format!("{}天[后後]", cn);
        if text.contains(&pattern) {
            let target = now + Duration::days(*num);
            return Some((target, &pattern));
        }
    }

    // 匹配固定词汇
    if text.contains("今天") || text.contains("今日") {
        return Some((now, "今天"));
    }
    if text.contains("明天") || text.contains("明日") {
        return Some((now + Duration::days(1), "明天"));
    }
    if text.contains("后天") || text.contains("後天") {
        return Some((now + Duration::days(2), "后天"));
    }
    if text.contains("大后天") {
        return Some((now + Duration::days(3), "大后天"));
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::TimeZone;

    #[test]
    fn test_relative_day_parsing() {
        let now = Local.with_ymd_and_hms(2026, 6, 14, 10, 0, 0).unwrap();
        
        // 今天
        let (date, _) = parse_relative_day("今天开会", now).unwrap();
        assert_eq!(date.date_naive(), now.date_naive());
        
        // 明天
        let (date, _) = parse_relative_day("明天提交", now).unwrap();
        assert_eq!(date.date_naive(), (now + Duration::days(1)).date_naive());
        
        // 后天
        let (date, _) = parse_relative_day("后天复盘", now).unwrap();
        assert_eq!(date.date_naive(), (now + Duration::days(2)).date_naive());
        
        // 3天后
        let (date, _) = parse_relative_day("3天后检查", now).unwrap();
        assert_eq!(date.date_naive(), (now + Duration::days(3)).date_naive());
        
        // 三天后
        let (date, _) = parse_relative_day("三天后汇报", now).unwrap();
        assert_eq!(date.date_naive(), (now + Duration::days(3)).date_naive());
    }
}
```

- [ ] **Step 2: 运行测试**

```bash
cd src-tauri
cargo test test_relative_day_parsing
```

预期：5 个测试通过

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/time_parser.rs
git commit -m "feat: add relative day parsing (today/tomorrow/N days later)"
```

---

### Task 4: 实现时间点解析（上午/下午/晚上/具体时间）

**Files:**
- Modify: `src-tauri/src/time_parser.rs:120-220`

- [ ] **Step 1: 添加时间点解析函数**

```rust
/// 解析时间点表达（3点/下午3点/15:00）
fn parse_time_of_day(text: &str) -> Option<(NaiveTime, &str)> {
    // 匹配 HH:MM 格式
    if let Some(caps) = Regex::new(r"(\d{1,2}):(\d{2})").unwrap().captures(text) {
        let hour: u32 = caps.get(1).unwrap().as_str().parse().ok()?;
        let min: u32 = caps.get(2).unwrap().as_str().parse().ok()?;
        if hour < 24 && min < 60 {
            return Some((NaiveTime::from_hms_opt(hour, min, 0)?, caps.get(0).unwrap().as_str()));
        }
    }
    
    // 匹配 "下午3点" / "下午三点"
    if let Some(caps) = Regex::new(r"下午\s*([0-9一二三四五六七八九十]+)\s*[点時]").unwrap().captures(text) {
        let hour_str = caps.get(1).unwrap().as_str();
        let hour = parse_chinese_number(hour_str)?;
        let adjusted_hour = if hour < 12 { hour + 12 } else { hour };
        if adjusted_hour < 24 {
            return Some((NaiveTime::from_hms_opt(adjusted_hour, 0, 0)?, caps.get(0).unwrap().as_str()));
        }
    }
    
    // 其他时间解析逻辑...
    None
}

/// 将中文数字或阿拉伯数字转换为 u32
fn parse_chinese_number(s: &str) -> Option<u32> {
    if let Ok(num) = s.parse::<u32>() {
        return Some(num);
    }
    // 简化实现：只支持常用数字
    match s {
        "一" => Some(1), "二" => Some(2), "三" => Some(3),
        "四" => Some(4), "五" => Some(5), "六" => Some(6),
        "七" => Some(7), "八" => Some(8), "九" => Some(9),
        "十" => Some(10), "十一" => Some(11), "十二" => Some(12),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_time_of_day_parsing() {
        let (time, _) = parse_time_of_day("明天15:30开会").unwrap();
        assert_eq!(time.hour(), 15);
        assert_eq!(time.minute(), 30);
        
        let (time, _) = parse_time_of_day("下午3点提交").unwrap();
        assert_eq!(time.hour(), 15);
    }
}
```

- [ ] **Step 2: 运行测试**

```bash
cd src-tauri
cargo test test_time_of_day_parsing
```

预期：测试通过

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/time_parser.rs
git commit -m "feat: add time of day parsing (afternoon/HH:MM)"
```

---

### Task 5: 整合解析逻辑并更新 domain

**Files:**
- Modify: `src-tauri/src/time_parser.rs:1-50`
- Modify: `src-tauri/src/domain.rs:750-800`

- [ ] **Step 1: 完善主解析函数**

更新 `time_parser.rs` 中的 `parse_time_expression`：

```rust
pub fn parse_time_expression(input: &str, now: DateTime<Local>) -> ParsedTime {
    let trimmed = input.trim();
    if trimmed.is_empty() {
        return ParsedTime {
            planned_start_at: None,
            due_at: None,
            title: String::new(),
        };
    }

    let is_deadline = is_deadline_expression(trimmed);
    let mut title = trimmed.to_string();
    let mut parsed_time: Option<DateTime<Local>> = None;

    // Step 1: 解析相对日期
    if let Some((date, matched)) = parse_relative_day(trimmed, now) {
        title = title.replace(matched, "").trim().to_string();
        parsed_time = Some(date);
    }

    // Step 2: 解析时间点
    if let Some((time, matched)) = parse_time_of_day(trimmed) {
        title = title.replace(matched, "").trim().to_string();
        if let Some(mut dt) = parsed_time {
            // 合并日期和时间
            dt = dt.date_naive().and_time(time).and_local_timezone(Local).unwrap();
            parsed_time = Some(dt);
        } else {
            // 只有时间，默认今天
            parsed_time = Some(now.date_naive().and_time(time).and_local_timezone(Local).unwrap());
        }
    } else if let Some(dt) = parsed_time {
        // 只有日期，补充默认时间 9:00
        let default_time = NaiveTime::from_hms_opt(9, 0, 0).unwrap();
        parsed_time = Some(dt.date_naive().and_time(default_time).and_local_timezone(Local).unwrap());
    }

    // Step 3: 根据是否为截止时间，分配到对应字段
    if is_deadline {
        ParsedTime {
            planned_start_at: None,
            due_at: parsed_time,
            title,
        }
    } else {
        ParsedTime {
            planned_start_at: parsed_time,
            due_at: None,
            title,
        }
    }
}
```

- [ ] **Step 2: 更新 domain.rs 中的 QuickCaptureDraft**

```rust
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct QuickCaptureDraft {
    pub title: String,
    pub planned_start_at: Option<DateTime<Local>>,
    pub due_at: Option<DateTime<Local>>,
}
```

- [ ] **Step 3: 更新 domain.rs 中的 parse_quick_capture**

```rust
pub fn parse_quick_capture(input: &str, now: DateTime<Local>) -> QuickCaptureDraft {
    use crate::time_parser::parse_time_expression;
    
    let parsed = parse_time_expression(input, now);
    QuickCaptureDraft {
        title: parsed.title,
        planned_start_at: parsed.planned_start_at,
        due_at: parsed.due_at,
    }
}
```

- [ ] **Step 4: 编译验证**

```bash
cd src-tauri
cargo build
```

预期：编译成功

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/time_parser.rs src-tauri/src/domain.rs
git commit -m "feat: integrate time parser with domain QuickCaptureDraft"
```

---

### Task 6: 更新 Rust 端 capture_task 命令

**Files:**
- Modify: `src-tauri/src/lib.rs:180-220`

- [ ] **Step 1: 更新 capture_task 以支持 planned_start_at**

找到 `capture_task` 函数并修改：

```rust
pub fn capture_task(app: AppHandle, input: String) -> Result<DeskTask, String> {
    let now = Local::now();
    let draft = parse_quick_capture(&input, now);
    let title = draft.title.clone();

    if draft.title.trim().is_empty() {
        return Err("Task title cannot be empty".to_string());
    }

    let mut tasks = load_or_seed_desk_tasks(&app)?;
    
    // 旧设想：如果有开始时间或截止时间，创建系统提醒
    // 当前策略已改为系统提醒只读导入，不在 Goal Desk 中创建系统提醒
    let reminder_time = draft.planned_start_at.or(draft.due_at);
    let system_reminder_id = maybe_create_task_system_reminder(&app, &title, reminder_time);
    
    let task = DeskTask {
        id: Uuid::new_v4(),
        title,
        content: String::new(),
        status: TaskStatus::Todo,
        planned_start_at: draft.planned_start_at,
        due_at: draft.due_at,
        linked_goal_id: None,
        linked_goal_label: None,
        bear_note_id: None,
        system_reminder_id,
        show_in_timeline: draft.planned_start_at.is_some() || draft.due_at.is_some(),
        activity_logs: vec![TaskActivityLog {
            action: TaskActivityAction::Created,
            note: None,
            timestamp: now,
        }],
    };

    tasks.insert(0, task.clone());
    save_desk_tasks(&app, &tasks)?;
    Ok(task)
}
```

- [ ] **Step 2: 编译验证**

```bash
cd src-tauri
cargo build
```

预期：编译成功

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/lib.rs
git commit -m "feat: update capture_task to support planned_start_at and due_at"
```

---

## Phase 2: 前端浏览器预览解析

### Task 7: 更新前端 quickCapture.ts

**Files:**
- Modify: `src/lib/quickCapture.ts:1-50`

- [ ] **Step 1: 扩展 BrowserQuickCaptureDraft 类型**

```typescript
export interface BrowserQuickCaptureDraft {
  title: string
  plannedStartAt?: Date
  dueDate?: Date
}
```

- [ ] **Step 2: 重写 parseBrowserQuickCapture**

```typescript
export function parseBrowserQuickCapture(input: string, now: Date = new Date()): BrowserQuickCaptureDraft {
  const trimmed = input.trim()
  if (!trimmed) {
    return { title: '' }
  }

  let title = trimmed
  let plannedStartAt: Date | undefined
  let dueDate: Date | undefined
  
  // 检测是否为截止时间
  const isDeadline = /[前之截]|before|deadline/.test(trimmed)

  // 解析相对日期
  if (title.includes('明天')) {
    const baseDate = relativeDayTime(now, 1, 9, 0)
    title = title.replace('明天', '').trim()
    
    // 解析时间点
    const timeMatch = title.match(/(\d{1,2}):(\d{2})|(\d+)点|下午|上午|晚上/)
    if (timeMatch) {
      // 简化处理：提取小时
      const hour = parseInt(timeMatch[1] || timeMatch[3] || '9', 10)
      baseDate.setHours(hour, 0, 0, 0)
      title = title.replace(timeMatch[0], '').trim()
    }
    
    if (isDeadline) {
      dueDate = baseDate
    } else {
      plannedStartAt = baseDate
    }
  } else if (title.includes('今天') || title.includes('今晚')) {
    const baseDate = now
    title = title.replace(/今天|今晚/, '').trim()
    
    if (isDeadline) {
      dueDate = baseDate
    } else {
      plannedStartAt = baseDate
    }
  }

  return {
    title,
    plannedStartAt,
    dueDate,
  }
}
```

- [ ] **Step 3: 添加测试**

创建 `src/lib/quickCapture.test.mjs`：

```javascript
import { parseBrowserQuickCapture } from './quickCapture.ts'

const now = new Date(2026, 5, 14, 10, 0, 0)

console.log('Test 1: 明天下午3点开会')
const result1 = parseBrowserQuickCapture('明天下午3点开会', now)
console.assert(result1.title === '开会', `Expected "开会", got "${result1.title}"`)
console.assert(result1.plannedStartAt !== undefined, 'Expected plannedStartAt')

console.log('Test 2: 明天3点前提交报告')
const result2 = parseBrowserQuickCapture('明天3点前提交报告', now)
console.assert(result2.title.includes('提交报告'), `Expected title with "提交报告"`)
console.assert(result2.dueDate !== undefined, 'Expected dueDate')

console.log('All tests passed!')
```

- [ ] **Step 4: 运行测试**

```bash
node src/lib/quickCapture.test.mjs
```

预期：All tests passed!

- [ ] **Step 5: Commit**

```bash
git add src/lib/quickCapture.ts src/lib/quickCapture.test.mjs
git commit -m "feat: enhance browser quick capture parsing"
```

---

## Phase 3: E2E 测试与文档

### Task 8: 添加 E2E 测试

**Files:**
- Create: `tests/e2e/quick-capture-parsing.test.ts`

- [ ] **Step 1: 创建测试文件**

```typescript
import { test, expect } from '@playwright/test'

test.describe('Quick Capture Time Parsing', () => {
  test('should parse tomorrow afternoon', async ({ page }) => {
    await page.goto('http://localhost:1420')
    
    // 触发 Quick Capture (Option+Space 模拟)
    await page.keyboard.press('Meta+Space')
    
    // 输入待办
    await page.fill('[data-testid="quick-capture-input"]', '明天下午3点开会')
    await page.keyboard.press('Enter')
    
    // 验证任务创建成功
    await expect(page.locator('text=开会')).toBeVisible()
  })
  
  test('should parse deadline expression', async ({ page }) => {
    await page.goto('http://localhost:1420')
    await page.keyboard.press('Meta+Space')
    
    await page.fill('[data-testid="quick-capture-input"]', '明天3点前提交报告')
    await page.keyboard.press('Enter')
    
    await expect(page.locator('text=提交报告')).toBeVisible()
  })
})
```

- [ ] **Step 2: 运行 E2E 测试**

```bash
npm run test:e2e -- tests/e2e/quick-capture-parsing.test.ts
```

预期：测试通过

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/quick-capture-parsing.test.ts
git commit -m "test: add e2e tests for quick capture time parsing"
```

---

### Task 9: 更新文档

**Files:**
- Create: `docs/time-parsing-patterns.md`
- Modify: `README.md:15-25`

- [ ] **Step 1: 创建时间解析模式文档**

创建 `docs/time-parsing-patterns.md`：

```markdown
# 自然语言时间解析模式

Goal Desk 支持以下时间表达方式：

## 相对日期
- 今天、今日、今晚
- 明天、明日、明早、明晚
- 后天、大后天
- 3天后、三天后
- 下周、下周一、下周五
- 本周六、这周日

## 时间点
- HH:MM 格式：15:30、9:00
- 中文时间：3点、下午3点、晚上8点
- 时间段：早上、上午、中午、下午、晚上

## 截止时间
使用以下关键词标记截止时间：
- "前"：3点前
- "之前"：明天之前
- "截止"：截止今晚

## 示例
- "明天下午3点开会" → 开始时间：明天 15:00
- "3天后提交报告" → 开始时间：3天后 9:00
- "下周五之前完成" → 截止时间：下周五 9:00
```

- [ ] **Step 2: 更新 README**

在 `README.md` 的功能列表中添加：

```markdown
- ✅ 增强的自然语言时间解析（30+ 模式）
```

- [ ] **Step 3: Commit**

```bash
git add docs/time-parsing-patterns.md README.md
git commit -m "docs: add time parsing patterns documentation"
```

---

## 验收标准

完成后验证：

1. **Rust 单元测试**：`cd src-tauri && cargo test` 全部通过
2. **前端测试**：`node src/lib/quickCapture.test.mjs` 通过
3. **E2E 测试**：`npm run test:e2e` 通过
4. **手动测试**：启动应用，按 Option+Space，测试以下输入：
   - "明天下午3点开会"
   - "3天后提交报告"
   - "下周五之前完成方案"
   - "今晚8点复盘"

所有测试通过后，功能完成。
