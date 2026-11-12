# SentryMesh
### Trimodal Perimeter Intrusion Detection System for Critical Infrastructure

**RV College of Engineering | Experiential Learning – Phase 1 | SDG 9: Industry, Innovation and Infrastructure**

---

## 1. Overview

SentryMesh is an intelligent, trimodal perimeter intrusion detection system designed to improve the security of critical infrastructure such as electrical substations, industrial plants and pipelines.

Traditional perimeter surveillance relies heavily on CCTV cameras and manual monitoring. These approaches can suffer from operator fatigue, environmental false alarms and blind spots, particularly when visual surveillance alone is insufficient to identify suspicious ground activity.

SentryMesh proposes an additional, low-cost sensing layer that combines:

- **Seismic/Vibration Sensing:** A piezoelectric contact transducer detects vibrations caused by activities around the perimeter.
- **Acoustic Sensing:** An electret microphone captures sound patterns associated with different ground activities.
- **Visual Surveillance:** Existing CCTV footage is analysed using a computer vision model to identify people and vehicles.

The first two sensors are connected to an ESP32 edge node, which performs local signal processing and classification. CCTV footage is analysed separately using a cloud-based or on-site computer vision pipeline. The visual result is returned to the ESP32, where the available sensor outputs are fused to determine whether an alert should be generated.

If the CCTV result is unavailable within the defined timeout, the system falls back to seismic and acoustic sensing and marks the resulting alert as unverified.

**SentryMesh aims to augment existing CCTV infrastructure rather than replace it, providing an additional intelligent sensing layer for more resilient perimeter monitoring.**

## 2. Objectives

1. Develop a low-cost IoT-based perimeter monitoring node using an ESP32 and seismic and acoustic sensors.
2. Implement signal preprocessing and edge-based classification of ground activities.
3. Integrate computer vision-based CCTV analytics as a third sensing modality.
4. Implement multimodal decision-level fusion with confidence-based alert generation.
5. Provide an offline fallback mechanism when the cloud-based visual result is unavailable.
6. Develop a centralised backend and monitoring dashboard for alert logging, inspection and visualisation.
7. Evaluate the system using classification performance, false-alarm rate, alert latency and fallback behaviour.

## 3. Proposed System Architecture

SentryMesh follows an edge-cloud architecture combining local sensor intelligence, cloud-based visual analytics and centralised event monitoring.

### 3.1 System Components

| Component | Technology / Hardware | Responsibility |
|---|---|---|
| Sensor 1 | Piezoelectric contact transducer | Detects fence or ground vibrations |
| Sensor 2 | Electret microphone with amplifier | Captures acoustic activity |
| Edge node | ESP32 DevKit | Signal acquisition, local classification and fusion |
| Sensor 3 | Existing CCTV / laptop camera | Provides visual surveillance |
| Video analytics | Pretrained person/vehicle detector | Identifies visual activity and generates confidence scores |
| Messaging layer | MQTT / Mosquitto | Communication between nodes, backend and cloud pipeline |
| Backend | Python, FastAPI | Alert ingestion, validation and API services |
| Database | SQLite / PostgreSQL | Persistent event and audit-log storage |
| Dashboard | React | Visual monitoring and event inspection |

### 3.2 End-to-End Data Flow

1. **Sensing:** The ESP32 acquires vibration and acoustic signals. CCTV provides the visual input.
2. **Preprocessing:** Sensor signals are filtered and divided into one-second windows with 50% overlap.
3. **Edge classification:** A lightweight TinyML classifier processes the seismic and acoustic features and predicts the activity class.
4. **Visual analysis:** The camera stream is analysed by a computer vision model, which returns a visual class and confidence score.
5. **Decision-level fusion:** The ESP32 combines its local classification result with the corresponding CCTV result.
6. **Alert generation:** A confidence threshold and consecutive-window check are applied before generating an alert.
7. **Fallback:** If the cloud result is unavailable within the timeout, the node uses the seismic-acoustic result and marks the alert as unverified.
8. **Communication:** The alert is published over MQTT.
9. **Backend processing:** FastAPI receives, validates and stores the alert.
10. **Monitoring:** The React dashboard retrieves the stored events and presents the alert information.

### 3.3 Architecture Diagram

