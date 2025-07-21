# Minecraft Bot Dashboard

## Overview

This is a full-stack web application that provides a dashboard interface for managing and monitoring a Minecraft bot. The application consists of a React frontend with a Node.js/Express backend, using PostgreSQL for data storage and WebSocket connections for real-time communication. The bot is currently configured to connect to example.com:12345 with fully editable server configuration.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The application follows a modern full-stack architecture with clear separation between client and server components:

- **Frontend**: React with TypeScript using Vite as the build tool
- **Backend**: Node.js with Express and TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Real-time Communication**: WebSocket for live updates
- **UI Framework**: Radix UI components with shadcn/ui styling
- **Styling**: Tailwind CSS with custom theming

## Key Components

### Frontend Architecture
- **React SPA**: Single-page application with client-side routing using Wouter
- **State Management**: TanStack Query for server state management
- **UI Components**: Comprehensive Radix UI component library with custom styling
- **Type Safety**: Full TypeScript implementation with strict type checking
- **Styling**: Tailwind CSS with CSS variables for theming support

### Backend Architecture
- **Express Server**: RESTful API with WebSocket support for real-time features
- **Minecraft Bot Service**: Dedicated service for managing Minecraft bot connections using the mineflayer library
- **Storage Layer**: Abstract storage interface with in-memory implementation (ready for database migration)
- **WebSocket Integration**: Real-time communication for bot status updates and log streaming

### Database Schema
The application uses Drizzle ORM with PostgreSQL, defining two main tables:
- **bot_configs**: Stores bot configuration settings (username, server details, reconnection settings)
- **log_entries**: Stores application and bot logs with timestamps and log levels

## Data Flow

1. **Configuration Management**: Users can view and edit bot settings (username, server IP, port) through an intuitive web interface with form validation
2. **Bot Control**: Start/stop bot operations via API endpoints with real-time status updates
3. **Real-time Updates**: WebSocket connection provides live bot status and log streaming
4. **Persistent Storage**: Bot configurations and logs are stored in PostgreSQL
5. **Error Handling**: Comprehensive error handling with user-friendly notifications

## External Dependencies

### Core Libraries
- **mineflayer**: Minecraft bot creation and management
- **drizzle-orm**: Type-safe database ORM
- **@neondatabase/serverless**: PostgreSQL database connectivity
- **ws**: WebSocket server implementation
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Headless UI component primitives

### Development Tools
- **Vite**: Fast build tool and development server
- **TypeScript**: Static type checking
- **Tailwind CSS**: Utility-first CSS framework
- **ESBuild**: Fast bundling for production builds

## Deployment Strategy

The application is configured for deployment with the following approach:

1. **Build Process**: 
   - Frontend builds to `dist/public` directory
   - Backend bundles with ESBuild to `dist` directory
   - Shared types and schemas are accessible to both client and server

2. **Environment Configuration**:
   - Database URL configured via environment variables
   - Drizzle migrations stored in `/migrations` directory
   - Development and production environment support

3. **Static File Serving**: Express server serves built React application in production

4. **Database Setup**: 
   - Drizzle configuration for PostgreSQL
   - Migration system for schema management
   - Connection pooling and error handling

The architecture supports both development and production environments, with hot module replacement in development and optimized builds for production deployment.

## Recent Changes

### January 21, 2025 - Multi-Bot Support Implementation
- **Complete architecture overhaul**: Transitioned from single-bot to multi-bot management system
- **New UI Interface**: Replaced single bot control panel with comprehensive bot list management
- **Enhanced API endpoints**: Added support for multiple bot instances with individual control endpoints
- **AI Features restored**: Re-integrated chat, wandering, and random name generation features
- **Individual bot controls**: Each bot can be started/stopped independently with real-time status updates
- **Create new bot dialog**: Added form interface for creating new bots with custom configurations
- **Visual indicators**: Added badges to show active AI features (wandering, chat, random names) for each bot
