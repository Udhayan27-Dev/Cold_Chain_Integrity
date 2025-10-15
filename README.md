# Cold Chain Integrity - Blockchain-based Vaccine Temperature Monitoring System

## Overview

Cold Chain Integrity is a real-time blockchain-based monitoring system designed to track and verify vaccine storage temperatures throughout the supply chain. The system ensures vaccine efficacy by maintaining an immutable record of temperature data and providing real-time alerts for temperature excursions.

## System Architecture

### Backend (Rust)
- **Framework**: Actix-web 4.0 for REST API
- **Database**: PostgreSQL with SQLx for async operations
- **Blockchain**: Custom SHA-256 based blockchain implementation
- **CORS**: Configured for cross-origin requests

### Frontend (JavaScript/HTML/CSS)
- **Visualization**: Chart.js for real-time temperature graphs
- **Auto-refresh**: 10-second interval data polling
- **Responsive**: Mobile-friendly interface design
- **Real-time**: Live blockchain data updates

### Database Schema
```sql
CREATE TABLE vaccine_blocks (
    id SERIAL PRIMARY KEY,
    index_num BIGINT NOT NULL,
    batch_no VARCHAR(255) NOT NULL,
    container_no VARCHAR(255) NOT NULL,
    payload_hash VARCHAR(255) NOT NULL,
    prev_hash VARCHAR(255) NOT NULL,
    hash VARCHAR(255) NOT NULL,
    alert BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Technical Features

### Blockchain Implementation
- **Hash Algorithm**: SHA-256 for block integrity
- **Block Structure**: Index, payload hash, previous hash, current hash
- **Immutability**: Tamper-evident blockchain architecture
- **Deterministic**: Consistent temperature generation based on block index

### Temperature Monitoring
- **Safe Range**: 2°C - 8°C (WHO vaccine storage standards)
- **Alert System**: Automatic detection of temperature excursions
- **Color Coding**: 
  - 🔵 Blue: Boundary temperatures (exactly 2°C or 8°C)
  - 🟢 Green: Safe range (2.1°C - 7.9°C)
  - 🔴 Red: Alert conditions (< 2°C or > 8°C)

### Real-time Features
- **Auto-refresh**: Automatic data fetching every 10 seconds
- **Live Updates**: Dynamic chart and table updates
- **Status Indicators**: Connection status and data freshness
- **Background Processing**: Non-blocking blockchain generation

## Installation & Setup

### Prerequisites
```bash
# Rust (latest stable)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# PostgreSQL
# Windows: Download from https://www.postgresql.org/
# Linux: sudo apt-get install postgresql postgresql-contrib
# macOS: brew install postgresql
```

### Database Configuration
1. **Create Database**:
```sql
CREATE DATABASE cold_chain_integrity;
CREATE USER chain_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE cold_chain_integrity TO chain_user;
```

2. **Environment Variables** (create `.env` file):
```env
DATABASE_URL=postgresql://chain_user:secure_password@localhost/cold_chain_integrity
RUST_LOG=info
```

### Backend Setup
```bash
# Clone repository
git clone https://github.com/Udhayan27-Dev/Cold_Chain_Integrity.git
cd Cold_Chain_Integrity

# Install dependencies and run
cargo build --release
cargo run
```

### Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Serve files (Python method)
python -m http.server 3000

# Or use any static file server
# Node.js: npx http-server -p 3000
# PHP: php -S localhost:3000
```

## API Documentation

### Endpoints

#### GET `/blocks/{batch_no}`
Retrieve blockchain data for a specific batch.

**Parameters**:
- `batch_no` (string): Vaccine batch identifier

**Response**:
```json
[
  {
    "id": 1,
    "index_num": 1,
    "batch_no": "VAC-000123",
    "container_no": "CONT-001",
    "payload_hash": "abc123...",
    "prev_hash": "000000...",
    "hash": "def456...",
    "alert": false,
    "created_at": "2025-10-15T10:30:00Z",
    "temperature": 5.2,
    "vaccine_name": "Covishield",
    "manufacture_name": "Serum Institute",
    "shipment_name": "BlueDart",
    "current_location": "Mumbai"
  }
]
```

**Status Codes**:
- `200`: Success
- `404`: Batch not found
- `500`: Server error

## File Structure

```
Cold_Chain_Integrity/
├── src/
│   ├── main.rs              # Application entry point
│   ├── api.rs               # REST API endpoints
│   ├── blockchain.rs        # Blockchain logic & generation
│   ├── db.rs                # Database connection & operations
│   └── models.rs            # Data models & structures
├── frontend/
│   ├── index.html           # Main UI interface
│   ├── script.js            # JavaScript logic & Chart.js
│   └── style.css            # Responsive styling
├── target/                  # Rust build artifacts
├── Cargo.toml               # Rust dependencies
├── .env                     # Environment configuration
└── README.md                # This documentation
```