```text
                 PERIMETER / EDGE NODE
              ┌───────────────────────────┐
              │                           │
  Piezo Sensor ──> Signal Conditioning    │
              │                           │
  Electret Mic ──> Signal Conditioning    │
              │            │              │
              │            v              │
              │       ESP32 Node          │
              │                           │
              │  Signal Processing        │
              │  TinyML Classification    │
              │  Decision-Level Fusion    │
              │  Fallback Mechanism       │
              └─────────────┬─────────────┘
                            │
                  MQTT / Wi-Fi
                            │
           ┌────────────────┴──────────────┐
           │                               │
           v                               v
   Cloud Video Analytics             MQTT Broker
           ^                               │
           │                               v
   Laptop Camera / CCTV           FastAPI Backend
           │                               │
           └── Visual Result ──> ESP32     v
                                     SQLite Database
                                            │
                                            v
                                     React Dashboard
```

*The diagram represents the intended complete architecture. The ESP32, cloud video analytics, fusion and dashboard integrations are still under development.*

## 4. Intrusion Classification

The system is designed to classify five categories of activity:

| Class | Description |
|---|---|
| `normal_noise` | Background noise and non-intrusive environmental activity |
| `walk_run` | Human walking or running |
| `vehicle` | Vehicle movement |
| `digging` | Digging or ground disturbance |
| `climbing_cutting` | Climbing or cutting-related activity |

The final classification is expected to be produced through the edge classifier and combined with visual analytics where available.

## 5. Signal Processing and Machine Learning Methodology

### 5.1 Signal Acquisition

- Sampling frequency: approximately 2–4 kHz.
- Sensor inputs: piezoelectric vibration transducer and electret microphone.
- Window size: 1 second.
- Overlap: 50%.

### 5.2 Preprocessing

A digital bandpass filter is proposed to reduce DC bias, thermal drift and mains-frequency interference.

### 5.3 Feature Extraction

**Vibration features:**
- Root Mean Square (RMS)
- Zero-Crossing Rate (ZCR)
- Dominant frequency peaks

**Acoustic features:**
- Mel-Frequency Cepstral Coefficients (MFCCs)
- Spectral centroid

The extracted vibration and acoustic features are concatenated to form a combined feature vector.

### 5.4 Edge Classification

A lightweight, quantised Random Forest or small neural network is proposed for deployment on the ESP32.

The final model and TinyML deployment toolchain are yet to be selected.

### 5.5 Visual Analytics

The CCTV stream will be processed using a pretrained person/vehicle detection model. The system will generate a visual classification and confidence score, which will be communicated to the ESP32 through MQTT.

### 5.6 Decision-Level Fusion

The ESP32 combines the local seismic-acoustic classification with the visual result.

The intended decision mechanism includes:
- Confidence-based alert thresholds.
- Consecutive-window verification.
- Cloud-result timeout handling.
- An unverified alert path when visual confirmation is unavailable.

The exact conflict policy, thresholds and timeout parameters remain to be finalised through simulation and testing.

## 6. Current Implementation

The initial software infrastructure has been implemented and tested independently of the physical hardware.

The current implementation establishes the MQTT communication pipeline, alert validation, database storage and HTTP API layer. It uses a Python-based simulated node to generate test alerts in place of the ESP32.

### 6.1 MQTT Communication

**Implemented and tested**

- Mosquitto is used as the MQTT broker.
- Paho MQTT is used for Python-based publishing and subscription.
- The backend subscribes to `sentrymesh/+/alert`.
- The simulated node publishes alerts to `sentrymesh/<node_id>/alert`.
- MQTT communication has been tested using simulated alerts.

### 6.2 Simulated IoT Node

**File:** `fake_node.py`

A Python-based simulator reproduces the alert-publishing behaviour expected from an ESP32 node.

It supports:
- Configurable node IDs.
- Configurable publishing intervals.
- Finite or continuous alert generation.
- Random or fixed intrusion classes.
- Verified and unverified alert scenarios.

This enables backend development and testing without requiring the physical sensor node.

### 6.3 Backend Development

**File:** `app.py`

The backend is developed using FastAPI.

Implemented functionality:

- MQTT connection management using FastAPI's lifespan handler.
- Background MQTT message processing.
- Incoming JSON packet reception.
- Alert validation using Pydantic.
- Rejection of invalid messages.
- Storage of validated events in SQLite.
- HTTP endpoints for health monitoring and event retrieval.
- Thread synchronisation for the shared SQLite connection.

### 6.4 Alert Schema and Validation

**File:** `schema.py`

Pydantic is used to define and validate the incoming alert packet.

