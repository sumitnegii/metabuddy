# Meta Ads SaaS Schema

This is the production direction for MetaBuddy as a multi-tenant Meta Ads intelligence platform.

## Principles

- Every Meta record is scoped by `userId`.
- Multi-login users are supported with multiple Meta connections per `userId`.
- Meta access tokens are encrypted, never hashed, never returned to the frontend.
- Store light campaign metadata and aggregated insights.
- Fetch heavy details such as creatives and breakdowns on demand or short-cache them.
- AI recommendations are advisory until the user approves.
- Every approved Meta mutation is logged.

## Collections

### `MBMetaAdsV2Account`

One connected Facebook identity. A user can have multiple Meta connections.

Important fields:

- `userId`
- `metaUserId`
- `name`
- `accessTokenEncrypted`
- `accessTokenIv`
- `accessTokenTag`
- `tokenLastFour`
- `tokenExpiresAt`
- `tokenStatus`: `valid`, `expiring_soon`, `expired`, `revoked`
- `isValid`
- `isActive`
- `deletedAt`
- `disconnectedAt`
- `disconnectReason`
- `lastErrorAt`
- `lastErrorMessage`
- `lastSyncedAt`
- `lastSuccessfulSyncAt`
- `syncHealthStatus`: `healthy`, `warning`, `error`, `unknown`

Indexes:

- unique `{ userId: 1, metaUserId: 1 }`
- `{ tokenStatus: 1 }`

### `MBMetaAdsV2AdAccount`

Ad accounts the connected Facebook user can access.

Important fields:

- `userId`
- `connectionId`
- `accountId`
- `name`
- `currency`
- `timezoneName`
- `accountStatus`
- `isActive`
- `deletedAt`
- `metaAccountNameSnapshot`
- `lastInsightsSummary`
- `lastSyncedAt`

Indexes:

- unique `{ userId: 1, accountId: 1, connectionId: 1 }`
- query by `{ userId: 1, accountId: 1 }`

### `MBMetaAdsV2UserPreference`

User-level dashboard preferences. This keeps selection state out of ad account rows.

Important fields:

- `userId`
- `selectedConnectionId`
- `selectedAdAccountId`
- `dashboardDatePreset`

Indexes:

- unique `{ userId: 1 }`

### `MBMetaAdsV2Campaign`

Light campaign metadata snapshot. This is not the full Meta object.

Important fields:

- `userId`
- `connectionId`
- `adAccountId`
- `metaCampaignId`
- `name`
- `objective`
- `status`
- `effectiveStatus`
- `dailyBudget`
- `lifetimeBudget`
- `metaCreatedAt`
- `metaUpdatedAt`
- `sortKey`
- `lastInsightsSummary`
- `lastInsightsDate`
- `lastSyncedAt`
- `cacheExpiresAt`
- `isActive`
- `deletedAt`

Indexes:

- unique `{ userId: 1, adAccountId: 1, metaCampaignId: 1 }`
- query by `{ userId: 1, adAccountId: 1 }`
- dashboard sort `{ userId: 1, adAccountId: 1, metaUpdatedAt: -1 }`

### `MBMetaAdsV2DailyInsight`

Aggregated daily metrics. This is the primary analytics store.

Store raw additive metrics. Compute derived metrics such as CTR, CPC, CPM, CPL, and ROAS on read to avoid inconsistent stored values.

Important fields:

- `userId`
- `connectionId`
- `adAccountId`
- `entityType`: `account`, `campaign`, `adset`, `ad`
- `entityId`
- `date`
- `metrics.spend`
- `metrics.impressions`
- `metrics.reach`
- `metrics.clicks`
- `metrics.conversions`
- `metrics.leads`
- `metrics.purchases`
- `metrics.purchaseValue`

Indexes:

- unique `{ userId, connectionId, adAccountId, entityType, entityId, date }`
- dashboard range `{ userId: 1, connectionId: 1, adAccountId: 1, date: -1 }`

### `MBMetaAdsV2SyncJob`

Tracks manual and scheduled sync runs.

Important fields:

- `userId`
- `connectionId`
- `adAccountId`
- `idempotencyKey`
- `jobType`: `manual`, `scheduled`
- `status`: `queued`, `running`, `completed`, `failed`
- `datePreset`
- `dateStart`
- `dateStop`
- `startedAt`
- `finishedAt`
- `lockedAt`
- `lockedBy`
- `retryCount`
- `nextRetryAt`
- `rateLimitRemaining`
- `rateLimitResetAt`
- `counts`
- `error`

