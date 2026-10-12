# Grafana Cloud Alerting Rules & Setup Guide

This document defines the production alerting configuration for the **MERN AI Finance Tracker** application monitored via Grafana Cloud and OpenTelemetry.

---

## 1. Alerting Architecture & Data Sources

| Signal Type | Grafana Cloud Data Source | Ingestion Endpoint |
|---|---|---|
| **Metrics** | `grafanacloud-prom` / Prometheus | OTLP `/v1/metrics` |
| **Logs** | `grafanacloud-logs` / Loki | OTLP `/v1/logs` |
| **Traces** | `grafanacloud-traces` / Tempo | OTLP `/v1/traces` |
| **Synthetic Checks** | Grafana Synthetic Monitoring | HTTP Check |

---

## 2. Production Alert Rules Specification

### Alert A — High HTTP 5xx Error Rate
* **Objective**: Alert when internal server errors exceed 5% of total traffic over a 5-minute rolling window, preventing noise during low traffic.
* **Data Source**: Prometheus
* **Query Expression (PromQL)**:
  ```promql
  (
    sum(rate(app_http_requests_total{http_response_status_code=~"5.."}[5m]))
    /
    (sum(rate(app_http_requests_total[5m])) > 0.05)
  ) * 100 > 5
  ```
  *(Note: `> 0.05` ensures the rule only evaluates when traffic is at least 3 requests per minute).*
* **Evaluation Interval**: `1m`
* **Pending Period (For)**: `5m`
* **Severity**: `critical`
* **Labels**:
  - `service`: `mern-backend`
  - `team`: `backend`
* **Annotations**:
  - **Summary**: `High 5xx error rate detected on MERN backend (> 5%)`
  - **Description**: `HTTP 5xx server errors currently account for more than 5% of all incoming requests over the past 5 minutes.`
  - **Runbook**: Inspect Loki logs filtered by `{service_name="mern-backend"} |= "ERROR"` and check Vercel function runtime logs.

---

### Alert B — High API Latency (p95 > 1s)
* **Objective**: Alert when 95th percentile request latency exceeds 1 second for 5 consecutive minutes.
* **Data Source**: Prometheus
* **Query Expression (PromQL)**:
  ```promql
  histogram_quantile(
    0.95,
    sum(rate(app_http_request_duration_seconds_bucket{http_route!="/api/receipts/scan"}[5m])) by (le)
  ) > 1.0
  ```
  *(Note: Excludes AI receipt OCR scan which may take 1.5–2s for multimodal vision parsing).*
* **Evaluation Interval**: `1m`
* **Pending Period (For)**: `5m`
* **Severity**: `warning`
* **Labels**:
  - `service`: `mern-backend`
  - `performance`: `degraded`
* **Annotations**:
  - **Summary**: `API p95 latency is exceeding 1.0s`
  - **Description**: `95% of API requests are taking longer than 1,000ms over a 5-minute evaluation window.`
  - **Runbook**: Check MongoDB Atlas connection pool metrics and review slow traces in Tempo.

---

### Alert C — MongoDB Database Ping Failures
* **Objective**: Alert immediately if the database health check encounters connection drops or timeout failures on MongoDB Atlas M0.
* **Data Source**: Prometheus
* **Query Expression (PromQL)**:
  ```promql
  sum(increase(app_db_ping_failures_total[5m])) > 0
  ```
* **Evaluation Interval**: `1m`
* **Pending Period (For)**: `1m`
* **Severity**: `critical`
* **Labels**:
  - `service`: `mern-backend`
  - `component`: `database`
* **Annotations**:
  - **Summary**: `MongoDB health ping failure detected`
  - **Description**: `One or more database ping operations failed on MongoDB Atlas M0 free cluster.`
  - **Runbook**: Check MongoDB Atlas Cluster status, IP access list (ensure `0.0.0.0/0` is permitted for Vercel), and Atlas connection limits.

---

### Alert D — Telemetry Stream Stoppage (Heartbeat / Missing Metrics)
* **Objective**: Alert if metrics stop arriving at Grafana Cloud, indicating bad OTLP credentials or crashed functions.
* **Data Source**: Prometheus
* **Query Expression (PromQL)**:
  ```promql
  absent_over_time(app_http_requests_total{service_name="mern-backend"}[15m]) == 1
  ```
* **Evaluation Interval**: `2m`
* **Pending Period (For)**: `10m`
* **Severity**: `warning`
* **Labels**:
  - `service`: `mern-backend`
  - `telemetry`: `absent`
* **Annotations**:
  - **Summary**: `No OpenTelemetry metrics received in the last 15 minutes`
  - **Description**: `Grafana Cloud has not ingested metrics from the MERN backend. Verify Vercel environment variables OTEL_EXPORTER_OTLP_ENDPOINT and OTEL_EXPORTER_OTLP_HEADERS.`

---

### Alert E — Public Application & Health Check Availability (Synthetic Monitoring)
* **Objective**: Detect outages even if the backend is completely unreachable or deployment fails.
* **Mechanism**: Grafana Cloud **Synthetic Monitoring** (Blackbox probe)
* **Target URL**: `https://<YOUR_VERCEL_DOMAIN>/api/health`
* **Probe Locations**: 3 geo-distributed locations (e.g., Mumbai, Frankfurt, Virginia)
* **Frequency**: Every `60s`
* **Expected Response**:
  - HTTP Status Code: `200`
  - Response Body Contains: `"status":"healthy"`
* **Trigger Condition**: Failed checks from 2 or more locations for 3 consecutive minutes.
* **Severity**: `critical`

---

## 3. Step-by-Step Alert Rule Setup in Grafana Cloud

1. Log in to your **Grafana Cloud** instance (`https://<your-instance>.grafana.net`).
2. Navigate to **Alerting** (bell icon in left sidebar) → **Alert rules** → **+ New alert rule**.
3. **Step 1: Set rule name**: e.g., `MERN - High 5xx Error Rate`.
4. **Step 2: Set query and condition**:
   - Select your Prometheus data source (`grafanacloud-prom`).
   - Paste the corresponding PromQL expression from Section 2 above.
   - Set threshold condition: `Input is above 5`.
5. **Step 3: Set evaluation behavior**:
   - Create a folder: `MERN Observability`.
   - Evaluation group: `MERN Backend Alerts` (interval `1m`, for `5m`).
6. **Step 4: Configure contact point & notifications**:
   - Link to your desired notification channel (Email, Slack, Discord, or PagerDuty).
7. Click **Save rule and exit**. Repeat for Alerts B, C, and D.