The current schema includes:

| Field | Type | Validation |
|---|---|---|
| `node_id` | String | Required |
| `timestamp` | Datetime | Must be a valid datetime |
| `class` | Enum | Must match one of the five defined classes |
| `confidence` | Float | Must be between 0 and 1 |
| `verified` | Boolean | Required |

The JSON field `class` is mapped to the Python attribute `cls` using a Pydantic alias.

### 6.5 Database Implementation

**Files:** `db.py`, `sentrymesh.db`

SQLite is currently used for persistent event storage.

The `events` table contains:

| Column | Description |
|---|---|
| `id` | Auto-incrementing event ID |
| `node_id` | Source node identifier |
| `timestamp` | Event generation timestamp |
| `class` | Intrusion category |
| `confidence` | Detection confidence |
| `verified` | Verification status |
| `received_at` | Database insertion timestamp |

An index on `(node_id, timestamp)` supports node-specific event queries.

Implemented database operations include:
- Database connection and initialisation.
- Event insertion.
- Recent event retrieval.
- Filtering by node ID and event class.

### 6.6 REST API

The backend currently exposes the following endpoints:

| Method | Endpoint | Function |
|---|---|---|
| GET | `/health` | Backend status and MQTT processing counters |
| GET | `/events` | Retrieves stored events |
| GET | `/docs` | Interactive FastAPI documentation |

The `/health` endpoint reports:

- `status`: Backend health response.
- `received`: Number of MQTT messages received.
- `stored`: Number of valid events stored.
- `rejected`: Number of invalid messages rejected.

The `/events` endpoint supports:
- Configurable result limits.
- Filtering by node ID.
- Filtering by event class.
- Combined filtering.

Example requests:

```http
GET /events?limit=100
GET /events?node_id=node_01
GET /events?class=digging
GET /events?node_id=node_01&class=vehicle
```

### 6.7 MQTT Debugging Utility

**File:** `subscriber_print.py`

An independent MQTT subscriber listens to `sentrymesh/#` and prints incoming messages.

It is used to verify broker communication and debug the publishing pipeline.

### 6.8 Current Software Stack

| Layer | Technology |
|---|---|
| Programming language | Python |
| Backend framework | FastAPI |
| API server | Uvicorn |
| Messaging protocol | MQTT |
| MQTT broker | Mosquitto |
| MQTT client | Paho MQTT |
| Data validation | Pydantic |
| Database | SQLite |
| Data format | JSON |
| Concurrency | Python threading and locks |

### 6.9 Verified Implementation Status

The following software flow has been tested end-to-end:

```text
Fake Node
    |
    v
MQTT Broker
    |
    v
FastAPI MQTT Subscriber
    |
    v
Pydantic Validation
    |
    v
SQLite Event Storage
    |
    v
REST API Retrieval
```

The simulator has been used to publish alerts, and the backend has been verified to receive, validate and store them. Health counters and event retrieval have also been tested.

**Important:** This confirms the software communication and storage pipeline. It does not establish the accuracy of an intrusion detection model or the performance of the physical sensing system.

## 7. Expected Dashboard

The planned React dashboard will provide a central interface for monitoring perimeter activity.

The dashboard is expected to include:

1. **System Overview:** Backend health and summary alert statistics.
2. **Fence-Line Schematic:** Visual representation of the monitored perimeter and node locations.
3. **Node Monitoring:** Node identifiers and their activity/status information.
4. **Alert Classification:** Event category and confidence score.
5. **Verification Status:** Visual distinction between verified and unverified alerts.
6. **Event Inspector:** Detailed information about individual alerts, including timestamps.
7. **Audible and Visual Alarms:** Notifications for detected intrusion events.
8. **Event History:** Searchable and filterable alert records.

The initial dashboard will use the existing `/health` and `/events` APIs. Live updates can initially use periodic polling, with WebSockets or Server-Sent Events considered as a later enhancement.

## 8. Development Workstreams

Development is divided into parallel tracks to enable independent progress.

### Track A – Backend and Dashboard

**Backend foundation: Implemented**

Remaining work:
- React + Vite frontend setup.
- Dashboard components and layouts.
- REST API integration.
- Event history and filters.
- Fence-line visualisation.
- Node status representation.
- Audible and visual notifications.
- Real-time update mechanism.

### Track B – Hardware and Firmware

**Hardware procurement and prototype development: In progress as a team workstream**

