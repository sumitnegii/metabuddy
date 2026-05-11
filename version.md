# MetaBuddy Release Notes

## Version 1.0

**Release date:** 11th May 2026  
**Release link:** https://metabuddy-frontend.vercel.app/meta-campaign/6986736460944

## Changelog

### Platform

- Released MetaBuddy version `1.0` as the first complete production release.
- Published the live campaign experience through the release link.
- Added authentication, onboarding, dashboard, settings, and protected user workflows.
- Added core navigation across dashboard, campaigns, ad creation, ad creatives, content, contacts, offers, recruit, analytics, and agent usage.

### AI Campaign System

- Added campaign idea generation and campaign draft workflows.
- Added AI campaign generation with multi-step agent support.
- Added campaign detail pages for reviewing generated strategy, ads, and campaign output.
- Added approval and rejection workflows for campaign drafts and generated content.
- Added dashboard reporting, analytics summaries, best-content views, and campaign performance tables.

### Ad Creative System

- Added the full Ad Creatives workspace.
- Added prompt validation for real advertising briefs before running creative agents.
- Added a 6-agent creative pipeline covering persona, keyword research, ad variations, strategy stitching, auditing, prediction, logging, and MCP context.
- Added ranked ad creative variations with headline, primary text, description, CTA, angle, keyword usage, quality score, CTR prediction, conversion prediction, and risk score.
- Added market keyword intelligence, competitor signals, similar Meta Ads context, memory comparison, forecast assumptions, and cost/token tracking.
- Added visual creative previews for Facebook Feed, Instagram, WhatsApp, and Web/App placements.
- Added detailed ad creative preview pages with saved preview state.
- Added persisted ad creative preview records in the backend.
- Added ad creative history so each completed creative run stores the full generated object in the database, including prompt, agents, intelligence, forecast, audit, workflow, and all generated ads.
- Kept ad creative history separate from preview drafts: history stores the user's earlier full ad creation runs, while previews remain single-creative review and publish drafts.
- Added pagination and a compact list view for ad creative history so thousands of saved runs remain fast to browse.

### Meta Ads Integration

- Added Meta Ads V2 connection, account selection, diagnostics, and sync support.
- Added imported Meta campaign, ad set, and ad detail pages.
- Added real Meta ad reporting from synced Meta insights data.
- Added campaign, ad set, and ad-level report panels for spend, impressions, reach, clicks, CTR, CPC, CPM, leads, purchases, purchase value, ROAS, date range, and last sync time.
- Added Meta action breakdown reporting from the raw synced Meta insights payload.
- Added daily insight history support on Meta campaign, ad set, and ad detail APIs.
- Added Meta campaign analysis with pending recommendations.
- Added approve/reject handling for Meta recommendations.
- Added campaign status controls for activating and pausing Meta campaigns.
- Added agent-generated Meta ad creation from existing campaign pages.
- Added paused Meta ad publishing from ad creative previews.
- Added support for creating a real Meta campaign, ad set, creative, and ad in `PAUSED` status from a selected creative.
- Added launch configuration for Page ID, destination URL, image URL or image hash, daily budget, country, and objective.
- Added Meta publish result tracking for campaign ID, ad set ID, creative ID, ad ID, status, and published time.
- Added Meta publish failure tracking with user-facing error hints.

### Backend

- Added API routes for auth, campaigns, ads, dashboard, agents, MCP, campaign drafts, Meta, Meta Ads V2, and ad creative previews.
- Added MongoDB models for users, campaigns, ads, agents, approvals, performance, Meta connections, Meta Ads V2 entities, agent logs, campaign drafts, creative memory, and ad creative previews.
- Added Meta Ads V2 sync worker support.
- Added token encryption support for Meta connections.
- Added MCP services for analytics prediction, cost/token tracking, market keywords, competitor context, memory, and similar Meta ads.

### Production Readiness

- Prepared the full frontend and backend system for the `1.0` production release.
- Added safer publish flow by creating Meta ads in paused status first.
- Added validation around required Meta publish inputs and public URL requirements.
- Added persisted status states for ad creative previews: `draft`, `publishing`, `published_paused`, and `failed`.
