const MAX_NAME_LEN: usize = 200;
const MAX_LABEL_LEN: usize = 200;
const MAX_NOTES_LEN: usize = 2000;
const MAX_TAG_NAME_LEN: usize = 50;
const MAX_EMOJI_LEN: usize = 10;

const VALID_TAG_COLORS: &[&str] = &[
    "red", "orange", "amber", "green", "teal", "blue", "indigo", "purple",
    "pink", "gray",
];

const VALID_BUDGET_STATUSES: &[&str] = &["plan", "active", "review", "closed"];

pub fn validate_budget_name(name: &str) -> Result<(), String> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err("Budget name cannot be empty".to_string());
    }
    if trimmed.len() > MAX_NAME_LEN {
        return Err(format!(
            "Budget name must be {} characters or fewer",
            MAX_NAME_LEN
        ));
    }
    Ok(())
}

pub fn validate_date_format(date: &str) -> Result<(), String> {
    if date.len() != 10
        || date.as_bytes().get(4) != Some(&b'-')
        || date.as_bytes().get(7) != Some(&b'-')
    {
        return Err(format!(
            "Invalid date format '{}': expected YYYY-MM-DD",
            date
        ));
    }
    let year: &str = &date[0..4];
    let month: &str = &date[5..7];
    let day: &str = &date[8..10];
    if !year.chars().all(|c| c.is_ascii_digit())
        || !month.chars().all(|c| c.is_ascii_digit())
        || !day.chars().all(|c| c.is_ascii_digit())
    {
        return Err(format!(
            "Invalid date format '{}': expected YYYY-MM-DD",
            date
        ));
    }
    Ok(())
}

pub fn validate_date_range(start_date: &str, end_date: &str) -> Result<(), String> {
    validate_date_format(start_date)?;
    validate_date_format(end_date)?;
    if start_date > end_date {
        return Err(format!(
            "Start date ({}) must be on or before end date ({})",
            start_date, end_date
        ));
    }
    Ok(())
}

pub fn validate_budget_status(status: &str) -> Result<(), String> {
    if !VALID_BUDGET_STATUSES.contains(&status) {
        return Err(format!(
            "Invalid budget status '{}'. Must be one of: {}",
            status,
            VALID_BUDGET_STATUSES.join(", ")
        ));
    }
    Ok(())
}

pub fn validate_record_label(label: &str) -> Result<(), String> {
    let trimmed = label.trim();
    if trimmed.is_empty() {
        return Err("Record label cannot be empty".to_string());
    }
    if trimmed.len() > MAX_LABEL_LEN {
        return Err(format!(
            "Record label must be {} characters or fewer",
            MAX_LABEL_LEN
        ));
    }
    Ok(())
}

pub fn validate_emoji(emoji: &str) -> Result<(), String> {
    if emoji.trim().is_empty() {
        return Err("Emoji cannot be empty".to_string());
    }
    if emoji.len() > MAX_EMOJI_LEN {
        return Err(format!(
            "Emoji must be {} characters or fewer",
            MAX_EMOJI_LEN
        ));
    }
    Ok(())
}

pub fn validate_amount(amount: i32) -> Result<(), String> {
    if amount < 0 {
        return Err("Amount cannot be negative".to_string());
    }
    if amount == i32::MAX {
        return Err(format!(
            "Amount exceeds maximum allowed value ({})",
            i32::MAX - 1
        ));
    }
    Ok(())
}

pub fn validate_notes(notes: Option<&str>) -> Result<(), String> {
    if let Some(n) = notes {
        if n.len() > MAX_NOTES_LEN {
            return Err(format!(
                "Notes must be {} characters or fewer",
                MAX_NOTES_LEN
            ));
        }
    }
    Ok(())
}

pub fn validate_tag_name(name: &str) -> Result<(), String> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err("Tag name cannot be empty".to_string());
    }
    if trimmed.len() > MAX_TAG_NAME_LEN {
        return Err(format!(
            "Tag name must be {} characters or fewer",
            MAX_TAG_NAME_LEN
        ));
    }
    Ok(())
}

pub fn validate_tag_color(color: &str) -> Result<(), String> {
    if !VALID_TAG_COLORS.contains(&color) {
        return Err(format!(
            "Invalid tag color '{}'. Must be one of: {}",
            color,
            VALID_TAG_COLORS.join(", ")
        ));
    }
    Ok(())
}
