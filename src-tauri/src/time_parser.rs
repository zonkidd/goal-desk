use chrono::{DateTime, Datelike, Duration, Local, NaiveTime, Weekday};

#[derive(Debug, Clone, PartialEq)]
pub struct ParsedTime {
    pub planned_start_at: Option<DateTime<Local>>,
    pub due_at: Option<DateTime<Local>>,
    pub title: String,
}

/// 检测是否为截止时间表达式
fn is_deadline_expression(input: &str) -> bool {
    input.contains("前") || input.contains("之前") || input.contains("截止")
}

/// 清理标题中的时间相关关键词
/// 移除周次、星期、时间点、时间段等关键词，返回清理后的标题
fn clean_title(input: &str, is_deadline: bool) -> String {
    let mut title = input.to_string();

    // 先移除周次+星期的组合关键词（长的先移除，避免"下周一" → "下一"）
    title = title.replace("下星期一", "").replace("下星期二", "").replace("下星期三", "")
                 .replace("下星期四", "").replace("下星期五", "").replace("下星期六", "")
                 .replace("下星期日", "").replace("下星期天", "")
                 .replace("本星期一", "").replace("本星期二", "").replace("本星期三", "")
                 .replace("本星期四", "").replace("本星期五", "").replace("本星期六", "")
                 .replace("本星期日", "").replace("本星期天", "")
                 .replace("这星期一", "").replace("这星期二", "").replace("这星期三", "")
                 .replace("这星期四", "").replace("这星期五", "").replace("这星期六", "")
                 .replace("这星期日", "").replace("这星期天", "")
                 .replace("下周一", "").replace("下周二", "").replace("下周三", "")
                 .replace("下周四", "").replace("下周五", "").replace("下周六", "")
                 .replace("下周日", "").replace("下周天", "")
                 .replace("本周一", "").replace("本周二", "").replace("本周三", "")
                 .replace("本周四", "").replace("本周五", "").replace("本周六", "")
                 .replace("本周日", "").replace("本周天", "")
                 .replace("这周一", "").replace("这周二", "").replace("这周三", "")
                 .replace("这周四", "").replace("这周五", "").replace("这周六", "")
                 .replace("这周日", "").replace("这周天", "");

    // 再移除单独的星期关键词
    title = title.replace("星期一", "").replace("星期二", "").replace("星期三", "")
                 .replace("星期四", "").replace("星期五", "").replace("星期六", "")
                 .replace("星期日", "").replace("星期天", "")
                 .replace("周一", "").replace("周二", "").replace("周三", "")
                 .replace("周四", "").replace("周五", "").replace("周六", "")
                 .replace("周日", "").replace("周天", "");

    // 移除周次关键词
    title = title.replace("下周", "").replace("本周", "").replace("这周", "")
                 .replace("下星期", "").replace("本星期", "").replace("这星期", "");

    // 移除日期关键词
    title = title.replace("明天", "").replace("今天", "").replace("今晚", "")
                 .replace("今早", "").replace("今日", "").replace("后天", "");

    // 移除时间关键词
    title = title.replace("下午", "").replace("上午", "").replace("早上", "").replace("晚上", "");

    // 移除"N点"表达式（如"8点"、"下午3点"、"4 点"）
    if let Some(dot_char_pos) = title.chars().position(|c| c == '点') {
        let chars: Vec<char> = title.chars().collect();
        let mut digit_start_char_pos = dot_char_pos;

        // 向前查找数字或中文数字的起始位置（跳过空格）
        for i in (0..dot_char_pos).rev() {
            if chars[i].is_ascii_digit() {
                digit_start_char_pos = i;
            } else if matches!(chars[i], '一' | '二' | '三' | '四' | '五' | '六' | '七' | '八' | '九' | '十') {
                digit_start_char_pos = i;
                break;
            } else if chars[i] == ' ' {
                // 跳过空格，继续向前查找
                continue;
            } else {
                break;
            }
        }

        // 重建字符串：保留数字之前和"点"之后的部分
        let before: String = chars[..digit_start_char_pos].iter().collect();
        let after: String = chars[dot_char_pos + 1..].iter().collect();
        title = format!("{}{}", before, after);
    }

    // 移除 HH:MM 格式（如 "15:30"）
    if let Some(colon_char_pos) = title.chars().position(|c| c == ':') {
        let chars: Vec<char> = title.chars().collect();

        // 向前找数字起始位置
        let mut start_pos = colon_char_pos;
        for i in (0..colon_char_pos).rev() {
            if chars[i].is_ascii_digit() {
                start_pos = i;
            } else {
                break;
            }
        }

        // 向后找数字结束位置
        let mut end_pos = colon_char_pos + 1;
        for i in (colon_char_pos + 1)..chars.len() {
            if chars[i].is_ascii_digit() {
                end_pos = i + 1;
            } else {
                break;
            }
        }

        // 重建字符串
        let before: String = chars[..start_pos].iter().collect();
        let after: String = chars[end_pos..].iter().collect();
        title = format!("{}{}", before, after);
    }

    // 移除截止时间关键词（长的先移除）
    if is_deadline {
        title = title.replace("之前", "").replace("截止", "").replace("前", "");
    }

    title.trim().to_string()
}

