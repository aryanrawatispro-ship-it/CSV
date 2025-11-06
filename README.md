# Chat with CSV - AI-Powered Data Analysis

A production-ready web application that lets you upload CSV files and ask questions using natural language. Powered by GLM-4.6 AI and DuckDB for blazing-fast SQL execution.

## Features

- 📊 **Upload Multiple File Formats**: CSV, TSV, Excel (XLS/XLSX)
- 💬 **Natural Language Queries**: Ask questions in plain English
- 🤖 **AI-Powered Analysis**: GLM-4.6 automatically generates SQL queries
- 📈 **Auto-Generated Charts**: Beautiful visualizations using Vega-Lite
- ⚡ **Fast Query Execution**: DuckDB engine for high-performance analytics
- 🌓 **Dark/Light Mode**: Toggle between themes
- 💾 **Export Results**: Download query results as CSV
- 🔄 **Streaming Responses**: Real-time AI responses with Server-Sent Events

## Tech Stack

- **Framework**: Next.js 14 (App Router) with TypeScript
- **UI**: Tailwind CSS + shadcn/ui
- **Database**: DuckDB (Node.js binding)
- **AI**: GLM-4.6 API from Zhipu AI
- **Charts**: Vega-Lite with react-vega
- **File Parsing**: PapaParse (CSV) and xlsx (Excel)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- GLM-4.6 API key from [Zhipu AI](https://api.z.ai)

### Installation

1. Clone the repository:

```bash
git clone <your-repo-url>
cd CSV
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file:

```bash
cp .env.example .env
```

4. Add your API key to `.env`:

```env
ZAI_API_KEY=your_api_key_here
```

### Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```

## Usage

1. **Upload a File**: Drag and drop or select a CSV/Excel file
2. **Ask Questions**: Type natural language questions about your data
3. **View Results**: See results as tables and auto-generated charts
4. **Export**: Download query results as CSV

### Example Questions

- "What were the top 5 products by revenue last quarter?"
- "Show me weekly signups by channel for this year"
- "Which customers have the highest lifetime value?"
- "What's the average order value by region?"
- "Find trends in monthly active users over time"

## Architecture

### Backend API Routes

- `POST /api/upload` - Upload and process CSV/Excel files
- `POST /api/ask` - Ask questions (streaming SSE response)
- `GET /api/datasets/:id/schema` - Get dataset schema
- `GET /api/datasets/:id/export` - Export query results

### Frontend Pages

- `/` - Landing page with features and CTA
- `/app` - Main application with chat interface

### Key Components

- `FileUpload` - Drag-and-drop file upload
- `ChatInput` - Message input with keyboard shortcuts
- `ChatMessage` - Message display with streaming support
- `DataTable` - Results table with export
- `ChartView` - Vega-Lite visualizations

## Security

- ✅ SQL injection protection (only SELECT queries allowed)
- ✅ File type validation
- ✅ File size limits (default 100MB)
- ✅ Content-type checking
- ✅ No data training on user uploads
- ✅ Server-side query validation

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ZAI_API_KEY` | GLM-4.6 API key (required) | - |
| `MAX_FILE_SIZE_MB` | Maximum upload size in MB | 100 |
| `DATA_DIR` | Directory for data files | ./data |
| `USE_WASM_DUCKDB` | Use WASM instead of native DuckDB | false |

## Deployment

### Vercel

1. Push to GitHub
2. Import project in Vercel
3. Add `ZAI_API_KEY` environment variable
4. Deploy

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

## License

MIT

## Credits

- Powered by [GLM-4.6](https://api.z.ai) AI model
- Built with [Next.js](https://nextjs.org)
- Database by [DuckDB](https://duckdb.org)
- UI components from [shadcn/ui](https://ui.shadcn.com)
