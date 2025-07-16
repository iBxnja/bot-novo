const axios = require('axios');

class ValidationService {
  constructor() {
    this.businessHours = {
      start: 6,  // 6:00 AM
      end: 23    // 11:00 PM
    };
    
    this.serviceAreas = {
      concordia: {
        center: { lat: -31.3927, lng: -58.0209 },
        radius: 15 // km
      },
      buenosAires: {
        center: { lat: -34.6118, lng: -58.3960 },
        radius: 50
      }
    };
    
    this.tariffRanges = {
      short: { min: 500, max: 800, distance: 2 }, // hasta 2km
      medium: { min: 800, max: 1200, distance: 5 }, // 2-5km
      long: { min: 1200, max: 2000, distance: 15 } // 5-15km
    };
  }

  // Validación de horarios
  validateTime(timeValue, isReservation = false) {
    const validation = {
      isValid: true,
      error: null,
      warning: null,
      normalizedTime: null
    };

    try {
      // Normalizar el formato de hora
      const normalizedTime = this.normalizeTime(timeValue);
      validation.normalizedTime = normalizedTime;

      if (!normalizedTime) {
        validation.isValid = false;
        validation.error = `Formato de hora inválido: ${timeValue}`;
        return validation;
      }

      const { hour, minute } = normalizedTime;

      // Validar rangos básicos
      if (hour < 0 || hour > 23) {
        validation.isValid = false;
        validation.error = `Hora fuera de rango: ${hour}:${minute}`;
        return validation;
      }

      if (minute < 0 || minute > 59) {
        validation.isValid = false;
        validation.error = `Minutos fuera de rango: ${hour}:${minute}`;
        return validation;
      }

      // Validar horario de servicio
      if (hour < this.businessHours.start || hour > this.businessHours.end) {
        if (isReservation) {
          validation.warning = `Horario fuera del servicio regular (${this.businessHours.start}:00 - ${this.businessHours.end}:00). Podemos hacer la reserva pero puede haber disponibilidad limitada.`;
        } else {
          validation.isValid = false;
          validation.error = `Horario fuera del servicio regular. Servicio disponible de ${this.businessHours.start}:00 a ${this.businessHours.end}:00.`;
          return validation;
        }
      }

      // Validar reservas futuras
      if (isReservation) {
        const now = new Date();
        const reservationTime = new Date();
        reservationTime.setHours(hour, minute, 0, 0);

        // Si la hora es menor a la actual, asumir que es para mañana
        if (reservationTime < now) {
          reservationTime.setDate(reservationTime.getDate() + 1);
        }

        const timeDiff = reservationTime - now;
        const hoursDiff = timeDiff / (1000 * 60 * 60);

        if (hoursDiff < 0.5) {
          validation.warning = 'Reserva muy próxima. Te recomendamos pedir un taxi inmediato.';
        } else if (hoursDiff > 24) {
          validation.warning = 'Reserva muy anticipada. Te confirmaremos la disponibilidad más cerca de la fecha.';
        }
      }

    } catch (error) {
      validation.isValid = false;
      validation.error = `Error validando hora: ${error.message}`;
    }

    return validation;
  }

  normalizeTime(timeValue) {
    const timeStr = timeValue.toString().toLowerCase().trim();
    
    // Patrones de hora
    const patterns = [
      /^(\d{1,2}):(\d{2})\s*(am|pm)?$/i,
      /^(\d{1,2})\s*(am|pm)$/i,
      /^(\d{1,2})hs?$/i,
      /^(\d{1,2}):(\d{2})$/,
      /^(\d{1,2})$/,
      /^(\d{1,2})\s*horas?$/i
    ];

    for (const pattern of patterns) {
      const match = timeStr.match(pattern);
      if (match) {
        let hour = parseInt(match[1]);
        let minute = match[2] ? parseInt(match[2]) : 0;
        const period = match[3];

        // Convertir formato 12h a 24h
        if (period) {
          if (period.toLowerCase() === 'pm' && hour !== 12) {
            hour += 12;
          } else if (period.toLowerCase() === 'am' && hour === 12) {
            hour = 0;
          }
        }

        return { hour, minute };
      }
    }

    return null;
  }