/// 解析 HH:MM 格式（如 "15:30"）
fn parse_hhmm_format(input: &str) -> Option<(u32, u32)> {
    // 查找冒号位置
    if let Some(colon_pos) = input.find(':') {
        let before_colon = &input[..colon_pos];
        let after_colon = &input[colon_pos + 1..];

        // 从冒号前提取小时数字
        let hour_str: String = before_colon.chars().rev()
            .take_while(|c| c.is_ascii_digit())
            .collect::<String>()
            .chars().rev().collect();

        // 从冒号后提取分钟数字（最多2位）
        let minute_str: String = after_colon.chars()
            .take_while(|c| c.is_ascii_digit())
            .take(2)
            .collect();

        if let (Ok(hour), Ok(minute)) = (hour_str.parse::<u32>(), minute_str.parse::<u32>()) {
            if (0..=23).contains(&hour) && (0..=59).contains(&minute) {
                return Some((hour, minute));
            }
        }
    }
    None
}

/// 解析时间关键词（如 "今晚" -> 20:00, "下午" -> 14:00）
fn parse_time_of_day_keyword(input: &str) -> Option<u32> {
    if input.contains("今晚") || input.contains("晚上") {
        Some(20)
    } else if input.contains("下午") {
        Some(14)
    } else if input.contains("上午") || input.contains("早上") || input.contains("今早") {
        Some(9)
    } else {
        None
    }
}

/// 解析时间点表达式（如 "3点"、"三点"、"3 点"）
fn parse_hour_expression(input: &str) -> Option<u32> {
    if let Some(pos) = input.find("点") {
        let before_dot = &input[..pos];

        // 先尝试阿拉伯数字（跳过尾部空格）
        let trimmed_before = before_dot.trim_end();
        let digits: String = trimmed_before.chars().rev()
            .take_while(|c| c.is_ascii_digit())
            .collect::<String>()
            .chars().rev().collect();

        if let Ok(hour) = digits.parse::<u32>() {
            if (1..=23).contains(&hour) {
                return Some(hour);
            }
        }

        // 尝试中文数字（取最后一个非空字符）
        if let Some(last_char) = trimmed_before.chars().last() {
            if let Some(hour) = parse_chinese_number(last_char) {
                let hour_u32 = hour as u32;
                if (1..=23).contains(&hour_u32) {
                    return Some(hour_u32);
                }
            }
        }
    }
    None
}

/// Parse hour from "N点" expression with smart PM detection.
/// Returns (hour, is_smart_adjusted) where is_smart_adjusted indicates
/// if the 1-7 → afternoon adjustment was applied.
fn parse_hour_expression_smart(input: &str) -> Option<(u32, bool)> {
    let raw_hour = parse_hour_expression(input)?;
    let has_afternoon = input.contains("下午");
    if has_afternoon && (1..=12).contains(&raw_hour) {
        Some((raw_hour + 12, true))
    } else if (1..=7).contains(&raw_hour) {
        Some((raw_hour + 12, true))
    } else {
        Some((raw_hour, false))
    }
}

