# GénéalogieQuébec Integration - No Public API Available

## Key Finding

**GénéalogieQuébec.com does NOT provide a public API for third-party integration.**

This changes the feasibility and approach for direct integration with Heritage.

## Options for Integration

### ❌ Option 1: Direct API Integration (NOT POSSIBLE)
- **Status:** Not available
- **Why:** Institut généalogique Drouin does not expose a public API
- **Alternative:** Contact them directly for a custom business agreement

### ⚠️ Option 2: Web Scraping (NOT RECOMMENDED)
**Pros:**
- Technically possible with tools like Cheerio or Puppeteer
- Could work without official partnership

**Cons:**
- Violates Terms of Service
- Fragile (breaks with any website layout change)
- Rate limiting issues
- Legal liability
- Performance intensive
- Unsustainable long-term

**Risk:** GénéalogieQuébec could block automated access, legal action possible

**Recommendation:** **DO NOT implement this approach**

### ✅ Option 3: Business Partnership (RECOMMENDED)
**Approach:**
1. Contact Institut généalogique Drouin directly
2. Propose custom API development or data export partnership
3. Negotiate licensing terms
4. Sign commercial agreement
5. Implement authenticated integration

**Contact Information:**
- Email: contact@institutdrouin.com
- Phone: 514-400-3961
- Website: https://genealogiequebec.com

**Key Points for Partnership Discussion:**
- Heritage is an open-source genealogy application
- Need for Quebec genealogical record access
- Potential to drive subscriptions through referrals
- Professional integration partnership
- Mutual benefit scenario

### ✅ Option 4: User-Assisted Import (INTERIM SOLUTION)
**Approach:**
- Export search results from GénéalogieQuébec (if available)
- User provides data file or credentials
- Heritage imports using data mapper we've built
- No need for API

**Implementation:**
```javascript
// User provides GQ data in JSON format:
[
  {
    givenNames: "Jean-Marie",
    surname: "Dupont",
    birthDate: "15/05/1850",
    birthPlace: "Montréal",
    recordId: "gq-123",
    recordUrl: "https://genealogiequebec.com/record/123"
  }
]

// Heritage imports using existing dataMapper functions:
import { gqSearchResultsToHeritagePersons } from '@/integrations/genealogieQuebec/dataMapper';
const heritageRecords = gqSearchResultsToHeritagePersons(importedData);
```

**Advantages:**
- Works immediately with existing data mapper
- No scraping or legal issues
- User has control
- Can be paired with manual copy-paste
- Sets foundation for official API later

## Updated Implementation Strategy

### Phase 1: Data Foundation (COMPLETED) ✅
- ✅ Data mapper fully implemented
- ✅ 44 comprehensive tests
- ✅ Can convert any GQ data format to Heritage
- ✅ Ready for any integration method

### Phase 2: User Import UI (RECOMMENDED)
Replace planned API integration with user-controlled import:

**UI Components Needed:**
1. **Import from GénéalogieQuébec** dialog
   - JSON file upload
   - Manual data entry
   - Paste search results
   - Preview before import

2. **Data Validation**
   - Check required fields
   - Validate dates and places
   - Show warnings for missing data

3. **Conflict Resolution**
   - Detect duplicate people
   - Offer merge options
   - Preview relationships

4. **Citation Generation**
   - Auto-generate citations
   - Link to GQ record URLs
   - Set confidence levels

### Phase 3: Manual Web Integration (INTERIM)
**User workflow:**
1. User visits GénéalogieQuébec in browser
2. Finds relevant records
3. Takes screenshot or copies data
4. Pastes into Heritage import dialog
5. Heritage converts and imports

**Advantages:**
- Immediate implementation
- No API needed
- User in control
- Complies with ToS

### Phase 4: Official Partnership (LONG-TERM)
**If/when GénéalogieQuébec agrees:**
1. Custom API development
2. OAuth authentication
3. Automatic record sync
4. Real-time updates

## Recommended Next Steps

