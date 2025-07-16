const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: true,
    index: true
  },
  
  // Información de la sesión
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  
  startTime: {
    type: Date,
    default: Date.now
  },
  
  endTime: Date,
  
  // Estado de la conversación
  status: {
    type: String,
    enum: ['active', 'completed', 'abandoned', 'error'],
    default: 'active'
  },
  
  // Mensajes de la conversación
  messages: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    sender: {
      type: String,
      enum: ['user', 'bot'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    intent: String, // intención detectada
    entities: [{
      type: String, // 'address', 'time', 'payment', 'service'
      value: String,
      confidence: Number
    }],
    sentiment: {
      score: Number, // -1 a 1
      label: String // 'positive', 'negative', 'neutral'
    },
    context: {
      state: String, // estado del bot en ese momento
      userData: Object, // datos del usuario en ese momento
      pendingQuestions: [String]
    }
  }],
  
  // Análisis de la conversación
  analysis: {
    // Intenciones detectadas
    intents: [{
      intent: String,
      confidence: Number,
      timestamp: Date
    }],
    
    // Entidades extraídas
    entities: [{
      type: String,
      value: String,
      count: Number
    }],
    
    // Sentimiento general
    overallSentiment: {
      score: Number,
      label: String,
      trend: String // 'improving', 'declining', 'stable'
    },
    
    // Métricas de la conversación
    metrics: {
      totalMessages: { type: Number, default: 0 },
      userMessages: { type: Number, default: 0 },
      botMessages: { type: Number, default: 0 },
      averageResponseTime: Number, // tiempo promedio de respuesta del bot
      conversationDuration: Number, // duración total en segundos
      completionRate: { type: Number, default: 0 }, // porcentaje de completitud
      userSatisfaction: Number // puntuación de satisfacción (1-5)
    },
    
    // Problemas detectados
    issues: [{
      type: String, // 'confusion', 'frustration', 'timeout', 'error'
      description: String,
      timestamp: Date,
      severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical']
      }
    }],
    
    // Sugerencias de mejora
    suggestions: [{
      type: String, // 'clarification', 'suggestion', 'correction'
      message: String,
      context: String
    }]
  },
  
  // Resultado de la conversación
  outcome: {
    success: { type: Boolean, default: false },
    tripCreated: { type: Boolean, default: false },
    tripId: String,
    userData: {
      origin: String,
      destination: String,
      paymentMethod: String,
      serviceType: String,
      time: String,
      specialService: String
    },
    finalState: String,
    completionReason: String // 'user_confirmed', 'user_cancelled', 'timeout', 'error'
  },
  
  // Contexto adicional
  context: {
    userAgent: String,
    platform: String, // 'whatsapp', 'web', 'mobile'
    language: {
      type: String,
      default: 'es'
    },
    timezone: String,
    location: {
      country: String,
      city: String,
      coordinates: {
        lat: Number,
        lng: Number
      }
    }
  }
}, {
  timestamps: true
});

// Métodos del modelo
conversationSchema.methods.addMessage = function(messageData) {
  this.messages.push(messageData);
  this.analysis.metrics.totalMessages += 1;
  
  if (messageData.sender === 'user') {
    this.analysis.metrics.userMessages += 1;
  } else {
    this.analysis.metrics.botMessages += 1;
  }
  
  // Actualizar análisis de sentimiento
  if (messageData.sentiment) {
    this.updateSentimentAnalysis(messageData.sentiment);
  }
  
  // Actualizar intenciones
  if (messageData.intent) {
    this.analysis.intents.push({
      intent: messageData.intent,
      confidence: messageData.confidence || 0.8,
      timestamp: new Date()
    });
  }
  
  // Actualizar entidades
  if (messageData.entities) {
    messageData.entities.forEach(entity => {
      const existing = this.analysis.entities.find(e => e.type === entity.type && e.value === entity.value);
      if (existing) {
        existing.count += 1;
      } else {
        this.analysis.entities.push({
          type: entity.type,
          value: entity.value,
          count: 1
        });
      }
    });
  }
};

conversationSchema.methods.updateSentimentAnalysis = function(newSentiment) {
  const sentiments = this.messages
    .filter(m => m.sentiment && m.sentiment.score !== undefined)
    .map(m => m.sentiment.score);
  
  if (sentiments.length > 0) {
    const average = sentiments.reduce((a, b) => a + b, 0) / sentiments.length;
    this.analysis.overallSentiment.score = average;
    
    if (average > 0.3) {
      this.analysis.overallSentiment.label = 'positive';
    } else if (average < -0.3) {
      this.analysis.overallSentiment.label = 'negative';
    } else {
      this.analysis.overallSentiment.label = 'neutral';
    }
    
    // Determinar tendencia
    if (sentiments.length >= 2) {
      const recent = sentiments.slice(-3);
      const older = sentiments.slice(0, -3);
      
      if (recent.length > 0 && older.length > 0) {
        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
        
        if (recentAvg > olderAvg + 0.1) {
          this.analysis.overallSentiment.trend = 'improving';
        } else if (recentAvg < olderAvg - 0.1) {
          this.analysis.overallSentiment.trend = 'declining';
        } else {
          this.analysis.overallSentiment.trend = 'stable';
        }
      }
    }
  }
};

conversationSchema.methods.completeConversation = function(outcome) {
  this.endTime = new Date();
  this.status = 'completed';
  this.outcome = { ...this.outcome, ...outcome };
  
  // Calcular duración
  this.analysis.metrics.conversationDuration = 
    (this.endTime - this.startTime) / 1000; // en segundos
  
  // Calcular tasa de completitud
  if (this.outcome.success) {
    this.analysis.metrics.completionRate = 100;
  } else {
    // Calcular basado en el progreso
    const steps = ['origin', 'destination', 'payment', 'confirmation'];
    const completedSteps = steps.filter(step => 
      this.outcome.userData && this.outcome.userData[step]
    ).length;
    this.analysis.metrics.completionRate = (completedSteps / steps.length) * 100;
  }
};

conversationSchema.methods.addIssue = function(issue) {
  this.analysis.issues.push({
    ...issue,
    timestamp: new Date()
  });
};

conversationSchema.methods.addSuggestion = function(suggestion) {
  this.analysis.suggestions.push({
    ...suggestion,
    timestamp: new Date()
  });
};

// Métodos estáticos
conversationSchema.statics.findByPhoneNumber = function(phoneNumber, limit = 10) {
  return this.find({ phoneNumber })
    .sort({ startTime: -1 })
    .limit(limit);
};

conversationSchema.statics.getAnalytics = function(phoneNumber) {
  return this.aggregate([
    { $match: { phoneNumber } },
    {
      $group: {
        _id: null,
        totalConversations: { $sum: 1 },
        successfulConversations: {
          $sum: { $cond: [{ $eq: ['$outcome.success', true] }, 1, 0] }
        },
        averageDuration: { $avg: '$analysis.metrics.conversationDuration' },
        averageMessages: { $avg: '$analysis.metrics.totalMessages' },
        averageSentiment: { $avg: '$analysis.overallSentiment.score' },
        commonIssues: {
          $push: '$analysis.issues'
        }
      }
    }
  ]);
};

module.exports = mongoose.model('Conversation', conversationSchema); 