/// 解析中文数字（一到十）
fn parse_chinese_number(ch: char) -> Option<i64> {
    match ch {
        '一' => Some(1),
        '二' => Some(2),
        '三' => Some(3),
        '四' => Some(4),
        '五' => Some(5),
        '六' => Some(6),
        '七' => Some(7),
        '八' => Some(8),
        '九' => Some(9),
        '十' => Some(10),
        _ => None,
    }
}

/// 解析星期关键词到 chrono::Weekday
fn parse_weekday(input: &str) -> Option<Weekday> {
    if input.contains("周一") || input.contains("星期一") {
        Some(Weekday::Mon)
    } else if input.contains("周二") || input.contains("星期二") {
        Some(Weekday::Tue)
    } else if input.contains("周三") || input.contains("星期三") {
        Some(Weekday::Wed)
    } else if input.contains("周四") || input.contains("星期四") {
        Some(Weekday::Thu)
    } else if input.contains("周五") || input.contains("星期五") {
        Some(Weekday::Fri)
    } else if input.contains("周六") || input.contains("星期六") {
        Some(Weekday::Sat)
    } else if input.contains("周日") || input.contains("周天") || input.contains("星期日") || input.contains("星期天") {
        Some(Weekday::Sun)
    } else {
        None
    }
}

/// 解析相对星期表达式（如"下周一"、"本周五"）
/// 返回 (目标日期, 清理后的标题)
fn parse_relative_week(input: &str, now: DateTime<Local>) -> Option<(DateTime<Local>, String)> {
    let weekday = parse_weekday(input)?;

    let is_next_week = input.contains("下周") || input.contains("下星期");
    let is_this_week = input.contains("本周") || input.contains("这周") || input.contains("本星期") || input.contains("这星期");

    if !is_next_week && !is_this_week {
        return None;
    }

    // 计算目标日期
    let current_weekday = now.weekday();
    let days_until_target = if is_next_week {
        // 下周：计算到下周目标星期的天数
        let current_days = current_weekday.num_days_from_monday();
        let target_days = weekday.num_days_from_monday();

        // 先计算到下周一的天数（周日=6, 所以 7-6=1 即明天）
        let days_to_next_monday = 7 - current_days;

        // 再加上目标星期相对周一的偏移
        days_to_next_monday + target_days
    } else {
        // 本周：计算到目标星期的天数
        let target_days = weekday.num_days_from_monday();
        let current_days = current_weekday.num_days_from_monday();
        if target_days >= current_days {
            target_days - current_days
        } else {
            // 目标已过，指向下周
            7 - current_days + target_days
        }
    };

    let target_date = now + Duration::days(days_until_target as i64);

    // 解析时间（默认 9:00）
    let hour = if let Some((h, m)) = parse_hhmm_format(input) {
        let time = NaiveTime::from_hms_opt(h, m, 0).unwrap();
        let result = target_date.date_naive().and_time(time).and_local_timezone(Local).unwrap();
        return Some((result, clean_title(input, false)));
    } else if let Some((h, _)) = parse_hour_expression_smart(input) {
        h
    } else if let Some(h) = parse_time_of_day_keyword(input) {
        h
    } else {
        9
    };

    let time = NaiveTime::from_hms_opt(hour, 0, 0).unwrap();
    let result = target_date.date_naive().and_time(time).and_local_timezone(Local).unwrap();

    Some((result, clean_title(input, false)))
}

