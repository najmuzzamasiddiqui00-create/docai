# Gemini Helper Test Harness

Quick testing utility for the Gemini API integration.

## Usage

```bash
# Test with short business text (default)
npm run test:gemini

# Test with PDF-like text
npm run test:gemini -- pdf

# Test with long document
npm run test:gemini -- long
```

## What It Tests

- ✅ Environment variable validation
- ✅ API connectivity
- ✅ Request/response cycle
- ✅ JSON parsing
- ✅ Response structure validation
- ✅ Error handling

## Sample Output

```
🧪 === GEMINI HELPER TEST HARNESS ===

📝 Testing with sample: short
📏 Sample length: 234 characters
📄 Sample preview: This is a short business proposal document...

⏳ Calling Gemini API...

✅ === TEST PASSED === ✅

⏱️  Duration: 2340ms (2.34s)

📊 Analysis Results:

Summary:
  This proposal recommends implementing a new customer service system...

Key Points:
  1. Faster response times
  2. Better issue tracking
  3. Improved customer satisfaction

Keywords:
  customer service, system, implementation, response times, tracking

Metadata:
  Category: Business
  Sentiment: Positive
  Word Count: 42
  Char Count: 234

✅ Structure validation passed
```

## Troubleshooting

### 404 Error
- Model `gemini-1.5-pro` may not be available for your API key region
- Verify at https://ai.google.dev/gemini-api/docs/models

### Missing API Key
- Set `GEMINI_API_KEY` in `.env.local`
- Get key at https://aistudio.google.com/app/apikey

### JSON Parse Error
- Check `lib/gemini.ts` response parsing
- Gemini may be returning non-JSON content

## Direct Test

```bash
# Run without npm script
npx tsx test-gemini.ts short
npx tsx test-gemini.ts pdf
npx tsx test-gemini.ts long
```
