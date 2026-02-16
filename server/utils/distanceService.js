/**
 * Distance Calculation Service
 * 
 * Priority:
 * 1. OpenRouteService API (real road distance with geocoding)
 * 2. Haversine Formula (if geocoding works but routing fails)
 * 3. Error if geocoding fails
 */

const axios = require('axios');

// OpenRouteService API Key (free tier - 2000 requests/day)
const ORS_API_KEY = process.env.ORS_API_KEY;
const ORS_BASE_URL = 'https://api.openrouteservice.org';

/**
 * Calculate distance using OpenRouteService API
 * Returns road distance in kilometers
 */
async function getDistanceFromORS(pickupCoords, deliveryCoords) {
    try {
        if (!ORS_API_KEY) {
            throw new Error('ORS_API_KEY not configured');
        }

        const response = await axios.post(
            `${ORS_BASE_URL}/v2/directions/driving-car`,
            {
                coordinates: [
                    [pickupCoords.lng, pickupCoords.lat],
                    [deliveryCoords.lng, deliveryCoords.lat]
                ]
            },
            {
                headers: {
                    'Authorization': ORS_API_KEY,
                    'Content-Type': 'application/json'
                },
                timeout: 10000 // 10 second timeout
            }
        );

        // Distance is returned in meters, convert to km
        const distanceInMeters = response.data.routes[0].summary.distance;
        const distanceInKm = distanceInMeters / 1000;
        
        console.log(`📍 ORS Distance: ${distanceInKm.toFixed(2)} km`);
        return distanceInKm;

    } catch (error) {
        console.log(`⚠️ ORS Routing API failed: ${error.message}`);
        throw error;
    }
}

/**
 * Geocode an address to get coordinates using OpenRouteService
 */
async function geocodeAddress(address) {
    try {
        if (!ORS_API_KEY) {
            throw new Error('ORS_API_KEY not configured');
        }

        const response = await axios.get(
            `${ORS_BASE_URL}/geocode/search`,
            {
                params: {
                    api_key: ORS_API_KEY,
                    text: address,
                    'boundary.country': 'IN', // Restrict to India
                    size: 1
                },
                timeout: 10000
            }
        );

        if (response.data.features && response.data.features.length > 0) {
            const [lng, lat] = response.data.features[0].geometry.coordinates;
            const placeName = response.data.features[0].properties.label || address;
            console.log(`📍 Geocoded "${address}" → ${placeName} (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
            return { lat, lng, placeName };
        }

        throw new Error(`Could not geocode address: ${address}`);

    } catch (error) {
        console.log(`⚠️ Geocoding failed for "${address}": ${error.message}`);
        throw error;
    }
}

/**
 * Haversine Formula - Calculate straight-line distance between two points
 * Used as fallback when routing API fails but geocoding works
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers

    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    // Multiply by 1.3 to approximate road distance (roads are ~30% longer than straight line)
    const roadDistanceApprox = distance * 1.3;
    
    console.log(`📍 Haversine Distance: ${roadDistanceApprox.toFixed(2)} km (approx road)`);
    return roadDistanceApprox;
}

/**
 * Pure Haversine Formula - Returns straight-line distance WITHOUT road multiplier
 * Used for ML predictions to match training data (trained on pure Haversine)
 */
function pureHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers

    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Pure straight-line distance, no multiplier
}

function toRadians(degrees) {
    return degrees * (Math.PI / 180);
}

/**
 * Main function to calculate distance between two addresses
 * 
 * @param {string} pickupAddress - Pickup location address
 * @param {string} deliveryAddress - Delivery location address
 * @returns {Promise<Object>} - Distance info including road distance, haversine distance, and coordinates
 */
async function calculateDistance(pickupAddress, deliveryAddress) {
    console.log(`\n🚚 Calculating distance:`);
    console.log(`   From: ${pickupAddress}`);
    console.log(`   To: ${deliveryAddress}`);
    
    // Step 1: Geocode both addresses using ORS API
    let pickupCoords, deliveryCoords;
    
    try {
        pickupCoords = await geocodeAddress(pickupAddress);
    } catch (error) {
        throw new Error(`Could not find pickup location: "${pickupAddress}". Please enter a valid address with city name.`);
    }
    
    try {
        deliveryCoords = await geocodeAddress(deliveryAddress);
    } catch (error) {
        throw new Error(`Could not find delivery location: "${deliveryAddress}". Please enter a valid address with city name.`);
    }
    
    // Calculate pure Haversine distance (for ML predictions - matches training data)
    const haversineDistForML = pureHaversineDistance(
        pickupCoords.lat, pickupCoords.lng,
        deliveryCoords.lat, deliveryCoords.lng
    );
    console.log(`📍 Pure Haversine (for ML): ${haversineDistForML.toFixed(2)} km`);
    
    // Step 2: Try OpenRouteService API for road distance (for display to user)
    try {
        const distance = await getDistanceFromORS(pickupCoords, deliveryCoords);
        return {
            distance: Math.round(distance),
            method: 'openrouteservice',
            haversineDistance: haversineDistForML,
            pickupCoords,
            deliveryCoords
        };
    } catch (error) {
        console.log('⚠️ Falling back to Haversine formula...');
    }
    
    // Step 3: Fallback to Haversine formula (with 1.3x for road approximation)
    try {
        const distance = haversineDistance(
            pickupCoords.lat, pickupCoords.lng,
            deliveryCoords.lat, deliveryCoords.lng
        );
        return {
            distance: Math.round(distance),
            method: 'haversine',
            haversineDistance: haversineDistForML,
            pickupCoords,
            deliveryCoords
        };
    } catch (error) {
        throw new Error('Failed to calculate distance. Please try again.');
    }
}

/**
 * Calculate price based on weight and distance
 */
function calculatePrice(weight, distance) {
    const baseCharge = 50;       // Base charge in INR
    const perKmCharge = 0.9;     // Per kilometer charge
    const perKgCharge = 12;      // Per kilogram charge
    
    const price = baseCharge + (distance * perKmCharge) + (weight * perKgCharge);
    return Math.round(price);
}

module.exports = {
    calculateDistance,
    calculatePrice,
    haversineDistance,
    pureHaversineDistance,
    geocodeAddress
};
