mod blockchain;
mod models;
mod db;
mod api;

use actix_web::{App, HttpServer};
use actix_cors::Cors;
use db::init_db_pool;
use api::configure_routes;
use tokio::task;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Load .env file
    dotenvy::dotenv().ok();

    // Initialize database pool
    let pool = init_db_pool().await.unwrap();

    // Spawn blockchain data generation in a separate task
    let pool_clone = pool.clone();
    task::spawn(async move {
        blockchain::start_generator(pool_clone).await;
    });

    // Start backend API
    HttpServer::new(move || {
        // Configure CORS
        let cors = Cors::default()
            .allow_any_origin()
            .allow_any_method()
            .allow_any_header()
            .max_age(3600);

        App::new()
            .wrap(cors)
            .app_data(actix_web::web::Data::new(pool.clone()))
            .configure(configure_routes)
    })
    .bind(("127.0.0.1", 8080))?
    .run()
    .await
}
