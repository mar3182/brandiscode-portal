# Data Model & Database Schema

## Introduction

This document defines the data model and database schema for the "Brand is Code" platform. It outlines the main entities, their attributes, relationships, and data types that will support the platform's functionality. The schema is designed to accommodate both structured and unstructured data needs while ensuring data integrity, performance, and scalability.

The data model is implemented using PostgreSQL as the primary database with Prisma as the ORM layer. This combination provides robust relational capabilities while also supporting JSON/JSONB for flexible schema requirements. The design prioritizes clarity, normalization where appropriate, and flexibility for future growth.

## Entity Relationship Overview

The following diagram represents the high-level relationships between the main entities in the system:

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│             │       │             │       │             │
│    User     │──1:N──│BrandProject │──1:N──│  IDPNode    │
│             │       │             │       │   State     │
└─────────────┘       └─────────────┘       └─────────────┘
                            │                      │
                            │                      │
                            │                      │
                      ┌─────┴─────┐         ┌─────┴─────┐
                      │           │         │           │
                      │  Agent    │         │   Node    │
                      │  Output   │         │ Definition │
                      │           │         │           │
                      └───────────┘         └───────────┘
                            │
                            │
                      ┌─────┴─────┐       ┌─────────────┐
                      │           │       │             │
                      │ Process   │       │   Brand     │
                      │   Log     │       │  Credits    │
                      │           │       │   Ledger    │
                      └───────────┘       └─────────────┘
                                                 │
                                                 │
                                          ┌──────┴──────┐
                                          │             │
                                          │Transaction  │
                                          │   Record    │
                                          │             │
                                          └─────────────┘
