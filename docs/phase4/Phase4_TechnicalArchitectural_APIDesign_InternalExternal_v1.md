# API Design - Internal & External

## Introduction

This document outlines the API design for the "Brand is Code" platform, covering both internal APIs for frontend-backend communication and potential future external APIs for third-party integrations. The API design follows RESTful principles with JSON as the primary data format, providing a clear, consistent, and secure interface for all platform interactions.

The API architecture is designed to support the platform's core functionality while ensuring scalability, security, and developer experience. It prioritizes simplicity and consistency for the MVP while establishing patterns that can evolve as the platform grows.

## API Architecture Overview

The "Brand is Code" API architecture consists of the following components:

1. **RESTful Endpoints**: Resource-oriented API following REST principles
2. **Authentication Layer**: JWT-based authentication and authorization
3. **Request/Response Format**: Standardized JSON structures
4. **Error Handling**: Consistent error reporting
5. **Versioning Strategy**: Future-proof versioning approach
6. **Documentation**: OpenAPI/Swagger specification

## Internal API Design

The internal API serves the frontend application and handles all platform functionality. It is organized around core resources and follows consistent patterns.

### Authentication & Authorization

#### Authentication Endpoints

```
POST /api/auth/register
- Purpose: Register a new user
- Request: { email, password, firstName, lastName, ... }
- Response: { user, token }

POST /api/auth/login
- Purpose: Authenticate a user
- Request: { email, password }
- Response: { user, token }

POST /api/auth/refresh
- Purpose: Refresh authentication token
- Request: { refreshToken }
- Response: { token, refreshToken }

POST /api/auth/logout
- Purpose: Invalidate current token
- Request: {}
- Response: { success }

GET /api/auth/me
- Purpose: Get current user profile
- Response: { user }
```

#### Authorization

All authenticated endpoints require a valid JWT token in the Authorization header:

```
Authorization: Bearer {token}
```

Role-based access control is implemented with the following roles:
- User: Standard platform user
- Admin: Platform administrator (for future use)

### User Management API

```
GET /api/users/profile
- Purpose: Get detailed user profile
- Response: { profile }

PUT /api/users/profile
- Purpose: Update user profile
- Request: { firstName, lastName, companyName, ... }
- Response: { profile }

GET /api/users/preferences
- Purpose: Get user preferences
- Response: { preferences }

PUT /api/users/preferences
- Purpose: Update user preferences
- Request: { notifications, uiSettings, ... }
- Response: { preferences }

GET /api/users/credits
- Purpose: Get user credit balance and history
- Response: { balance, transactions }
```

### Project Management API

```
GET /api/projects
- Purpose: List user's projects
- Query Parameters: status, page, limit, sort
- Response: { projects, pagination }

POST /api/projects
- Purpose: Create new project
- Request: { name, description, industry, ... }
- Response: { project }

GET /api/projects/:id
- Purpose: Get project details
- Response: { project }

PUT /api/projects/:id
- Purpose: Update project details
- Request: { name, description, ... }
- Response: { project }

DELETE /api/projects/:id
- Purpose: Archive project
- Response: { success }

POST /api/projects/:id/duplicate
- Purpose: Duplicate existing project
- Request: { name }
- Response: { project }
```

### Interactive Decision Pathway (IDP) API

```
GET /api/projects/:id/idp
- Purpose: Get IDP map for project
- Response: { nodes, connections, currentPosition }

GET /api/projects/:id/idp/nodes/:nodeId
- Purpose: Get specific node details
- Response: { node, state, previousDecisions }

PUT /api/projects/:id/idp/nodes/:nodeId
- Purpose: Update node state
- Request: { inputs, decisions, ... }
- Response: { node, nextNodes }

GET /api/projects/:id/idp/progress
- Purpose: Get overall IDP progress
- Response: { completionPercentage, completedNodes, pendingNodes }

POST /api/projects/:id/idp/navigate
- Purpose: Navigate to specific node
- Request: { targetNodeId }
- Response: { success, warnings }
```

### AI Agent API

```
POST /api/projects/:id/agents/:agentType
- Purpose: Execute agent operation
- Request: { inputs, parameters }
- Response: { jobId }

GET /api/projects/:id/agents/jobs/:jobId
- Purpose: Check agent job status
- Response: { status, progress, result }

GET /api/projects/:id/agents/:agentType/outputs
- Purpose: Get previous agent outputs
- Query Parameters: version, page, limit
- Response: { outputs, pagination }

POST /api/projects/:id/agents/:agentType/outputs/:outputId/feedback
- Purpose: Provide feedback on agent output
- Request: { rating, comments, ... }
- Response: { success }

POST /api/projects/:id/agents/:agentType/regenerate
- Purpose: Regenerate agent output
- Request: { outputId, modifiedInputs }
- Response: { jobId }
```

### Meta-Recipe API

```
GET /api/meta-recipe/categories
- Purpose: Get meta-recipe categories
- Response: { categories }

GET /api/meta-recipe/logs
- Purpose: Get development process logs
- Query Parameters: category, tags, page, limit
- Response: { logs, pagination }

GET /api/meta-recipe/logs/:id
- Purpose: Get specific process log details
- Response: { log, relatedLogs }

GET /api/meta-recipe/templates
- Purpose: Get recipe templates
- Query Parameters: category, page, limit
- Response: { templates, pagination }

GET /api/meta-recipe/templates/:id
- Purpose: Get specific template details
- Response: { template, relatedLogs }

POST /api/meta-recipe/feedback
- Purpose: Submit feedback on meta-recipe
- Request: { templateId, feedback, usefulness, ... }
- Response: { success }
```

