# Quick Start Guide - Document Management System

## 🚀 Getting Started

### 1. Fix Storage Bucket (REQUIRED)
Your documents are stored in Supabase Storage, but the Edge Function needs public access to process them.

**Steps**:
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Storage** in the left sidebar
4. Click on the `documents` bucket
5. Toggle **"Public bucket"** to ON
6. Save changes

✅ **This is the only manual step required!**

---

## 📱 Using the Document Management System

### Upload Documents
1. Go to `/dashboard`
2. Drag & drop files or click to browse
3. Supported formats: PDF, DOCX, TXT
4. Document is queued for processing

### View All Documents
1. Click **"My Documents"** or navigate to `/documents`
2. See all your documents in a grid layout
3. Use filters, search, and sort to find documents

### View Document Details
1. Click on any document card
2. See AI-generated summary, key points, keywords
3. View sentiment analysis and category
4. Download original file or export JSON report

### Manage Documents
**Rename**:
- Click three-dot menu on document card
- Select "Rename"
- Enter new name and confirm

**Download**:
- Click "Download File" in actions menu
- Or use button in document detail page

**Export Report**:
- View document details
- Click "Download Report" button
- Get comprehensive JSON with all analysis

**Delete**:
- Click three-dot menu
- Select "Delete"
- Confirm deletion (cannot be undone)

**Retry Failed Processing**:
- For failed documents, click three-dot menu
- Select "Retry Processing"
- Document resets to queued status

---

## 🎨 Features Overview

### Search
- Real-time search by document name
- Case-insensitive matching
- Located at top of document list page

### Filters
Choose status to display:
- **All** - All documents
- **Completed** - Successfully processed
- **Processing** - Currently being analyzed
- **Queued** - Waiting for processing
- **Failed** - Processing errors

### Sort Options
- **Newest First** - Most recent uploads
- **Oldest First** - Earliest uploads
- **Name A-Z** - Alphabetical ascending
- **Name Z-A** - Alphabetical descending
- **Status** - Grouped by processing status

---

## 🎯 Status Meanings

### 🔵 Queued
Document is waiting in the processing queue. Should process within seconds.

### 🟡 Processing
AI is analyzing your document. May take 10-30 seconds depending on size.

### 🟢 Completed
Processing successful! View full analysis and download reports.

### 🔴 Failed
Processing encountered an error. Click "Retry Processing" to try again.

---

## 🔍 Document Details Page

### Summary Section
AI-generated executive summary of your document content.

### Statistics
- **Word Count** - Total words in document
- **Character Count** - Total characters
- **Sentiment** - Positive/Negative/Neutral tone
- **Category** - Document classification

### Key Points
Numbered list of main takeaways from the document.

### Keywords
Important terms and topics extracted from content.

### Extracted Text
Full text content with expand/collapse functionality.

---

## 📊 API Endpoints

All endpoints require authentication via Clerk.

### Document Operations
- `GET /api/documents/list` - List user's documents
- `GET /api/documents/[id]` - Get document details
- `DELETE /api/documents/[id]` - Delete document

### New Endpoints
- `POST /api/documents/retry` - Retry failed processing
- `POST /api/documents/rename` - Rename document
- `POST /api/documents/download` - Get signed download URL
- `POST /api/documents/export` - Export JSON report

---

## 🐛 Troubleshooting

### "Failed to download file: 400 Bad Request"
**Cause**: Storage bucket is not public
**Fix**: Follow Step 1 above to enable public access

### Document Stuck in "Processing"
**Cause**: Edge Function may have timed out
**Fix**: Wait 2 minutes, then use "Retry Processing"

### TypeScript Errors in VS Code
**Cause**: Cache showing deleted files
**Fix**: 
1. Press `Ctrl+Shift+P`
2. Type "Reload Window"
3. Press Enter

### Upload Fails
**Causes**:
- Out of credits (you get 5 free)
- File too large (max 10MB)
- Unsupported file type

**Fix**: Check credit balance in dashboard

---

## 💡 Tips & Best Practices

### File Naming
- Use descriptive names
- Avoid special characters
- Include document type/purpose

### Processing Times
- **TXT files**: ~5-10 seconds
- **DOCX files**: ~10-20 seconds
- **PDF files**: ~20-30 seconds

### Credit Usage
- Each upload costs 1 credit
- You start with 5 free credits
- Retrying doesn't cost additional credits
- Buy more credits via subscription plans

### Search Tips
- Search by partial file name
- Use filters to narrow results
- Combine search + filter for best results

---

## 🎉 Features at a Glance

| Feature | Available | How to Access |
|---------|-----------|---------------|
| Upload Documents | ✅ | Dashboard upload zone |
| List Documents | ✅ | `/documents` page |
| View Details | ✅ | Click any document |
| Search | ✅ | Search bar on list page |
| Filter by Status | ✅ | Filter buttons on list page |
| Sort Documents | ✅ | Sort dropdown on list page |
| Rename | ✅ | Actions menu → Rename |
| Delete | ✅ | Actions menu → Delete |
| Download File | ✅ | Actions menu → Download |
| Export Report | ✅ | Detail page → Download Report |
| Retry Processing | ✅ | Actions menu (failed docs only) |

---

## 🔗 Navigation

### Main Routes
- `/` - Landing page
- `/dashboard` - Upload & quick view
- `/documents` - Full document list
- `/documents/[id]` - Document details
- `/dashboard/subscription` - Manage credits

### Quick Actions
- **Upload New** - Available on both dashboard and document list
- **Back to Dashboard** - Breadcrumb link on all pages
- **View Details** - Click document card or "View Details" button

---

## ✨ What's New

### Backend (4 new API routes)
1. ✅ Retry processing for failed documents
2. ✅ Rename documents
3. ✅ Download original files (signed URLs)
4. ✅ Export analysis reports (JSON)

### Frontend (3 new pages/components)
1. ✅ Document list page with search, filter, sort
2. ✅ Document details page with full analysis
3. ✅ StatusBadge component with animations
4. ✅ DocumentCard component with actions

### Features (10 enhancements)
1. ✅ Comprehensive document management UI
2. ✅ Real-time search and filtering
3. ✅ Multiple sort options
4. ✅ Beautiful status badges
5. ✅ Action menus with all operations
6. ✅ Confirmation dialogs
7. ✅ Loading states
8. ✅ Empty states
9. ✅ Responsive design
10. ✅ Error handling

---

## 🎯 Next Steps

1. **Enable Storage Bucket** (see Step 1)
2. **Test Upload Flow**:
   - Upload a sample document
   - Wait for processing
   - View the results
3. **Explore Features**:
   - Try search and filters
   - Rename a document
   - Download a file
   - Export a report
4. **Manage Documents**:
   - Organize your files
   - Delete old documents
   - Retry failed processing

---

## 📞 Need Help?

Check these resources:
- **Implementation Guide**: `DOCUMENT_MANAGEMENT_COMPLETE.md`
- **Architecture Overview**: Files in `cleanup-backup-*/` folders
- **API Examples**: Test routes with tools like Postman

Your document management system is production-ready! 🚀