```

## Core Entities

### User

Represents platform users and their account information.

**Attributes:**
- `id` (UUID, PK): Unique identifier
- `email` (String, Unique): User's email address
- `passwordHash` (String): Hashed password (if not using OAuth)
- `firstName` (String): User's first name
- `lastName` (String): User's last name
- `companyName` (String, Optional): User's company or project name
- `industry` (String, Optional): User's industry
- `role` (String, Optional): User's professional role
- `createdAt` (DateTime): Account creation timestamp
- `updatedAt` (DateTime): Last update timestamp
- `lastLoginAt` (DateTime, Optional): Last login timestamp
- `isActive` (Boolean): Account status
- `preferences` (JSONB): User preferences (notifications, UI settings, etc.)
- `authProvider` (String, Optional): OAuth provider if applicable
- `authProviderId` (String, Optional): ID from OAuth provider

**Relationships:**
- One-to-Many with BrandProject (User has many BrandProjects)
- One-to-Many with BrandCreditsLedger (User has many credit transactions)

**Indexes:**
- Primary Key: `id`
- Unique Index: `email`
- Index: `authProviderId`

### BrandProject

Represents a brand development project created by a user.

**Attributes:**
- `id` (UUID, PK): Unique identifier
- `userId` (UUID, FK): Reference to User
- `name` (String): Project name
- `description` (String): Project description
- `industry` (String): Specific industry/niche
- `businessDescription` (Text): Detailed business concept
- `createdAt` (DateTime): Creation timestamp
- `updatedAt` (DateTime): Last update timestamp
- `status` (Enum): Project status (ACTIVE, COMPLETED, ARCHIVED)
- `completionPercentage` (Float): Overall completion percentage
- `lastActivityAt` (DateTime): Last activity timestamp
- `metadata` (JSONB): Additional project metadata

**Relationships:**
- Many-to-One with User (BrandProject belongs to a User)
- One-to-Many with IDPNodeState (BrandProject has many node states)
- One-to-Many with AgentOutput (BrandProject has many agent outputs)

**Indexes:**
- Primary Key: `id`
- Foreign Key: `userId`
- Index: `status`, `createdAt`

### IDPNodeState

Represents the state of a node in the Interactive Decision Pathway for a specific project.

**Attributes:**
- `id` (UUID, PK): Unique identifier
- `projectId` (UUID, FK): Reference to BrandProject
- `nodeDefinitionId` (UUID, FK): Reference to NodeDefinition
- `status` (Enum): Node status (NOT_STARTED, IN_PROGRESS, COMPLETED, SKIPPED)
- `startedAt` (DateTime, Optional): When work on node began
- `completedAt` (DateTime, Optional): When node was completed
- `userInputs` (JSONB): User-provided inputs for this node
- `decisions` (JSONB): Decisions made at this node
- `nextNodeIds` (Array[UUID]): Possible next nodes based on decisions
- `previousNodeId` (UUID, Optional): Previous node in the pathway
- `metadata` (JSONB): Additional state metadata

**Relationships:**
- Many-to-One with BrandProject (IDPNodeState belongs to a BrandProject)
- Many-to-One with NodeDefinition (IDPNodeState is an instance of a NodeDefinition)
- One-to-Many with AgentOutput (IDPNodeState may have many AgentOutputs)

**Indexes:**
- Primary Key: `id`
- Foreign Keys: `projectId`, `nodeDefinitionId`
- Index: `status`, `completedAt`

### NodeDefinition

Represents the definition of a node type in the Interactive Decision Pathway.

**Attributes:**
- `id` (UUID, PK): Unique identifier
- `type` (Enum): Node type (INFORMATION, INPUT, DECISION, AGENT, REVIEW)
- `name` (String): Display name
- `description` (Text): Detailed description
- `agentType` (String, Optional): Type of agent if an agent node
- `requiredInputs` (JSONB): Schema of required inputs
- `outputSchema` (JSONB): Schema of expected outputs
- `uiConfiguration` (JSONB): UI rendering configuration
- `creditCost` (Integer, Optional): Brand Credits cost if applicable
- `position` (JSONB): Default position in IDP visualization
- `defaultNextNodeId` (UUID, Optional): Default next node
- `conditionalRouting` (JSONB): Logic for determining next node

**Relationships:**
- One-to-Many with IDPNodeState (NodeDefinition has many instances as IDPNodeState)

**Indexes:**
- Primary Key: `id`
- Index: `type`, `agentType`

### AgentOutput

Represents the results produced by an AI agent for a specific node in a project.

**Attributes:**
- `id` (UUID, PK): Unique identifier
- `projectId` (UUID, FK): Reference to BrandProject
- `nodeStateId` (UUID, FK): Reference to IDPNodeState
- `agentType` (String): Type of agent that produced the output
- `createdAt` (DateTime): Creation timestamp
- `inputs` (JSONB): Inputs provided to the agent
- `outputs` (JSONB): Results produced by the agent
- `llmProvider` (String): LLM provider used
- `llmModel` (String): Specific model used
- `tokenUsage` (JSONB): Token usage statistics
- `processingTime` (Integer): Time taken to generate in ms
- `creditCost` (Integer): Brand Credits consumed
- `userFeedback` (JSONB, Optional): User feedback on output
- `version` (Integer): Version number for multiple generations

**Relationships:**
- Many-to-One with BrandProject (AgentOutput belongs to a BrandProject)
- Many-to-One with IDPNodeState (AgentOutput belongs to an IDPNodeState)

**Indexes:**
- Primary Key: `id`
- Foreign Keys: `projectId`, `nodeStateId`
- Index: `agentType`, `createdAt`

### ProcessLog

Represents documentation of the development process for the meta-recipe.

**Attributes:**
- `id` (UUID, PK): Unique identifier
- `category` (Enum): Log category (DECISION, CHALLENGE, IMPLEMENTATION, AI_USAGE)
- `title` (String): Brief title
- `description` (Text): Detailed description
- `createdAt` (DateTime): Creation timestamp
- `author` (String): Author or source
- `relatedArea` (String): Related system area
- `tags` (Array[String]): Categorization tags
- `impact` (Enum): Impact level (LOW, MEDIUM, HIGH)
- `alternatives` (JSONB, Optional): Alternative options considered
- `rationale` (Text): Reasoning behind decisions
- `resources` (JSONB, Optional): Resources used (time, cost)
- `aiAssistance` (JSONB, Optional): How AI was used
- `artifacts` (JSONB, Optional): Links to related artifacts
- `metadata` (JSONB): Additional metadata

**Relationships:**
- Many-to-Many with AgentOutput (ProcessLog may reference many AgentOutputs)

**Indexes:**
- Primary Key: `id`
- Index: `category`, `createdAt`, `tags`

### RecipeTemplate

Represents a structured template derived from the development process.

**Attributes:**
- `id` (UUID, PK): Unique identifier
- `name` (String): Template name
- `description` (Text): Detailed description
- `category` (String): Template category
- `createdAt` (DateTime): Creation timestamp
- `updatedAt` (DateTime): Last update timestamp
- `version` (String): Version identifier
- `structure` (JSONB): Template structure and sections
- `instructions` (Text): Usage instructions
- `examples` (JSONB): Example applications
- `relatedLogs` (Array[UUID]): Related process logs
- `metadata` (JSONB): Additional metadata

**Relationships:**
- Many-to-Many with ProcessLog (RecipeTemplate references many ProcessLogs)

**Indexes:**
- Primary Key: `id`
- Index: `category`, `version`

### BrandCreditsLedger

Represents the Brand Credits balance and transactions for a user.

**Attributes:**
- `id` (UUID, PK): Unique identifier
- `userId` (UUID, FK): Reference to User
- `balance` (Integer): Current credit balance
- `lifetimeCredits` (Integer): Total credits ever received
- `lifetimeUsage` (Integer): Total credits ever used
- `updatedAt` (DateTime): Last update timestamp

**Relationships:**
- Many-to-One with User (BrandCreditsLedger belongs to a User)
- One-to-Many with TransactionRecord (BrandCreditsLedger has many TransactionRecords)

**Indexes:**
- Primary Key: `id`
- Foreign Key: `userId`

### TransactionRecord

Represents individual Brand Credits transactions.

**Attributes:**
- `id` (UUID, PK): Unique identifier
- `ledgerId` (UUID, FK): Reference to BrandCreditsLedger
- `type` (Enum): Transaction type (CREDIT, DEBIT)
- `amount` (Integer): Transaction amount
- `description` (String): Transaction description
- `createdAt` (DateTime): Transaction timestamp
- `relatedEntityType` (String, Optional): Type of related entity
- `relatedEntityId` (UUID, Optional): ID of related entity
- `metadata` (JSONB): Additional transaction metadata

**Relationships:**
- Many-to-One with BrandCreditsLedger (TransactionRecord belongs to a BrandCreditsLedger)

**Indexes:**
- Primary Key: `id`
- Foreign Key: `ledgerId`
- Index: `type`, `createdAt`

## Prisma Schema

The following is the Prisma schema representation of the data model:

```prisma
// This is a simplified Prisma schema for the "Brand is Code" platform

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id             String            @id @default(uuid())
  email          String            @unique
  passwordHash   String?
  firstName      String
  lastName       String
  companyName    String?
  industry       String?
  role           String?
  createdAt      DateTime          @default(now())
  updatedAt      DateTime          @updatedAt
  lastLoginAt    DateTime?
  isActive       Boolean           @default(true)
  preferences    Json              @default("{}")
  authProvider   String?
  authProviderId String?
  
  // Relationships
  brandProjects  BrandProject[]
  creditsLedger  BrandCreditsLedger?

  @@index([authProviderId])
}