pub fn parse_time_expression(input: &str, now: DateTime<Local>) -> ParsedTime {
    let trimmed: String = input.split_whitespace().collect::<Vec<&str>>().join(" ");
    let trimmed = trimmed.trim();
    if trimmed.is_empty() {
        return ParsedTime {
            planned_start_at: None,
            due_at: None,
            title: String::new(),
        };
    }

    let mut title = trimmed.to_string();
    let mut parsed_time: Option<DateTime<Local>> = None;
    let is_deadline = is_deadline_expression(trimmed);

    // 检测相对星期表达式（下周一、本周五等）
    if let Some((parsed_datetime, cleaned_title)) = parse_relative_week(trimmed, now) {
        parsed_time = Some(parsed_datetime);
        title = cleaned_title;
    }
    // 检测"明天"
    else if trimmed.contains("明天") {
        let tomorrow = now + Duration::days(1);

        // 优先尝试解析 HH:MM 格式
        if let Some((hour, minute)) = parse_hhmm_format(trimmed) {
            let time = NaiveTime::from_hms_opt(hour, minute, 0).unwrap();
            parsed_time = Some(tomorrow.date_naive().and_time(time).and_local_timezone(Local).unwrap());
        }
        // 尝试解析时间点
        else if let Some((hour, _)) = parse_hour_expression_smart(trimmed) {
            let time = NaiveTime::from_hms_opt(hour, 0, 0).unwrap();
            parsed_time = Some(tomorrow.date_naive().and_time(time).and_local_timezone(Local).unwrap());
        } else {
            // 默认时间 9:00
            let default_time = NaiveTime::from_hms_opt(9, 0, 0).unwrap();
            parsed_time = Some(tomorrow.date_naive().and_time(default_time).and_local_timezone(Local).unwrap());
        }
    }

    // 检测"今天"/"今晚"/"今早"等今日关键词
    let today_keywords = ["今天", "今晚", "今早", "今日", "今"];
    let has_today = today_keywords.iter().any(|k| trimmed.contains(k));
    if has_today && !trimmed.contains("明天") && parsed_time.is_none() {
        let today = now.date_naive();

        // 判断是否有"今晚"/"晚上"关键词
        let is_evening = trimmed.contains("今晚") || trimmed.contains("晚上");

        // 优先尝试解析精确的"点"表达
        if let Some(hour_from_expression) = parse_hour_expression(trimmed) {
            let hour = if is_evening {
                // "今晚" context: 1-7 = AM (raw), 8-11 = PM (+12), 12-23 = raw
                if hour_from_expression >= 8 && hour_from_expression <= 11 {
                    hour_from_expression + 12
                } else {
                    hour_from_expression
                }
            } else {
                // Other "today" contexts: smart PM adjustment for 1-7
                parse_hour_expression_smart(trimmed).map(|(h, _)| h).unwrap_or(hour_from_expression)
            };
            let time = NaiveTime::from_hms_opt(hour, 0, 0).unwrap();
            parsed_time = Some(today.and_time(time).and_local_timezone(Local).unwrap());
        } else if let Some(hour_from_keyword) = parse_time_of_day_keyword(trimmed) {
            // 没有"点"表达时，才使用时间段关键词（今晚 -> 默认20:00）
            let time = NaiveTime::from_hms_opt(hour_from_keyword, 0, 0).unwrap();
            parsed_time = Some(today.and_time(time).and_local_timezone(Local).unwrap());
        } else {
            // 默认时间 9:00
            let time = NaiveTime::from_hms_opt(9, 0, 0).unwrap();
            parsed_time = Some(today.and_time(time).and_local_timezone(Local).unwrap());
        }
    }

    // 检测"N天后"（如"3天后"或"三天后"）
    if let Some(days_later_pos) = trimmed.find("天后") {
        // 向前提取数字或中文数字
        let before_days_later = &trimmed[..days_later_pos];

        // 先尝试阿拉伯数字
        let digits: String = before_days_later.chars().rev()
            .take_while(|c| c.is_ascii_digit())
            .collect::<String>()
            .chars().rev().collect();

        let days_opt = if !digits.is_empty() {
            digits.parse::<i64>().ok()
        } else {
            // 尝试中文数字（取最后一个字符）
            before_days_later.chars().rev().next().and_then(parse_chinese_number)
        };

        if let Some(days) = days_opt {
            let target_day = now + Duration::days(days);

            // 默认时间 9:00
            let default_time = NaiveTime::from_hms_opt(9, 0, 0).unwrap();
            parsed_time = Some(target_day.date_naive().and_time(default_time).and_local_timezone(Local).unwrap());

            // 清理标题：移除"N天后"
            title = trimmed.to_string();
            if !digits.is_empty() {
                // 阿拉伯数字
                if let Some(digit_start_pos) = title.find(&digits) {
                    let digit_end_pos = digit_start_pos + digits.len();
                    let days_later_end_pos = digit_end_pos + "天后".len();
                    title = format!("{}{}", &title[..digit_start_pos], &title[days_later_end_pos..]);
                }
            } else {
                // 中文数字：移除最后一个中文数字字符 + "天后"
                let chars: Vec<char> = title.chars().collect();
                if let Some(pos) = title.find("天后") {
                    let char_pos = title[..pos].chars().count();
                    if char_pos > 0 {
                        let new_chars: Vec<char> = chars[..char_pos-1].iter()
                            .chain(chars[char_pos+2..].iter())
                            .copied()
                            .collect();
                        title = new_chars.iter().collect();
                    }
                }
            }

            title = title.trim().to_string();
        }
    }

    // 检测"后天"
    if trimmed.contains("后天") && !trimmed.contains("天后") {
        let day_after_tomorrow = now + Duration::days(2);

        // 优先尝试解析 HH:MM 格式
        if let Some((hour, minute)) = parse_hhmm_format(trimmed) {
            let time = NaiveTime::from_hms_opt(hour, minute, 0).unwrap();
            parsed_time = Some(day_after_tomorrow.date_naive().and_time(time).and_local_timezone(Local).unwrap());
        }
        // 尝试解析时间点
        else if let Some(hour) = parse_hour_expression(trimmed) {
            let time = NaiveTime::from_hms_opt(hour, 0, 0).unwrap();
            parsed_time = Some(day_after_tomorrow.date_naive().and_time(time).and_local_timezone(Local).unwrap());
        }
        // 尝试解析时间段关键词（下午、上午等）
        else if let Some(hour_from_keyword) = parse_time_of_day_keyword(trimmed) {
            let time = NaiveTime::from_hms_opt(hour_from_keyword, 0, 0).unwrap();
            parsed_time = Some(day_after_tomorrow.date_naive().and_time(time).and_local_timezone(Local).unwrap());
        } else {
            // 默认时间 9:00
            let default_time = NaiveTime::from_hms_opt(9, 0, 0).unwrap();
            parsed_time = Some(day_after_tomorrow.date_naive().and_time(default_time).and_local_timezone(Local).unwrap());
        }

        // 清理标题
        title = clean_title(trimmed, is_deadline);
    }

    // 如果没有解析到时间，但有"点"表达式（没有日期词），默认为今天
    if parsed_time.is_none() && trimmed.contains("点") {
        let today = now.date_naive();

        if let Some((hour, _)) = parse_hour_expression_smart(trimmed) {
            let time = NaiveTime::from_hms_opt(hour, 0, 0).unwrap();
            parsed_time = Some(today.and_time(time).and_local_timezone(Local).unwrap());

            // 清理标题
            title = clean_title(trimmed, is_deadline);
        }
    }

    // 如果没有解析到时间，使用 clean_title 清理标题
    if parsed_time.is_some() && title == trimmed {
        title = clean_title(trimmed, is_deadline);
    }

    // 根据是否为截止时间，分配到不同字段
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

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::TimeZone;

    #[test]
    fn test_parse_tomorrow_simple() {
        // 固定时间点：2026-06-14 10:00:00
        let now = Local.with_ymd_and_hms(2026, 6, 14, 10, 0, 0).unwrap();

        let result = parse_time_expression("明天开会", now);

        // 期望：明天（6月15日）09:00，标题为"开会"
        let expected_start = Local.with_ymd_and_hms(2026, 6, 15, 9, 0, 0).unwrap();

        assert_eq!(result.title, "开会");
        assert_eq!(result.planned_start_at, Some(expected_start));
        assert_eq!(result.due_at, None);
    }

    #[test]
    fn test_parse_deadline_expression() {
        // 固定时间点：2026-06-14 10:00:00
        let now = Local.with_ymd_and_hms(2026, 6, 14, 10, 0, 0).unwrap();

        let result = parse_time_expression("明天3点前提交报告", now);

        // 期望：明天（6月15日）15:00 作为截止时间
        let expected_due = Local.with_ymd_and_hms(2026, 6, 15, 15, 0, 0).unwrap();

        assert_eq!(result.title, "提交报告");
        assert_eq!(result.planned_start_at, None);
        assert_eq!(result.due_at, Some(expected_due));
    }

    #[test]
    fn test_parse_hhmm_format() {
        // P1-1: HH:MM 格式
        // 固定时间点：2026-06-14 10:00:00
        let now = Local.with_ymd_and_hms(2026, 6, 14, 10, 0, 0).unwrap();

        let result = parse_time_expression("明天15:30评审", now);

        // 期望：明天（6月15日）15:30
        let expected_start = Local.with_ymd_and_hms(2026, 6, 15, 15, 30, 0).unwrap();

        assert_eq!(result.title, "评审");
        assert_eq!(result.planned_start_at, Some(expected_start));
        assert_eq!(result.due_at, None);
    }

    #[test]
    fn test_parse_today_with_time() {
        // P1-2: 今天 + 时间
        // 固定时间点：2026-06-14 10:00:00
        let now = Local.with_ymd_and_hms(2026, 6, 14, 10, 0, 0).unwrap();

        let result = parse_time_expression("今晚8点健身", now);

        // 期望：今天（6月14日）20:00，"今晚"识别为今天晚上8点
        let expected_start = Local.with_ymd_and_hms(2026, 6, 14, 20, 0, 0).unwrap();

        assert_eq!(result.title, "健身");
        assert_eq!(result.planned_start_at, Some(expected_start));
        assert_eq!(result.due_at, None);
    }

    #[test]
    fn test_parse_day_after_tomorrow() {
        // P1-3: 后天
        // 固定时间点：2026-06-14 10:00:00
        let now = Local.with_ymd_and_hms(2026, 6, 14, 10, 0, 0).unwrap();

        let result = parse_time_expression("后天下午开会", now);

        // 期望：后天（6月16日）14:00，"下午"默认14:00
        let expected_start = Local.with_ymd_and_hms(2026, 6, 16, 14, 0, 0).unwrap();

        assert_eq!(result.title, "开会");
        assert_eq!(result.planned_start_at, Some(expected_start));
        assert_eq!(result.due_at, None);
    }

    #[test]
    fn test_parse_n_days_later_numeric() {
        // P2-1: N天后（数字）
        // 固定时间点：2026-06-14 10:00:00
        let now = Local.with_ymd_and_hms(2026, 6, 14, 10, 0, 0).unwrap();

        let result = parse_time_expression("3天后提交", now);

        // 期望：今天+3天（6月17日）09:00
        let expected_start = Local.with_ymd_and_hms(2026, 6, 17, 9, 0, 0).unwrap();

        assert_eq!(result.title, "提交");
        assert_eq!(result.planned_start_at, Some(expected_start));
        assert_eq!(result.due_at, None);
    }

    #[test]
    fn test_parse_n_days_later_chinese() {
        // P2-2: 中文数字
        // 固定时间点：2026-06-14 10:00:00
        let now = Local.with_ymd_and_hms(2026, 6, 14, 10, 0, 0).unwrap();

        let result = parse_time_expression("三天后汇报", now);

        // 期望：今天+3天（6月17日）09:00
        let expected_start = Local.with_ymd_and_hms(2026, 6, 17, 9, 0, 0).unwrap();

        assert_eq!(result.title, "汇报");
        assert_eq!(result.planned_start_at, Some(expected_start));
        assert_eq!(result.due_at, None);
    }

    #[test]
    fn test_parse_time_only_smart_pm() {
        // P2-3: 智能上下午判断
        // 固定时间点：2026-06-14 10:00:00
        let now = Local.with_ymd_and_hms(2026, 6, 14, 10, 0, 0).unwrap();

        let result = parse_time_expression("3点开会", now);

        // 期望：今天（6月14日）15:00，3点智能识别为下午
        let expected_start = Local.with_ymd_and_hms(2026, 6, 14, 15, 0, 0).unwrap();

        assert_eq!(result.title, "开会");
        assert_eq!(result.planned_start_at, Some(expected_start));
        assert_eq!(result.due_at, None);
    }

    #[test]
    fn test_parse_next_week_monday() {
        // 相对星期测试 1：下周一
        // 固定时间点：2026-06-14（周日）10:00:00
        let now = Local.with_ymd_and_hms(2026, 6, 14, 10, 0, 0).unwrap();

        let result = parse_time_expression("下周一开会", now);

        // 期望：下周一（6月15日，因为今天是周日，下周一就是明天）09:00
        let expected_start = Local.with_ymd_and_hms(2026, 6, 15, 9, 0, 0).unwrap();

        assert_eq!(result.title, "开会");
        assert_eq!(result.planned_start_at, Some(expected_start));
        assert_eq!(result.due_at, None);
    }

    #[test]
    fn test_parse_this_week_friday() {
        // 相对星期测试 2：本周五下午2点
        // 固定时间点：2026-06-14（周六）10:00:00
        let now = Local.with_ymd_and_hms(2026, 6, 14, 10, 0, 0).unwrap();

        let result = parse_time_expression("本周五下午2点", now);

        // 期望：本周五（6月19日）14:00
        let expected_start = Local.with_ymd_and_hms(2026, 6, 19, 14, 0, 0).unwrap();

        assert_eq!(result.title, "");
        assert_eq!(result.planned_start_at, Some(expected_start));
        assert_eq!(result.due_at, None);
    }

    #[test]
    fn test_clean_title_removes_week_keywords() {
        assert_eq!(clean_title("下周一开会", false), "开会");
        assert_eq!(clean_title("本周五下午", false), "");
        assert_eq!(clean_title("这周日休息", false), "休息");
    }

    #[test]
    fn test_clean_title_removes_weekday_keywords() {
        assert_eq!(clean_title("周一开会", false), "开会");
        assert_eq!(clean_title("星期五聚餐", false), "聚餐");
    }

    #[test]
    fn test_clean_title_removes_time_keywords() {
        assert_eq!(clean_title("下午3点开会", false), "开会");
        assert_eq!(clean_title("上午10点提交", false), "提交");
    }

    #[test]
    fn test_clean_title_removes_hhmm_format() {
        assert_eq!(clean_title("15:30开会", false), "开会");
        assert_eq!(clean_title("明天15:30评审", false), "评审");
    }

    #[test]
    fn test_clean_title_removes_deadline_keywords() {
        assert_eq!(clean_title("明天3点前提交", true), "提交");
        assert_eq!(clean_title("本周五之前完成", true), "完成");
    }

    #[test]
    fn test_clean_title_preserves_content() {
        assert_eq!(clean_title("写报告", false), "写报告");
        assert_eq!(clean_title("买牛奶", false), "买牛奶");
    }
}

