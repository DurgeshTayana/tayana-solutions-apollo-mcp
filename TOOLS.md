# Apollo.io MCP Server - Available Tools

This document lists all available tools in the Apollo.io MCP Server.

## Overview

The Apollo.io MCP Server provides **7 tools** that enable AI assistants and applications to interact with Apollo.io's data for people and organization enrichment.

---

## Tool List

### 1. `people_enrichment`
**Description:** Enrich contact data with comprehensive information for 1 person.

**Parameters:**
- `first_name` (string, optional): Person's first name
- `last_name` (string, optional): Person's last name
- `email` (string, optional): Person's email address
- `domain` (string, optional): Company domain
- `organization_name` (string, optional): Organization name
- `linkedin_url` (string, optional): Person's LinkedIn profile URL

**Note:** At least one parameter is required.

**MCP Tool Name:** `people_enrichment`  
**REST API:** `POST /api/v1/people/enrichment`

---

### 2. `organization_enrichment`
**Description:** Get detailed company information and insights for 1 company.

**Parameters:**
- `domain` (string, **required**): The domain of the company that you want to enrich. Do not include www., the @ symbol, or similar (e.g., 'apollo.io' or 'microsoft.com')

**MCP Tool Name:** `organization_enrichment`  
**REST API:** `GET /api/v1/organizations/enrichment?domain=<domain>`

---

### 3. `people_search`
**Description:** Find people based on various criteria with comprehensive filtering options.

**Parameters:**
- `person_titles` (array, optional): Job titles held by the people you want to find (e.g., 'sales development representative', 'marketing manager', 'research analyst')
- `include_similar_titles` (boolean, optional): Whether to include people with similar job titles (default: true)
- `q_keywords` (string, optional): A string of words to filter the results
- `person_locations` (array, optional): The location where people live (e.g., 'california', 'ireland', 'chicago')
- `person_seniorities` (array, optional): Job seniority levels (e.g., 'owner', 'founder', 'c_suite', 'partner', 'vp', 'head', 'director', 'manager', 'senior', 'entry', 'intern')
- `organization_locations` (array, optional): The location of the company headquarters for a person's current employer (e.g., 'texas', 'tokyo', 'spain')
- `q_organization_domains_list` (array, optional): The domain name for the person's employer (e.g., 'apollo.io', 'microsoft.com')
- `contact_email_status` (array, optional): Email statuses to filter by (e.g., 'verified', 'unverified', 'likely to engage', 'unavailable')
- `organization_ids` (array, optional): Apollo IDs for specific companies (employers) to include in search results
- `organization_num_employees_ranges` (array, optional): Employee count ranges for the person's current company (e.g., '1,10', '250,500', '10000,20000')
- `revenue_range` (object, optional): Revenue range for the person's current employer
  - `min` (integer): Minimum revenue (no currency symbols, commas, or decimals)
  - `max` (integer): Maximum revenue (no currency symbols, commas, or decimals)
- `currently_using_all_of_technology_uids` (array, optional): Find people based on ALL technologies their current employer uses (use underscores for spaces, e.g., 'salesforce', 'google_analytics', 'wordpress_org')
- `currently_using_any_of_technology_uids` (array, optional): Find people based on ANY of the technologies their current employer uses
- `currently_not_using_any_of_technology_uids` (array, optional): Exclude people based on technologies their current employer uses
- `q_organization_job_titles` (array, optional): Job titles listed in active job postings at the person's current employer
- `organization_job_locations` (array, optional): Locations of jobs being actively recruited by the person's employer
- `organization_num_jobs_range` (object, optional): Range for number of job postings active at the person's current employer
  - `min` (integer): Minimum number of active job postings
  - `max` (integer): Maximum number of active job postings
- `organization_job_posted_at_range` (object, optional): Date range for when jobs were posted
  - `min` (string): Earliest date (YYYY-MM-DD)
  - `max` (string): Latest date (YYYY-MM-DD)
- `page` (integer, optional): Page number for pagination (default: 1)
- `per_page` (integer, optional): Number of results per page (max: 100, default: 25)

**Note:** At least one parameter is required.

**MCP Tool Name:** `people_search`  
**REST API:** `POST /api/v1/people/search`

---

### 4. `organization_search`
**Description:** Discover companies matching specific criteria with comprehensive filtering options.

**Parameters:**
- `q_organization_domains_list` (array, optional): List of organization domains to search for
- `organization_locations` (array, optional): The location of the company headquarters (e.g., 'texas', 'tokyo', 'spain')
- `organization_not_locations` (array, optional): Exclude companies from search results based on location
- `organization_num_employees_ranges` (array, optional): Employee count ranges (e.g., '1,10', '250,500', '10000,20000')
- `revenue_range` (object, optional): Search for organizations based on their revenue range
  - `min` (integer): Minimum revenue amount
  - `max` (integer): Maximum revenue amount
