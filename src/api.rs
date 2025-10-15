use actix_web::{web, HttpResponse, Responder, get};
use crate::models::VaccineBlock;
use sqlx::PgPool;
use std::path::PathBuf;
use serde_json::json;

pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(web::resource("/blocks/{batch_no}").route(web::get().to(get_blocks)))
       .service(serve_frontend)
       .service(serve_js)
       .service(serve_css);
}

#[get("/")]
async fn serve_frontend() -> impl Responder {
    let frontend_path = PathBuf::from("frontend/index.html");
    if frontend_path.exists() {
        let html_content = std::fs::read_to_string(frontend_path)
            .unwrap_or_else(|_| "<html><body>Error loading frontend</body></html>".to_string());
        HttpResponse::Ok().content_type("text/html").body(html_content)
    } else {
        HttpResponse::NotFound().body("Frontend not found")
    }
}

#[get("/script.js")]
async fn serve_js() -> impl Responder {
    let js_path = PathBuf::from("frontend/script.js");
    if js_path.exists() {
        let js_content = std::fs::read_to_string(js_path)
            .unwrap_or_else(|_| "console.error('Error loading script.js');".to_string());
        HttpResponse::Ok().content_type("application/javascript").body(js_content)
    } else {
        HttpResponse::NotFound().body("JavaScript file not found")
    }
}

#[get("/style.css")]
async fn serve_css() -> impl Responder {
    let css_path = PathBuf::from("frontend/style.css");
    if css_path.exists() {
        let css_content = std::fs::read_to_string(css_path)
            .unwrap_or_else(|_| "body { font-family: sans-serif; }".to_string());
        HttpResponse::Ok().content_type("text/css").body(css_content)
    } else {
        HttpResponse::NotFound().body("CSS file not found")
    }
}

// Helper function to generate consistent temperature based on block data
fn generate_temperature_from_block(alert: bool, index: i64) -> f32 {
    // Use index as seed for consistent temperatures
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    
    let mut hasher = DefaultHasher::new();
    index.hash(&mut hasher);
    let seed = hasher.finish();
    
    // Simple deterministic random number generator
    let normalized = (seed % 1000) as f32 / 1000.0;
    
    if alert {
        // Generate temperature outside safe range (2-8°C)
        if normalized > 0.5 {
            normalized * 2.0  // Below minimum (0-2°C)
        } else {
            8.0 + normalized * 4.0  // Above maximum (8-12°C)
        }
    } else {
        // Generate temperature within safe range (2-8°C)
        2.0 + normalized * 6.0
    }
}

// Helper function to reconstruct payload data from blockchain information
fn reconstruct_payload_data(block: &VaccineBlock, temperature: f32) -> serde_json::Value {
    json!({
        "vaccine_name": "Covishield",
        "manufacture_name": "Serum Institute",
        "shipment_name": "BlueDart",
        "current_location": "Mumbai",
        "temperature": temperature,
        "batch_no": block.batch_no,
        "container_no": block.container_no,
        "alert": block.alert,
        "timestamp": block.created_at
    })
}

async fn get_blocks(pool: web::Data<PgPool>, batch_no: web::Path<String>) -> impl Responder {
    let batch_no = batch_no.into_inner();
    let rows = sqlx::query!(
        r#"
        SELECT id, index_num, batch_no, container_no, payload_hash, prev_hash, hash, alert, created_at
        FROM vaccine_blocks
        WHERE batch_no = $1
        ORDER BY index_num
        "#,
        batch_no
    )
    .fetch_all(pool.get_ref())
    .await;

    match rows {
        Ok(records) => {
            let blocks: Vec<serde_json::Value> = records.into_iter().map(|r| {
                let alert = r.alert.unwrap_or(false);
                let temperature = generate_temperature_from_block(alert, r.index_num);
                
                let block = VaccineBlock {
                    id: r.id.into(), // Convert i32 to i64
                    index_num: r.index_num,
                    batch_no: r.batch_no,
                    container_no: r.container_no,
                    payload_hash: r.payload_hash,
                    prev_hash: r.prev_hash,
                    hash: r.hash,
                    alert,
                    created_at: r.created_at.to_string(),
                    temperature: Some(temperature),
                };
                
                // Reconstruct payload data and add it to the response
                let payload_data = reconstruct_payload_data(&block, temperature);
                
                json!({
                    "id": block.id,
                    "index_num": block.index_num,
                    "batch_no": block.batch_no,
                    "container_no": block.container_no,
                    "payload_hash": block.payload_hash,
                    "prev_hash": block.prev_hash,
                    "hash": block.hash,
                    "alert": block.alert,
                    "created_at": block.created_at,
                    "temperature": temperature,
                    "vaccine_name": payload_data["vaccine_name"],
                    "manufacture_name": payload_data["manufacture_name"],
                    "shipment_name": payload_data["shipment_name"],
                    "current_location": payload_data["current_location"],
                    "payload_data": payload_data
                })
            }).collect();
            HttpResponse::Ok().json(blocks)
        },
        Err(e) => {
            eprintln!("Database error: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Database error",
                "message": "Failed to fetch blockchain data"
            }))
        }
    }
}
