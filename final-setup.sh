#!/bin/bash

# EnerLink P2P Energy Trading System - Final Setup Script
# This script installs all required dependencies and prepares the system for deployment

echo "🚀 EnerLink Backend - Final Setup & Dependency Installation"
echo "========================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install Node.js and npm first."
    exit 1
fi

print_status "Node.js and npm are available"

# Install core NestJS dependencies
echo ""
echo "📦 Installing core NestJS dependencies..."
npm install \
    @nestjs/common \
    @nestjs/core \
    @nestjs/platform-express \
    @nestjs/graphql \
    @nestjs/apollo \
    @apollo/server \
    graphql \
    @nestjs/typeorm \
    typeorm \
    pg \
    @nestjs/config \
    @nestjs/schedule \
    reflect-metadata \
    rxjs

print_status "Core NestJS dependencies installed"

# Install authentication dependencies
echo ""
echo "🔐 Installing authentication dependencies..."
npm install \
    @nestjs/jwt \
    @nestjs/passport \
    passport \
    passport-local \
    passport-jwt \
    bcryptjs \
    @types/bcryptjs

print_status "Authentication dependencies installed"

# Install IoT and MQTT dependencies
echo ""
echo "🌐 Installing IoT and MQTT dependencies..."
npm install \
    mqtt \
    @types/mqtt

print_status "IoT and MQTT dependencies installed"

# Install blockchain and crypto dependencies
echo ""
echo "⛓️  Installing blockchain dependencies..."
npm install \
    ethers \
    crypto-js \
    @types/crypto-js

print_status "Blockchain dependencies installed"

# Install validation and transformation dependencies
echo ""
echo "✅ Installing validation dependencies..."
npm install \
    class-validator \
    class-transformer

print_status "Validation dependencies installed"

# Install WebSocket dependencies
echo ""
echo "🔌 Installing WebSocket dependencies..."
npm install \
    @nestjs/websockets \
    @nestjs/platform-socket.io \
    socket.io

print_status "WebSocket dependencies installed"

# Install API documentation dependencies
echo ""
echo "📚 Installing API documentation dependencies..."
npm install \
    @nestjs/swagger \
    swagger-ui-express

print_status "API documentation dependencies installed"

# Install security and rate limiting dependencies
echo ""
echo "🛡️  Installing security dependencies..."
npm install \
    @nestjs/throttler

print_status "Security dependencies installed"

# Install logging dependencies
echo ""
echo "📝 Installing logging dependencies..."
npm install \
    winston

print_status "Logging dependencies installed"

# Install GraphQL additional dependencies
echo ""
echo "🔍 Installing GraphQL additional dependencies..."
npm install \
    graphql-type-json \
    apollo-server-express

print_status "GraphQL additional dependencies installed"

# Install development dependencies
echo ""
echo "🔧 Installing development dependencies..."
npm install --save-dev \
    @nestjs/cli \
    @nestjs/schematics \
    @nestjs/testing \
    @types/express \
    @types/jest \
    @types/node \
    @types/supertest \
    @typescript-eslint/eslint-plugin \
    @typescript-eslint/parser \
    eslint \
    eslint-config-prettier \
    eslint-plugin-prettier \
    jest \
    prettier \
    source-map-support \
    supertest \
    ts-jest \
    ts-loader \
    ts-node \
    tsconfig-paths \
    typescript

print_status "Development dependencies installed"

# Build the project
echo ""
echo "🏗️  Building the project..."
npm run build

if [ $? -eq 0 ]; then
    print_status "Project built successfully"
else
    print_error "Build failed. Please check the errors above."
    exit 1
fi

# Create environment file if it doesn't exist
if [ ! -f .env ]; then
    echo ""
    echo "📝 Creating environment file..."
    cp .env.example .env
    print_warning "Please update the .env file with your actual configuration values"
else
    print_status "Environment file already exists"
fi

echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "✅ All dependencies installed"
echo "✅ Project built successfully"
echo "✅ Ready for development/deployment"
echo ""
echo "📋 Next Steps:"
echo "1. Update .env file with your configuration"
echo "2. Set up PostgreSQL database"
echo "3. Configure MQTT broker"
echo "4. Deploy smart contracts"
echo "5. Run: npm run start:dev"
echo ""
echo "🚀 Happy coding!"
