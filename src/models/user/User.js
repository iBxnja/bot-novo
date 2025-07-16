const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Información básica
  name: String,
  email: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  
  // Preferencias aprendidas
  preferences: {
    // Direcciones frecuentes
    frequentOrigins: [{
      address: String,
      location: {
        lat: Number,
        lng: Number
      },
      useCount: { type: Number, default: 1 },
      lastUsed: Date
    }],
    
    frequentDestinations: [{
      address: String,
      location: {
        lat: Number,
        lng: Number
      },
      useCount: { type: Number, default: 1 },
      lastUsed: Date
    }],
    
    // Métodos de pago preferidos
    preferredPaymentMethods: [{
      method: String,
      useCount: { type: Number, default: 1 },
      lastUsed: Date
    }],
    
    // Horarios frecuentes
    frequentTimes: [{
      time: String,
      useCount: { type: Number, default: 1 },
      lastUsed: Date
    }],
    
    // Servicios especiales preferidos
    preferredSpecialServices: [{
      service: String,
      useCount: { type: Number, default: 1 },
      lastUsed: Date
    }],
    
    // Tono de comunicación preferido
    communicationStyle: {
      type: String,
      enum: ['formal', 'casual', 'friendly', 'professional'],
      default: 'friendly'
    },
    
    // Preferencias de notificación
    notificationPreferences: {
      confirmTrip: { type: Boolean, default: true },
      driverArrival: { type: Boolean, default: true },
      tripComplete: { type: Boolean, default: true }
    }
  },
  
  // Estadísticas de uso
  stats: {
    totalTrips: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    averageTripCost: { type: Number, default: 0 },
    favoriteServiceType: String, // 'inmediato' o 'reserva'
    averageTripDistance: { type: Number, default: 0 },
    lastTripDate: Date
  },
  
  // Patrones de comportamiento
  behavior: {
    typicalBookingTime: String, // hora del día más común
    typicalTripDay: String, // día de la semana más común
    averageResponseTime: Number, // tiempo promedio de respuesta en segundos
    conversationLength: { type: Number, default: 0 }, // mensajes promedio por conversación
    cancellationRate: { type: Number, default: 0 }, // porcentaje de cancelaciones
    satisfactionScore: { type: Number, default: 0 } // puntuación de satisfacción
  },
  
  // Estado actual de la conversación
  currentConversation: {
    state: {
      type: String,
      enum: ['idle', 'collecting_origin', 'collecting_destination', 'collecting_payment', 'collecting_time', 'confirming', 'completed'],
      default: 'idle'
    },
    userData: {
      origin: String,
      destination: String,
      paymentMethod: String,
      serviceType: String,
      time: String,
      specialService: String,
      originLocation: {
        lat: Number,
        lng: Number
      },
      destinationLocation: {
        lat: Number,
        lng: Number
      }
    },
    context: {
      lastIntent: String,
      pendingQuestions: [String],
      userMood: String, // 'happy', 'frustrated', 'rushed', 'calm'
      conversationStartTime: Date
    }
  }
}, {
  timestamps: true
});

// Métodos del modelo
userSchema.methods.updatePreferences = function(data) {
  const { origin, destination, paymentMethod, time, specialService } = data;
  
  // Actualizar origen frecuente
  if (origin) {
    this.updateFrequentLocation('frequentOrigins', origin, data.originLocation);
  }
  
  // Actualizar destino frecuente
  if (destination) {
    this.updateFrequentLocation('frequentDestinations', destination, data.destinationLocation);
  }
  
  // Actualizar método de pago preferido
  if (paymentMethod) {
    this.updateFrequentItem('preferredPaymentMethods', paymentMethod);
  }
  
  // Actualizar horario frecuente
  if (time) {
    this.updateFrequentItem('frequentTimes', time);
  }
  
  // Actualizar servicio especial preferido
  if (specialService) {
    this.updateFrequentItem('preferredSpecialServices', specialService);
  }
};

userSchema.methods.updateFrequentLocation = function(field, address, location) {
  const existing = this.preferences[field].find(item => item.address === address);
  
  if (existing) {
    existing.useCount += 1;
    existing.lastUsed = new Date();
  } else {
    this.preferences[field].push({
      address,
      location,
      useCount: 1,
      lastUsed: new Date()
    });
  }
  
  // Mantener solo los 10 más frecuentes
  this.preferences[field].sort((a, b) => b.useCount - a.useCount);
  this.preferences[field] = this.preferences[field].slice(0, 10);
};

userSchema.methods.updateFrequentItem = function(field, item) {
  const existing = this.preferences[field].find(pref => pref.method === item || pref.service === item || pref.time === item);
  
  if (existing) {
    existing.useCount += 1;
    existing.lastUsed = new Date();
  } else {
    const newItem = {
      [field === 'preferredPaymentMethods' ? 'method' : field === 'preferredSpecialServices' ? 'service' : 'time']: item,
      useCount: 1,
      lastUsed: new Date()
    };
    this.preferences[field].push(newItem);
  }
  
  // Mantener solo los 5 más frecuentes
  this.preferences[field].sort((a, b) => b.useCount - a.useCount);
  this.preferences[field] = this.preferences[field].slice(0, 5);
};

userSchema.methods.getSuggestions = function() {
  const suggestions = {
    origins: this.preferences.frequentOrigins.slice(0, 3).map(o => o.address),
    destinations: this.preferences.frequentDestinations.slice(0, 3).map(d => d.address),
    paymentMethods: this.preferences.preferredPaymentMethods.slice(0, 2).map(p => p.method),
    times: this.preferences.frequentTimes.slice(0, 2).map(t => t.time),
    specialServices: this.preferences.preferredSpecialServices.slice(0, 2).map(s => s.service)
  };
  
  return suggestions;
};

userSchema.methods.updateStats = function(tripData) {
  this.stats.totalTrips += 1;
  this.stats.totalSpent += tripData.cost || 0;
  this.stats.averageTripCost = this.stats.totalSpent / this.stats.totalTrips;
  this.stats.lastTripDate = new Date();
  
  if (tripData.serviceType) {
    this.stats.favoriteServiceType = tripData.serviceType;
  }
  
  if (tripData.distance) {
    this.stats.averageTripDistance = ((this.stats.averageTripDistance * (this.stats.totalTrips - 1)) + tripData.distance) / this.stats.totalTrips;
  }
};

module.exports = mongoose.model('User', userSchema); 