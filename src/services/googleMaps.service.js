const axios = require('axios');
const config = require('../../config/environment');

const GOOGLE_MAPS_API_KEY = config.googleMaps.apiKey;
const GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

/**
 * Valida y geocodifica una dirección usando Google Maps
 * @param {string} address - Dirección a validar
 * @returns {Promise<{valid: boolean, formattedAddress?: string, location?: {lat: number, lng: number}, candidates?: Array, error?: string}>}
 */
async function validateAddress(address) {
  try {
    const response = await axios.get(GEOCODE_URL, {
      params: {
        address,
        key: GOOGLE_MAPS_API_KEY
      }
    });
    const data = response.data;
    if (data.status === 'OK' && data.results.length > 0) {
      const result = data.results[0];
      return {
        valid: true,
        formattedAddress: result.formatted_address,
        location: result.geometry.location,
        candidates: data.results
      };
    } else {
      return {
        valid: false,
        error: data.status === 'ZERO_RESULTS' ? 'No se encontró la dirección.' : data.error_message || data.status
      };
    }
  } catch (error) {
    return {
      valid: false,
      error: error.message || 'Error al consultar Google Maps.'
    };
  }
}

module.exports = {
  validateAddress
}; 