  // Validación de direcciones
  async validateAddress(addressValue, city = 'concordia') {
    const validation = {
      isValid: true,
      error: null,
      warning: null,
      coordinates: null,
      distance: null
    };

    try {
      // Validaciones básicas
      if (!addressValue || addressValue.length < 5) {
        validation.isValid = false;
        validation.error = 'Dirección muy corta o vacía';
        return validation;
      }

      if (addressValue.length > 200) {
        validation.warning = 'Dirección muy larga. ¿Podrías ser más específico?';
      }

      // Validar formato básico (debe contener número)
      if (!/\d/.test(addressValue)) {
        validation.warning = 'La dirección debería incluir un número de calle';
      }

      // Geocodificación (opcional, requiere API key)
      try {
        const coordinates = await this.geocodeAddress(addressValue, city);
        if (coordinates) {
          validation.coordinates = coordinates;
          
          // Validar si está en el área de servicio
          const distance = this.calculateDistance(
            coordinates,
            this.serviceAreas[city]?.center
          );

          validation.distance = distance;

          if (distance > (this.serviceAreas[city]?.radius || 15)) {
            validation.warning = `La dirección está a ${distance.toFixed(1)}km del centro. Puede haber tarifa adicional.`;
          }
        }
      } catch (geoError) {
        // Si falla la geocodificación, continuar sin ella
        console.log('⚠️ Error en geocodificación:', geoError.message);
      }

    } catch (error) {
      validation.isValid = false;
      validation.error = `Error validando dirección: ${error.message}`;
    }

    return validation;
  }

  async geocodeAddress(address, city) {
    // Implementación básica de geocodificación
    // En producción, usarías Google Maps API o similar
    try {
      // Simular geocodificación para direcciones conocidas
      const knownAddresses = {
        '1 de mayo 449, concordia': { lat: -31.3927, lng: -58.0209 },
        'guemes 800, concordia': { lat: -31.3950, lng: -58.0180 },
        'diamante 2500, concordia': { lat: -31.3900, lng: -58.0250 }
      };

      const key = `${address.toLowerCase()}`;
      return knownAddresses[key] || null;
    } catch (error) {
      return null;
    }
  }

  calculateDistance(point1, point2) {
    if (!point1 || !point2) return null;

    const R = 6371; // Radio de la Tierra en km
    const dLat = this.deg2rad(point2.lat - point1.lat);
    const dLng = this.deg2rad(point2.lng - point1.lng);
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(this.deg2rad(point1.lat)) * Math.cos(this.deg2rad(point2.lat)) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;

    return distance;
  }

  deg2rad(deg) {
    return deg * (Math.PI/180);
  }

  // Validación de disponibilidad
  async validateAvailability(time, city = 'concordia') {
    const validation = {
      isAvailable: true,
      estimatedWait: null,
      alternativeTime: null,
      message: null
    };

    try {
      const now = new Date();
      const requestTime = time ? new Date(time) : now;
      
      // Simular verificación de disponibilidad
      const hour = requestTime.getHours();
      const isWeekend = requestTime.getDay() === 0 || requestTime.getDay() === 6;
      
      // Lógica de disponibilidad basada en horarios
      if (hour < 6 || hour > 23) {
        validation.isAvailable = false;
        validation.message = 'Servicio no disponible en este horario. Horario: 6:00 - 23:00';
        return validation;
      }

      // Calcular tiempo de espera estimado
      if (hour >= 7 && hour <= 9) {
        // Hora pico mañana
        validation.estimatedWait = '15-25 minutos';
      } else if (hour >= 17 && hour <= 19) {
        // Hora pico tarde
        validation.estimatedWait = '20-30 minutos';
      } else if (hour >= 22 || hour <= 6) {
        // Horario nocturno
        validation.estimatedWait = '10-20 minutos';
      } else {
        // Horario normal
        validation.estimatedWait = '5-15 minutos';
      }

      // Verificar si es fin de semana
      if (isWeekend) {
        validation.estimatedWait = '10-20 minutos';
      }

    } catch (error) {
      validation.isAvailable = false;
      validation.message = `Error verificando disponibilidad: ${error.message}`;
    }

    return validation;
  }

  // Validación de tarifas
  calculateTariff(origin, destination, serviceType = 'normal') {
    const calculation = {
      estimatedPrice: null,
      priceRange: null,
      distance: null,
      basePrice: null,
      additionalFees: [],
      totalPrice: null
    };

    try {
      // Calcular distancia (simulado)
      const distance = this.calculateDistance(origin, destination);
      calculation.distance = distance;

      if (!distance) {
        calculation.priceRange = 'Consultar';
        return calculation;
      }

      // Determinar rango de tarifa
      let tariffRange;
      if (distance <= this.tariffRanges.short.distance) {
        tariffRange = this.tariffRanges.short;
        calculation.basePrice = 500;
      } else if (distance <= this.tariffRanges.medium.distance) {
        tariffRange = this.tariffRanges.medium;
        calculation.basePrice = 800;
      } else {
        tariffRange = this.tariffRanges.long;
        calculation.basePrice = 1200;
      }

      calculation.priceRange = `${tariffRange.min}-${tariffRange.max}`;

      // Calcular precio estimado
      let estimatedPrice = calculation.basePrice;
      
      // Agregar tarifa por km adicional
      if (distance > tariffRange.distance) {
        const additionalKm = distance - tariffRange.distance;
        const additionalCost = additionalKm * 100; // $100 por km adicional
        estimatedPrice += additionalCost;
      }

      // Agregar tarifas adicionales
      if (serviceType === 'pet') {
        calculation.additionalFees.push({ type: 'Mascota', amount: 200 });
        estimatedPrice += 200;
      }

      if (serviceType === 'pink') {
        calculation.additionalFees.push({ type: 'Taxi Rosa', amount: 100 });
        estimatedPrice += 100;
      }

      // Tarifa nocturna (22:00 - 6:00)
      const now = new Date();
      const hour = now.getHours();
      if (hour >= 22 || hour <= 6) {
        calculation.additionalFees.push({ type: 'Tarifa Nocturna', amount: 150 });
        estimatedPrice += 150;
      }

      calculation.estimatedPrice = Math.round(estimatedPrice);
      calculation.totalPrice = calculation.estimatedPrice;

    } catch (error) {
      calculation.priceRange = 'Error en cálculo';
    }

    return calculation;
  }