Expected tasks:
- ESP32 setup and sensor interfacing.
- Piezo signal conditioning.
- Electret microphone integration.
- ADC acquisition at approximately 2–4 kHz.
- Signal sampling and timestamping.
- Wi-Fi and MQTT communication.
- Firmware implementation.
- Physical enclosure and perimeter mounting.
- Hardware-to-backend integration.

### Track C – AI/ML Pipeline

**Not yet implemented**

Expected tasks:
- Dataset identification and collection.
- Signal preprocessing.
- Feature extraction.
- Model training and evaluation.
- Session-based training and testing splits.
- Quantisation and model optimisation.
- ESP32 memory and inference-time evaluation.
- On-device classifier deployment.

### Track D – Cloud Video Analytics

**Not yet implemented**

Expected tasks:
- Laptop/USB camera integration for the prototype.
- Video frame acquisition.
- Pretrained person/vehicle detection.
- Confidence-score generation.
- Cloud-result JSON generation.
- MQTT communication with the ESP32.
- Timestamp alignment.
- Testing under poor lighting and different scene conditions.

### Track E – Fusion and Fallback

**Design direction established; implementation pending**

Expected tasks:
- Develop a Python-based fusion simulation.
- Define confidence thresholds and consecutive-window checks.
- Implement cloud-result timeout handling.
- Test confirmed, conflicting, late and unavailable cloud results.
- Finalise the conflict policy.
- Port the final decision logic to the ESP32.

### Track F – Testing and Evaluation

**Pending real sensor data and integrated system**

Expected tasks:
- MQTT communication tests.
- Invalid packet and schema validation tests.
- Multi-node tests.
- Database persistence tests.
- Hardware integration tests.
- Model evaluation.
- Fusion and fallback testing.
- End-to-end system validation.
- Field trials under different environmental conditions.

## 9. Evaluation Methodology

The system will be evaluated using:

| Metric | Purpose |
|---|---|
| Classification accuracy | Measures correct classification of activity |
| F1-score | Evaluates classification performance across classes |
| False alarms per hour | Measures false-positive alert frequency |
| Alert latency | Measures the time taken to generate and deliver an alert |
| Fallback performance | Evaluates behaviour when cloud visual results are unavailable |

### Ablation Study

The contribution of each sensing modality will be evaluated by comparing:

1. Sensor 1 – Seismic only.
2. Sensor 2 – Acoustic only.
3. Sensor 1 + Sensor 2 – Seismic-acoustic fusion.
4. Sensor 1 + Sensor 2 + Sensor 3 – Complete trimodal system.

Training and testing datasets will be split by recording session rather than individual windows to reduce data leakage.

### Project Targets

The team's proposed targets are:

- At least 95% classification accuracy.
- Fewer than two false alarms per week.

If 95% accuracy proves difficult across all five classes, 90% is the fallback target.

**These are targets, not measured results. No performance claims will be made until the system has been evaluated using collected data.**

## 10. Repository Structure

The current repository contains the initial backend implementation. The following is the proposed structure as the project expands:

```text
SentryMesh/
│
├── backend/
│   ├── app.py
│   ├── db.py
│   ├── schema.py
│   ├── fake_node.py
│   ├── subscriber_print.py
│   ├── requirements.txt
│   └── sentrymesh.db
│
├── firmware/
│   ├── acquisition/
│   ├── preprocessing/
│   ├── inference/
│   └── fusion/
│
├── cloud_video/
│   ├── camera.py
│   ├── detector.py
│   └── mqtt_publisher.py
│
├── ml/
│   ├── data/
│   ├── preprocessing/
│   ├── features/
│   ├── training/
│   └── evaluation/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── hooks/
│   └── package.json
│
├── docs/
│   ├── methodology/
│   ├── architecture/
│   └── diagrams/
│
├── .gitignore
└── README.md
```

*This is a proposed future structure, not the current repository layout. The existing Python files are currently at the repository root.*

## 11. Getting Started – Current Backend

The following instructions run the existing software prototype without physical hardware.

### Prerequisites

- Python 3.10 or later.
- Mosquitto MQTT broker.
- Git.
- PowerShell on Windows, or an equivalent terminal on other platforms.

### Step 1: Clone the repository

```bash
git clone <YOUR_REPOSITORY_URL>
cd SentryMesh
```

### Step 2: Create and activate a virtual environment

**Windows PowerShell:**

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

**Linux/macOS:**

