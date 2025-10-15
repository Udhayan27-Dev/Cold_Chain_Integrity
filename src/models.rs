use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct VaccineData {
    pub temperature: f32,
    pub container_no: String,
    pub batch_no: String,
    pub vaccine_name: String,
    pub manufacture_name: String,
    pub shipment_name: String,
    pub current_location: String,
    pub timestamp: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct VaccineBlock {
    pub id: i64,
    pub index_num: i64,
    pub batch_no: String,
    pub container_no: String,
    pub payload_hash: String,
    pub prev_hash: String,
    pub hash: String,
    pub alert: bool,
    pub created_at: String,
    pub temperature: Option<f32>, // Generated temperature based on alert
}
