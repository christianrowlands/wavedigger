# 5G NR Tower Investigation - Apple Location Services API

## Executive Summary

During investigation of cell tower searches in WaveDigger, we discovered that Apple's Location Services API is returning 5G NR towers with a special Cell ID value of `0xFFFFFFFF` (4294967295). This appears to be a backwards-compatibility mechanism for representing 5G NR towers that use 36-bit cell IDs in a protobuf schema that only supports 32-bit unsigned integers.

### Key Discovery
- **Cell ID `0xFFFFFFFF` appears to indicate 5G NR towers in Apple's API responses**
- Direct queries for these towers fail, but they appear in "surrounding towers" searches
- Found 20+ 5G NR towers across major US carriers (Verizon, AT&T, T-Mobile)

## Technical Background

### Cell ID Ranges by Technology

| Technology | Cell ID Range | Bits | Max Value |
|------------|--------------|------|-----------|
| GSM/CDMA | 0 - 65,535 | 16 | 2^16 - 1 |
| UMTS/LTE | 0 - 268,435,455 | 28 | 2^28 - 1 |
| 5G NR | 0 - 68,719,476,735 | 36 | 2^36 - 1 |

### The Problem
Apple's current protobuf schema uses `uint32` for cell IDs (max value: 4,294,967,295), which cannot represent the full range of 5G NR cell identities that require 36 bits.

## Investigation Findings

### Test Results

When searching for surrounding towers with the query:
- MCC: 311 (USA)
- MNC: 480 (Verizon)
- TAC: 2678
- Cell ID: 1234567 (valid LTE)

Results included:
- **21 total towers**
- **20 towers with Cell ID 0xFFFFFFFF**
- **1 tower with normal LTE Cell ID**

### Carrier Distribution of 0xFFFFFFFF Towers

```
Verizon (311-480): 9 towers
  TAC IDs: 2678, 17471, 40204, 40210, 40318, 40438, 40440, 40442, 47394

AT&T (310-410): 6 towers
  TAC IDs: 9859, 9872, 9873, 9881, 9882, 9884

T-Mobile (310-260): 2 towers
  TAC IDs: 9585, 20216

FirstNet (313-100): 3 towers
  TAC IDs: 9872, 9882, 9966
```

### Behavioral Patterns

1. **Direct Query Behavior**:
   - Querying directly for Cell ID 0xFFFFFFFF returns no results
   - The API appears to treat this as an invalid/sentinel value for direct queries

2. **Surrounding Towers Behavior**:
   - When requesting surrounding towers (numCellResults: 0), 5G NR towers are included
   - They all report Cell ID as 0xFFFFFFFF
   - They have valid locations and TAC IDs

3. **TAC-Based Identification**:
   - Each 0xFFFFFFFF tower has a unique TAC ID
   - TAC appears to be the primary identifier for these 5G NR towers

## Hypothesis: Hidden Protobuf Field

### Theory
Apple likely added a new field to the `CellTower` protobuf message to support 5G NR's 36-bit NCIs:

```protobuf
message CellTower {
  uint32 mcc = 1;
  uint32 mnc = 2;
  uint32 cell_id = 3;        // Limited to 32 bits, uses 0xFFFFFFFF for 5G NR
  uint32 tac_id = 4;
  optional Location location = 5;
  optional uint32 uarfcn = 6;
  optional uint32 pid = 7;
  // Hypothetical new field:
  optional uint64 nr_nci = 8;  // 5G NR Cell Identity (36-bit value in 64-bit field)
}
```

### Supporting Evidence

1. **0xFFFFFFFF as a Flag**: This value is traditionally used as "not available" in cellular protocols, making it a perfect backwards-compatibility flag

2. **Valid Location Data**: These towers have accurate location data, proving they're real towers, not errors

3. **Consistent Pattern**: All 5G NR towers consistently use this value, suggesting intentional design

4. **API Behavior**: The API knows not to return results for direct 0xFFFFFFFF queries, indicating special handling

## Investigation Attempted

### 1. Raw Protobuf Analysis
Attempted to decode raw protobuf bytes to find unknown fields:
```
Found field 22 (cell_tower_response) with wire type 2
  Message length: 81 bytes
  Found Verizon tower (MCC 311)
    Unknown field 434354560 with wire type 0
```
Result: Encountered parsing errors suggesting additional fields present

### 2. Query Variations Tested
- Cell ID 0xFFFFFFFF: No results
- Cell ID 0: Some results (possibly TAC-based fallback)
- Cell ID 1: Some results
- Cell ID 0xFFFFFFFE: No results

## Future Investigation Ideas

### 1. Deep Protobuf Analysis
- Capture raw bytes for towers with 0xFFFFFFFF cell IDs
- Use protobuf dissector tools to identify unknown fields
- Compare byte patterns between LTE and suspected 5G NR towers

### 2. iOS Testing
- Test with different iOS versions to see if behavior changes
- Try different device model strings (iPhone 14 Pro, iPhone 15 Pro)
- Monitor for API changes over time

### 3. Field Number Discovery
- Systematically test field numbers 8-21 in CellTower message
- Look for length-delimited fields that could contain 64-bit values
- Check if field order provides hints about when fields were added

### 4. Alternative Approaches
- Investigate if Apple has separate 5G-specific endpoints
- Check if different headers trigger 5G-specific responses
- Test with known 5G NR cell IDs from other sources

## Implementation Recommendations

### Short Term (Current Limitations)
1. **Display 0xFFFFFFFF towers as "5G NR"** with appropriate labeling
2. **Add help text** explaining why direct 5G NR queries don't work
3. **Suggest workaround**: Use "Include surrounding towers" with nearby LTE tower

### Long Term (If Hidden Field Discovered)
1. **Update protobuf schema** to include the new field
2. **Parse and display actual 5G NR NCIs**
3. **Enable direct 5G NR tower queries**

### UI/UX Considerations
- Add "5G" badge similar to "CN" badge for China towers
- Show warning when user enters Cell ID > LTE max
- Provide clear explanation of current limitations

## Code References

- Validation logic: `/lib/cell-tower-utils.ts:50` (validateCellId function)
- API endpoint: `/app/api/cell-tower/route.ts:31` (cell ID validation)
- Protobuf schema: `/lib/protobuf/schema.ts:27` (CellTower message definition)

## Test Files Created

- `test-5g-nr.ts` - Tests various 5G NR query scenarios
- `analyze-5g-protobuf.ts` - Attempts to decode unknown protobuf fields

## Conclusion

Apple's Location Services API appears to support 5G NR towers but with limitations due to backwards compatibility constraints. The use of 0xFFFFFFFF as a cell ID strongly suggests the presence of an additional protobuf field for the full 36-bit 5G NR cell identity. Further investigation through protobuf reverse engineering could reveal this hidden field and enable full 5G NR support in WaveDigger.

---

*Investigation conducted: December 2024*
*Next steps: Implement UI changes to handle 5G NR towers gracefully while continuing investigation of the protobuf structure*