- `currently_using_any_of_technology_uids` (array, optional): Technologies the organization currently uses (use underscores for spaces)
- `q_organization_keyword_tags` (array, optional): Filter search results based on keywords associated with companies
- `q_organization_name` (string, optional): Filter search results to include a specific company name (partial matches accepted)
- `organization_ids` (array, optional): Apollo IDs for specific companies to include in search results
- `latest_funding_amount_range` (object, optional): Funding amount range for the company's most recent funding round
  - `min` (integer): Minimum amount from most recent funding round
  - `max` (integer): Maximum amount from most recent funding round
- `total_funding_range` (object, optional): Total funding amount range across all funding rounds
  - `min` (integer): Minimum total funding amount
  - `max` (integer): Maximum total funding amount
- `latest_funding_date_range` (object, optional): Date range for when the company received its most recent funding round
  - `min` (string): Earliest date (YYYY-MM-DD)
  - `max` (string): Latest date (YYYY-MM-DD)
- `q_organization_job_titles` (array, optional): Job titles listed in active job postings at the company
- `organization_job_locations` (array, optional): Locations of jobs being actively recruited by the company
- `organization_num_jobs_range` (object, optional): Range for number of job postings active at the company
  - `min` (integer): Minimum number of active job postings
  - `max` (integer): Maximum number of active job postings
- `organization_job_posted_at_range` (object, optional): Date range for when jobs were posted by the company
  - `min` (string): Earliest date (YYYY-MM-DD)
  - `max` (string): Latest date (YYYY-MM-DD)
- `page` (integer, optional): Page number for pagination (default: 1)
- `per_page` (integer, optional): Number of results per page (max: 100, default: 25)

**Note:** At least one parameter is required.

**MCP Tool Name:** `organization_search`  
**REST API:** `POST /api/v1/organizations/search`

---

### 5. `organization_job_postings`
**Description:** Access job postings for specific organizations.

**Parameters:**
- `organization_id` (string, **required**): Apollo.io organization ID

**MCP Tool Name:** `organization_job_postings`  
**REST API:** `GET /api/v1/organizations/:organizationId/jobs`

---

### 6. `get_person_email`
**Description:** Get email address for a person using their Apollo ID.

**Parameters:**
- `apollo_id` (string, **required**): Apollo.io person ID

**MCP Tool Name:** `get_person_email`  
**REST API:** `GET /api/v1/people/:apolloId/email`

---

### 7. `employees_of_company`
**Description:** Find employees of a company using company name or website/LinkedIn URL.

**Parameters:**
- `company` (string, **required**): Company name
- `website_url` (string, optional): Company website URL
- `linkedin_url` (string, optional): Company LinkedIn URL

**MCP Tool Name:** `employees_of_company`  
**REST API:** `POST /api/v1/companies/employees`

---

## Access Methods

### Via MCP Protocol (SSE)
- Connect to: `GET /mcp` (Server-Sent Events)
- Send tool calls via: `POST /messages?sessionId=<session_id>`
- Use JSON-RPC format to call tools

### Via REST API
- All tools are available as REST API endpoints
- See `/api` endpoint for full documentation
- Requires Apollo.io API key in headers

## Authentication

All tools require an Apollo.io API key provided via:
- Header: `X-Apollo-Api-Key`
- Header: `X-Api-Key`
- Header: `Authorization: Bearer <key>`
- Query parameter: `?apollo_api_key=<key>`
- Request body: `{ "apollo_api_key": "<key>" }`

Optional server authorization token (if `SERVER_AUTH_TOKEN` is set):
- Header: `Authorization: Bearer <token>`
- Header: `X-Server-Token: <token>`

---

## Summary

| # | Tool Name | Type | Required Params | REST Endpoint |
|---|-----------|------|-----------------|---------------|
| 1 | `people_enrichment` | POST | At least one | `/api/v1/people/enrichment` |
| 2 | `organization_enrichment` | GET | `domain` | `/api/v1/organizations/enrichment` |
| 3 | `people_search` | POST | At least one | `/api/v1/people/search` |
| 4 | `organization_search` | POST | At least one | `/api/v1/organizations/search` |
| 5 | `organization_job_postings` | GET | `organization_id` | `/api/v1/organizations/:id/jobs` |
| 6 | `get_person_email` | GET | `apollo_id` | `/api/v1/people/:id/email` |
| 7 | `employees_of_company` | POST | `company` | `/api/v1/companies/employees` |