### Immediate (This Week)
1. **Contact Institut généalogique Drouin**
   ```
   Subject: Integration Partnership Proposal - Heritage Genealogy Application

   Body:
   Dear Institut généalogique Drouin,

   We are developing Heritage, an open-source genealogy application. We have
   a significant user base interested in Quebec genealogical records.

   We would like to discuss potential partnership opportunities to provide
   Heritage users with access to GénéalogieQuébec records.

   Would you be interested in discussing:
   - Custom API development
   - Data export partnerships
   - Affiliate/referral programs
   - Direct integration possibilities

   We believe mutual benefit is possible through increased user engagement
   with Quebec genealogical resources.

   Best regards,
   [Your Name]
   Heritage Project Team
   ```

2. **Document this finding**
   - Add note to integration roadmap
   - Update documentation
   - Set realistic expectations

### Short-term (Weeks 2-4)
**Build import UI for manual/file-based import:**
- [ ] Create ImportGQDataModal component
- [ ] Build JSON file parser
- [ ] Implement data validation
- [ ] Add duplicate detection
- [ ] Test with real GQ data

### Medium-term (If Partnership Happens)
- [ ] Implement authenticated API client
- [ ] Add search workflow
- [ ] Automatic sync setup
- [ ] Real-time updates

## Alternative Genealogy API Integrations

While GénéalogieQuébec doesn't provide an API, Heritage could integrate with:

### FamilySearch API (✅ Recommended Alternative)
- **Status:** Free, public API available
- **Coverage:** Worldwide genealogical records
- **Quebec Records:** Limited but growing
- **Implementation:** 1-2 weeks
- **Cost:** Free with rate limits
- **Documentation:** Excellent

### Ancestry API (⚠️ Commercial)
- **Status:** Partner API available
- **Cost:** Commercial licensing
- **Coverage:** Broad, including Quebec
- **Implementation:** 2-4 weeks
- **Documentation:** Good

### MyHeritage (⚠️ Commercial)
- **Status:** Limited API
- **Cost:** Commercial licensing
- **Coverage:** Broad
- **Implementation:** 2-4 weeks

## The Data Mapper's Role

**Even without GénéalogieQuébec API, our data mapper is valuable:**

1. **Manual Imports** - Users can paste GQ data, Heritage converts it
2. **Future API** - If they ever provide API, integration is straightforward
3. **Other Sources** - Can adapt to parse other genealogy services
4. **Web Scraping** (if ethically justified) - Parser already handles the data
5. **User Migration** - Help users migrate from GQ to Heritage

## Architecture Benefits

The data mapper approach means:
- ✅ No vendor lock-in
- ✅ Works with any data source
- ✅ User controls data flow
- ✅ Complies with ToS
- ✅ Sustainable long-term
- ✅ Can pivot to API if available

## Decision: What Should Heritage Do?

### RECOMMENDED PATH: User Import + Partnership Outreach

**Phase 2 (Next):**
- Build UI for manual GQ data import
- Support JSON file uploads
- Auto-generate citations with GQ URLs
- Set up for future API integration

**Parallel:**
- Send partnership inquiry to Institut généalogique Drouin
- Explore FamilySearch API as complement
- Build user workflows for multi-source research

**Advantages:**
- Provides value immediately
- Positions Heritage as professional tool
- Opens partnership conversations
- Complies with all ToS
- Creates foundation for future APIs

## Cost Analysis

| Approach | Cost | Timeline | Sustainability | Legal Risk |
|----------|------|----------|-----------------|-----------|
| Web Scraping | Low | 1-2 weeks | Low | High |
| User Import | Low | 2-3 weeks | High | None |
| Partnership API | Medium | 4-12 weeks | High | None |
| FamilySearch | Free | 1-2 weeks | High | None |

## Summary

GénéalogieQuébec's lack of public API is **not a blocker** for Heritage. Instead, it's an opportunity to:

1. **Build a professional import workflow** that respects ToS
2. **Reach out for partnership** with a mature, quality application
3. **Create sustainable user workflows** with multiple data sources
4. **Establish Heritage** as a serious genealogy tool worthy of partnerships

The data mapper we've built is the perfect foundation for any of these paths.

---

## Action Items

- [ ] Send partnership inquiry to Institut généalogique Drouin
- [ ] Plan user import UI (Phase 2)
- [ ] Explore FamilySearch API integration
- [ ] Update documentation with findings
- [ ] Consider web.archive.org for historical GQ structure analysis (if needed for migration tools)

**Status:** Re-assessing integration approach based on API availability
**Alternative:** User-assisted import + partnership outreach
**Timeline Adjusted:** Partnership approach may take longer but is more sustainable