model BrandProject {
  id                   String         @id @default(uuid())
  userId               String
  name                 String
  description          String
  industry             String
  businessDescription  String
  createdAt            DateTime       @default(now())
  updatedAt            DateTime       @updatedAt
  status               ProjectStatus  @default(ACTIVE)
  completionPercentage Float          @default(0)
  lastActivityAt       DateTime       @default(now())
  metadata             Json           @default("{}")
  
  // Relationships
  user                 User           @relation(fields: [userId], references: [id])
  nodeStates           IDPNodeState[]
  agentOutputs         AgentOutput[]

  @@index([status, createdAt])
}

enum ProjectStatus {
  ACTIVE
  COMPLETED
  ARCHIVED
}

model IDPNodeState {
  id              String        @id @default(uuid())
  projectId       String
  nodeDefinitionId String
  status          NodeStatus    @default(NOT_STARTED)
  startedAt       DateTime?
  completedAt     DateTime?
  userInputs      Json          @default("{}")
  decisions       Json          @default("{}")
  nextNodeIds     String[]      @default([])
  previousNodeId  String?
  metadata        Json          @default("{}")
  
  // Relationships
  project         BrandProject  @relation(fields: [projectId], references: [id])
  nodeDefinition  NodeDefinition @relation(fields: [nodeDefinitionId], references: [id])
  agentOutputs    AgentOutput[]

  @@index([status, completedAt])
}

