// Leaflet Wrapper for Blazor Integration
let map = null;
let markers = [];
let circles = [];
let polygons = [];
let polylines = [];
let geoJsonLayers = [];
let drawnItems = null;
let drawControl = null;
let miniMapControl = null;
let isDisposed = false;

// Initialize or get the map
export function createMap(elementId, lat, lng, zoom) {
    if (isDisposed) {
        console.warn('Map wrapper is disposed, cannot create map');
        return;
    }

    if (map) {
        try {
            map.remove();
        } catch (e) {
            console.warn('Error removing existing map:', e);
        }
    }

    try {
        map = L.map(elementId).setView([lat, lng], zoom);

        // Add OpenStreetMap tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        }).addTo(map);

        return map;
    } catch (e) {
        console.error('Error creating map:', e);
        return null;
    }
}

// Add a marker
export function addMarker(lat, lng, popupText = null) {
    if (!map) return;

    const marker = L.marker([lat, lng]).addTo(map);
    
    if (popupText) {
        marker.bindPopup(popupText);
    }

    markers.push(marker);
    return marker;
}

// Add a circle
export function addCircle(lat, lng, radius, options = {}) {
    if (!map) return;

    const circle = L.circle([lat, lng], {
        radius: radius,
        ...options
    }).addTo(map);

    circles.push(circle);
    return circle;
}

// Add a polygon
export function addPolygon(latLngs, options = {}) {
    if (!map) return;

    const polygon = L.polygon(latLngs, options).addTo(map);
    polygons.push(polygon);
    return polygon;
}

// Add a polyline
export function addPolyline(latLngs, options = {}) {
    if (!map) return;

    const polyline = L.polyline(latLngs, options).addTo(map);
    polylines.push(polyline);
    return polyline;
}

// Add GeoJSON data
export function addGeoJson(geoJson, options = {}) {
    if (!map) return;

    const layer = L.geoJSON(geoJson, options).addTo(map);
    geoJsonLayers.push(layer);
    return layer;
}

// Add GeoJSON with popup
export function addGeoJsonWithPopup(geoJson, options = {}) {
    if (!map) return;

    const layer = L.geoJSON(geoJson, {
        ...options,
        onEachFeature: function (feature, layer) {
            if (feature.properties) {
                let popupContent = '<div>';
                for (const [key, value] of Object.entries(feature.properties)) {
                    popupContent += `<strong>${key}:</strong> ${value}<br/>`;
                }
                popupContent += '</div>';
                layer.bindPopup(popupContent);
            }
        }
    }).addTo(map);

    geoJsonLayers.push(layer);
    return layer;
}

// Clear all overlays (except base tiles)
export function clearMap() {
    if (!map) return;

    markers.forEach(marker => map.removeLayer(marker));
    circles.forEach(circle => map.removeLayer(circle));
    polygons.forEach(polygon => map.removeLayer(polygon));
    polylines.forEach(polyline => map.removeLayer(polyline));
    geoJsonLayers.forEach(layer => map.removeLayer(layer));

    markers = [];
    circles = [];
    polygons = [];
    polylines = [];
    geoJsonLayers = [];
}

// Set map view
export function setView(lat, lng, zoom) {
    if (!map) return;
    map.setView([lat, lng], zoom);
}

// Fit map to bounds
export function fitBounds(bounds) {
    if (!map) return;
    
    // Validate bounds
    if (!bounds || bounds.length !== 2 || 
        !Array.isArray(bounds[0]) || !Array.isArray(bounds[1]) ||
        bounds[0].length !== 2 || bounds[1].length !== 2) {
        console.error('Invalid bounds format');
        return;
    }

    const [[minLat, minLng], [maxLat, maxLng]] = bounds;
    
    // Check if bounds are valid (not the same point)
    if (minLat === maxLat && minLng === maxLng) {
        // Single point, just center on it
        map.setView([minLat, minLng], 10);
        return;
    }

    // Check if coordinates are valid numbers
    if (isNaN(minLat) || isNaN(minLng) || isNaN(maxLat) || isNaN(maxLng)) {
        console.error('Invalid coordinate values');
        return;
    }

    try {
        map.fitBounds(bounds, { padding: [50, 50] });
    } catch (error) {
        console.error('Error fitting bounds:', error);
        // Fallback to center view
        const centerLat = (minLat + maxLat) / 2;
        const centerLng = (minLng + maxLng) / 2;
        map.setView([centerLat, centerLng], 8);
    }
}

// Initialize drawing tools
export function initDrawTools(lineColor = '#3388ff', fillColor = '#3388ff', lineWeight = 2) {
    if (!map) return;

    // Load Leaflet.draw if not already loaded
    if (typeof L.Control.Draw === 'undefined') {
        console.error('Leaflet.draw library not loaded');
        return;
    }

    drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    drawControl = new L.Control.Draw({
        position: 'topright',
        draw: {
            polyline: {
                shapeOptions: {
                    color: lineColor,
                    weight: lineWeight
                }
            },
            polygon: {
                shapeOptions: {
                    color: lineColor,
                    fillColor: fillColor,
                    weight: lineWeight
                }
            },
            circle: {
                shapeOptions: {
                    color: lineColor,
                    fillColor: fillColor,
                    weight: lineWeight
                }
            },
            rectangle: {
                shapeOptions: {
                    color: lineColor,
                    fillColor: fillColor,
                    weight: lineWeight
                }
            },
            marker: true
        },
        edit: {
            featureGroup: drawnItems
        }
    });

    map.addControl(drawControl);

    // Event handlers for drawing
    map.on(L.Draw.Event.CREATED, function (e) {
        const layer = e.layer;
        drawnItems.addLayer(layer);
    });
}

