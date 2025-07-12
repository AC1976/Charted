# Charted 📊

**Professional Organizational Chart Builder for Complex Corporate Structures**

Charted is a powerful Flask-based SaaS application that transforms Excel data into beautiful, interactive organizational charts. Perfect for visualizing complex corporate hierarchies, ownership structures, and reporting relationships.

![Charted Demo](https://img.shields.io/badge/Demo-Live-brightgreen) ![License](https://img.shields.io/badge/License-MIT-blue) ![Python](https://img.shields.io/badge/Python-3.8+-blue) ![Flask](https://img.shields.io/badge/Flask-2.3+-red)

## ✨ Key Features

### 📈 **Interactive Hierarchical Charts**
- **D3.js-powered visualization** with smooth zoom, pan, and drag interactions
- **Hierarchical tree layout** showing clear parent-child relationships
- **Smart node positioning** with automatic level-based organization
- **Visual highlighting** of ownership percentages and relationships

### 🎯 **Entity-Focused Navigation**
- **Focus on any entity** to show only relevant shareholders and subsidiaries
- **Complete ownership chain** from ultimate parents to final subsidiaries
- **Click-to-navigate** between entities for easy exploration
- **Smart search** by entity ID or company name

### 📊 **Advanced Filtering & Controls**
- **Real-time search** across all entities and people
- **Jurisdiction filtering** by tax location
- **Ownership threshold slider** to hide minor holdings
- **Toggle visibility** of people, percentages, and jurisdictions

### 💼 **Professional Export Options**
- **SVG export** (vector format, perfect for PowerPoint scaling)
- **High-resolution PNG** (2x resolution for crisp presentations)  
- **Interactive HTML** (standalone files with zoom/pan functionality)
- **Smart file naming** with timestamps and entity context

### 🔄 **Intelligent Data Processing**
- **Excel file upload** with automatic field mapping
- **Three dataset types**: Entities, Ownership relationships, People
- **Data validation** using Pydantic models
- **Auto-conversion** of numeric IDs to strings for compatibility

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/AC1976/charted.git
cd charted
```

2. **Install dependencies**
```bash
pip install -r requirements.txt
```

3. **Run the application**
```bash
python app.py
```

4. **Open your browser**
```
http://localhost:5000
```

## 📋 Data Requirements

Charted expects three types of Excel files:

### 🏢 **Entity Data**
Required columns (can be mapped from your Excel with custom field names on upload):
- `ENTITY_ID`: Unique identifier (numbers or text)
- `ENTITY_NAME`: Legal company name
- `ENTITY_TAX_JURISDICTION`: Tax jurisdiction (optional)

### 🔗 **Ownership Data** 
Required columns (can be mapped from your Excel with custom field names on upload):
- `PARENT_ID`: Entity ID of the shareholder
- `CHILD_ID`: Entity ID of the subsidiary
- `OWNERSHIP_PERC`: Ownership percentage (0-100)

### 👥 **Person Data**
Required columns:
- `PERSON_ID`: Unique identifier for the person
- `PERSON_NAME`: Full name
- `PERSON_ROLE`: Job title/role (optional)
- `ENTITY_ID`: Associated company (optional)

> **💡 Pro Tip**: All ID fields automatically convert from numbers to strings, so your Excel files can use numeric IDs without issues.

## 🎮 How to Use

### 1. **Upload Your Data**
1. Click **"Upload Excel File"** for each dataset type
2. **Map your columns** to the required standard fields
3. **Save mappings** to process and validate the data
4. Watch the upload progress bar at the bottom

### 2. **Explore the Full Chart**
- **Zoom**: Mouse wheel or zoom controls
- **Pan**: Click and drag on empty space
- **Node details**: Hover for tooltips

### 3. **Focus on Specific Entities**
- **Search box**: Type entity ID or name → Click "Focus"
- **Click navigation**: Click any entity node to focus on it
- **Smart sub-charts**: See complete ownership chain (shareholders above, subsidiaries below)
- **Return to full view**: Click "Show All"

### 4. **Filter and Customize**
- **Search**: Filter by entity/person name or ID
- **Jurisdiction**: Show only specific tax jurisdictions
- **Ownership threshold**: Hide relationships below X%
- **Display options**: Toggle people, ownership %, jurisdictions

### 5. **Export for Presentations**
- **SVG**: Best for PowerPoint (scales perfectly)
- **PNG**: High-resolution images (universal compatibility)
- **HTML**: Interactive standalone files

## 💡 Use Cases

### **Corporate Development**
- Visualize acquisition targets and their subsidiaries
- Map complex ownership structures before M&A
- Present corporate hierarchies to executives

### **Compliance & Legal**
- Document entity structures for regulatory filings
- Track ownership percentages for compliance
- Generate charts for legal documentation

### **Investment Analysis**
- Analyze portfolio company structures
- Map fund ownership across entities
- Present investment structures to LPs

### **Tax Planning**
- Visualize tax jurisdiction strategies
- Map transfer pricing structures
- Document entity planning recommendations

## 🛠 Technical Architecture

### **Backend**
- **Flask**: Web framework with session management
- **SQLAlchemy**: Database ORM with SQLite storage
- **Pandas**: Excel file processing and data manipulation
- **Pydantic**: Data validation and schema enforcement

### **Frontend**
- **D3.js**: Interactive data visualization
- **Tailwind CSS**: Modern, responsive UI design
- **Vanilla JavaScript**: Lightweight, no heavy frameworks

### **Data Flow**
```
Excel Files → Field Mapping → Validation → SQLite → D3.js Rendering
```

## ⚡ Performance Features

### **Large Dataset Optimization**
- **Entity-focused views**: Show relevant subsets instead of full 400+ entity charts
- **Smart rendering**: Only display filtered nodes for better performance
- **Efficient algorithms**: Fast traversal of ownership hierarchies
- **Progressive disclosure**: Manage complexity through focused navigation

### **Production Ready**
- **Session management**: Server-side storage with automatic cleanup
- **File cleanup**: Automatic deletion of temporary files
- **Error handling**: Graceful degradation and user feedback
- **Security**: Input validation and sanitization

## 🎨 Advanced Features

### **Smart Hierarchy Detection**
- **Root entity identification**: Automatically finds ultimate parent companies
- **Circular reference protection**: Prevents infinite loops in complex structures
- **Multi-tree support**: Handles separate organizational structures side-by-side

### **Visual Intelligence**
- **Focused entity highlighting**: Red nodes with gold borders for selected entities
- **Ownership path emphasis**: Orange lines for focused entity relationships
- **Variable line thickness**: Visual weight based on ownership percentages
- **Interactive tooltips**: Rich information on hover

### **Export Intelligence**
- **Context-aware naming**: Filenames include view type and entity focus
- **PowerPoint optimization**: White backgrounds and proper scaling
- **Metadata inclusion**: Generation timestamps and entity counts
- **Format optimization**: Vector SVG for scaling, high-DPI PNG for compatibility

## 🔧 Configuration

### **Environment Variables**
```python
# app.py - Update these for production
app.secret_key = 'your-secure-secret-key'
app.config['DEBUG'] = False  # Disable debug mode
```

### **Customization Options**
- **Color schemes**: Modify CSS variables in the template
- **Chart sizing**: Adjust margins and dimensions in JavaScript
- **Validation rules**: Update Pydantic models for different requirements
- **File limits**: Configure maximum file size in Flask settings

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature-name`
3. **Make your changes** with clear commit messages
4. **Test thoroughly** with various data sets
5. **Submit a pull request** with detailed description

### **Development Setup**
```bash
# Development mode with auto-reload
export FLASK_DEBUG=1
python app.py
```

## 📚 FAQ

**Q: What's the maximum number of entities Charted can handle?**
A: Tested with 400+ entities. Use focused views for optimal performance with large datasets.

**Q: Can I use non-English entity names?**
A: Yes! Charted supports Unicode characters in all text fields.

**Q: What if my ownership percentages don't add up to 100%?**
A: No problem. Charted displays actual percentages and doesn't require mathematical consistency.

**Q: Can I edit data after uploading?**
A: Currently, use the "Reset Data" feature to clear everything and re-upload. Edit capabilities planned for future versions.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **D3.js community** for the powerful visualization library
- **Flask team** for the elegant web framework
- **Tailwind CSS** for the beautiful, responsive design system

---

**Charted** - Making organizational structures visual and interactive.

*Built with ❤️ by Claude A.I. and A.C. van der Linde*