enum NodeStatus {
  NOT_STARTED
  IN_PROGRESS
  COMPLETED
  SKIPPED
}

model NodeDefinition {
  id                String        @id @default(uuid())
  type              NodeType
  name              String
  description       String
  agentType         String?
  requiredInputs    Json          @default("{}")
  outputSchema      Json          @default("{}")
  uiConfiguration   Json          @default("{}")
  creditCost        Int?
  position          Json          @default("{}")
  defaultNextNodeId String?
  conditionalRouting Json         @default("{}")
  
  // Relationships
  nodeStates        IDPNodeState[]

  @@index([type, agentType])
}

enum NodeType {
  INFORMATION
  INPUT
  DECISION
  AGENT
  REVIEW
}

model AgentOutput {
  id              String        @id @default(uuid())
  projectId       String
  nodeStateId     String
  agentType       String
  createdAt       DateTime      @default(now())
  inputs          Json
  outputs         Json
  llmProvider     String
  llmModel        String
  tokenUsage      Json
  processingTime  Int
  creditCost      Int
  userFeedback    Json?
  version         Int           @default(1)
  
  // Relationships
  project         BrandProject  @relation(fields: [projectId], references: [id])
  nodeState       IDPNodeState  @relation(fields: [nodeStateId], references: [id])
  processLogs     ProcessLogToAgentOutput[]

  @@index([agentType, createdAt])
}

model ProcessLog {
  id              String        @id @default(uuid())
  category        LogCategory
  title           String
  description     String
  createdAt       DateTime      @default(now())
  author          String
  relatedArea     String
  tags            String[]
  impact          ImpactLevel
  alternatives    Json?
  rationale       String
  resources       Json?
  aiAssistance    Json?
  artifacts       Json?
  metadata        Json          @default("{}")
  
  // Relationships
  agentOutputs    ProcessLogToAgentOutput[]
  recipeTemplates ProcessLogToRecipeTemplate[]

  @@index([category, createdAt])
  @@index([tags])
}

enum LogCategory {
  DECISION
  CHALLENGE
  IMPLEMENTATION
  AI_USAGE
}

enum ImpactLevel {
  LOW
  MEDIUM
  HIGH
}

model ProcessLogToAgentOutput {
  processLogId    String
  agentOutputId   String
  
  // Relationships
  processLog      ProcessLog    @relation(fields: [processLogId], references: [id])
  agentOutput     AgentOutput   @relation(fields: [agentOutputId], references: [id])

  @@id([processLogId, agentOutputId])
}

model RecipeTemplate {
  id              String        @id @default(uuid())
  name            String
  description     String
  category        String
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  version         String
  structure       Json
  instructions    String
  examples        Json
  metadata        Json          @default("{}")
  
  // Relationships
  processLogs     ProcessLogToRecipeTemplate[]

  @@index([category, version])
}