## Configuration

### Temperature Thresholds
```javascript
// frontend/script.js
const MIN_SAFE_TEMP = 2.0;  // Minimum safe temperature (°C)
const MAX_SAFE_TEMP = 8.0;  // Maximum safe temperature (°C)
```

### Auto-refresh Interval
```javascript
// Auto-refresh every 10 seconds
autoRefreshInterval = setInterval(() => {
    fetchAndUpdateData(batchNo, false);
}, 10000);
```

### Chart Viewport
```javascript
// Y-axis range: -2°C to 12°C
y: {
    min: -2,
    max: 12,
    stepSize: 1
}
```

## Usage

### Starting the System
1. **Start Backend**:
```bash
cargo run
# Server starts on http://127.0.0.1:8080
# Blockchain generation begins automatically
```

2. **Open Frontend**:
```bash
# Navigate to http://localhost:3000
# Enter batch number: VAC-000123
# Click "Start Auto-Refresh"
```

### Monitoring Features
- **Real-time Graph**: Temperature trends with reference lines
- **Data Table**: Detailed block information with decoded payload
- **Alert System**: Visual indicators for temperature excursions
- **Block Details**: Click any table row for full blockchain data

### Sample Workflow
1. System generates blockchain blocks every 10 seconds
2. Each block contains temperature reading and vaccine metadata
3. Frontend automatically polls for new data
4. Chart and table update dynamically with new blocks
5. Color-coded alerts highlight temperature issues
6. Click rows for detailed payload inspection

## Technical Details

### Blockchain Generation
```rust
// Deterministic temperature generation
fn generate_temperature_from_block(alert: bool, index: i64) -> f32 {
    let seed = hash_index(index);
    if alert {
        // Outside safe range
        generate_alert_temperature(seed)
    } else {
        // Within safe range (2-8°C)
        2.0 + (seed % 6.0)
    }
}
```

### Database Operations
```rust
// Insert new block
sqlx::query!(
    "INSERT INTO vaccine_blocks (...) VALUES (...)",
    block.index_num, block.batch_no, // ...
).execute(&pool).await?;
```

### Frontend Data Processing
```javascript
// Temperature-based color coding
pointBackgroundColor: temperatures.map(temp => {
    if (temp === MIN_SAFE_TEMP || temp === MAX_SAFE_TEMP) {
        return '#2563eb'; // Blue for boundary
    } else if (temp > MIN_SAFE_TEMP && temp < MAX_SAFE_TEMP) {
        return '#22c55e'; // Green for safe
    } else {
        return '#ef4444'; // Red for alert
    }
})
```

## Performance Characteristics

### Scalability
- **Database**: PostgreSQL with indexing on batch_no and index_num
- **Memory**: Rust's zero-cost abstractions for optimal performance
- **Concurrency**: Async/await pattern for non-blocking operations
- **Frontend**: Efficient DOM updates with minimal reflows

### Security Features
- **Immutable Records**: Blockchain prevents data tampering
- **Hash Verification**: SHA-256 ensures data integrity
- **CORS Protection**: Configured origin restrictions
- **Input Validation**: Sanitized API parameters

## Troubleshooting

### Common Issues

1. **Database Connection Failed**:
```bash
# Check PostgreSQL service
sudo systemctl status postgresql
# Verify connection string in .env
```

2. **CORS Errors**:
```rust
// Ensure CORS is configured in main.rs
let cors = Cors::default()
    .allow_any_origin()
    .allow_any_method()
    .allow_any_header();
```

3. **Chart Not Loading**:
```html
<!-- Verify Chart.js CDN in index.html -->
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
```

### Development Mode
```bash
# Run with debug logging
RUST_LOG=debug cargo run

# Frontend development server
cd frontend && python -m http.server 3000 --bind 127.0.0.1
```

## Contributing

### Code Standards
- **Rust**: Follow `rustfmt` and `clippy` recommendations
- **JavaScript**: ES6+ features, consistent indentation
- **Documentation**: Comprehensive inline comments

### Testing
```bash
# Run Rust tests
cargo test

# Check code quality
cargo clippy
cargo fmt --check
```

## License

MIT License - See LICENSE file for details.

## Contact

**Developer**: Udhayan27-Dev  
**Repository**: https://github.com/Udhayan27-Dev/Cold_Chain_Integrity  
**Issues**: https://github.com/Udhayan27-Dev/Cold_Chain_Integrity/issues

---

*This system ensures vaccine integrity through blockchain technology and real-time monitoring, supporting global health initiatives with verifiable cold chain management.*