// Initialize drawing tools with advanced options
export function initDrawToolsAdvanced(options) {
    if (!map) return;

    drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    const drawOptions = {
        position: options.position || 'topright',
        draw: {
            polyline: options.enablePolyline ? {
                shapeOptions: {
                    color: options.lineColor,
                    weight: options.lineWeight
                }
            } : false,
            polygon: options.enablePolygon ? {
                shapeOptions: {
                    color: options.lineColor,
                    fillColor: options.fillColor,
                    fillOpacity: options.fillOpacity,
                    weight: options.lineWeight
                }
            } : false,
            circle: options.enableCircle ? {
                shapeOptions: {
                    color: options.lineColor,
                    fillColor: options.fillColor,
                    fillOpacity: options.fillOpacity,
                    weight: options.lineWeight
                }
            } : false,
            rectangle: options.enableRectangle ? {
                shapeOptions: {
                    color: options.lineColor,
                    fillColor: options.fillColor,
                    fillOpacity: options.fillOpacity,
                    weight: options.lineWeight
                }
            } : false,
            marker: options.enableMarker
        },
        edit: {
            featureGroup: drawnItems
        }
    };

    drawControl = new L.Control.Draw(drawOptions);
    map.addControl(drawControl);

    map.on(L.Draw.Event.CREATED, function (e) {
        const layer = e.layer;
        drawnItems.addLayer(layer);
    });
}

// Update drawing tools style
export function updateDrawToolsStyle(lineColor, fillColor, lineWeight, fillOpacity = 0.2) {
    // This would require recreating the draw control with new options
    if (drawControl) {
        map.removeControl(drawControl);
    }
    initDrawTools(lineColor, fillColor, lineWeight);
}

// Enable drawing
export function enableDrawing() {
    if (drawControl) {
        map.addControl(drawControl);
    }
}

// Disable drawing
export function disableDrawing() {
    if (drawControl) {
        map.removeControl(drawControl);
    }
}

// Clear all drawn items
export function clearAllDrawn() {
    if (drawnItems) {
        drawnItems.clearLayers();
    }
}

// Get drawn items as GeoJSON
export function getDrawnGeoJson() {
    if (!drawnItems) return null;
    return JSON.stringify(drawnItems.toGeoJSON());
}

// Add drawn items from GeoJSON
export function addDrawnFromGeoJson(geoJson) {
    if (!drawnItems) return;

    const layer = L.geoJSON(geoJson);
    layer.eachLayer(function (l) {
        drawnItems.addLayer(l);
    });
}

// Add MiniMap
export function addMiniMap(miniMapLayerUrl, options = {}) {
    if (!map) return;

    // Load MiniMap plugin if available
    if (typeof L.Control.MiniMap === 'undefined') {
        console.error('Leaflet.MiniMap plugin not loaded');
        return;
    }

    const miniMapLayer = L.tileLayer(miniMapLayerUrl, {
        attribution: ''
    });

    miniMapControl = new L.Control.MiniMap(miniMapLayer, {
        width: options.width || 150,
        height: options.height || 150,
        position: options.position || 'bottomright',
        toggleDisplay: options.toggleDisplay !== false,
        zoomLevelOffset: options.zoomLevelOffset || -5
    }).addTo(map);
}

// Remove MiniMap
export function removeMiniMap() {
    if (miniMapControl) {
        map.removeControl(miniMapControl);
        miniMapControl = null;
    }
}

// Toggle MiniMap visibility
export function toggleMiniMap() {
    if (miniMapControl) {
        miniMapControl._toggleDisplayButtonClicked();
    }
}

// Setup map click handler
export function setupMapClick(dotNetReference) {
    if (!map || isDisposed) return;

    map.on('click', function (e) {
        dotNetReference.invokeMethodAsync('HandleMapClick', e.latlng.lat, e.latlng.lng);
    });
}

// Cleanup function to be called on disposal
export function dispose() {
    isDisposed = true;
    
    try {
        if (map) {
            // Remove all layers
            markers.forEach(marker => {
                try { map.removeLayer(marker); } catch (e) {}
            });
            circles.forEach(circle => {
                try { map.removeLayer(circle); } catch (e) {}
            });
            polygons.forEach(polygon => {
                try { map.removeLayer(polygon); } catch (e) {}
            });
            polylines.forEach(polyline => {
                try { map.removeLayer(polyline); } catch (e) {}
            });
            geoJsonLayers.forEach(layer => {
                try { map.removeLayer(layer); } catch (e) {}
            });

            // Remove controls
            if (drawControl) {
                try { map.removeControl(drawControl); } catch (e) {}
            }
            if (miniMapControl) {
                try { map.removeControl(miniMapControl); } catch (e) {}
            }

            // Remove the map
            try {
                map.remove();
            } catch (e) {
                console.warn('Error removing map:', e);
            }
            
            map = null;
        }

        // Clear arrays
        markers = [];
        circles = [];
        polygons = [];
        polylines = [];
        geoJsonLayers = [];
        drawnItems = null;
        drawControl = null;
        miniMapControl = null;
    } catch (e) {
        console.error('Error during disposal:', e);
    }
}
