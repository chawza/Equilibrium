#![allow(dead_code)]
use serde::{Deserialize, Serialize};
use specta::Type;

// ── Enums ────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub enum BudgetStatus {
    Plan,
    Active,
    Review,
    Closed,
}

impl std::fmt::Display for BudgetStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            BudgetStatus::Plan => write!(f, "plan"),
            BudgetStatus::Active => write!(f, "active"),
            BudgetStatus::Review => write!(f, "review"),
            BudgetStatus::Closed => write!(f, "closed"),
        }
    }
}

impl BudgetStatus {
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "plan" => Some(BudgetStatus::Plan),
            "active" => Some(BudgetStatus::Active),
            "review" => Some(BudgetStatus::Review),
            "closed" => Some(BudgetStatus::Closed),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub enum RecordType {
    Inflow,
    Outflow,
}

impl std::fmt::Display for RecordType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            RecordType::Inflow => write!(f, "inflow"),
            RecordType::Outflow => write!(f, "outflow"),
        }
    }
}

impl RecordType {
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "inflow" => Some(RecordType::Inflow),
            "outflow" => Some(RecordType::Outflow),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub enum ColorKey {
    Red,
    Orange,
    Amber,
    Green,
    Teal,
    Blue,
    Indigo,
    Purple,
    Pink,
    Gray,
}

impl std::fmt::Display for ColorKey {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let s = match self {
            ColorKey::Red => "red",
            ColorKey::Orange => "orange",
            ColorKey::Amber => "amber",
            ColorKey::Green => "green",
            ColorKey::Teal => "teal",
            ColorKey::Blue => "blue",
            ColorKey::Indigo => "indigo",
            ColorKey::Purple => "purple",
            ColorKey::Pink => "pink",
            ColorKey::Gray => "gray",
        };
        write!(f, "{}", s)
    }
}

impl ColorKey {
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "red" => Some(ColorKey::Red),
            "orange" => Some(ColorKey::Orange),
            "amber" => Some(ColorKey::Amber),
            "green" => Some(ColorKey::Green),
            "teal" => Some(ColorKey::Teal),
            "blue" => Some(ColorKey::Blue),
            "indigo" => Some(ColorKey::Indigo),
            "purple" => Some(ColorKey::Purple),
            "pink" => Some(ColorKey::Pink),
            "gray" => Some(ColorKey::Gray),
            _ => None,
        }
    }
}

// ── Structs ──────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct Tag {
    pub id: i64,
    pub name: String,
    pub color: String, // stored as string in DB, validated on write
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct Record {
    pub id: i64,
    pub budget_id: i64,
    #[serde(rename = "type")]
    pub record_type: String, // "inflow" | "outflow"
    pub emoji: String,
    pub label: String,
    pub amount: i64, // whole Rupiah, no decimals
    pub notes: Option<String>,
    pub tags: Vec<Tag>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct Budget {
    pub id: i64,
    pub name: String,
    pub start_date: String,
    pub end_date: String,
    pub status: String, // "plan" | "active" | "review" | "closed"
    pub created_at: String,
    pub records: Vec<Record>,
}