```bash
python -m venv venv
source venv/bin/activate
```

### Step 3: Install dependencies

```bash
pip install -r requirements.txt
```

### Step 4: Start the MQTT broker

Start Mosquitto in a separate terminal:

```bash
mosquitto -v
```

The default broker address is `localhost:1883`.

### Step 5: Start the FastAPI backend

```bash
uvicorn app:app --reload
```

### Step 6: Generate simulated alerts

Open another terminal, activate the virtual environment and run:

```bash
python fake_node.py --count 5 --interval 1
```

To generate only digging alerts:

```bash
python fake_node.py --class digging --count 5
```

To simulate the unverified fallback case:

```bash
python fake_node.py --class digging --unverified --count 5
```

To simulate a second node:

```bash
python fake_node.py --node node_02 --count 5
```

### Step 7: Verify the backend

Open the following endpoints:

| URL | Purpose |
|---|---|
| `http://localhost:8000/health` | Backend status and MQTT counters |
| `http://localhost:8000/events` | Stored alert records |
| `http://localhost:8000/docs` | Interactive API documentation |

The SQLite database `sentrymesh.db` is created automatically next to `app.py`.

### Optional: MQTT debugging

Run the standalone subscriber:

```bash
python subscriber_print.py
```

It listens to all topics under `sentrymesh/#`.

### Configuration

The backend supports these environment variables:

| Variable | Default | Purpose |
|---|---|---|
| `MQTT_HOST` | `localhost` | MQTT broker hostname |
| `MQTT_PORT` | `1883` | MQTT broker port |

## 12. Current Limitations and Open Decisions

The following items must be addressed before the complete prototype can be considered integrated.

| Area | Current limitation / decision |
|---|---|
| Hardware | Actual ESP32 and sensor integration is not yet verified |
| Edge ML | No trained or deployed classifier yet |
| Cloud analytics | CCTV processing pipeline is pending |
| Fusion | Fusion and fallback implementation is pending |
| Conflict policy | Behaviour when local sensors detect intrusion but CCTV returns `none` is undecided |
| Dashboard | React dashboard is pending |
| Node monitoring | Node registration, heartbeat and online/offline status are not implemented |
| Real-time updates | Current API uses HTTP retrieval; no WebSocket/SSE implementation |
| Security | MQTT and HTTP API authentication are not implemented |
| Database scalability | SQLite is sufficient for the prototype but may need replacement for larger deployments |
| Communication failure | No independent backup communication path for a complete network outage |
| Evaluation | No measured model accuracy, false-alarm rate or field-trial results yet |

### Important Engineering Constraints

- Use ESP32 ADC1 pins (GPIO32–39) for sensor acquisition while Wi-Fi is active.
- The piezoelectric sensor requires appropriate buffering and input protection before connecting to the ADC.
- The proposed 2–4 kHz sampling frequency must be maintained.
- Model quantisation and memory usage must be considered before ESP32 deployment.
- Thresholds, consecutive-window counts and cloud timeouts must be tuned using collected data.
- MQTT topic names and JSON interfaces must remain consistent across all development tracks.

## 13. Future Scope

Potential enhancements after the initial prototype include:

- Real CCTV integration through RTSP/ONVIF.
- Battery or solar-powered perimeter nodes.
- LoRa or cellular backup communication.
- Cross-node event correlation.
- Number-plate recognition through CCTV.
- Multi-site monitoring.
- Validation using datasets representative of Indian environmental conditions.
- Improved resilience under wind, rain, poor lighting and network interruptions.
- Migration to PostgreSQL and scalable backend infrastructure.

## 14. Project Impact – SDG 9

SentryMesh aligns with **United Nations Sustainable Development Goal 9: Industry, Innovation and Infrastructure**.

The project explores how low-cost embedded systems, edge intelligence, computer vision and IoT communication can improve the monitoring and protection of critical infrastructure.

Rather than replacing existing CCTV installations, the proposed system adds complementary sensing capabilities to improve intrusion detection and reduce dependence on continuous manual observation.

The project aims to contribute towards more resilient, intelligent and accessible infrastructure security solutions.

---

## 15. Acknowledgements

Developed as part of the Experiential Learning Phase-1 project at **RV College of Engineering**, under the broader objective of exploring intelligent IoT-based solutions for critical infrastructure protection.

**SentryMesh – Intelligent sensing. Resilient monitoring. Safer infrastructure.**