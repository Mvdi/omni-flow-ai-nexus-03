
# VRP Backend Services

This directory contains the backend microservices for Vehicle Routing Problem (VRP) optimization.

## Services

### 1. VRP Solver (`/solver`)
- **Technology**: FastAPI + OR-Tools
- **Purpose**: Multi-day vehicle routing optimization with time windows
- **Features**:
  - Real distance matrix via OSRM
  - Multi-day planning (Monday-Friday)
  - Work hour constraints (max 8h/day per employee)
  - Time window optimization
  - Priority-based scheduling

### 2. OSRM Routing Engine
- **Technology**: Docker container with Denmark OSM data
- **Purpose**: Real-world distance and duration calculations
- **Data**: Denmark road network from OpenStreetMap

## Quick Start

1. **Setup OSRM data**:
   ```bash
   chmod +x scripts/setup-osrm.sh
   ./scripts/setup-osrm.sh
   ```

2. **Start services**:
   ```bash
   docker-compose up -d
   ```

3. **Verify services**:
   - VRP Solver: http://localhost:8000/health
   - OSRM: http://localhost:5000/route/v1/driving/10.2039,56.1629;10.2139,56.1729

## API Endpoints

### VRP Solver
- `POST /optimize` - Optimize routes
- `GET /health` - Health check
- `GET /` - Service info

### OSRM
- `GET /table/v1/driving/{coordinates}` - Distance matrix
- `GET /route/v1/driving/{coordinates}` - Route calculation

## Configuration

### Environment Variables
- `OSRM_URL` - OSRM service URL (default: http://localhost:5000)

### Docker Compose
The services are configured to work together automatically via Docker networking.

## Development

### Local Development
1. Install Python dependencies: `pip install -r services/solver/requirements.txt`
2. Start OSRM: `docker-compose up osrm`
3. Run solver: `cd services/solver && uvicorn main:app --reload`

### Production Deployment
Use the provided Docker Compose configuration for production deployment on Fly.io or similar platforms.

## Architecture Benefits

1. **Real Distance Matrix**: Uses actual road network data instead of Euclidean distance
2. **Multi-Day Planning**: Optimizes across the entire work week (Monday-Friday)
3. **Scalable**: Handles 250+ orders in under 5 seconds
4. **Constraint-Based**: Respects work hours, time windows, and employee capacities
5. **Real-Time**: Supports dynamic re-optimization for new bookings

## Integration

The frontend automatically detects when the backend VRP services are available and switches from browser-based optimization to the more powerful backend solution.
