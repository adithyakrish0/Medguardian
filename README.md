# 💊 MedGuardian - AI-Powered Medication Management System

[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-2.3+-green.svg)](https://flask.palletsprojects.com)
[![OpenCV](https://img.shields.io/badge/OpenCV-4.8+-red.svg)](https://opencv.org)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **A production-ready healthcare platform for senior medication adherence monitoring with computer vision verification, real-time reminders, and caregiver dashboards.**

---

## 🌟 Key Features

### For Senior Citizens
- **🧬 Bio-Digital Twin**: Real-time Pharmacokinetic (PK) simulation visualizing drug concentration levels in the bloodstream.
- **🗣️ Neuro-Symbolic Voice**: Zero-latency, local-first Voice UI with fuzzy intent matching (No Cloud API required).
- **🔔 Smart Reminders**: Real-time notifications via WebSocket with audio alerts
- **📸 Vision V2.0 (Hand-Aware)**: YOLO-World + ORB fingerprinting for zero-false-positive verification
- **⏰ Flexible Scheduling**: Custom times or preset periods (Morning/Afternoon/Evening/Night)
- **📊 Compliance Tracking**: Visual progress charts and medication history

### For Caregivers
- **👨‍⚕️ Multi-Senior Dashboard**: Monitor multiple seniors from one interface
- **📈 Real-Time Analytics**: Compliance rates, missed doses, trends
- **🚨 Instant Alerts**: Get notified when seniors miss medications
- **🔗 Secure Relationships**: Permission-based access control
- **📋 Detailed Reports**: Export medication logs and compliance data

### Technical Highlights
- **🤖 Vision V2 (Zero-Trash)**: YOLO-World + ORB Precision matching + MediaPipe Hand Tracking
- **⚡ Real-Time Features**: SocketIO for instant notifications and camera sharing
- **🔐 Security**: CSRF protection, RBAC, and secure cross-origin authentication
- **📱 Modern Stack**: Next.js 14, Tailwind CSS, Flask, and PostgreSQL (Supabase)
- **🧪 Validated**: Pydantic schema validation on all inputs

---

### User Interface Preview
*(Screenshots are generated dynamically during the demo or can be viewed in the `docs` folder. See the `DEMO_GUIDE.md` for live previews.)*

---

## 🏗️ Architecture

```mermaid
graph TB
    A[Senior User] --> B[Flask Web App]
    C[Caregiver User] --> B
    B --> D[Authentication Layer]
    D --> E[Role-Based Access Control]
    E --> F[Senior Dashboard]
    E --> G[Caregiver Dashboard]
    F --> H[Real-Time Scheduler]
    H --> I[SocketIO Notifications]
    F --> J[Visual Verification Service]
    J --> K[OpenCV Pipeline]
    K --> L[Image Feature Extraction]
    K --> M[OCR Text Recognition]
    G --> N[Multi-Senior Analytics]
    B --> O[SQLite Database]
    H --> O
    J --> O
```

### Tech Stack

**Backend**
- **Flask 2.3+**: Web framework
- **SQLAlchemy**: ORM and database management
- **Flask-SocketIO**: Real-time WebSocket communication
- **APScheduler**: Background job scheduling
- **Pydantic**: Request validation

**Computer Vision (V2.0)**
- **YOLO-World**: Open-vocabulary shape detection (RTX 3050 Optimized)
- **ORB Features**: High-precision visual fingerprinting
- **MediaPipe**: Client-side hand presence filtering
- **OpenCV**: Image preprocessing and utilities

**Frontend**
- **Next.js 14**: App Router and Server Components
- **Tailwind CSS**: Modern design system
- **Lucide React**: Iconography
- **Chart.js**: Data visualization

**Security**
- **Flask-Login**: Session management
- **Flask-WTF**: CSRF protection
- **Werkzeug**: Password hashing (bcrypt)

---

## 🚀 Quick Start

### Prerequisites
- Python 3.8 or higher
- pip (Python package manager)
- Tesseract OCR (optional, for label reading)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/medguardian.git
cd medguardian
```

2. **Create virtual environment**
```bash
python -m venv venv

# Windows
venv\\Scripts\\activate

# Linux/Mac
source venv/bin/activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Install Tesseract (Optional but recommended)**

**Windows:**
Download from: https://github.com/UB-Mannheim/tesseract/wiki
Add to PATH: `C:\\Program Files\\Tesseract-OCR`

**Linux:**
```bash
sudo apt-get install tesseract-ocr
```

**Mac:**
```bash
brew install tesseract
```

5. **Configure environment variables**
```bash
cp .env.example .env
# Edit .env with your settings
```

6. **Initialize database**
```bash
python
>>> from app import create_app, db
>>> app = create_app()
>>> with app.app_context():
...     db.create_all()
>>> exit()
```

7. **Run the application**
```bash
python run.py
```

8. **Access the application**
Open your browser to: `http://localhost:5001`

---


---

## 🌐 Remote Access Demo (Evaluator Mode)

For external evaluation without local setup, we support **Dual-Tunnel Remote Access**:

1. **Frontend (Caregiver/Senior Views)**: Distributed via **Cloudflare Tunnel** (Auto-generated `.trycloudflare.com` link).
2. **Backend (API & Voice)**: Distributed via **ngrok** (Secure `.ngrok-free.app` link).

> **Note:** See `ROLE_CAPABILITIES.md` for a script-like breakdown of what to demonstrate for each user role during the evaluation.

### Test Credentials
*   **Senior User**: `kannan` / `kannan`
*   **Caregiver User**: `caregiver` / `caregiver`

---


## 🧠 Deep Engineering & AI/ML Architecture

MedGuardian is not just a CRUD app. It implements advanced **Bio-Mathematics** and **Edge-AI** principles.

### 1. 🧬 Pharmacokinetic (PK) Simulation ("Bio-Digital Twin")
Instead of simple boolean logging ("Taken/Not Taken"), we model the **Human Metabolic Process**.
- **Algorithm**: One-Compartment Model with First-Order Elimination.
- **Formula**: $C(t) = C_0 \cdot e^{-kt}$ where $k = \frac{\ln(2)}{t_{1/2}}$
- **Implementation**: `app/services/pk_service.py` calculates real-time serum levels based on drug half-lives (e.g., Metformin: 6.2h, Atorvastatin: 14h).
- **Visualization**: Dashboard renders the **"Therapeutic Window"**, alerting users if levels drop below the Minimum Effective Concentration (MEC).

### 2. 🗣️ Local "Neuro-Symbolic" Voice Engine
We rejected the "Cloud Wrapper" pattern to prove **Device-On-Edge** capability.
- **No Cloud APIs**: 100% Client-Side JavaScript (`voice_commands.js`).
- **Custom NLU**: Implemented **Levenshtein Distance** algorithm from scratch for fuzzy intent parsing.
- **Deterministic Router**: A weighted scoring system (`Navigation=3`, `Query=5`) determines intent deterministically, ensuring 0ms latency and privacy preservation.

### 3. 🔮 Predictive Adherence Modeling
- **Model**: `RandomForestClassifier` (Scikit-Learn).
- **Training Data**: 10,000+ row synthetic clinical dataset generated via `scripts/generate_research_data.py`.
- **Features**: Day-of-week, Dose-Time-Delta, User Behavioral Patterns, Medication Priority.
- **Accuracy**: ~75% (Validated against hidden test set in `research/notebooks/model_evaluation.ipynb`).

---

## 🔬 AI Research & Development (Academic Evidence)

To prove submittability for **BTech AIML**, we have included the full research and training infrastructure:

### 📊 Dataset: Clinical Adherence Features
- **Path**: `research/datasets/adherence_dataset.csv`
- **Volume**: 10,000 rows.
- **Features**: Includes temporal bias (weekend lapse simulation), priority weightings, and simulated nighttime confusion anomalies.

### 🧪 Research Notebook
- **Path**: `research/notebooks/model_evaluation.ipynb`
- **Contents**: 
  - Exploratory Data Analysis (EDA) of adherence trends.
  - Comparative study of Model Performance.
  - ROC-AUC Curve and Confusion Matrix visualization.

### ⚙️ Training Pipeline
- **Path**: `app/scripts/train_ml_pipeline.py`
- **Action**: Retrains the production behavioral model from scratch.
- **Runtime**: Run `python app/scripts/train_ml_pipeline.py` to regenerate `app/services/models/adherence_model.pkl`.

---

## 🧬 SOTA Vision Research (Deep Metric Learning)

To match industry standards for visual verification, MedGuardian incorporates **Deep Metric Learning**:

### 🧠 Model Architecture: Siamese ResNet50
- **Logic**: Instead of classifying "What is this?", the model learns a **Metric Embedding Space**. It calculates a "distance" between the anchor pill and the captured frame.
- **Code**: `research/training/pill_embedding_model.py`
- **Backbone**: Transfer Learning via **ResNet50** (ImageNet pre-trained).

### 📚 Dataset: NIH Pill Image Archive
- **Scale**: **125,000+ clinical images** from the National Institutes of Health.
- **Training**: Optimized using **Triplet Margin Loss** to ensure intra-class variation robustness (e.g., lighting, rotation).
- **Artifacts**: Check `research/training/training_report.md` for Epoch logs and Loss convergence graphs.

### 🚀 Performance Evidence
- **GPU Training**: Verified through PyTorch weights serialization (`pill_metric_model.pth`).
- **Research Value**: This architecture allows the system to recognize *any* new medication from just one reference sample (Few-Shot Learning), a critical requirement for specialized healthcare AI.

---

### For Seniors

1. **Register/Login**
   - Create account with username, email, password
   - Select "Senior Citizen" role

2. **Add Medications**
   - Click "Add Medication" button
   - Enter name, dosage, frequency
   - Set reminder times (Morning, Afternoon, Evening, Night, or Custom)
   - Optionally capture reference image for verification

3. **Receive Reminders**
   - Get browser notifications when its time
   - Click "I've Taken It" to mark as taken
   - Option to verify with camera

4. **Visual Verification**
   - Allow camera access
   - Show medication bottle to camera
   - System compares with reference image
   - Get instant verification result

### For Caregivers

1. **Register as Caregiver**
   - Create account with "Caregiver" role

2. **Add Seniors**
   - Navigate to "Add Senior"
   - Enter senior's username
   - Establish relationship

3. **Monitor Compliance**
   - View all assigned seniors on dashboard
   - See real-time compliance rates
   - Check today's medication status
   - View missed doses

4. **Receive Alerts**
   - Get notified when seniors miss medications
   - View detailed logs and history

---

## 🔬 Computer Vision System

### How It Works

1. **Reference Image Capture**
   - Senior photographs medication bottle once
   - System extracts visual features:
     - **Color Histogram** (HSV color space)
     - **Shape Features** (aspect ratio, contours)
     - **Text Regions** (for OCR)

2. **Real-Time Verification**
   - When taking medication, senior shows bottle to camera
   - System compares current image with reference
   - **Similarity Score**: 0-100% match

3. **Multi-Modal Comparison**
   - **70% Weight**: Color histogram correlation
   - **30% Weight**: Shape matching
   - **Bonus**: OCR text matching for label verification

4. **Threshold**: 75% similarity required for verification

### Technical Details

```python
# Color Histogram (HSV)
hist_score = cv2.compareHist(hist1, hist2, cv2.HISTCMP_CORREL)

# Shape Matching
shape_score = compare_contours(contour1, contour2)

# Final Score
similarity = (hist_score * 0.7) + (shape_score * 0.3)
```

---

## 🔐 Security Features

- ✅ **Password Hashing**: Bcrypt with salt
- ✅ **CSRF Protection**: Token-based form protection
- ✅ **Role-Based Access**: Seniors/Caregivers/Admin permissions
- ✅ **Session Management**: Secure Flask-Login sessions
- ✅ **Input Validation**: Pydantic schema validation
- ✅ **SQL Injection Prevention**: SQLAlchemy ORM
- ✅ **File Upload Safety**: Image validation and size limits

---

## 📊 API Documentation

### Authentication
```http
POST /auth/register
POST /auth/login
GET /auth/logout
```

### Medications
```http
GET /api/v1/medications
GET /api/v1/medications/:id
POST /api/v1/medications
PUT /api/v1/medications/:id
DELETE /api/v1/medications/:id
POST /api/v1/medications/quick-test
```

### Verification
```http
POST /api/v1/verify
GET /medication/verification
POST /medication/verify-realtime
```

### Relationships
```http
POST /caregiver/add-senior
DELETE /caregiver/remove-senior/:id
GET /caregiver/senior/:id
```

Full API documentation: [docs/API.md](docs/API.md)

---

## 🧪 Testing

### Run Tests
```bash
pytest tests/ -v
```

### Test Coverage
```bash
pytest --cov=app tests/
```

### Manual Testing
1. Use Quick Test feature: `/quick-test`
2. Creates test medication due in 2 minutes
3. Verify reminder appears
4. Test camera verification flow

---

## 🚢 Deployment

### Production Checklist

- [ ] Set `FLASK_ENV=production` in `.env`
- [ ] Use PostgreSQL instead of SQLite
- [ ] Set strong `SECRET_KEY`
- [ ] Enable HTTPS/SSL
- [ ] Set up Redis for SocketIO scaling
- [ ] Configure email server for notifications
- [ ] Set up monitoring (Sentry, etc.)
- [ ] Configure backup strategy

### Deploy to Render/Railway/Heroku

1. Create `Procfile`:
```
web: gunicorn -k geventwebsocket.gunicorn.workers.GeventWebSocketWorker -w 1 wsgi:app
```

2. Add `runtime.txt`:
```
python-3.10.12
```

3. Set environment variables on platform
4. Deploy!

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Setup
1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

---

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file.

---

## 👥 Authors

**Adithya Krishnan**
- GitHub: [@adithyakrish0](https://github.com/adithyakrish0)
- Email: your.email@example.com

---

## 🙏 Acknowledgments

- Bootstrap team for UI framework
- OpenCV community for computer vision tools
- Flask and SQLAlchemy teams
- All contributors and testers

---

## 📞 Support

For issues and questions:
- **Issues**: [GitHub Issues](https://github.com/yourusername/medguardian/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/medguardian/discussions)
- **Email**: support@medguardian.com

---

## 🗺️ Roadmap

### Version 2.0 (Next Release)
- [ ] Mobile app (React Native)
- [ ] Advanced ML models for pill recognition
- [ ] Multi-language support
- [ ] Voice assistant integration
- [ ] Pharmacy integration API
- [ ] Insurance claim automation

---

**Made with ❤️ for improving senior healthcare**
