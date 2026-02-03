/**
 * Distance Calculation Service
 * 
 * Priority:
 * 1. OpenRouteService API (real road distance)
 * 2. Haversine Formula (straight-line distance as fallback)
 * 3. Error if both fail
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
        console.log(`⚠️ ORS API failed: ${error.message}`);
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
            console.log(`📍 Geocoded "${address}" → (${lat}, ${lng})`);
            return { lat, lng, source: 'ors' };
        }

        throw new Error(`Could not geocode address: ${address}`);

    } catch (error) {
        console.log(`⚠️ Geocoding failed for "${address}": ${error.message}`);
        throw error;
    }
}

/**
 * Haversine Formula - Calculate straight-line distance between two points
 * Used as fallback when API is not available
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

function toRadians(degrees) {
    return degrees * (Math.PI / 180);
}

/**
 * Predefined coordinates for major Indian cities (fallback for geocoding)
 */
const CITY_COORDINATES = {
    // Metro Cities
    'mumbai': { lat: 19.0760, lng: 72.8777 },
    'delhi': { lat: 28.6139, lng: 77.2090 },
    'new delhi': { lat: 28.6139, lng: 77.2090 },
    'bangalore': { lat: 12.9716, lng: 77.5946 },
    'bengaluru': { lat: 12.9716, lng: 77.5946 },
    'hyderabad': { lat: 17.3850, lng: 78.4867 },
    'chennai': { lat: 13.0827, lng: 80.2707 },
    'kolkata': { lat: 22.5726, lng: 88.3639 },
    'pune': { lat: 18.5204, lng: 73.8567 },
    'ahmedabad': { lat: 23.0225, lng: 72.5714 },
    
    // Other Major Cities
    'jaipur': { lat: 26.9124, lng: 75.7873 },
    'lucknow': { lat: 26.8467, lng: 80.9462 },
    'kanpur': { lat: 26.4499, lng: 80.3319 },
    'nagpur': { lat: 21.1458, lng: 79.0882 },
    'indore': { lat: 22.7196, lng: 75.8577 },
    'thane': { lat: 19.2183, lng: 72.9781 },
    'bhopal': { lat: 23.2599, lng: 77.4126 },
    'visakhapatnam': { lat: 17.6868, lng: 83.2185 },
    'patna': { lat: 25.5941, lng: 85.1376 },
    'vadodara': { lat: 22.3072, lng: 73.1812 },
    'ghaziabad': { lat: 28.6692, lng: 77.4538 },
    'ludhiana': { lat: 30.9010, lng: 75.8573 },
    'agra': { lat: 27.1767, lng: 78.0081 },
    'nashik': { lat: 19.9975, lng: 73.7898 },
    'faridabad': { lat: 28.4089, lng: 77.3178 },
    'meerut': { lat: 28.9845, lng: 77.7064 },
    'rajkot': { lat: 22.3039, lng: 70.8022 },
    'varanasi': { lat: 25.3176, lng: 82.9739 },
    'srinagar': { lat: 34.0837, lng: 74.7973 },
    'aurangabad': { lat: 19.8762, lng: 75.3433 },
    'dhanbad': { lat: 23.7957, lng: 86.4304 },
    'amritsar': { lat: 31.6340, lng: 74.8723 },
    'allahabad': { lat: 25.4358, lng: 81.8463 },
    'prayagraj': { lat: 25.4358, lng: 81.8463 },
    'ranchi': { lat: 23.3441, lng: 85.3096 },
    'coimbatore': { lat: 11.0168, lng: 76.9558 },
    'jabalpur': { lat: 23.1815, lng: 79.9864 },
    'gwalior': { lat: 26.2183, lng: 78.1828 },
    'vijayawada': { lat: 16.5062, lng: 80.6480 },
    'jodhpur': { lat: 26.2389, lng: 73.0243 },
    'madurai': { lat: 9.9252, lng: 78.1198 },
    'raipur': { lat: 21.2514, lng: 81.6296 },
    'kota': { lat: 25.2138, lng: 75.8648 },
    'chandigarh': { lat: 30.7333, lng: 76.7794 },
    'guwahati': { lat: 26.1445, lng: 91.7362 },
    'solapur': { lat: 17.6599, lng: 75.9064 },
    'hubli': { lat: 15.3647, lng: 75.1240 },
    'tiruchirappalli': { lat: 10.7905, lng: 78.7047 },
    'bareilly': { lat: 28.3670, lng: 79.4304 },
    'mysore': { lat: 12.2958, lng: 76.6394 },
    'mysuru': { lat: 12.2958, lng: 76.6394 },
    'gurgaon': { lat: 28.4595, lng: 77.0266 },
    'gurugram': { lat: 28.4595, lng: 77.0266 },
    'noida': { lat: 28.5355, lng: 77.3910 },
    'surat': { lat: 21.1702, lng: 72.8311 },
    'bhubaneswar': { lat: 20.2961, lng: 85.8245 },
    'dehradun': { lat: 30.3165, lng: 78.0322 },
    'jammu': { lat: 32.7266, lng: 74.8570 },
    'shimla': { lat: 31.1048, lng: 77.1734 },
    'thiruvananthapuram': { lat: 8.5241, lng: 76.9366 },
    'kochi': { lat: 9.9312, lng: 76.2673 },
    'mangalore': { lat: 12.9141, lng: 74.8560 }
};