model ProcessLogToRecipeTemplate {
  processLogId     String
  recipeTemplateId String
  
  // Relationships
  processLog       ProcessLog     @relation(fields: [processLogId], references: [id])
  recipeTemplate   RecipeTemplate @relation(fields: [recipeTemplateId], references: [id])

  @@id([processLogId, recipeTemplateId])
}

model BrandCreditsLedger {
  id               String             @id @default(uuid())
  userId           String             @unique
  balance          Int                @default(0)
  lifetimeCredits  Int                @default(0)
  lifetimeUsage    Int                @default(0)
  updatedAt        DateTime           @updatedAt
  
  // Relationships
  user             User               @relation(fields: [userId], references: [id])
  transactions     TransactionRecord[]
}

model TransactionRecord {
  id               String             @id @default(uuid())
  ledgerId         String
  type             TransactionType
  amount           Int
  description      String
  createdAt        DateTime           @default(now())
  relatedEntityType String?
  relatedEntityId  String?
  metadata         Json               @default("{}")
  
  // Relationships
  ledger           BrandCreditsLedger @relation(fields: [ledgerId], references: [id])

  @@index([type, createdAt])
}

enum TransactionType {
  CREDIT
  DEBIT
}
```

## Data Access Patterns

The following are the primary data access patterns for the platform:

### User Management
- User registration and authentication
- Profile management and preferences
- Credit balance and transaction history

### Project Management
- Project creation and listing
- Project status and progress tracking
- Project archiving and duplication

### Interactive Decision Pathway
- Node state tracking and progression
- Decision recording and pathway navigation
- Completion status and progress visualization

### AI Agent Operations
- Input collection and validation
- Output storage and retrieval
- Performance and usage tracking

### Meta-Recipe Access
- Process log querying and filtering
- Recipe template generation and access
- Development insight retrieval

## Data Migration Strategy

The database schema will evolve over time as the platform grows. The migration strategy includes:

1. **Versioned Migrations**: Using Prisma's migration system to track schema changes
2. **Zero-Downtime Updates**: Designing migrations to avoid service interruption
3. **Data Backfilling**: Procedures for populating new fields in existing records
4. **Rollback Plans**: Defined procedures for reverting problematic migrations
5. **Testing Protocol**: Comprehensive testing of migrations in staging environment

## Data Security Considerations

The following security measures are implemented for data protection:

1. **Encryption**: Sensitive data encrypted at rest
2. **Access Control**: Row-level security for multi-tenant data
3. **Audit Logging**: Tracking of significant data modifications
4. **Data Validation**: Input validation at application and database levels
5. **Backup Strategy**: Regular backups with point-in-time recovery
6. **Compliance**: GDPR and CCPA compliant data handling

## Performance Optimization

The database is optimized for performance through:

1. **Indexing Strategy**: Strategic indexes on frequently queried fields
2. **Denormalization**: Selective denormalization for read-heavy operations
3. **Query Optimization**: Efficient query patterns and ORM usage
4. **Connection Pooling**: Optimized database connection management
5. **Caching Strategy**: Redis caching for frequently accessed data
6. **Pagination**: Efficient data retrieval for large result sets

## Implementation Notes

When implementing this data model, consider the following:

1. **JSON Schema Validation**: Implement validation for JSON/JSONB fields
2. **Soft Deletion**: Consider soft deletion for important entities
3. **Timestamps**: Maintain accurate created/updated timestamps
4. **Transactions**: Use database transactions for operations affecting multiple entities
5. **Constraints**: Implement appropriate foreign key constraints and cascades
6. **Migrations**: Plan careful migrations for schema evolution

## Conclusion

This data model provides a comprehensive foundation for the "Brand is Code" platform, supporting both the user-facing functionality and the meta-development recipe documentation. The schema balances relational integrity with flexibility for evolving requirements, while prioritizing security, performance, and compliance with regulations.

As the platform evolves, the data model can be extended to support additional features while maintaining backward compatibility with existing data.