#[cfg(test)]
mod regression_tests {
    use super::*;
    use chrono::TimeZone;

    #[test]
    fn test_tomorrow_afternoon_4pm_with_spaces() {
        let now = Local.with_ymd_and_hms(2026, 6, 30, 10, 0, 0).unwrap();
        let result = parse_time_expression("明天下午 4 点进行计划", now);
        let expected = Local.with_ymd_and_hms(2026, 7, 1, 16, 0, 0).unwrap();
        assert_eq!(result.title, "进行计划");
        assert_eq!(result.planned_start_at, Some(expected));
    }

    #[test]
    fn test_tomorrow_space_before_point() {
        let now = Local.with_ymd_and_hms(2026, 6, 30, 10, 0, 0).unwrap();
        let result = parse_time_expression("明天 3 点提交", now);
        let expected = Local.with_ymd_and_hms(2026, 7, 1, 15, 0, 0).unwrap();
        assert_eq!(result.title, "提交");
        assert_eq!(result.planned_start_at, Some(expected));
    }

    #[test]
    fn test_tomorrow_afternoon_8pm_with_spaces() {
        let now = Local.with_ymd_and_hms(2026, 6, 30, 10, 0, 0).unwrap();
        let result = parse_time_expression("明天下午 8 点开会", now);
        let expected = Local.with_ymd_and_hms(2026, 7, 1, 20, 0, 0).unwrap();
        assert_eq!(result.title, "开会");
        assert_eq!(result.planned_start_at, Some(expected));
    }
}
