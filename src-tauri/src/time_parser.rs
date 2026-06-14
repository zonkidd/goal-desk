use chrono::{DateTime, Duration, Local, NaiveTime};

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

/// 解析时间点表达式（如 "3点"）
fn parse_hour_expression(input: &str) -> Option<u32> {
    if let Some(pos) = input.find("点") {
        let before_dot = &input[..pos];
        // 从后往前找数字
        let digits: String = before_dot.chars().rev()
            .take_while(|c| c.is_ascii_digit())
            .collect::<String>()
            .chars().rev().collect();

        if let Ok(hour) = digits.parse::<u32>() {
            // 智能判断：1-7点认为是下午，加12
            if (1..=7).contains(&hour) {
                return Some(hour + 12);
            } else if (8..=23).contains(&hour) {
                return Some(hour);
            }
        }
    }
    None
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

    let mut title = trimmed.to_string();
    let mut parsed_time: Option<DateTime<Local>> = None;
    let is_deadline = is_deadline_expression(trimmed);

    // 检测"明天"
    if trimmed.contains("明天") {
        let tomorrow = now + Duration::days(1);

        // 优先尝试解析 HH:MM 格式
        if let Some((hour, minute)) = parse_hhmm_format(trimmed) {
            let time = NaiveTime::from_hms_opt(hour, minute, 0).unwrap();
            parsed_time = Some(tomorrow.date_naive().and_time(time).and_local_timezone(Local).unwrap());

            // 清理标题：移除"明天"和 HH:MM 时间
            title = title.replace("明天", "");

            // 移除 HH:MM 格式（找到冒号，向前向后移除数字）
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

            if is_deadline {
                title = title.replace("前", "").replace("之前", "").replace("截止", "");
            }
        }
        // 尝试解析时间点
        else if let Some(hour) = parse_hour_expression(trimmed) {
            let time = NaiveTime::from_hms_opt(hour, 0, 0).unwrap();
            parsed_time = Some(tomorrow.date_naive().and_time(time).and_local_timezone(Local).unwrap());

            // 清理标题：移除"明天"、"N点"、"前"等
            title = title.replace("明天", "");

            // 移除时间点表达式（使用字符索引而非字节索引）
            if let Some(dot_char_pos) = title.chars().position(|c| c == '点') {
                // 找到"点"前面的数字起始位置（字符位置）
                let chars: Vec<char> = title.chars().collect();
                let mut digit_start_char_pos = dot_char_pos;

                for i in (0..dot_char_pos).rev() {
                    if chars[i].is_ascii_digit() {
                        digit_start_char_pos = i;
                    } else {
                        break;
                    }
                }

                // 重建字符串：保留数字之前和"点"之后的部分
                let before: String = chars[..digit_start_char_pos].iter().collect();
                let after: String = chars[dot_char_pos+1..].iter().collect();
                title = format!("{}{}", before, after);
            }

            if is_deadline {
                title = title.replace("前", "").replace("之前", "").replace("截止", "");
            }
        } else {
            // 默认时间 9:00
            let default_time = NaiveTime::from_hms_opt(9, 0, 0).unwrap();
            parsed_time = Some(tomorrow.date_naive().and_time(default_time).and_local_timezone(Local).unwrap());
            title = title.replace("明天", "");
        }

        title = title.trim().to_string();
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
}