  // Validación de métodos de pago
  validatePaymentMethod(method, amount = null) {
    const validation = {
      isValid: true,
      error: null,
      warning: null,
      availableMethods: ['efectivo', 'transferencia', 'tarjeta']
    };

    const validMethods = ['efectivo', 'transferencia', 'tarjeta', 'débito', 'crédito'];

    if (!validMethods.includes(method.toLowerCase())) {
      validation.isValid = false;
      validation.error = `Método de pago no válido: ${method}`;
      return validation;
    }

    // Validaciones específicas por método
    if (method.toLowerCase() === 'efectivo') {
      if (amount && amount > 5000) {
        validation.warning = 'Para montos mayores a $5000, recomendamos transferencia o tarjeta';
      }
    }

    if (method.toLowerCase() === 'transferencia') {
      validation.warning = 'La transferencia debe realizarse antes del viaje';
    }

    if (method.toLowerCase() === 'tarjeta') {
      validation.warning = 'Aceptamos tarjetas de débito y crédito';
    }

    return validation;
  }

  // Validación completa de un pedido
  async validateOrder(orderData) {
    const validation = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: [],
      availability: null,
      tariff: null
    };

    try {
      // Validar horario
      if (orderData.time) {
        const timeValidation = this.validateTime(orderData.time, orderData.serviceType === 'reserva');
        if (!timeValidation.isValid) {
          validation.errors.push(timeValidation.error);
          validation.isValid = false;
        }
        if (timeValidation.warning) {
          validation.warnings.push(timeValidation.warning);
        }
      }

      // Validar direcciones
      if (orderData.origin) {
        const originValidation = await this.validateAddress(orderData.origin, orderData.city);
        if (!originValidation.isValid) {
          validation.errors.push(`Origen: ${originValidation.error}`);
          validation.isValid = false;
        }
        if (originValidation.warning) {
          validation.warnings.push(`Origen: ${originValidation.warning}`);
        }
      }

      if (orderData.destination) {
        const destValidation = await this.validateAddress(orderData.destination, orderData.city);
        if (!destValidation.isValid) {
          validation.errors.push(`Destino: ${destValidation.error}`);
          validation.isValid = false;
        }
        if (destValidation.warning) {
          validation.warnings.push(`Destino: ${destValidation.warning}`);
        }
      }

      // Validar disponibilidad
      if (orderData.time) {
        validation.availability = await this.validateAvailability(orderData.time, orderData.city);
        if (!validation.availability.isAvailable) {
          validation.errors.push(validation.availability.message);
          validation.isValid = false;
        }
      }

      // Calcular tarifa
      if (orderData.origin && orderData.destination) {
        validation.tariff = this.calculateTariff(
          orderData.origin,
          orderData.destination,
          orderData.serviceType
        );
      }

      // Validar método de pago
      if (orderData.paymentMethod) {
        const paymentValidation = this.validatePaymentMethod(
          orderData.paymentMethod,
          validation.tariff?.totalPrice
        );
        if (!paymentValidation.isValid) {
          validation.errors.push(paymentValidation.error);
          validation.isValid = false;
        }
        if (paymentValidation.warning) {
          validation.warnings.push(paymentValidation.warning);
        }
      }

      // Generar sugerencias
      if (validation.warnings.length > 0) {
        validation.suggestions.push('Revisá los detalles del pedido antes de confirmar');
      }

      if (validation.tariff && validation.tariff.totalPrice > 2000) {
        validation.suggestions.push('Para viajes largos, considerá reservar con anticipación');
      }

    } catch (error) {
      validation.isValid = false;
      validation.errors.push(`Error en validación: ${error.message}`);
    }

    return validation;
  }
}

module.exports = ValidationService; 