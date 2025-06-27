
#!/bin/bash

# Setup script for OSRM with Denmark data
echo "Setting up OSRM with Denmark OSM data..."

# Create data directory
mkdir -p osm-data

# Check if Denmark data already exists
if [ ! -f osm-data/denmark-latest.osm.pbf ]; then
    echo "Downloading Denmark OSM data..."
    wget -O osm-data/denmark-latest.osm.pbf http://download.geofabrik.de/europe/denmark-latest.osm.pbf
else
    echo "Denmark OSM data already exists."
fi

# Make script executable
chmod +x scripts/setup-osrm.sh

echo "OSRM setup complete!"
echo "Run 'docker-compose up' to start the VRP optimization services."