Indexes:

- unique `{ userId: 1, adAccountId: 1, idempotencyKey: 1 }`

### `MBMetaAdsV2Recommendation`

AI or rules-based recommendation requiring user approval.

Important fields:

- `userId`
- `connectionId`
- `adAccountId`
- `entityType`
- `entityId`
- `campaignId`
- `title`
- `summary`
- `modelVersion`
- `ruleVersion`
- `severity`
- `confidenceScore`
- `category`
- `suggestedAction`
- `expectedImpact`
- `actionPayload`
- `status`: `pending`, `approved`, `applied`, `rejected`, `failed`
- `failedAt`
- `failureReason`

### `MBMetaAdsV2ActionLog`

Records attempted and completed Meta mutations.

Important fields:

- `userId`
- `connectionId`
- `adAccountId`
- `recommendationId`
- `actionType`
- `entityType`
- `entityId`
- `status`
- `requestPayload`
- `responsePayload`
- `error`
- `appliedAt`

### `MBMetaAdsV2AuditLog`

Security and compliance trail.

Important fields:

- `userId`
- `connectionId`
- `adAccountId`
- `actorType`: `user`, `system`, `agent`
- `eventType`
- `entityType`
- `entityId`
- `metadata`
- `ipAddress`

## Query Rules

Never query Meta business data by Meta ID alone.

Bad:

```js
MetaCampaign.findOne({ metaCampaignId });
```

Good:

```js
MetaCampaign.findOne({ userId, adAccountId, metaCampaignId });
```

## Sync Strategy

Default sync stores:

- light campaign metadata
- latest insight summary
- daily insight rows
- sync job result
- audit log event

Sync jobs must use an `idempotencyKey` so overlapping jobs update the same job row instead of creating duplicate work. Workers must claim jobs with `lockedAt` and `lockedBy`. Insight writes use unique upserts by `{ userId, connectionId, adAccountId, entityType, entityId, date }`.

Detailed ads, ad sets, creatives, and breakdowns should be fetched live or short-cached unless the UI needs historical tracking for that entity.

`MBMetaAdsV2DailyInsight` will grow quickly. Plan monthly partitioning by `date` or sharding by `userId` before scale.

Future rollups should be added once daily rows grow:

- `MBMetaAdsV2WeeklyInsight`
- `MBMetaAdsV2MonthlyInsight`

## Token Strategy

- Convert short-lived OAuth token to long-lived token.
- Store encrypted token fields only.
- Mark token `expiring_soon` inside the last 7 days.
- Mark token `expired` and require reconnect after expiry.
- Never expose token fields from API responses.

## Backend API Surface

All routes are authenticated except OAuth callback.

### OAuth and Connections

- `GET /api/meta-ads-v2/oauth/url`
- `GET /api/meta-ads-v2/oauth/callback`
- `GET /api/meta-ads-v2/connections`
- `DELETE /api/meta-ads-v2/connections/:id`

### Ad Accounts and Preferences

- `GET /api/meta-ads-v2/ad-accounts`
- `POST /api/meta-ads-v2/ad-accounts/sync`
- `PUT /api/meta-ads-v2/ad-accounts/select`
- `PUT /api/meta-ads-v2/preferences`

### Dashboard and Campaigns

- `GET /api/meta-ads-v2/overview`
- `GET /api/meta-ads-v2/campaigns/:campaignId`
- `POST /api/meta-ads-v2/campaigns/:campaignId/analyze`
- `POST /api/meta-ads-v2/campaigns/create`

### Sync Jobs

- `POST /api/meta-ads-v2/sync`
- `POST /api/meta-ads-v2/sync/enqueue`
- `POST /api/meta-ads-v2/sync/process-next`
- `GET /api/meta-ads-v2/sync/jobs`

`/sync` runs immediately for manual usage. `/sync/enqueue` plus the worker is the production path.

### Recommendation Approval

- `POST /api/meta-ads-v2/recommendations/:id/apply`
- `POST /api/meta-ads-v2/recommendations/:id/reject`

Only approved actions call Meta. Failed Meta calls update both `ActionLog` and `Recommendation`.

## Worker

Enable the queue worker with:

```bash
META_ADS_V2_WORKER_ENABLED=true
META_ADS_V2_WORKER_INTERVAL_MS=60000
```

The worker claims jobs with `lockedAt` and `lockedBy`, processes one job per tick, and releases the lock on completion or failure.