### Brand Credits API

```
GET /api/credits/balance
- Purpose: Get current credit balance
- Response: { balance, lifetimeCredits, lifetimeUsage }

GET /api/credits/transactions
- Purpose: Get credit transaction history
- Query Parameters: type, page, limit
- Response: { transactions, pagination }

POST /api/credits/estimate
- Purpose: Estimate credit cost for operation
- Request: { operationType, parameters }
- Response: { estimatedCost }

POST /api/credits/add
- Purpose: Add credits (for MVP testing)
- Request: { amount }
- Response: { newBalance, transaction }
```

## Request & Response Format

All API endpoints follow a consistent request and response format:

### Success Response Format

```json
{
  "success": true,
  "data": {
    // Resource-specific data
  },
  "meta": {
    // Metadata (pagination, etc.)
  }
}
```

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      // Additional error details
    }
  }
}
```

### Common Error Codes

- `AUTHENTICATION_REQUIRED`: User is not authenticated
- `PERMISSION_DENIED`: User lacks permission for the operation
- `RESOURCE_NOT_FOUND`: Requested resource does not exist
- `VALIDATION_ERROR`: Request validation failed
- `INSUFFICIENT_CREDITS`: User has insufficient credits
- `RATE_LIMIT_EXCEEDED`: User has exceeded rate limits
- `INTERNAL_ERROR`: Server encountered an error

### Pagination Format

For endpoints returning collections:

```json
{
  "success": true,
  "data": [
    // Array of resources
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 10,
      "totalItems": 42,
      "totalPages": 5
    }
  }
}
```

## External API (Future)

While not part of the MVP, the platform is designed with future external API access in mind. This section outlines the planned approach for external API development.

### External API Authentication

External API access will use API keys and OAuth 2.0:

```
POST /api/external/auth/token
- Purpose: Get access token using client credentials
- Request: { client_id, client_secret }
- Response: { access_token, expires_in, token_type }
```

### External API Rate Limiting

External API access will include rate limiting:

- Rate limits defined per endpoint and API key
- Rate limit headers in responses:
  - `X-RateLimit-Limit`: Requests allowed per time window
  - `X-RateLimit-Remaining`: Requests remaining in current window
  - `X-RateLimit-Reset`: Time when the current window resets

### Potential External Endpoints

```
GET /api/external/v1/brand-analysis
- Purpose: Analyze brand positioning
- Query Parameters: industry, competitors, target_audience
- Response: { positioning, recommendations }

POST /api/external/v1/name-generation
- Purpose: Generate brand name options
- Request: { industry, attributes, preferences }
- Response: { names, availability }

GET /api/external/v1/meta-recipe/templates
- Purpose: Access public recipe templates
- Query Parameters: category, page, limit
- Response: { templates, pagination }
```

## API Versioning Strategy

The API implements versioning to ensure backward compatibility:

1. **URL Path Versioning**: External APIs include version in path (`/api/external/v1/...`)
2. **Internal API Evolution**: Internal APIs evolve with the frontend and don't require explicit versioning for MVP
3. **Deprecation Process**: Future API changes will include:
   - Deprecation notices in documentation
   - Deprecation headers in responses
   - Minimum 6-month support for deprecated endpoints

## Security Considerations

The API implements several security measures:

1. **Authentication**: JWT-based with short expiration and refresh tokens
2. **Authorization**: Role-based access control for all endpoints
3. **Input Validation**: Thorough validation of all request parameters
4. **Rate Limiting**: Protection against abuse and DoS attacks
5. **CORS**: Proper configuration for frontend access
6. **Security Headers**: Implementation of recommended security headers
7. **Audit Logging**: Logging of sensitive operations

## Implementation Notes

When implementing the API, consider the following:

1. **Middleware Architecture**: Use middleware for cross-cutting concerns
2. **Validation**: Implement request validation using a schema validator
3. **Error Handling**: Centralized error handling for consistency
4. **Logging**: Structured logging for all API operations
5. **Testing**: Comprehensive test coverage for all endpoints
6. **Documentation**: Auto-generated API documentation from code

## API Documentation

The API will be documented using OpenAPI/Swagger:

1. **Interactive Documentation**: Swagger UI for exploring the API
2. **Schema Definition**: OpenAPI 3.0 schema for all endpoints
3. **Code Generation**: Client library generation from OpenAPI schema
4. **Examples**: Request and response examples for all endpoints

## Future Considerations

As the platform evolves, the API may be enhanced with:

1. **GraphQL**: Addition of GraphQL endpoint for flexible data fetching
2. **Webhooks**: Event notifications for external integrations
3. **Streaming**: Real-time data streaming for collaborative features
4. **Public API Marketplace**: Developer portal for external API access
5. **Partner Integrations**: Specialized endpoints for strategic partners

## Conclusion

This API design provides a comprehensive blueprint for implementing the "Brand is Code" platform's internal communication and laying the groundwork for future external integrations. The design prioritizes clarity, consistency, and security while establishing patterns that can evolve as the platform grows.

The RESTful approach with standardized JSON structures ensures a familiar and accessible interface for frontend development, while the planned external API considerations provide a path for future expansion of the platform's capabilities and reach.