/**
 * Extract city name from address
 */
function extractCityFromAddress(address) {
    const addressLower = address.toLowerCase();
    
    // Check if any known city is in the address
    for (const city of Object.keys(CITY_COORDINATES)) {
        if (addressLower.includes(city)) {
            return city;
        }
    }
    
    // Try to extract last part as city (common format: "Street, Area, City")
    const parts = address.split(',').map(p => p.trim().toLowerCase());
    for (const part of parts.reverse()) {
        if (CITY_COORDINATES[part]) {
            return part;
        }
    }
    
    return null;
}

/**
 * Get coordinates for an address
 * Tries: 1) City lookup, 2) Geocoding API
 */
async function getCoordinates(address) {
    // First try city lookup (fast, no API call)
    const city = extractCityFromAddress(address);
    if (city && CITY_COORDINATES[city]) {
        console.log(`📍 Found city "${city}" in lookup table`);
        return { ...CITY_COORDINATES[city], source: 'lookup' };
    }
    
    // Try geocoding API
    try {
        return await geocodeAddress(address);
    } catch (error) {
        console.log(`⚠️ Could not get coordinates for: ${address}`);
        return null;
    }
}

/**
 * Main function to calculate distance between two addresses
 * 
 * @param {string} pickupAddress - Pickup location address
 * @param {string} deliveryAddress - Delivery location address
 * @returns {Promise<{distance: number, method: string}>} - Distance in km and method used
 */
async function calculateDistance(pickupAddress, deliveryAddress) {
    console.log(`\n🚚 Calculating distance:`);
    console.log(`   From: ${pickupAddress}`);
    console.log(`   To: ${deliveryAddress}`);
    
    // Step 1: Get coordinates for both addresses
    const pickupCoords = await getCoordinates(pickupAddress);
    const deliveryCoords = await getCoordinates(deliveryAddress);
    
    if (!pickupCoords || !deliveryCoords) {
        throw new Error('Could not determine coordinates for one or both addresses. Please provide valid city names in the address.');
    }
    
    // Step 2: Try OpenRouteService API for road distance
    try {
        const distance = await getDistanceFromORS(pickupCoords, deliveryCoords);
        return { distance: Math.round(distance), method: 'openrouteservice' };
    } catch (error) {
        console.log('⚠️ Falling back to Haversine formula...');
    }
    
    // Step 3: Fallback to Haversine formula
    try {
        const distance = haversineDistance(
            pickupCoords.lat, pickupCoords.lng,
            deliveryCoords.lat, deliveryCoords.lng
        );
        return { distance: Math.round(distance), method: 'haversine' };
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
    getCoordinates,
    CITY_COORDINATES
};
