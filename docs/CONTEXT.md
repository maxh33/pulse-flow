# Real-Time Social Media Data Insights Platform

## Overview
A sophisticated real-time data processing and visualization platform built with enterprise-grade technologies. This project demonstrates advanced data simulation, monitoring, and analytics capabilities using modern DevOps practices.

## Tech Stack

### Core Technologies
- **Backend Framework**: Node.js + Express with TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Containerization**: Docker & Docker Compose

### Monitoring & Visualization
- **Metrics**: Prometheus
- **Dashboards**: Grafana
- **Health Checks**: Custom endpoints with prometheus-client

### CI/CD & DevOps
- **Continuous Integration & Deployment**: GitHub Actions
- **Container Orchestration**: Docker Compose

## Data Architecture

### Database Schema

#### Social Media Event Collection
```typescript
// Tweet Schema
interface TweetDocument extends Document {
    tweetId: string;           // Unique identifier
    user: string;              // Author of the post
    content: string;           // Main content
    timestamp: Date;           // Creation timestamp
    metrics: {
        retweets: number;      // Share count
        likes: number;         // Engagement metric
        comments: number;      // Interaction count
    };
    sentiment: 'positive' | 'negative' | 'neutral';  // AI-analyzed sentiment
    location: {
        country: string;       // Geographic data
        city: string;         
    };
    platform: 'web' | 'android' | 'ios';  // Source platform
    tags: string[];           // Associated categories/topics
}

// Metrics Schema
interface MetricsDocument extends Document {
    timestamp: Date;           // Measurement timestamp
    totalTweets: number;       // Total tweets processed
    avgEngagement: number;     // Average engagement rate
    sentimentDistribution: {
        positive: number;
        negative: number;
        neutral: number;
    };
    platformDistribution: {
        web: number;
        android: number;
        ios: number;
    };
    topTags: Array<{
        tag: string;
        count: number;
    }>;
}

// Error Log Schema
interface ErrorLogDocument extends Document {
    timestamp: Date;           // Error occurrence time
    errorType: string;         // Type of error
    message: string;           // Error message
    stack?: string;           // Stack trace (optional)
    metadata: {
        component: string;     // System component
        severity: 'low' | 'medium' | 'high';
        resolved: boolean;
    };
}

// System Health Schema
interface HealthCheckDocument extends Document {
    timestamp: Date;           // Check timestamp
    status: 'healthy' | 'degraded' | 'down';
    metrics: {
        cpuUsage: number;
        memoryUsage: number;
        activeConnections: number;
    };
    lastError?: {
        message: string;
        timestamp: Date;
    };
}
```

#### Indexes
```typescript
// Tweet Collection Indexes
{
    tweetId: 1,               // Unique index
    timestamp: -1,            // For time-based queries
    "metrics.likes": -1,      // For engagement sorting
    tags: 1,                  // For tag-based queries
    "location.country": 1     // For geographic analysis
}

// Metrics Collection Indexes
{
    timestamp: -1,            // Time-series data access
    totalTweets: -1           // Performance monitoring
}

// Error Log Collection Indexes
{
    timestamp: -1,            // Time-based error analysis
    errorType: 1,            // Error type aggregation
    "metadata.severity": 1    // Severity-based queries
}

// Health Check Collection Indexes
{
    timestamp: -1,            // Historical health data
    status: 1                 // Status-based queries
}
```

#### Data Relationships
- Each `Tweet` document is independent
- `Metrics` documents are time-series aggregations
- `ErrorLog` documents track system issues
- `HealthCheck` documents monitor system status

#### Data Retention Policies
- Tweets: Indefinite storage
- Metrics: 30-day rolling window
- Error Logs: 90-day retention
- Health Checks: 7-day retention

### Key Features
- Real-time data generation and processing
- Sentiment analysis integration
- Geographic data tracking
- Cross-platform metrics
- Engagement analytics

## Monitoring & Analytics
- Real-time metrics visualization
- Custom Grafana dashboards
- Automated alerts and notifications
- Performance monitoring
- Error tracking and logging

## Security & Best Practices
- Input validation and sanitization
- Rate limiting
- API authentication
- Secure environment configuration
- Docker security best practices

## Getting Started

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- MongoDB (Atlas)

### Quick Start
```bash
# Clone the repository
git clone https://github.com/maxh33/pulse-flow

# Install dependencies
npm install

# Start development environment
docker-compose -f docker-compose.dev.yml up -d

# Access services
- Application: http://localhost:3002
- Grafana: http://localhost:3001
- Jenkins: http://localhost:8080
- Prometheus: http://localhost:9090
```

## Development

### Environment Configuration
```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>
```

### Running Tests
```bash
npm run test
```

### Development Workflow

#### Available Scripts
```bash
npm run dev           # Start development server
npm run dev:insert   # Run continuous data insertion

# Testing
npm run test         # Run all tests
npm run test:watch   # Run tests in watch mode
npm run test:mongodb # Test MongoDB connection

# Docker Operations
npm run docker:dev   # Start development containers
npm run docker:prod  # Start production containers
npm run docker:build # Build production images

# Jenkins
npm run jenkins:status # Check Jenkins container status
npm run jenkins:logs  # View Jenkins logs
```

## Production Deployment
```bash
docker-compose -f docker-compose.prod.yml up -d
```
