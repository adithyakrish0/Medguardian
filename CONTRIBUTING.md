# 🤝 Contributing to MedGuardian

Thank you for considering contributing to MedGuardian! This document outlines the process and guidelines for contributing.

---

## 📋 Table of Contents
- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)

---

## 📜 Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Focus on what is best for the community
- Show empathy towards other community members

---

## 🚀 How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues. When creating a bug report, include:

- **Clear title and description**
- **Steps to reproduce**
- **Expected vs actual behavior**
- **Screenshots** if applicable
- **Environment details** (OS, Python version, etc.)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. Include:

- **Use case**: Why is this enhancement needed?
- **Proposed solution**: How should it work?
- **Alternatives considered**

### Pull Requests

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Update documentation
6. Submit PR

---

## 💻 Development Setup

### Prerequisites
- Python 3.8+
- Git
- Virtual environment tool

### Setup Steps

1. **Fork and clone**
```bash
git clone https://github.com/YOUR-USERNAME/medguardian.git
cd medguardian
```

2. **Create virtual environment**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\\Scripts\\activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
pip install -r requirements-dev.txt  # For development tools
```

4. **Set up environment**
```bash
cp .env.example .env
# Edit .env with your settings
```

5. **Initialize database**
```bash
python
>>> from app import create_app, db
>>> app = create_app()
>>> with app.app_context():
...     db.create_all()
>>> exit()
```

6. **Run tests**
```bash
pytest
```

7. **Start development server**
```bash
python run.py
```

---

## 📏 Coding Standards

### Python Style Guide

Follow [PEP 8](https://pep8.org/) and use these tools:

```bash
# Format code
black app/ tests/

# Lint code
flake8 app/ tests/

# Type checking
mypy app/
```

### Code Organization

```
app/
├── models/          # Database models
├── routes/          # Route handlers
├── services/        # Business logic
├── utils/           # Utility functions
├── vision/          # Computer vision code
└── templates/       # HTML templates
```

### Naming Conventions

- **Files**: `snake_case.py`
- **Classes**: `PascalCase`
- **Functions**: `snake_case()`
- **Constants**: `UPPER_SNAKE_CASE`
- **Private**: `_leading_underscore()`

### Documentation

Every module, class, and function should have docstrings:

```python
def calculate_similarity(img1: np.ndarray, img2: np.ndarray) -> float:
    """
    Calculate similarity between two images.
    
    Args:
        img1: First image as numpy array
        img2: Second image as numpy array
        
    Returns:
        Similarity score between 0.0 and 1.0
        
    Raises:
        ValueError: If images have different dimensions
    """
    pass
```

---

## 📝 Commit Guidelines

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting)
- **refactor**: Code refactoring
- **test**: Adding tests
- **chore**: Maintenance tasks

### Examples

```bash
feat(verification): add barcode scanning support

Implemented barcode scanning using pyzbar library.
Supports QR codes and common barcode formats.

Closes #123
```

```bash
fix(scheduler): prevent duplicate reminders

Added session.expire_all() to clear cached objects
before checking medication logs.

Fixes #456
```

---

## 🔄 Pull Request Process

1. **Update Documentation**
   - Update README if needed
   - Add/update docstrings
   - Update API docs if applicable

2. **Add Tests**
   - Write unit tests for new code
   - Ensure all tests pass
   - Aim for >80% code coverage

3. **Code Quality**
   - Run `black` to format
   - Run `flake8` to lint
   - Fix any warnings

4. **Create PR**
   - Use descriptive title
   - Reference related issues
   - Describe changes made
   - Add screenshots for UI changes

5. **Review Process**
   - Address review comments
   - Keep discussion professional
   - Be patient

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Manual testing performed
- [ ] All tests passing

## Screenshots (if applicable)

## Related Issues
Closes #123
```

---

## 🧪 Testing

### Running Tests

```bash
# All tests
pytest

# Specific file
pytest tests/test_verification.py

# With coverage
pytest --cov=app tests/

# Verbose
pytest -v
```

### Writing Tests

```python
import pytest
from app import create_app, db

@pytest.fixture
def app():
    app = create_app('testing')
    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()

@pytest.fixture
def client(app):
    return app.test_client()

def test_medication_creation(client):
    \"\"\"Test creating a new medication\"\"\"
    response = client.post('/api/v1/medications', json={
        'name': 'Test Med',
        'dosage': '100mg',
        'frequency': 'daily'
    })
    assert response.status_code == 201
    assert response.json['success'] == True
```

### Test Coverage Goals

- **Models**: 90%+
- **Services**: 85%+
- **Routes**: 80%+
- **Utils**: 85%+
- **Overall**: 80%+

---

## 🏷️ Versioning

We use [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes
- **MINOR**: New features (backwards compatible)
- **PATCH**: Bug fixes

---

## 🎯 Areas Needing Help

Check out [good first issues](https://github.com/yourusername/medguardian/labels/good%20first%20issue) for beginner-friendly tasks.

**High Priority:**
- [ ] Mobile app (React Native)
- [ ] Improved ML models
- [ ] Multi-language support
- [ ] Pharmacy API integration

**Medium Priority:**
- [ ] More unit tests
- [ ] Performance optimization
- [ ] Accessibility improvements
- [ ] Dark mode

**Low Priority:**
- [ ] Voice commands expansion
- [ ] Export to PDF
- [ ] Advanced analytics

---

## 📬 Questions?

- **GitHub Discussions**: [Ask here](https://github.com/yourusername/medguardian/discussions)
- **Email**: dev@medguardian.com
- **Discord**: Join our server

---

## 📜 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to MedGuardian! Together we can improve healthcare for seniors.**
